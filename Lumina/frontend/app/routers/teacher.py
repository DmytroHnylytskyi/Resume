"""Teacher Portal Router Module.

Provides administrative and pedagogical endpoints for instructors, including
student roster management, course assignments, per-lesson deadline configuration,
custom lesson generation, and homework submission reviews.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from .. import auth_utils, database, models, schemas
from .courses import detect_resource_type

router = APIRouter(prefix="/teacher", tags=["teacher"])


def require_teacher(
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> models.User:
    """Dependency ensuring the authenticated user has the 'teacher' role.

    Args:
        current_user (models.User): Currently authenticated user.

    Returns:
        models.User: The verified teacher user entity.

    Raises:
        HTTPException(403): If user does not possess teacher privileges.
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher access required",
        )
    return current_user


@router.get(
    "/students",
    response_model=List[schemas.StudentResponse],
    summary="List teacher's students",
    description="Returns all student accounts linked to the authenticated teacher's roster.",
)
async def get_students(
    db: AsyncSession = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher),
) -> List[models.User]:
    """Retrieves all students linked to this teacher asynchronously."""
    stmt_links = select(models.TeacherStudent).filter(
        models.TeacherStudent.teacher_id == teacher.id
    )
    res_links = await db.execute(stmt_links)
    links = res_links.scalars().all()

    student_ids = [link.student_id for link in links]
    if not student_ids:
        return []

    stmt_students = select(models.User).filter(models.User.id.in_(student_ids))
    res_students = await db.execute(stmt_students)
    return res_students.scalars().all()


@router.post(
    "/students",
    response_model=schemas.StudentResponse,
    summary="Add student to roster",
    description="Links an existing student account to the teacher's roster by email address.",
    responses={
        200: {"description": "Student added successfully"},
        400: {"description": "Cannot add self or student already added"},
        404: {"description": "User with specified email not found"},
    },
)
async def add_student(
    req: schemas.AddStudentRequest,
    db: AsyncSession = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher),
) -> models.User:
    """Adds a student to the teacher's roster."""
    stmt_user = select(models.User).filter(models.User.email == req.email)
    res_user = await db.execute(stmt_user)
    student = res_user.scalars().first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    if student.id == teacher.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself",
        )

    stmt_existing = select(models.TeacherStudent).filter(
        models.TeacherStudent.teacher_id == teacher.id,
        models.TeacherStudent.student_id == student.id,
    )
    res_existing = await db.execute(stmt_existing)
    existing = res_existing.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student already added",
        )

    link = models.TeacherStudent(teacher_id=teacher.id, student_id=student.id)
    db.add(link)
    await db.commit()
    return student


@router.delete(
    "/students/{student_id}",
    summary="Remove student from roster",
    description="Unlinks a student from the teacher's roster without deleting their user account.",
    responses={
        200: {"description": "Student unlinked successfully"},
        404: {"description": "Student link not found"},
    },
)
async def remove_student(
    student_id: int,
    db: AsyncSession = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher),
) -> Dict[str, bool]:
    """Removes a student from the teacher's roster."""
    stmt = select(models.TeacherStudent).filter(
        models.TeacherStudent.teacher_id == teacher.id,
        models.TeacherStudent.student_id == student_id,
    )
    res = await db.execute(stmt)
    link = res.scalars().first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    await db.delete(link)
    await db.commit()
    return {"ok": True}


@router.post(
    "/assign",
    summary="Assign course to student",
    description="Assigns a course curriculum to a student with customized per-lesson due dates.",
    responses={
        200: {"description": "Course assigned successfully"},
        400: {"description": "Student not in roster or course already assigned"},
        404: {"description": "Course not found"},
    },
)
async def assign_course(
    req: schemas.AssignCourseRequest,
    db: AsyncSession = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher),
) -> Dict[str, Any]:
    """Assigns a course to a student with individual lesson deadlines."""
    stmt_link = select(models.TeacherStudent).filter(
        models.TeacherStudent.teacher_id == teacher.id,
        models.TeacherStudent.student_id == req.student_id,
    )
    res_link = await db.execute(stmt_link)
    link = res_link.scalars().first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student not in your list",
        )

    stmt_course = select(models.Course).filter(models.Course.id == req.course_id)
    res_course = await db.execute(stmt_course)
    course = res_course.scalars().first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    stmt_existing = select(models.CourseAssignment).filter(
        models.CourseAssignment.teacher_id == teacher.id,
        models.CourseAssignment.student_id == req.student_id,
        models.CourseAssignment.course_id == req.course_id,
    )
    res_existing = await db.execute(stmt_existing)
    existing = res_existing.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already assigned",
        )

    assignment = models.CourseAssignment(
        teacher_id=teacher.id,
        student_id=req.student_id,
        course_id=req.course_id,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    if req.deadlines:
        for lesson_id, deadline in req.deadlines.items():
            dl = models.AssignmentDeadline(
                assignment_id=assignment.id,
                lesson_id=int(lesson_id),
                deadline=deadline,
            )
            db.add(dl)
        await db.commit()

    return {"ok": True, "id": assignment.id}


@router.get(
    "/assignments",
    summary="List teacher's active assignments",
    description="Returns all course assignments issued by this teacher with student progress calculations.",
)
async def get_assignments(
    db: AsyncSession = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher),
) -> List[Dict[str, Any]]:
    """Fetches assignments with aggregated completion percentage for each student."""
    stmt_assign = (
        select(models.CourseAssignment)
        .options(
            joinedload(models.CourseAssignment.student),
            joinedload(models.CourseAssignment.course).selectinload(models.Course.lessons),
        )
        .filter(models.CourseAssignment.teacher_id == teacher.id)
    )
    res_assign = await db.execute(stmt_assign)
    assignments = res_assign.scalars().all()

    if not assignments:
        return []

    student_ids = list({a.student_id for a in assignments})

    stmt_prog = (
        select(models.Progress)
        .filter(
            models.Progress.user_id.in_(student_ids),
            models.Progress.is_completed == True,
        )
    )
    res_prog = await db.execute(stmt_prog)
    progress_records = res_prog.scalars().all()

    completed_lookup = {(p.user_id, p.lesson_id): True for p in progress_records}

    result = []
    for a in assignments:
        student = a.student
        course = a.course
        lessons = course.lessons if course else []

        total = len(lessons)
        completed = sum(1 for l in lessons if completed_lookup.get((a.student_id, l.id)))
        progress_pct = round((completed / total) * 100) if total > 0 else 0

        result.append(
            {
                "id": a.id,
                "student_email": student.email if student else "?",
                "course_title": course.title if course else "?",
                "total_lessons": total,
                "completed_lessons": completed,
                "progress": progress_pct,
                "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
            }
        )

    return result


@router.post(
    "/toggle-role",
    summary="Toggle user role (student <-> teacher)",
    description="Switches role between student and teacher. Demotion is blocked if active students/assignments exist.",
    responses={
        200: {"description": "Role toggled successfully"},
        400: {"description": "Cannot demote with active students or assignments"},
    },
)
async def toggle_role(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> Dict[str, str]:
    """Toggles user role between 'student' and 'teacher'."""
    if current_user.role == "student":
        current_user.role = "teacher"
    else:
        stmt_st = select(models.TeacherStudent).filter(
            models.TeacherStudent.teacher_id == current_user.id
        )
        res_st = await db.execute(stmt_st)
        student_count = len(res_st.scalars().all())

        stmt_as = select(models.CourseAssignment).filter(
            models.CourseAssignment.teacher_id == current_user.id
        )
        res_as = await db.execute(stmt_as)
        assignment_count = len(res_as.scalars().all())

        if student_count > 0 or assignment_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote to student: you still have active students or assignments.",
            )

        current_user.role = "student"

    await db.commit()
    await db.refresh(current_user)
    return {"role": current_user.role}


@router.get(
    "/library",
    response_model=List[schemas.Course],
    summary="Get teacher's authored courses",
    description="Retrieves all teaching course curricula authored by this teacher.",
)
async def get_library(
    db: AsyncSession = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher),
) -> List[models.Course]:
    """Retrieves all teaching courses authored by the requesting teacher."""
    stmt = (
        select(models.Course)
        .options(selectinload(models.Course.lessons))
        .filter(
            models.Course.author_id == teacher.id,
            models.Course.is_personal == False,
        )
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get(
    "/assignable-courses",
    response_model=List[schemas.Course],
    summary="Get assignable courses",
    description="Returns courses that the teacher is permitted to assign (authored or global templates).",
)
async def get_assignable_courses(
    db: AsyncSession = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher),
) -> List[models.Course]:
    """Retrieves assignable course templates and author courses."""
    stmt = (
        select(models.Course)
        .options(selectinload(models.Course.lessons))
        .filter(
            or_(models.Course.author_id == None, models.Course.author_id == teacher.id),
            models.Course.is_personal == False,
        )
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post(
    "/custom-lesson",
    summary="Create custom one-on-one course for student",
    description="Creates a tailored course and immediately assigns it exclusively to the selected student.",
)
async def create_custom_lesson(
    req: schemas.CourseCreate,
    student_id: int,
    db: AsyncSession = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher),
) -> Dict[str, Any]:
    """Creates a customized curriculum for a specific student."""
    stmt_link = select(models.TeacherStudent).filter(
        models.TeacherStudent.teacher_id == teacher.id,
        models.TeacherStudent.student_id == student_id,
    )
    res_link = await db.execute(stmt_link)
    link = res_link.scalars().first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student not in your list",
        )

    db_course = models.Course(
        title=req.title,
        description=req.description,
        image_url=req.image_url,
        author_id=teacher.id,
    )
    db.add(db_course)
    await db.commit()
    await db.refresh(db_course)

    for lesson_data in req.lessons:
        rtype = lesson_data.resource_type or detect_resource_type(lesson_data.video_url or "")
        db_lesson = models.Lesson(
            title=lesson_data.title,
            content=lesson_data.content,
            video_url=lesson_data.video_url,
            attachments=lesson_data.attachments or [],
            resource_type=rtype,
            course_id=db_course.id,
        )
        db.add(db_lesson)
    await db.commit()

    assignment = models.CourseAssignment(
        teacher_id=teacher.id,
        student_id=student_id,
        course_id=db_course.id,
    )
    db.add(assignment)
    await db.commit()

    return {"ok": True, "course_id": db_course.id}


@router.get(
    "/submissions",
    response_model=List[schemas.HomeworkSubmissionOut],
    summary="Review student homework submissions",
    description="Retrieves all submitted homework assignments across courses authored by this teacher.",
)
async def get_submissions(
    db: AsyncSession = Depends(database.get_db),
    teacher: models.User = Depends(require_teacher),
) -> List[models.HomeworkSubmission]:
    """Retrieves and enriches all homework submissions for teacher's courses."""
    stmt_courses = select(models.Course.id).filter(models.Course.author_id == teacher.id)
    res_courses = await db.execute(stmt_courses)
    teacher_course_ids = res_courses.scalars().all()

    if not teacher_course_ids:
        return []

    stmt_lessons = select(models.Lesson.id).filter(models.Lesson.course_id.in_(teacher_course_ids))
    res_lessons = await db.execute(stmt_lessons)
    teacher_lesson_ids = res_lessons.scalars().all()

    if not teacher_lesson_ids:
        return []

    stmt_subs = (
        select(models.HomeworkSubmission)
        .options(
            joinedload(models.HomeworkSubmission.student),
            joinedload(models.HomeworkSubmission.lesson).joinedload(models.Lesson.course),
        )
        .filter(models.HomeworkSubmission.lesson_id.in_(teacher_lesson_ids))
        .order_by(models.HomeworkSubmission.submitted_at.desc())
    )
    res_subs = await db.execute(stmt_subs)
    submissions = res_subs.scalars().all()

    for sub in submissions:
        setattr(sub, "student_email", sub.student.email if sub.student else "?")
        setattr(sub, "lesson_title", sub.lesson.title if sub.lesson else "?")
        setattr(sub, "course_title", sub.lesson.course.title if sub.lesson and sub.lesson.course else "?")

    return submissions
