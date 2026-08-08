from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload
from .. import models, schemas, database, auth_utils
from typing import List, Optional
import uuid
import shutil
from datetime import datetime
import os
import cloudinary
import cloudinary.uploader

# The Cloudinary Python SDK will automatically pick up the CLOUDINARY_URL env variable

router = APIRouter(prefix="/courses", tags=["courses"])

@router.get("/", response_model=List[schemas.Course])
def get_courses(
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(auth_utils.get_current_user_optional)
):
    if not current_user:
        return []
        
    assignments = db.query(models.CourseAssignment).options(
        selectinload(models.CourseAssignment.deadlines)
    ).filter(
        models.CourseAssignment.student_id == current_user.id
    ).all()
    assigned_course_ids = [a.course_id for a in assignments]
    assignments_by_course = {a.course_id: a for a in assignments}
    
    # Include courses authored by the user or assigned to the user
    conditions = [models.Course.author_id == current_user.id]
    if assigned_course_ids:
        conditions.append(models.Course.id.in_(assigned_course_ids))

    courses = db.query(models.Course).options(
        selectinload(models.Course.lessons)
    ).filter(or_(*conditions)).all()
    
    for course in courses:
        assignment = assignments_by_course.get(course.id)
        if assignment:
            deadlines = {d.lesson_id: d.deadline for d in assignment.deadlines}
            for lesson in course.lessons:
                setattr(lesson, 'deadline', deadlines.get(lesson.id))
        else:
            for lesson in course.lessons:
                setattr(lesson, 'deadline', None)
                
    return courses
def detect_resource_type(url: str) -> str:
    """Auto-detect resource type from URL."""
    if not url:
        return "text"
    url_lower = url.lower()
    if any(d in url_lower for d in ['youtube.com', 'youtu.be']):
        return "video"
    if 'drive.google.com' in url_lower or 'docs.google.com' in url_lower:
        return "gdrive"
    if any(d in url_lower for d in ['zoom.us', 'meet.google.com', 'teams.microsoft.com']):
        return "meeting"
    if url_lower.endswith('.pdf'):
        return "pdf"
    if any(url_lower.endswith(ext) for ext in ['.doc', '.docx', '.pptx', '.ppt', '.xls', '.xlsx']):
        return "document"
    return "link"

@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    # Check if Cloudinary is configured
    if not os.environ.get("CLOUDINARY_URL"):
        # Fallback to local storage if Cloudinary is not set up
        ext = file.filename.split(".")[-1] if "." in file.filename else ""
        filename = f"{uuid.uuid4().hex}.{ext}"
        os.makedirs("uploads", exist_ok=True)
        file_location = f"uploads/{filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        
        file_size = os.path.getsize(file_location)
        api_url = os.environ.get("API_URL", "http://localhost:8000")
        return {
            "url": f"{api_url}/uploads/{filename}",
            "filename": file.filename,
            "size": file_size,
            "content_type": file.content_type
        }

    # Upload to Cloudinary
    try:
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        # Force documents to be uploaded as 'raw' to avoid Cloudinary image-processing restrictions
        doc_extensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'txt']
        rtype = "raw" if ext in doc_extensions else "auto"
        
        # Generate a unique public_id. For raw files, Cloudinary needs the extension in the public_id
        import uuid
        unique_id = uuid.uuid4().hex
        public_id = f"{unique_id}.{ext}" if (rtype == "raw" and ext) else unique_id

        result = cloudinary.uploader.upload(
            file.file, 
            resource_type=rtype,
            public_id=public_id,
            folder="minilms_uploads"
        )
        return {
            "url": result.get("secure_url"),
            "filename": file.filename,
            "size": result.get("bytes", 0),
            "content_type": file.content_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {str(e)}")

@router.post("/", response_model=schemas.Course)
def create_course(
    course: schemas.CourseCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    db_course = models.Course(
        title=course.title,
        description=course.description,
        image_url=course.image_url,
        author_id=current_user.id
    )
    db.add(db_course)
    db.commit()
    db.refresh(db_course)

    for lesson_data in course.lessons:
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
    db.refresh(db_course)
    return db_course

@router.post("/{course_id}/schedule", response_model=schemas.ScheduleResponse)
def schedule_course(
    course_id: int, 
    schedule: schemas.ScheduleCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_schedule = models.CourseSchedule(
        user_id=current_user.id,
        course_id=course_id,
        scheduled_date=schedule.scheduled_date
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@router.post("/lessons/{lesson_id}/complete", response_model=schemas.ProgressResponse)
def complete_lesson(
    lesson_id: int,
    progress: schemas.ProgressUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    db_progress = db.query(models.Progress).filter(
        models.Progress.user_id == current_user.id,
        models.Progress.lesson_id == lesson_id
    ).first()

    if not db_progress:
        db_progress = models.Progress(
            user_id=current_user.id,
            lesson_id=lesson_id,
            is_completed=progress.is_completed,
            completed_at=datetime.utcnow() if progress.is_completed else None
        )
        db.add(db_progress)
    else:
        db_progress.is_completed = progress.is_completed
        db_progress.completed_at = datetime.utcnow() if progress.is_completed else None

    db.commit()
    db.refresh(db_progress)
    return db_progress

@router.get("/my-progress")
def get_my_progress(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    schedules = db.query(models.CourseSchedule).filter(models.CourseSchedule.user_id == current_user.id).all()
    progress = db.query(models.Progress).filter(models.Progress.user_id == current_user.id).all()
    
    return {
        "schedules": schedules,
        "progress": progress
    }

@router.delete("/{course_id}")
def delete_course(
    course_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this course")
    
    db.delete(course)
    db.commit()
    return {"ok": True}

@router.put("/{course_id}", response_model=schemas.Course)
def update_course(
    course_id: int,
    course_data: schemas.CourseUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    db_course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    if db_course.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this course")
        
    db_course.title = course_data.title
    db_course.description = course_data.description
    db_course.image_url = course_data.image_url
    
    existing_lessons = {l.id: l for l in db_course.lessons}
    new_lesson_ids = [l.id for l in course_data.lessons if l.id]
    
    # Delete removed lessons
    for l_id, lesson in existing_lessons.items():
        if l_id not in new_lesson_ids:
            db.delete(lesson)
            
    # Add or update lessons
    for l_data in course_data.lessons:
        rtype = l_data.resource_type or detect_resource_type(l_data.video_url or "")
        if l_data.id:
            if l_data.id in existing_lessons:
                db_l = existing_lessons[l_data.id]
                db_l.title = l_data.title
                db_l.content = l_data.content
                db_l.video_url = l_data.video_url
                db_l.attachments = l_data.attachments
                db_l.resource_type = rtype
            else:
                raise HTTPException(status_code=400, detail=f"Lesson {l_data.id} not found in this course")
        else:
            new_l = models.Lesson(
                title=l_data.title,
                content=l_data.content,
                video_url=l_data.video_url,
                attachments=l_data.attachments,
                resource_type=rtype,
                course_id=db_course.id
            )
            db.add(new_l)
            
    db.commit()
    db.refresh(db_course)
    return db_course

@router.post("/lessons/{lesson_id}/submit", response_model=schemas.HomeworkSubmissionOut)
def submit_homework(
    lesson_id: int,
    submission: schemas.HomeworkSubmissionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Check if student is assigned to this course
    assignment = db.query(models.CourseAssignment).filter(
        models.CourseAssignment.student_id == current_user.id,
        models.CourseAssignment.course_id == lesson.course_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=403, detail="Not assigned to this course")
        
    db_submission = models.HomeworkSubmission(
        student_id=current_user.id,
        lesson_id=lesson_id,
        content=submission.content,
        attachments=submission.attachments
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    
    # Enrich response
    setattr(db_submission, 'student_email', current_user.email)
    setattr(db_submission, 'lesson_title', lesson.title)
    setattr(db_submission, 'course_title', lesson.course.title)
    
    return db_submission

@router.get("/lessons/{lesson_id}/my-submission", response_model=Optional[schemas.HomeworkSubmissionOut])
def get_my_submission(
    lesson_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    db_submission = db.query(models.HomeworkSubmission).filter(
        models.HomeworkSubmission.lesson_id == lesson_id,
        models.HomeworkSubmission.student_id == current_user.id
    ).order_by(models.HomeworkSubmission.submitted_at.desc()).first()
    
    if not db_submission:
        return None
        
    setattr(db_submission, 'student_email', current_user.email)
    return db_submission
