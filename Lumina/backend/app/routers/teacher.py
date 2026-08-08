from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload
from .. import models, schemas, database, auth_utils
from typing import List

router = APIRouter(prefix="/teacher", tags=["teacher"])

def require_teacher(current_user: models.User = Depends(auth_utils.get_current_user)):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return current_user

@router.get("/students", response_model=List[schemas.StudentResponse])
def get_students(
    db: Session = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher)
):
    links = db.query(models.TeacherStudent).filter(
        models.TeacherStudent.teacher_id == teacher.id
    ).all()
    student_ids = [link.student_id for link in links]
    students = db.query(models.User).filter(models.User.id.in_(student_ids)).all()
    return students

@router.post("/students", response_model=schemas.StudentResponse)
def add_student(
    req: schemas.AddStudentRequest,
    db: Session = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher)
):
    student = db.query(models.User).filter(models.User.email == req.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="User not found")
    if student.id == teacher.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    
    existing = db.query(models.TeacherStudent).filter(
        models.TeacherStudent.teacher_id == teacher.id,
        models.TeacherStudent.student_id == student.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student already added")
    
    link = models.TeacherStudent(teacher_id=teacher.id, student_id=student.id)
    db.add(link)
    db.commit()
    return student

@router.delete("/students/{student_id}")
def remove_student(
    student_id: int,
    db: Session = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher)
):
    link = db.query(models.TeacherStudent).filter(
        models.TeacherStudent.teacher_id == teacher.id,
        models.TeacherStudent.student_id == student_id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(link)
    db.commit()
    return {"ok": True}

@router.post("/assign")
def assign_course(
    req: schemas.AssignCourseRequest,
    db: Session = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher)
):
    # Verify student is in teacher's list
    link = db.query(models.TeacherStudent).filter(
        models.TeacherStudent.teacher_id == teacher.id,
        models.TeacherStudent.student_id == req.student_id
    ).first()
    if not link:
        raise HTTPException(status_code=400, detail="Student not in your list")
    
    # Verify course exists
    course = db.query(models.Course).filter(models.Course.id == req.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check for duplicate assignment
    existing = db.query(models.CourseAssignment).filter(
        models.CourseAssignment.teacher_id == teacher.id,
        models.CourseAssignment.student_id == req.student_id,
        models.CourseAssignment.course_id == req.course_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already assigned")
    
    assignment = models.CourseAssignment(
        teacher_id=teacher.id,
        student_id=req.student_id,
        course_id=req.course_id
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    if req.deadlines:
        for lesson_id, deadline in req.deadlines.items():
            dl = models.AssignmentDeadline(
                assignment_id=assignment.id,
                lesson_id=int(lesson_id),
                deadline=deadline
            )
            db.add(dl)
        db.commit()

    return {"ok": True, "id": assignment.id}

@router.get("/assignments")
def get_assignments(
    db: Session = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher)
):
    assignments = db.query(models.CourseAssignment).options(
        joinedload(models.CourseAssignment.student),
        joinedload(models.CourseAssignment.course).selectinload(models.Course.lessons)
    ).filter(
        models.CourseAssignment.teacher_id == teacher.id
    ).all()
    
    if not assignments:
        return []
        
    student_ids = list({a.student_id for a in assignments})
    
    progress_records = db.query(models.Progress).filter(
        models.Progress.user_id.in_(student_ids),
        models.Progress.is_completed == True
    ).all()
    
    completed_lookup = {(p.user_id, p.lesson_id): True for p in progress_records}
    
    result = []
    for a in assignments:
        student = a.student
        course = a.course
        lessons = course.lessons if course else []
        
        total = len(lessons)
        completed = sum(1 for l in lessons if completed_lookup.get((a.student_id, l.id)))
        
        progress_pct = round((completed / total) * 100) if total > 0 else 0
        
        result.append({
            "id": a.id,
            "student_email": student.email if student else "?",
            "course_title": course.title if course else "?",
            "total_lessons": total,
            "completed_lessons": completed,
            "progress": progress_pct,
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None
        })
    
    return result

@router.post("/toggle-role")
def toggle_role(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    if current_user.role == "student":
        current_user.role = "teacher"
    else:
        # Prevent demoting if they still have students or assignments
        student_count = db.query(models.TeacherStudent).filter(
            models.TeacherStudent.teacher_id == current_user.id
        ).count()
        assignment_count = db.query(models.CourseAssignment).filter(
            models.CourseAssignment.teacher_id == current_user.id
        ).count()
        
        if student_count > 0 or assignment_count > 0:
            raise HTTPException(status_code=400, detail="Cannot demote to student: you still have active students or assignments.")
        
        current_user.role = "student"
    
    db.commit()
    db.refresh(current_user)
    return {"role": current_user.role}

@router.get("/library", response_model=List[schemas.Course])
def get_library(
    db: Session = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher)
):
    courses = db.query(models.Course).filter(models.Course.author_id == teacher.id).all()
    return courses

@router.get("/assignable-courses", response_model=List[schemas.Course])
def get_assignable_courses(
    db: Session = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher)
):
    courses = db.query(models.Course).filter(
        (models.Course.author_id == None) | (models.Course.author_id == teacher.id)
    ).all()
    return courses

from ..routers.courses import detect_resource_type

@router.post("/custom-lesson")
def create_custom_lesson(
    req: schemas.CourseCreate,
    student_id: int,
    db: Session = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher)
):
    link = db.query(models.TeacherStudent).filter(
        models.TeacherStudent.teacher_id == teacher.id,
        models.TeacherStudent.student_id == student_id
    ).first()
    if not link:
        raise HTTPException(status_code=400, detail="Student not in your list")
        
    db_course = models.Course(
        title=req.title,
        description=req.description,
        image_url=req.image_url,
        author_id=teacher.id
    )
    db.add(db_course)
    db.commit()
    db.refresh(db_course)

    for lesson_data in req.lessons:
        rtype = lesson_data.resource_type or detect_resource_type(lesson_data.video_url or "")
        db_lesson = models.Lesson(
            title=lesson_data.title,
            content=lesson_data.content,
            video_url=lesson_data.video_url,
            attachments=lesson_data.attachments,
            resource_type=rtype,
            course_id=db_course.id
        )
        db.add(db_lesson)
    db.commit()
    
    assignment = models.CourseAssignment(
        teacher_id=teacher.id,
        student_id=student_id,
        course_id=db_course.id
    )
    db.add(assignment)
    db.commit()
    
    return {"ok": True, "course_id": db_course.id}

@router.get("/submissions", response_model=List[schemas.HomeworkSubmissionOut])
def get_submissions(
    db: Session = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher)
):
    # Get all courses created by this teacher
    teacher_courses = db.query(models.Course.id).filter(
        models.Course.author_id == teacher.id
    )
    
    # Get all lessons in these courses
    teacher_lessons = db.query(models.Lesson.id).filter(
        models.Lesson.course_id.in_(teacher_courses)
    )
    
    # Get all submissions for these lessons
    submissions = db.query(models.HomeworkSubmission).options(
        joinedload(models.HomeworkSubmission.student),
        joinedload(models.HomeworkSubmission.lesson).joinedload(models.Lesson.course)
    ).filter(
        models.HomeworkSubmission.lesson_id.in_(teacher_lessons)
    ).order_by(models.HomeworkSubmission.submitted_at.desc()).all()
    
    # Enrich with student email and lesson title
    for sub in submissions:
        setattr(sub, 'student_email', sub.student.email)
        setattr(sub, 'lesson_title', sub.lesson.title)
        setattr(sub, 'course_title', sub.lesson.course.title)
        
    return submissions
