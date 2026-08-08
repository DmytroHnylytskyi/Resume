"""
Pydantic v2 Data Validation & Serialization Schemas Module.

Defines:
    - ProjectBase, ProjectCreate, ProjectResponse schemas.
    - UserBase, UserCreate, User schemas.
    - Token and TokenData JWT payload schemas.

Author: 3D Furniture Configurator Team
"""

from datetime import datetime
from pydantic import BaseModel


class ProjectBase(BaseModel):
    """Base schema attributes for a 3D scene project."""
    name: str
    data: str  # Serialized JSON string of placed 3D objects


class ProjectCreate(ProjectBase):
    """Schema payload for creating a new project."""
    pass


class ProjectResponse(ProjectBase):
    """Response schema returned for saved project queries."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    """Base user profile schema."""
    email: str
    name: str = "Користувач"


class UserCreate(UserBase):
    """Registration request payload containing user password."""
    password: str


class User(UserBase):
    """User response schema including ID and associated project records."""
    id: int
    projects: list[ProjectResponse] = []

    class Config:
        from_attributes = True


class Token(BaseModel):
    """OAuth2 access token response schema."""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Decoded JWT payload data containing user email claim."""
    email: str | None = None
