"""Authentication & User Profile REST API Router Module.

Handles:
    - User registration (/register)
    - OAuth2 password grant login (/token)
    - Token refresh rotation (/refresh)
    - Current authenticated user profile inspection (/users/me/)

Author: Forma-3D Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from ..database import get_db
from ..models import User
from ..schemas import RefreshTokenRequest, Token, TokenResponse, UserCreate, User as UserSchema

router = APIRouter(tags=["authentication"])


@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED, summary="User registration")
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)) -> User:
    """Registers a new user account with hashed password and unique email constraint."""
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered",
        )

    new_user = User(
        email=user_data.email,
        name=user_data.name if user_data.name else "User",
        hashed_password=get_password_hash(user_data.password),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.post("/token", response_model=Token, summary="OAuth2 password grant login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Authenticates user credentials and issues signed JWT access and refresh tokens."""
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
    }


@router.post("/refresh", response_model=TokenResponse, summary="Refresh JWT access token")
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Issues a new access token using a valid refresh token."""
    token_data = decode_token(payload.refresh_token, expected_type="refresh")

    result = await db.execute(select(User).where(User.email == token_data.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
        )

    new_access_token = create_access_token(data={"sub": user.email})
    new_refresh_token = create_refresh_token(data={"sub": user.email})

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "refresh_token": new_refresh_token,
        "expires_in": 86400,
    }


@router.get("/users/me/", response_model=UserSchema, summary="Get current user profile and projects")
async def read_users_me(current_user: User = Depends(get_current_user)) -> User:
    """Returns profile details and saved 3D project list of the authenticated user."""
    return current_user
