"""
Authentication and Cryptographic Security Module.

Provides utilities for:
    - Passlib password hashing and verification.
    - PyJWT access token encoding with HS256 algorithm and expiration windows.

Author: 3D Furniture Configurator Team
"""

from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt

# Secret key used for signing JWT tokens (should be set via environment variable in production)
SECRET_KEY = "super-secret-key-for-resume-project"

# JWT Token hashing algorithm
ALGORITHM = "HS256"

# Default token expiration lifespan (7 days)
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

# Cryptographic context configured for PBKDF2 SHA256 password hashing
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a hashed password digest.

    Args:
        plain_password (str): Plain-text password entered by user.
        hashed_password (str): Hashed password digest stored in database.

    Returns:
        bool: True if password matches hash, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Generates a secure password hash digest.

    Args:
        password (str): Plain-text password.

    Returns:
        str: Hashed password string.
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Creates a signed JWT Bearer Access Token.

    Args:
        data (dict): Payload dictionary to encode (e.g. {"sub": email}).
        expires_delta (timedelta | None): Optional custom expiration window.

    Returns:
        str: Encoded JWT token string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
