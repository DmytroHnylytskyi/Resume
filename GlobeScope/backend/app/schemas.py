"""
Pydantic Request & Response Validation Schemas Module.

Provides data type contracts for authentication payloads (UserCreate, UserResponse, Token),
saved globe view configuration presets (SavedViewCreate, SavedViewResponse), and cache entries.
"""

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

# --- User Account Schemas ---

class UserBase(BaseModel):
    """Base user schema containing email address string."""
    email: str

class UserCreate(UserBase):
    """Schema for incoming user registration requests with password constraints."""
    password: str = Field(..., min_length=8, max_length=100, description="Plain text password (min 8 characters)")

class UserResponse(UserBase):
    """Schema for user profile responses returned to client."""
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- OAuth2 Authentication & Token Schemas ---

class Token(BaseModel):
    """OAuth2 Bearer access token response payload."""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Decoded JWT payload token data."""
    email: Optional[EmailStr] = None

# --- Saved View Configuration Schemas ---

class SavedViewBase(BaseModel):
    """Base schema for custom 3D globe view configuration presets."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    camera_position: Optional[Union[List[float], Dict[str, Any]]] = None
    camera_target: Optional[Union[List[float], Dict[str, Any]]] = None
    active_layers: Optional[List[str]] = None
    layer_filters: Optional[Dict[str, Any]] = None

class SavedViewCreate(SavedViewBase):
    """Request payload schema for creating a new saved view."""
    pass

class SavedViewUpdate(BaseModel):
    """Request payload schema for updating an existing saved view."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    camera_position: Optional[Union[List[float], Dict[str, Any]]] = None
    camera_target: Optional[Union[List[float], Dict[str, Any]]] = None
    active_layers: Optional[List[str]] = None
    layer_filters: Optional[Dict[str, Any]] = None

class SavedViewResponse(SavedViewBase):
    """Response payload schema returning saved view preset details."""
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Cache Entry Schemas ---

class CacheEntryResponse(BaseModel):
    """Schema representing a database cache entry record."""
    id: int
    cache_key: str
    data: str
    expires_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
