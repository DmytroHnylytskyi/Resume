"""Pydantic Validation & Serialization Schemas Module.

Defines standard request and response data contracts for API endpoints across
the Lumina educational platform.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class LessonBase(BaseModel):
    """Base lesson schema."""

    title: str = Field(..., description="Lesson title", min_length=1, max_length=200)
    content: str = Field(..., description="Lesson content or lecture notes")
    video_url: Optional[str] = Field(None, description="URL of primary video or embedded resource")
    attachments: Optional[List[Any]] = Field(default_factory=list, description="Array of attachment file objects")
    resource_type: Optional[str] = Field("video", description="Resource type: video, pdf, gdrive, meeting, document, text, link")
    deadline: Optional[datetime] = Field(None, description="Assigned lesson deadline if applicable")


class Lesson(LessonBase):
    """Lesson schema with database identifiers."""

    id: int = Field(..., description="Unique lesson database ID")
    course_id: int = Field(..., description="Parent course database ID")

    model_config = ConfigDict(from_attributes=True)


class CourseBase(BaseModel):
    """Base course metadata schema."""

    title: str = Field(..., description="Course title", min_length=1, max_length=200)
    description: str = Field(..., description="Course curriculum overview description")
    image_url: Optional[str] = Field(None, description="Cover image thumbnail URL")
    is_personal: Optional[bool] = Field(False, description="Whether this is a private personal self-study course")
    author_id: Optional[int] = Field(None, description="Author teacher user ID")


class LessonCreate(BaseModel):
    """Schema for creating a lesson within a course."""

    title: str = Field(..., description="Lesson title")
    content: str = Field(..., description="Lesson notes or instructions")
    video_url: Optional[str] = Field(None, description="Media or external resource URL")
    attachments: Optional[List[Any]] = Field(default_factory=list, description="List of attachment objects")
    resource_type: Optional[str] = Field(None, description="Optional resource type override")


class CourseCreate(BaseModel):
    """Schema for creating a new course."""

    title: str = Field(..., description="Course title")
    description: str = Field(..., description="Course overview")
    image_url: Optional[str] = Field(None, description="Cover image URL")
    is_personal: Optional[bool] = Field(False, description="Whether this is a private personal self-study course")
    lessons: List[LessonCreate] = Field(default_factory=list, description="List of module lessons")


class LessonUpdate(BaseModel):
    """Schema for updating an existing lesson or creating a new one in an update payload."""

    id: Optional[int] = Field(None, description="Existing lesson ID if updating")
    title: str = Field(..., description="Lesson title")
    content: str = Field(..., description="Lesson content")
    video_url: Optional[str] = Field(None, description="Media URL")
    attachments: Optional[List[Any]] = Field(default_factory=list, description="Attachments")
    resource_type: Optional[str] = Field(None, description="Resource type override")


class CourseUpdate(BaseModel):
    """Schema for updating course metadata and lesson modules."""

    title: str = Field(..., description="Updated title")
    description: str = Field(..., description="Updated description")
    image_url: Optional[str] = Field(None, description="Updated cover image URL")
    is_personal: Optional[bool] = Field(False, description="Whether this is a private personal self-study course")
    lessons: List[LessonUpdate] = Field(default_factory=list, description="Updated lessons list")


class Course(CourseBase):
    """Full course schema with attached lesson objects."""

    id: int = Field(..., description="Unique course database ID")
    lessons: List[Lesson] = Field(default_factory=list, description="List of lesson entities")

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Plaintext password", min_length=6)
    role: Optional[str] = Field("student", description="Role: 'student' or 'teacher'")


class UserResponse(BaseModel):
    """Public user profile schema."""

    id: int = Field(..., description="User database ID")
    email: str = Field(..., description="User email address")
    role: str = Field(..., description="Assigned role ('student' or 'teacher')")

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """OAuth2 JWT access token schema."""

    access_token: str = Field(..., description="Signed JWT access token string")
    token_type: str = Field("bearer", description="Token authorization type")
    refresh_token: Optional[str] = Field(None, description="Long-lived signed refresh token string")


class RefreshTokenRequest(BaseModel):
    """Request payload to renew access token."""

    refresh_token: str = Field(..., description="Long-lived JWT refresh token")


class ScheduleCreate(BaseModel):
    """Schema for creating a course study schedule."""

    scheduled_date: datetime = Field(..., description="Scheduled study session datetime")


class ScheduleResponse(BaseModel):
    """Schedule event response schema."""

    id: int = Field(..., description="Schedule record ID")
    course_id: int = Field(..., description="Scheduled course ID")
    scheduled_date: datetime = Field(..., description="Scheduled study session datetime")

    model_config = ConfigDict(from_attributes=True)


class ProgressUpdate(BaseModel):
    """Schema for marking lesson progress."""

    is_completed: bool = Field(..., description="Completion state")


class ProgressResponse(BaseModel):
    """Lesson progress response schema."""

    lesson_id: int = Field(..., description="Lesson ID")
    is_completed: bool = Field(..., description="Completion state")
    completed_at: Optional[datetime] = Field(None, description="UTC completion timestamp")

    model_config = ConfigDict(from_attributes=True)


class MyProgressResponse(BaseModel):
    """Aggregated student progress and schedules response."""

    schedules: List[ScheduleResponse] = Field(default_factory=list, description="Active study schedules")
    progress: List[ProgressResponse] = Field(default_factory=list, description="Lesson completion states")

    model_config = ConfigDict(from_attributes=True)


class AddStudentRequest(BaseModel):
    """Request payload to add a student to teacher roster."""

    email: str = Field(..., description="Email address of student to add")


class StudentResponse(BaseModel):
    """Student profile response schema."""

    id: int = Field(..., description="Student user ID")
    email: str = Field(..., description="Student email address")
    role: str = Field(..., description="Role string")

    model_config = ConfigDict(from_attributes=True)


class AssignCourseRequest(BaseModel):
    """Request payload for assigning a course to a student."""

    student_id: int = Field(..., description="Target student user ID")
    course_id: int = Field(..., description="Target course database ID")
    deadlines: Optional[Dict[int, datetime]] = Field(None, description="Mapping of lesson_id to due datetime")


class AssignmentResponse(BaseModel):
    """Course assignment response schema."""

    id: int = Field(..., description="Assignment ID")
    teacher_id: int = Field(..., description="Assigning teacher ID")
    student_id: int = Field(..., description="Target student ID")
    course_id: int = Field(..., description="Assigned course ID")
    assigned_at: datetime = Field(..., description="Timestamp of assignment")
    student_email: Optional[str] = Field(None, description="Student email")
    course_title: Optional[str] = Field(None, description="Course title")

    model_config = ConfigDict(from_attributes=True)


class HomeworkSubmissionCreate(BaseModel):
    """Payload for submitting homework."""

    content: Optional[str] = Field(None, description="Text answer or notes")
    attachments: Optional[List[Any]] = Field(default_factory=list, description="Attached file objects")


class HomeworkSubmissionOut(BaseModel):
    """Homework submission output schema."""

    id: int = Field(..., description="Submission ID")
    student_id: int = Field(..., description="Submitting student ID")
    lesson_id: int = Field(..., description="Target lesson ID")
    content: Optional[str] = Field(None, description="Submitted text answer")
    attachments: List[Any] = Field(default_factory=list, description="List of attached files")
    submitted_at: datetime = Field(..., description="Submission timestamp")
    student_email: Optional[str] = Field(None, description="Submitting student email")
    lesson_title: Optional[str] = Field(None, description="Lesson title")
    course_title: Optional[str] = Field(None, description="Course title")

    model_config = ConfigDict(from_attributes=True)
