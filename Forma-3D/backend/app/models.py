"""SQLAlchemy Relational ORM Database Models Module.

Defines:
    - User model (users table: authentication credentials, profile metadata, projects relationship).
    - Project model (projects table: project name, JSON layout data, creation/update timestamps, user_id foreign key).

Author: 3D Furniture Configurator Team
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


def get_utc_now() -> datetime:
    """Returns current UTC timestamp without timezone offset issues."""
    return datetime.now(timezone.utc)


class User(Base):
    """User account database model representation."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False, default="User")
    hashed_password = Column(String(255), nullable=False)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}')>"


class Project(Base):
    """3D Scene Project database model representation."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    data = Column(Text, nullable=False)  # JSON string payload of 3D placed objects
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    owner = relationship("User", back_populates="projects", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name='{self.name}', user_id={self.user_id})>"

