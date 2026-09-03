"""Authentication Router Module.

Handles user registration, password verification, OAuth2 Bearer token generation,
Refresh token rotation, and asynchronous authenticated user identity resolution.
"""

from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import auth_utils, database, models, schemas

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Registers a new user with an email, password, and assigned role ('student' or 'teacher').",
    responses={
        201: {"description": "User created successfully"},
        400: {"description": "Email is already registered"},
    },
)
async def register(
    user: schemas.UserCreate,
    db: AsyncSession = Depends(database.get_db),
) -> models.User:
    """Asynchronously creates a new user account with a hashed password.

    Args:
        user (schemas.UserCreate): User payload containing email, plaintext password, and role.
        db (AsyncSession): Asynchronous database session.

    Returns:
        models.User: Created database user record.

    Raises:
        HTTPException(400): If the email already exists in the database.
    """
    stmt = select(models.User).filter(models.User.email == user.email)
    result = await db.execute(stmt)
    db_user = result.scalars().first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    hashed_password = auth_utils.get_password_hash(user.password)
    role = user.role if user.role in ("student", "teacher") else "student"
    new_user = models.User(email=user.email, hashed_password=hashed_password, role=role)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.post(
    "/login",
    response_model=schemas.Token,
    summary="User login & token issuance",
    description="Authenticates user credentials and returns signed JWT access and refresh tokens.",
    responses={
        200: {"description": "Authentication successful, tokens returned"},
        401: {"description": "Incorrect email or password"},
    },
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(database.get_db),
) -> dict:
    """Validates user login credentials asynchronously and issues access + refresh tokens.

    Args:
        form_data (OAuth2PasswordRequestForm): Standard OAuth2 form with username (email) and password.
        db (AsyncSession): Asynchronous database session.

    Returns:
        dict: Object containing access_token, refresh_token, and token_type 'bearer'.

    Raises:
        HTTPException(401): If credentials cannot be verified.
    """
    stmt = select(models.User).filter(models.User.email == form_data.username)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    refresh_token = auth_utils.create_refresh_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
    }


@router.post(
    "/refresh",
    response_model=schemas.Token,
    summary="Refresh access token",
    description="Exchanges a valid long-lived refresh token for a newly signed access token.",
    responses={
        200: {"description": "Token renewed successfully"},
        401: {"description": "Invalid or expired refresh token"},
    },
)
async def refresh_token(
    req: schemas.RefreshTokenRequest,
    db: AsyncSession = Depends(database.get_db),
) -> dict:
    """Validates a refresh token and generates a new access token.

    Args:
        req (schemas.RefreshTokenRequest): Payload containing the refresh_token.
        db (AsyncSession): Asynchronous database session.

    Returns:
        dict: Object containing new access_token, refresh_token, and token_type 'bearer'.

    Raises:
        HTTPException(401): If the refresh token is invalid, expired, or user does not exist.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            req.refresh_token,
            auth_utils.REFRESH_SECRET_KEY,
            algorithms=[auth_utils.ALGORITHM],
        )
        email: Optional[str] = payload.get("sub")
        token_type: Optional[str] = payload.get("type")
        if email is None or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    stmt = select(models.User).filter(models.User.email == email)
    result = await db.execute(stmt)
    user = result.scalars().first()
    if not user:
        raise credentials_exception

    new_access_token = auth_utils.create_access_token(data={"sub": user.email})
    new_refresh_token = auth_utils.create_refresh_token(data={"sub": user.email})

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "refresh_token": new_refresh_token,
    }


@router.get(
    "/me",
    response_model=schemas.UserResponse,
    summary="Get current user profile",
    description="Retrieves profile information (ID, email, role) of the currently authenticated user.",
    responses={
        200: {"description": "Profile retrieved successfully"},
        401: {"description": "Invalid or expired JWT token"},
    },
)
async def read_users_me(
    current_user: models.User = Depends(auth_utils.get_current_user),
) -> models.User:
    """Returns the authenticated user extracted from the JWT token.

    Args:
        current_user (models.User): Authenticated user dependency.

    Returns:
        models.User: Current user entity.
    """
    return current_user
