"""
SQLAlchemy Relational ORM Database Models Module.

Defines:
    - User model (users table: authentication credentials, profile metadata, projects relationship).
    - Project model (projects table: project name, JSON layout data, creation/update timestamps, user_id foreign key).

Author: 3D Furniture Configurator Team
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """
    User account database model representation.

    Attributes:
        id (int): Primary key ID.
        email (str): Unique user email address used as login username.
        name (str): Display name.
        hashed_password (str): Bcrypt/PBKDF2 hashed password string.
        projects (list[Project]): One-to-many relationship linking to owned 3D scene projects.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class Project(Base):
    """
    3D Scene Project database model representation.

    Attributes:
        id (int): Primary key ID.
        name (str): Project title (e.g., "My Gothic Castle").
        data (str): Serialized JSON string representing placed 3D objects, positions, and colors.
        created_at (datetime): Record creation timestamp in UTC.
        updated_at (datetime): Record last update timestamp in UTC.
        user_id (int): Foreign key linking to owner User.id.
        owner (User): Many-to-one relationship reference back to User.
    """
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    data = Column(Text)  # JSON string payload of 3D placed objects
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="projects")
