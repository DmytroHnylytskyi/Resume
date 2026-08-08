from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="student")
    
    progress = relationship("Progress", back_populates="user")
    schedules = relationship("CourseSchedule", back_populates="user")
    
    # Teacher relationships
    students = relationship("TeacherStudent", foreign_keys="TeacherStudent.teacher_id", back_populates="teacher")
    teachers = relationship("TeacherStudent", foreign_keys="TeacherStudent.student_id", back_populates="student")

class TeacherStudent(Base):
    __tablename__ = "teacher_students"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    student_id = Column(Integer, ForeignKey("users.id"))

    teacher = relationship("User", foreign_keys=[teacher_id], back_populates="students")
    student = relationship("User", foreign_keys=[student_id], back_populates="teachers")

class CourseAssignment(Base):
    __tablename__ = "course_assignments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    student_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    assigned_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="assignments")
    deadlines = relationship("AssignmentDeadline", back_populates="assignment", cascade="all, delete-orphan")
    student = relationship("User", foreign_keys=[student_id])

class AssignmentDeadline(Base):
    __tablename__ = "assignment_deadlines"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("course_assignments.id", ondelete="CASCADE"))
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"))
    deadline = Column(DateTime, nullable=False)

    assignment = relationship("CourseAssignment", back_populates="deadlines")
    lesson = relationship("Lesson")

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    image_url = Column(String, nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    lessons = relationship("Lesson", back_populates="course", cascade="all, delete-orphan")
    assignments = relationship("CourseAssignment", back_populates="course", cascade="all, delete-orphan")
    schedules = relationship("CourseSchedule", back_populates="course", cascade="all, delete-orphan")
    author = relationship("User")

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    video_url = Column(String, nullable=True)
    attachments = Column(JSON, default=list) # JSON list of strings
    resource_type = Column(String, default="video")  # video, pdf, gdrive, link, text
    course_id = Column(Integer, ForeignKey("courses.id"))

    course = relationship("Course", back_populates="lessons")
    progress = relationship("Progress", back_populates="lesson", cascade="all, delete-orphan")
    submissions = relationship("HomeworkSubmission", back_populates="lesson", cascade="all, delete-orphan")

class HomeworkSubmission(Base):
    __tablename__ = "homework_submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    lesson_id = Column(Integer, ForeignKey("lessons.id"))
    content = Column(Text, nullable=True)
    attachments = Column(JSON, default=list) # JSON list of strings
    submitted_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User")
    lesson = relationship("Lesson", back_populates="submissions")

class Progress(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    lesson_id = Column(Integer, ForeignKey("lessons.id"))
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="progress")
    lesson = relationship("Lesson", back_populates="progress")

class CourseSchedule(Base):
    __tablename__ = "course_schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    scheduled_date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="schedules")
    course = relationship("Course", back_populates="schedules")
