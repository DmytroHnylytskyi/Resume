"""
SQLAlchemy ORM Data Models Module.

Defines database schemas for User authentication profiles, SavedView user presets,
and CacheEntry server-side API response TTL caching.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

def utc_now():
    """Generates timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)

class User(Base):
    """
    User account model storing authentication credentials and profile metadata.

    Attributes:
        id (int): Primary key unique identifier.
        email (str): User email address used for login authentication.
        hashed_password (str): Bcrypt hashed password string.
        created_at (datetime): UTC timestamp of account creation.
        views (relationship): One-to-many relationship with user's SavedView presets.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    # One-to-many relationship mapping user to their saved globe presets
    views = relationship("SavedView", back_populates="user", cascade="all, delete-orphan")

class SavedView(Base):
    """
    SavedView model storing user-customized 3D globe camera targets and active layers.

    Attributes:
        id (int): Primary key unique identifier.
        user_id (int): Foreign key referencing associated user.
        name (str): Custom title for the view preset (e.g. 'Pacific Seismics').
        description (str): Optional description details.
        camera_position (dict): Saved 3D camera spatial coordinates.
        camera_target (dict): Saved camera focus target (lat, lng, zoom).
        active_layers (dict): Active data layers configuration.
        layer_filters (dict): Layer query filter states.
        created_at (datetime): UTC creation timestamp.
    """
    __tablename__ = "saved_views"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    camera_position = Column(JSON, nullable=True)
    camera_target = Column(JSON, nullable=True)
    active_layers = Column(JSON, nullable=True)
    layer_filters = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Many-to-one relationship back to the user owner
    user = relationship("User", back_populates="views")

class CacheEntry(Base):
    """
    CacheEntry model providing database-backed API response caching with TTL.

    Attributes:
        id (int): Primary key unique identifier.
        cache_key (str): Unique cache lookup key (e.g. 'layer_earthquakes_7days_2.5').
        data (str): JSON serialized API response body string.
        expires_at (datetime): Expiration timestamp after which cache item is invalid.
        created_at (datetime): UTC creation timestamp.
    """
    __tablename__ = "cache_entries"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String, unique=True, index=True, nullable=False)
    data = Column(Text, nullable=False)  # JSON string representation
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=utc_now)
