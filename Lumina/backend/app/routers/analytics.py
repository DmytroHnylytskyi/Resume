from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from .. import models, database, auth_utils
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/user")
def get_user_analytics(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    assigned_course_ids = [a.course_id for a in db.query(models.CourseAssignment).filter(models.CourseAssignment.student_id == current_user.id).all()]
    authored_count = db.query(models.Course).filter(models.Course.author_id == current_user.id).count()
    total_courses = authored_count + len(set(assigned_course_ids))

    total_lessons_completed = db.query(models.Progress).filter(
        models.Progress.user_id == current_user.id,
        models.Progress.is_completed == True
    ).count()

    submissions_count = db.query(models.HomeworkSubmission).filter(
        models.HomeworkSubmission.student_id == current_user.id
    ).count()

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    activity = db.query(
        func.date(models.Progress.completed_at).label('date'),
        func.count(models.Progress.id).label('count')
    ).filter(
        models.Progress.user_id == current_user.id,
        models.Progress.is_completed == True,
        models.Progress.completed_at >= thirty_days_ago
    ).group_by(func.date(models.Progress.completed_at)).all()
    
    activity_data = [{"date": str(a.date), "count": a.count} for a in activity if a.date]

    return {
        "total_courses": total_courses,
        "total_lessons_completed": total_lessons_completed,
        "total_submissions": submissions_count,
        "activity": activity_data
    }

@router.get("/teacher")
def get_teacher_analytics(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    total_students = db.query(models.TeacherStudent).filter(models.TeacherStudent.teacher_id == current_user.id).count()
    active_assignments = db.query(models.CourseAssignment).filter(models.CourseAssignment.teacher_id == current_user.id).count()
    
    teacher_assignments = db.query(models.CourseAssignment).filter(models.CourseAssignment.teacher_id == current_user.id).all()
    assigned_student_ids = [a.student_id for a in teacher_assignments]
    assigned_course_ids = [a.course_id for a in teacher_assignments]
    
    submissions_count = 0
    on_time = 0
    late = 0
    
    if assigned_student_ids and assigned_course_ids:
        lesson_ids = [l.id for l in db.query(models.Lesson).filter(models.Lesson.course_id.in_(assigned_course_ids)).all()]
        if lesson_ids:
            submissions_count = db.query(models.HomeworkSubmission).filter(
                models.HomeworkSubmission.student_id.in_(assigned_student_ids),
                models.HomeworkSubmission.lesson_id.in_(lesson_ids)
            ).count()
            
            submissions = db.query(models.HomeworkSubmission).filter(
                models.HomeworkSubmission.student_id.in_(assigned_student_ids),
                models.HomeworkSubmission.lesson_id.in_(lesson_ids)
            ).all()
            
            deadlines = db.query(models.AssignmentDeadline).join(
                models.CourseAssignment
            ).options(
                joinedload(models.AssignmentDeadline.assignment)
            ).filter(
                models.CourseAssignment.student_id.in_(assigned_student_ids),
                models.AssignmentDeadline.lesson_id.in_(lesson_ids)
            ).all()
            
            deadline_map = {
                (d.assignment.student_id, d.lesson_id): d.deadline
                for d in deadlines if d.assignment
            }
            
            for sub in submissions:
                deadline = deadline_map.get((sub.student_id, sub.lesson_id))
                
                if deadline:
                    if sub.submitted_at > deadline:
                        late += 1
                    else:
                        on_time += 1
                else:
                    on_time += 1
            
    return {
        "total_students": total_students,
        "active_assignments": active_assignments,
        "total_submissions": submissions_count,
        "submissions_status": [
            {"name": "On Time", "value": on_time},
            {"name": "Late", "value": late}
        ]
    }
