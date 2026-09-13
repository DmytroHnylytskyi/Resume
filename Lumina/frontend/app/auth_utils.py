"""Authentication & Security Utilities Module.

Provides cryptographic password hashing via bcrypt, signed JWT access and refresh
token generation, and non-blocking asynchronous user authentication dependencies.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from . import database, models

load_dotenv()

# JWT configuration. The signing keys are mandatory: silently falling back
# to hard-coded secrets would let a misconfigured deployment sign forgeable
# tokens, so the process refuses to start without them.
def _required_secret(name: str) -> str:
    """Returns the mandatory environment variable or aborts at startup."""
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"Environment variable {name} is required but not set. "
            'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(48))"'
        )
    return value

SECRET_KEY = _required_secret("SECRET_KEY")
REFRESH_SECRET_KEY = _required_secret("REFRESH_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))  # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against its bcrypt hash.

    Args:
        plain_password (str): The candidate plaintext password.
        hashed_password (str): The stored bcrypt hash string.

    Returns:
        bool: True if password matches, False otherwise.
    """
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    """Generates a secure bcrypt password hash.

    Args:
        password (str): Plaintext password to hash.

    Returns:
        str: Bcrypt hash string.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a signed short-lived JWT access token.

    Args:
        data (dict): Payload dictionary (must contain 'sub').
        expires_delta (timedelta, optional): Custom expiration duration.

    Returns:
        str: Encoded JWT token string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a signed long-lived JWT refresh token for session renewal.

    Args:
        data (dict): Payload dictionary.
        expires_delta (timedelta, optional): Custom expiration duration.

    Returns:
        str: Encoded JWT refresh token string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(database.get_db),
) -> models.User:
    """FastAPI async dependency extracting and validating authenticated user from Bearer token.

    Args:
        token (str): JWT token provided in Authorization header.
        db (AsyncSession): Asynchronous database session.

    Returns:
        models.User: Authenticated database user record.

    Raises:
        HTTPException(401): If token is invalid, expired, or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    stmt = select(models.User).filter(models.User.email == email)
    result = await db.execute(stmt)
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(database.get_db),
) -> Optional[models.User]:
    """FastAPI async dependency optionally resolving user if a Bearer token is present.

    Args:
        token (str, optional): Optional Bearer token string.
        db (AsyncSession): Asynchronous database session.

    Returns:
        models.User | None: User entity if token is valid, None otherwise.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None

    stmt = select(models.User).filter(models.User.email == email)
    result = await db.execute(stmt)
    return result.scalars().first()
