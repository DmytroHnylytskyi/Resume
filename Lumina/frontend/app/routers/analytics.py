"""Analytics & Reporting Router Module.

Provides aggregated statistical data, study progression metrics, and homework
timeliness distribution for both student dashboards and teacher management portals.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from .. import auth_utils, database, models

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/user",
    summary="Get student progress analytics",
    description="Calculates student metrics including total active courses, completed lessons, and 30-day activity trends.",
)
async def get_user_analytics(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> Dict[str, Any]:
    """Aggregates learning analytics for the current student asynchronously."""
    stmt_assign = select(models.CourseAssignment.course_id).filter(
        models.CourseAssignment.student_id == current_user.id
    )
    res_assign = await db.execute(stmt_assign)
    assigned_course_ids = res_assign.scalars().all()

    stmt_auth = select(func.count(models.Course.id)).filter(
        models.Course.author_id == current_user.id
    )
    res_auth = await db.execute(stmt_auth)
    authored_count = res_auth.scalar() or 0

    total_courses = authored_count + len(set(assigned_course_ids))

    stmt_prog = select(func.count(models.Progress.id)).filter(
        models.Progress.user_id == current_user.id,
        models.Progress.is_completed == True,
    )
    res_prog = await db.execute(stmt_prog)
    total_lessons_completed = res_prog.scalar() or 0

    stmt_subs = select(func.count(models.HomeworkSubmission.id)).filter(
        models.HomeworkSubmission.student_id == current_user.id
    )
    res_subs = await db.execute(stmt_subs)
    submissions_count = res_subs.scalar() or 0

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    stmt_act = (
        select(
            func.date(models.Progress.completed_at).label("date"),
            func.count(models.Progress.id).label("count"),
        )
        .filter(
            models.Progress.user_id == current_user.id,
            models.Progress.is_completed == True,
            models.Progress.completed_at >= thirty_days_ago,
        )
        .group_by(func.date(models.Progress.completed_at))
    )
    res_act = await db.execute(stmt_act)
    activity = res_act.all()

    activity_data = [
        {"date": str(a.date), "count": a.count} for a in activity if a.date
    ]

    return {
        "total_courses": total_courses,
        "total_lessons_completed": total_lessons_completed,
        "total_submissions": submissions_count,
        "activity": activity_data,
    }


@router.get(
    "/teacher",
    summary="Get teacher management analytics",
    description="Calculates teacher metrics including student count, active assignments, and on-time vs late submissions.",
    responses={
        200: {"description": "Teacher analytics calculated"},
        403: {"description": "Teacher privileges required"},
    },
)
async def get_teacher_analytics(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> Dict[str, Any]:
    """Aggregates pedagogical and submission metrics for the teacher dashboard asynchronously."""
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )

    stmt_st = select(func.count(models.TeacherStudent.id)).filter(
        models.TeacherStudent.teacher_id == current_user.id
    )
    res_st = await db.execute(stmt_st)
    total_students = res_st.scalar() or 0

    stmt_as_count = select(func.count(models.CourseAssignment.id)).filter(
        models.CourseAssignment.teacher_id == current_user.id
    )
    res_as_count = await db.execute(stmt_as_count)
    active_assignments = res_as_count.scalar() or 0

    stmt_as = select(models.CourseAssignment).filter(
        models.CourseAssignment.teacher_id == current_user.id
    )
    res_as = await db.execute(stmt_as)
    teacher_assignments = res_as.scalars().all()

    assigned_student_ids = [a.student_id for a in teacher_assignments]
    assigned_course_ids = [a.course_id for a in teacher_assignments]

    submissions_count = 0
    on_time = 0
    late = 0

    if assigned_student_ids and assigned_course_ids:
        stmt_lessons = select(models.Lesson.id).filter(
            models.Lesson.course_id.in_(assigned_course_ids)
        )
        res_lessons = await db.execute(stmt_lessons)
        lesson_ids = res_lessons.scalars().all()

        if lesson_ids:
            stmt_sub_count = select(func.count(models.HomeworkSubmission.id)).filter(
                models.HomeworkSubmission.student_id.in_(assigned_student_ids),
                models.HomeworkSubmission.lesson_id.in_(lesson_ids),
            )
            res_sub_count = await db.execute(stmt_sub_count)
            submissions_count = res_sub_count.scalar() or 0

            stmt_subs = select(models.HomeworkSubmission).filter(
                models.HomeworkSubmission.student_id.in_(assigned_student_ids),
                models.HomeworkSubmission.lesson_id.in_(lesson_ids),
            )
            res_subs = await db.execute(stmt_subs)
            submissions = res_subs.scalars().all()

            stmt_deadlines = (
                select(models.AssignmentDeadline)
                .join(models.CourseAssignment)
                .options(joinedload(models.AssignmentDeadline.assignment))
                .filter(
                    models.CourseAssignment.student_id.in_(assigned_student_ids),
                    models.AssignmentDeadline.lesson_id.in_(lesson_ids),
                )
            )
            res_deadlines = await db.execute(stmt_deadlines)
            deadlines = res_deadlines.scalars().all()

            deadline_map = {
                (d.assignment.student_id, d.lesson_id): d.deadline
                for d in deadlines
                if d.assignment
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
            {"name": "Late", "value": late},
        ],
    }
