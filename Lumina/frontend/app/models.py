"""Database Models Module.

Defines all SQLAlchemy ORM models representing the relational database schema
for the Lumina educational platform, including user authentication, role-based
permissions, course modules, assignments, deadline tracking, and homework submissions.
"""

from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    """User account model.

    Represents registered users in the platform. Supports role-based access control
    (RBAC) with 'student' and 'teacher' roles.

    Attributes:
        id (int): Primary key identifier.
        email (str): Unique email address used as the login username.
        hashed_password (str): Securely hashed bcrypt password string.
        role (str): Role of user ('student', 'teacher', or 'admin').
        progress (List[Progress]): Relational link to lesson completion records.
        schedules (List[CourseSchedule]): Scheduled calendar study events.
        students (List[TeacherStudent]): Linked students if user is a teacher.
        teachers (List[TeacherStudent]): Linked teachers if user is a student.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="student", nullable=False)

    # Relationships
    progress = relationship("Progress", back_populates="user", cascade="all, delete-orphan")
    schedules = relationship("CourseSchedule", back_populates="user", cascade="all, delete-orphan")

    # Teacher-Student association links
    students = relationship(
        "TeacherStudent",
        foreign_keys="TeacherStudent.teacher_id",
        back_populates="teacher",
        cascade="all, delete-orphan",
    )
    teachers = relationship(
        "TeacherStudent",
        foreign_keys="TeacherStudent.student_id",
        back_populates="student",
        cascade="all, delete-orphan",
    )


class TeacherStudent(Base):
    """Association model linking Teachers with Students in their roster.

    Enables a teacher to manage, assign courses, and monitor progress for specific
    student accounts.

    Attributes:
        id (int): Primary key identifier.
        teacher_id (int): Foreign key to the teacher's User ID.
        student_id (int): Foreign key to the student's User ID.
        teacher (User): Relationship to the teacher user.
        student (User): Relationship to the student user.
    """

    __tablename__ = "teacher_students"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    teacher = relationship("User", foreign_keys=[teacher_id], back_populates="students")
    student = relationship("User", foreign_keys=[student_id], back_populates="teachers")


class CourseAssignment(Base):
    """Course Assignment model.

    Tracks a course assigned by a specific teacher to a student, including individual
    lesson due dates and timestamp of assignment.

    Attributes:
        id (int): Primary key identifier.
        teacher_id (int): Foreign key to the assigning teacher.
        student_id (int): Foreign key to the assigned student.
        course_id (int): Foreign key to the assigned course.
        assigned_at (datetime): Timestamp when the course was assigned.
        course (Course): Relationship to the assigned course.
        deadlines (List[AssignmentDeadline]): Per-lesson due dates.
        student (User): Relationship to the assigned student.
    """

    __tablename__ = "course_assignments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    course = relationship("Course", back_populates="assignments")
    deadlines = relationship("AssignmentDeadline", back_populates="assignment", cascade="all, delete-orphan")
    student = relationship("User", foreign_keys=[student_id])


class AssignmentDeadline(Base):
    """Per-lesson customized deadline for a specific course assignment.

    Attributes:
        id (int): Primary key identifier.
        assignment_id (int): Foreign key to the parent CourseAssignment.
        lesson_id (int): Foreign key to the Lesson being scheduled.
        deadline (datetime): Target completion deadline date/time.
        assignment (CourseAssignment): Relationship to parent assignment.
        lesson (Lesson): Relationship to the scheduled lesson.
    """

    __tablename__ = "assignment_deadlines"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("course_assignments.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    deadline = Column(DateTime, nullable=False)

    assignment = relationship("CourseAssignment", back_populates="deadlines")
    lesson = relationship("Lesson")


class Course(Base):
    """Course educational curriculum entity.

    Represents a full course containing multiple structured lessons and modules.

    Attributes:
        id (int): Primary key identifier.
        title (str): Course name or title.
        description (str): Detailed text description of curriculum.
        image_url (str, optional): URL to course cover thumbnail.
        author_id (int, optional): Foreign key to the author teacher User ID.
        lessons (List[Lesson]): Ordered list of module lessons.
        assignments (List[CourseAssignment]): Assignments linked to this course.
        schedules (List[CourseSchedule]): Calendar study sessions for this course.
        author (User): Relationship to the creating teacher/author.
    """

    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    is_personal = Column(Boolean, default=False, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    lessons = relationship("Lesson", back_populates="course", cascade="all, delete-orphan")
    assignments = relationship("CourseAssignment", back_populates="course", cascade="all, delete-orphan")
    schedules = relationship("CourseSchedule", back_populates="course", cascade="all, delete-orphan")
    author = relationship("User")


class Lesson(Base):
    """Individual educational lesson or module within a course.

    Attributes:
        id (int): Primary key identifier.
        title (str): Title of the lesson.
        content (str): Text, markdown instructions, or lecture notes.
        video_url (str, optional): Primary media URL (YouTube, Vimeo, Google Drive, PDF).
        attachments (JSON): JSON array of attachment file metadata objects.
        resource_type (str): Format category ('video', 'pdf', 'gdrive', 'meeting', 'document', 'text', 'link').
        course_id (int): Foreign key to the parent Course.
        course (Course): Parent course entity.
        progress (List[Progress]): Student completion records for this lesson.
        submissions (List[HomeworkSubmission]): Homework submissions from students.
    """

    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    content = Column(Text, nullable=False)
    video_url = Column(String, nullable=True)
    attachments = Column(JSON, default=list)
    resource_type = Column(String, default="video", nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)

    course = relationship("Course", back_populates="lessons")
    progress = relationship("Progress", back_populates="lesson", cascade="all, delete-orphan")
    submissions = relationship("HomeworkSubmission", back_populates="lesson", cascade="all, delete-orphan")


class HomeworkSubmission(Base):
    """Homework assignment submission created by a student for a lesson.

    Attributes:
        id (int): Primary key identifier.
        student_id (int): Foreign key to the submitting student User ID.
        lesson_id (int): Foreign key to the corresponding Lesson.
        content (str, optional): Student answer text or response notes.
        attachments (JSON): JSON list of uploaded homework file objects.
        submitted_at (datetime): UTC timestamp of submission.
        student (User): Relationship to the submitting student.
        lesson (Lesson): Relationship to the submitted lesson.
    """

    __tablename__ = "homework_submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=True)
    attachments = Column(JSON, default=list)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    student = relationship("User")
    lesson = relationship("Lesson", back_populates="submissions")


class Progress(Base):
    """Student lesson completion status tracking model.

    Attributes:
        id (int): Primary key identifier.
        user_id (int): Foreign key to the student User ID.
        lesson_id (int): Foreign key to the completed Lesson.
        is_completed (bool): Whether the student marked the lesson as completed.
        completed_at (datetime, optional): UTC timestamp of completion.
        user (User): Relationship to the student user.
        lesson (Lesson): Relationship to the completed lesson.
    """

    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="progress")
    lesson = relationship("Lesson", back_populates="progress")


class CourseSchedule(Base):
    """Personalized calendar schedule event for studying a course.

    Attributes:
        id (int): Primary key identifier.
        user_id (int): Foreign key to the User scheduling the session.
        course_id (int): Foreign key to the scheduled Course.
        scheduled_date (datetime): Planned study session date and time.
        user (User): Relationship to the student user.
        course (Course): Relationship to the scheduled course.
    """

    __tablename__ = "course_schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    scheduled_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="schedules")
    course = relationship("Course", back_populates="schedules")
