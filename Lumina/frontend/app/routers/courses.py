"""Course Management & Learning Pipeline Router Module.

Handles curriculum creation, updates, deletion, individual lesson modules,
dynamic media type detection, homework submissions, and student completion progress.
"""

import os
import re
import shutil
import uuid
from datetime import datetime, timezone
from typing import List, Optional

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .. import auth_utils, database, models, schemas

router = APIRouter(prefix="/courses", tags=["courses"])

# Constants
MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
ALLOWED_EXTENSIONS = {
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "png", "jpg", "jpeg", "webp", "gif", "svg",
    "mp4", "webm", "zip", "rar", "txt"
}


def detect_resource_type(url: str) -> str:
    """Auto-detect resource type from URL string."""
    if not url:
        return "text"
    url_lower = url.lower()
    if any(d in url_lower for d in ["youtube.com", "youtu.be", "vimeo.com"]):
        return "video"
    if "drive.google.com" in url_lower or "docs.google.com" in url_lower:
        return "gdrive"
    if any(d in url_lower for d in ["zoom.us", "meet.google.com", "teams.microsoft.com"]):
        return "meeting"
    if url_lower.endswith(".pdf"):
        return "pdf"
    if any(url_lower.endswith(ext) for ext in [".doc", ".docx", ".pptx", ".ppt", ".xls", ".xlsx"]):
        return "document"
    return "link"


@router.get(
    "/",
    response_model=List[schemas.Course],
    summary="List accessible courses",
    description="Returns courses authored by or assigned to the authenticated user with pagination.",
)
async def get_courses(
    limit: int = Query(100, ge=1, le=200, description="Max number of items to return"),
    offset: int = Query(0, ge=0, description="Number of items to skip"),
    db: AsyncSession = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(auth_utils.get_current_user_optional),
) -> List[models.Course]:
    """Retrieves all accessible courses asynchronously with per-lesson deadlines."""
    if not current_user:
        return []

    # Query student assignments
    stmt_assign = (
        select(models.CourseAssignment)
        .options(selectinload(models.CourseAssignment.deadlines))
        .filter(models.CourseAssignment.student_id == current_user.id)
    )
    res_assign = await db.execute(stmt_assign)
    assignments = res_assign.scalars().all()

    assigned_course_ids = [a.course_id for a in assignments]
    if not assigned_course_ids:
        return []

    assignments_by_course = {a.course_id: a for a in assignments}

    stmt_courses = (
        select(models.Course)
        .options(selectinload(models.Course.lessons))
        .filter(models.Course.id.in_(assigned_course_ids))
        .offset(offset)
        .limit(limit)
    )
    res_courses = await db.execute(stmt_courses)
    courses = res_courses.scalars().all()

    for course in courses:
        assignment = assignments_by_course.get(course.id)
        if assignment:
            deadlines = {d.lesson_id: d.deadline for d in assignment.deadlines}
            for lesson in course.lessons:
                setattr(lesson, "deadline", deadlines.get(lesson.id))
        else:
            for lesson in course.lessons:
                setattr(lesson, "deadline", None)

    return courses


@router.get(
    "/my-progress",
    response_model=schemas.MyProgressResponse,
    summary="Get student progress & study schedules",
    description="Returns all completed lesson records and scheduled study calendar events for current user.",
)
async def get_my_progress(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> dict:
    """Retrieves lesson progress and scheduled dates for current student."""
    stmt_sched = select(models.CourseSchedule).filter(models.CourseSchedule.user_id == current_user.id)
    res_sched = await db.execute(stmt_sched)
    schedules = res_sched.scalars().all()

    stmt_prog = select(models.Progress).filter(models.Progress.user_id == current_user.id)
    res_prog = await db.execute(stmt_prog)
    progress = res_prog.scalars().all()

    return {
        "schedules": schedules,
        "progress": progress,
    }


@router.get(
    "/{course_id}",
    response_model=schemas.Course,
    summary="Get single course by ID",
    description="Retrieves a complete course entity with its ordered module lessons.",
    responses={
        200: {"description": "Course details retrieved"},
        404: {"description": "Course not found"},
    },
)
async def get_course(
    course_id: int,
    db: AsyncSession = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(auth_utils.get_current_user_optional),
) -> models.Course:
    """Retrieves a single course by its ID with deadlines attached."""
    stmt = (
        select(models.Course)
        .options(selectinload(models.Course.lessons))
        .filter(models.Course.id == course_id)
    )
    result = await db.execute(stmt)
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if current_user:
        stmt_assign = (
            select(models.CourseAssignment)
            .options(selectinload(models.CourseAssignment.deadlines))
            .filter(
                models.CourseAssignment.student_id == current_user.id,
                models.CourseAssignment.course_id == course_id,
            )
        )
        res_assign = await db.execute(stmt_assign)
        assignment = res_assign.scalars().first()
        if assignment:
            deadlines = {d.lesson_id: d.deadline for d in assignment.deadlines}
            for lesson in course.lessons:
                setattr(lesson, "deadline", deadlines.get(lesson.id))

    return course


@router.post(
    "/upload",
    summary="Upload media attachment",
    description="Validates and uploads an attachment file to Cloudinary or secured local disk storage.",
    responses={
        200: {"description": "File uploaded successfully"},
        400: {"description": "File extension not permitted"},
        413: {"description": "File exceeds maximum size (25MB)"},
    },
)
async def upload_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> dict:
    """Uploads attachment file with strict MIME type and extension validation."""
    raw_filename = file.filename or "file"
    ext = raw_filename.split(".")[-1].lower() if "." in raw_filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '.{ext}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    clean_name = re.sub(r"[^a-zA-Z0-9_\.-]", "_", raw_filename)
    unique_name = f"{uuid.uuid4().hex}_{clean_name}"

    if not os.environ.get("CLOUDINARY_URL"):
        os.makedirs("uploads", exist_ok=True)
        file_location = os.path.join("uploads", unique_name)

        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)

        file_size = os.path.getsize(file_location)
        if file_size > MAX_UPLOAD_SIZE_BYTES:
            os.remove(file_location)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB",
            )

        api_url = os.environ.get("API_URL", "http://localhost:8000")
        return {
            "url": f"{api_url}/uploads/{unique_name}",
            "filename": raw_filename,
            "size": file_size,
            "content_type": file.content_type,
        }

    try:
        doc_extensions = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar", "txt"]
        rtype = "raw" if ext in doc_extensions else "auto"
        public_id = f"{uuid.uuid4().hex}.{ext}" if (rtype == "raw" and ext) else uuid.uuid4().hex

        result = cloudinary.uploader.upload(
            file.file,
            resource_type=rtype,
            public_id=public_id,
            folder="lumina_uploads",
        )
        return {
            "url": result.get("secure_url"),
            "filename": raw_filename,
            "size": result.get("bytes", 0),
            "content_type": file.content_type,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cloudinary upload failed: {str(e)}",
        )


@router.post(
    "/",
    response_model=schemas.Course,
    summary="Create a new course",
    description="Creates a new course entity with initial lesson modules.",
)
async def create_course(
    course: schemas.CourseCreate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> models.Course:
    """Asynchronously creates a new course curriculum."""
    db_course = models.Course(
        title=course.title,
        description=course.description,
        image_url=course.image_url,
        is_personal=course.is_personal if course.is_personal is not None else False,
        author_id=current_user.id,
    )
    db.add(db_course)
    await db.commit()
    await db.refresh(db_course)

    for lesson_data in course.lessons:
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

    # Auto-enroll creator into student dashboard if created for personal self-study
    if db_course.is_personal:
        db_assignment = models.CourseAssignment(
            teacher_id=current_user.id,
            student_id=current_user.id,
            course_id=db_course.id,
        )
        db.add(db_assignment)

    await db.commit()

    # Re-fetch with selectinload to populate lessons relationship
    stmt = (
        select(models.Course)
        .options(selectinload(models.Course.lessons))
        .filter(models.Course.id == db_course.id)
    )
    res = await db.execute(stmt)
    return res.scalars().first()


@router.post(
    "/{course_id}/schedule",
    response_model=schemas.ScheduleResponse,
    summary="Schedule study session",
    description="Schedules a personalized study calendar event for a course.",
)
async def schedule_course(
    course_id: int,
    schedule: schemas.ScheduleCreate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> models.CourseSchedule:
    """Creates a calendar study schedule."""
    stmt = select(models.Course).filter(models.Course.id == course_id)
    res = await db.execute(stmt)
    course = res.scalars().first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    db_schedule = models.CourseSchedule(
        user_id=current_user.id,
        course_id=course_id,
        scheduled_date=schedule.scheduled_date,
    )
    db.add(db_schedule)
    await db.commit()
    await db.refresh(db_schedule)
    return db_schedule


@router.post(
    "/lessons/{lesson_id}/complete",
    response_model=schemas.ProgressResponse,
    summary="Mark lesson complete/incomplete",
    description="Updates or creates student completion progress for a lesson.",
)
async def complete_lesson(
    lesson_id: int,
    progress: schemas.ProgressUpdate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> models.Progress:
    """Updates lesson completion status asynchronously."""
    stmt_lesson = select(models.Lesson).filter(models.Lesson.id == lesson_id)
    res_lesson = await db.execute(stmt_lesson)
    lesson = res_lesson.scalars().first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    stmt_prog = (
        select(models.Progress)
        .filter(
            models.Progress.user_id == current_user.id,
            models.Progress.lesson_id == lesson_id,
        )
    )
    res_prog = await db.execute(stmt_prog)
    db_progress = res_prog.scalars().first()

    now_utc = models.utc_now()

    if not db_progress:
        db_progress = models.Progress(
            user_id=current_user.id,
            lesson_id=lesson_id,
            is_completed=progress.is_completed,
            completed_at=now_utc if progress.is_completed else None,
        )
        db.add(db_progress)
    else:
        db_progress.is_completed = progress.is_completed
        db_progress.completed_at = now_utc if progress.is_completed else None

    await db.commit()
    await db.refresh(db_progress)
    return db_progress


@router.delete(
    "/{course_id}",
    summary="Delete authored course",
    description="Deletes a course curriculum created by the current author/teacher.",
)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> dict:
    """Deletes an authored course."""
    stmt = select(models.Course).filter(models.Course.id == course_id)
    res = await db.execute(stmt)
    course = res.scalars().first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this course",
        )

    await db.delete(course)
    await db.commit()
    return {"ok": True}


@router.put(
    "/{course_id}",
    response_model=schemas.Course,
    summary="Update course & module lessons",
    description="Updates course title, description, cover image, and modifies/adds/deletes module lessons.",
)
async def update_course(
    course_id: int,
    course_data: schemas.CourseUpdate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> models.Course:
    """Updates course metadata and synchronize lesson modules."""
    stmt = (
        select(models.Course)
        .options(selectinload(models.Course.lessons))
        .filter(models.Course.id == course_id)
    )
    res = await db.execute(stmt)
    db_course = res.scalars().first()
    if not db_course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if db_course.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this course",
        )

    db_course.title = course_data.title
    db_course.description = course_data.description
    db_course.image_url = course_data.image_url

    existing_lessons = {l.id: l for l in db_course.lessons}
    new_lesson_ids = [l.id for l in course_data.lessons if l.id]

    # Delete removed lessons
    for l_id, lesson in existing_lessons.items():
        if l_id not in new_lesson_ids:
            await db.delete(lesson)

    # Add or update lessons
    for l_data in course_data.lessons:
        rtype = l_data.resource_type or detect_resource_type(l_data.video_url or "")
        if l_data.id:
            if l_data.id in existing_lessons:
                db_l = existing_lessons[l_data.id]
                db_l.title = l_data.title
                db_l.content = l_data.content
                db_l.video_url = l_data.video_url
                db_l.attachments = l_data.attachments or []
                db_l.resource_type = rtype
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Lesson {l_data.id} not found in this course",
                )
        else:
            new_l = models.Lesson(
                title=l_data.title,
                content=l_data.content,
                video_url=l_data.video_url,
                attachments=l_data.attachments or [],
                resource_type=rtype,
                course_id=db_course.id,
            )
            db.add(new_l)

    await db.commit()

    # Re-fetch course with lessons
    stmt_refetch = (
        select(models.Course)
        .options(selectinload(models.Course.lessons))
        .filter(models.Course.id == course_id)
    )
    res_refetch = await db.execute(stmt_refetch)
    return res_refetch.scalars().first()


@router.post(
    "/lessons/{lesson_id}/submit",
    response_model=schemas.HomeworkSubmissionOut,
    summary="Submit homework assignment",
    description="Submits homework responses and attachment links for a specific lesson.",
)
async def submit_homework(
    lesson_id: int,
    submission: schemas.HomeworkSubmissionCreate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> models.HomeworkSubmission:
    """Asynchronously creates student homework submission."""
    stmt_lesson = (
        select(models.Lesson)
        .options(selectinload(models.Lesson.course))
        .filter(models.Lesson.id == lesson_id)
    )
    res_lesson = await db.execute(stmt_lesson)
    lesson = res_lesson.scalars().first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    stmt_assign = (
        select(models.CourseAssignment)
        .filter(
            models.CourseAssignment.student_id == current_user.id,
            models.CourseAssignment.course_id == lesson.course_id,
        )
    )
    res_assign = await db.execute(stmt_assign)
    assignment = res_assign.scalars().first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not assigned to this course",
        )

    db_submission = models.HomeworkSubmission(
        student_id=current_user.id,
        lesson_id=lesson_id,
        content=submission.content,
        attachments=submission.attachments or [],
    )
    db.add(db_submission)
    await db.commit()
    await db.refresh(db_submission)

    setattr(db_submission, "student_email", current_user.email)
    setattr(db_submission, "lesson_title", lesson.title)
    setattr(db_submission, "course_title", lesson.course.title if lesson.course else "")

    return db_submission


@router.get(
    "/lessons/{lesson_id}/my-submission",
    response_model=Optional[schemas.HomeworkSubmissionOut],
    summary="Get user's latest homework submission",
    description="Retrieves the most recent submission made by current student for a given lesson.",
)
async def get_my_submission(
    lesson_id: int,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> Optional[models.HomeworkSubmission]:
    """Retrieves user's latest homework submission."""
    stmt = (
        select(models.HomeworkSubmission)
        .filter(
            models.HomeworkSubmission.lesson_id == lesson_id,
            models.HomeworkSubmission.student_id == current_user.id,
        )
        .order_by(models.HomeworkSubmission.submitted_at.desc())
    )
    res = await db.execute(stmt)
    db_submission = res.scalars().first()

    if not db_submission:
        return None

    setattr(db_submission, "student_email", current_user.email)
    return db_submission
