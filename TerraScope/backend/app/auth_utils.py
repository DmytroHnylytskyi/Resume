"""
Security & Authentication Utilities Module.

Provides direct Bcrypt password hashing, verification, PyJWT token generation,
and FastAPI get_current_user security dependency.
"""

import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from . import database, models

load_dotenv()

# JWT configuration constants
DEFAULT_SECRET = "globescope-super-secret-jwt-key-2026"
SECRET_KEY = os.getenv("SECRET_KEY", DEFAULT_SECRET)
ENV_MODE = os.getenv("ENV_MODE", "development")

if ENV_MODE == "production" and SECRET_KEY == DEFAULT_SECRET:
    raise ValueError("CRITICAL SECURITY ERROR: SECRET_KEY must be set in environment variables for production deployment.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours validity

# OAuth2 Password Bearer scheme endpoint reference
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password string against a stored bcrypt hash.

    Truncates password input to 72 bytes as mandated by the bcrypt specification.

    Args:
        plain_password (str): Raw password string provided by user.
        hashed_password (str): Stored bcrypt hash string from database.

    Returns:
        bool: True if password matches hash, False otherwise.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except (ValueError, TypeError):
        return False

def get_password_hash(password: str) -> str:
    """
    Generates a secure bcrypt hash of a plain text password with salt.

    Args:
        password (str): Plain text user password.

    Returns:
        str: Salted bcrypt hash string.
    """
    if len(password.encode('utf-8')) > 72:
        # Note: Bcrypt specification truncates at 72 bytes
        pass
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a signed OAuth2 JWT access token containing subject data and expiration timestamp.

    Args:
        data (dict): Data payload to encode into JWT token claims.
        expires_delta (Optional[timedelta]): Custom token validity duration.

    Returns:
        str: Encoded JWT token string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
) -> models.User:
    """
    FastAPI Security Dependency validating incoming JWT Bearer tokens.

    Decodes JWT payload, validates subject email claim, and retrieves matching
    User model instance from SQLite database.

    Args:
        token (str): OAuth2 Bearer token string extracted from Authorization header.
        db (Session): Database session dependency.

    Returns:
        models.User: Authenticated SQLAlchemy User model instance.

    Raises:
        HTTPException: 401 Unauthorized error if token signature or user lookup fails.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user
