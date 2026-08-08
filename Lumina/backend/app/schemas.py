from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class LessonBase(BaseModel):
    title: str
    content: str
    video_url: Optional[str] = None
    attachments: Optional[List[Any]] = []
    resource_type: Optional[str] = "video"
    deadline: Optional[datetime] = None

class Lesson(LessonBase):
    id: int
    course_id: int

    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    title: str
    description: str
    image_url: Optional[str] = None
    author_id: Optional[int] = None

class LessonCreate(BaseModel):
    title: str
    content: str
    video_url: Optional[str] = None
    attachments: Optional[List[Any]] = []
    resource_type: Optional[str] = None  # auto-detected if not provided

class CourseCreate(BaseModel):
    title: str
    description: str
    image_url: Optional[str] = None
    lessons: List[LessonCreate] = []

class LessonUpdate(BaseModel):
    id: Optional[int] = None
    title: str
    content: str
    video_url: Optional[str] = None
    attachments: Optional[List[Any]] = []
    resource_type: Optional[str] = None

class CourseUpdate(BaseModel):
    title: str
    description: str
    image_url: Optional[str] = None
    lessons: List[LessonUpdate] = []

class Course(CourseBase):
    id: int
    lessons: List[Lesson] = []

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    password: str
    role: Optional[str] = "student"

class UserResponse(BaseModel):
    id: int
    email: str
    role: str

    class Config:
        from_attributes = True
        
class Token(BaseModel):
    access_token: str
    token_type: str

class ScheduleCreate(BaseModel):
    scheduled_date: datetime

class ScheduleResponse(BaseModel):
    id: int
    course_id: int
    scheduled_date: datetime

    class Config:
        from_attributes = True

class ProgressUpdate(BaseModel):
    is_completed: bool

class ProgressResponse(BaseModel):
    lesson_id: int
    is_completed: bool

    class Config:
        from_attributes = True

# Teacher schemas
class AddStudentRequest(BaseModel):
    email: str

class StudentResponse(BaseModel):
    id: int
    email: str
    role: str

    class Config:
        from_attributes = True

class AssignCourseRequest(BaseModel):
    student_id: int
    course_id: int
    deadlines: Optional[Dict[int, datetime]] = None

class AssignmentResponse(BaseModel):
    id: int
    teacher_id: int
    student_id: int
    course_id: int
    assigned_at: datetime
    student_email: Optional[str] = None
    course_title: Optional[str] = None

    class Config:
        from_attributes = True

class HomeworkSubmissionCreate(BaseModel):
    content: Optional[str] = None
    attachments: Optional[List[Any]] = []

class HomeworkSubmissionOut(BaseModel):
    id: int
    student_id: int
    lesson_id: int
    content: Optional[str] = None
    attachments: List[Any] = []
    submitted_at: datetime
    student_email: Optional[str] = None
    lesson_title: Optional[str] = None
    course_title: Optional[str] = None

    class Config:
        from_attributes = True
