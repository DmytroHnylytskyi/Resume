"""Pydantic v2 Data Validation & Serialization Schemas Module.

Defines:
    - ProjectBase, ProjectCreate, ProjectUpdate, ProjectResponse schemas.
    - UserBase, UserCreate, UserProfile, User schemas.
    - Token, TokenResponse, RefreshTokenRequest, TokenData JWT payload schemas.

Author: Forma-3D Team
"""

import json
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ProjectBase(BaseModel):
    """Base schema attributes for a 3D scene project."""

    name: str = Field(..., min_length=1, max_length=255, description="Project title")
    data: str = Field(..., description="Serialized JSON string of placed 3D objects, coordinates, and colors")

    @field_validator("data")
    @classmethod
    def validate_json_data(cls, v: str) -> str:
        """Ensures that project data payload is valid JSON."""
        try:
            json.loads(v)
        except Exception as e:
            raise ValueError(f"Project data must be a valid JSON string: {e}")
        return v


class ProjectCreate(ProjectBase):
    """Schema payload for creating a new project."""

    pass


class ProjectUpdate(BaseModel):
    """Schema payload for updating an existing project."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    data: Optional[str] = None

    @field_validator("data")
    @classmethod
    def validate_optional_json_data(cls, v: Optional[str]) -> Optional[str]:
        """Ensures that updated project data payload is valid JSON."""
        if v is not None:
            try:
                json.loads(v)
            except Exception as e:
                raise ValueError(f"Project data must be a valid JSON string: {e}")
        return v


class ProjectResponse(ProjectBase):
    """Response schema returned for saved project queries."""

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    """Base user profile schema."""

    email: EmailStr
    name: str = Field("User", max_length=255)


class UserCreate(UserBase):
    """Registration request payload containing user password."""

    password: str = Field(..., min_length=6, description="Plaintext password")


class UserProfile(UserBase):
    """User profile response without projects."""

    id: int

    model_config = ConfigDict(from_attributes=True)


class User(UserBase):
    """Full user response schema including ID and associated project records."""

    id: int
    projects: List[ProjectResponse] = []

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """OAuth2 access token response schema."""

    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None


class TokenResponse(BaseModel):
    """Comprehensive token response with both access and refresh tokens."""

    access_token: str
    token_type: str = "bearer"
    refresh_token: str
    expires_in: int = 86400


class RefreshTokenRequest(BaseModel):
    """Request payload for rotating an expired access token using a refresh token."""

    refresh_token: str


class TokenData(BaseModel):
    """Decoded JWT payload data containing user email and token type claims."""

    email: Optional[str] = None
    token_type: Optional[str] = "access"
