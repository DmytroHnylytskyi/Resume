"""
Authentication Endpoints Sub-Router Module for TerraScope.

Provides async endpoints for user registration (/register), OAuth2 password token login (/token),
token refresh (/refresh), and current profile lookup (/me).

Author: TerraScope 3D Geospatial Intelligence Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta

from .. import models, schemas, database, auth_utils

router = APIRouter(tags=["auth"])

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: schemas.UserCreate, db: AsyncSession = Depends(database.get_db)):
    """
    Registers a new user account with email and password.

    Validates that the email is unique, hashes password using Bcrypt, and saves
    the user record to SQLite database.

    Args:
        user_in (schemas.UserCreate): User registration input payload.
        db (AsyncSession): Async database session dependency.

    Returns:
        schemas.UserResponse: Created user profile object.

    Raises:
        HTTPException: 400 Bad Request if email address is already registered.
    """
    result = await db.execute(select(models.User).where(models.User.email == user_in.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = auth_utils.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(database.get_db)
):
    """
    Authenticates user credentials and issues an OAuth2 JWT Bearer access token.

    Args:
        form_data (OAuth2PasswordRequestForm): Standard OAuth2 form containing username (email) and password.
        db (AsyncSession): Async database session dependency.

    Returns:
        dict: Access token string and token_type ('bearer').

    Raises:
        HTTPException: 401 Unauthorized if authentication fails.
    """
    result = await db.execute(select(models.User).where(models.User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/refresh", response_model=schemas.Token)
async def refresh_access_token(
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Refreshes active JWT session token for authenticated user.
    
    Returns:
        dict: Fresh JWT token string and token_type.
    """
    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_token = auth_utils.create_access_token(
        data={"sub": current_user.email},
        expires_delta=access_token_expires
    )
    return {"access_token": new_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(auth_utils.get_current_user)):
    """
    Retrieves profile details of the currently authenticated user.

    Args:
        current_user (models.User): Authenticated user model provided by dependency.

    Returns:
        schemas.UserResponse: Current user profile object.
    """
    return current_user
