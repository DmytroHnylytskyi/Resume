"""Asynchronous Database Engine & Session Management Module.

Configures SQLAlchemy 2.0 AsyncEngine, AsyncSession factory, and connection pooling
supporting PostgreSQL (asyncpg) for Production and SQLite (aiosqlite) for Local Development & Testing.
"""

import os
from typing import AsyncGenerator
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

load_dotenv()

RAW_DB_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

# Convert standard database URLs to async driver schemes if needed
if RAW_DB_URL.startswith("sqlite:///"):
    ASYNC_DATABASE_URL = RAW_DB_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
elif RAW_DB_URL.startswith("postgresql://"):
    ASYNC_DATABASE_URL = RAW_DB_URL.replace("postgresql://", "postgresql+asyncpg://")
elif RAW_DB_URL.startswith("postgres://"):
    ASYNC_DATABASE_URL = RAW_DB_URL.replace("postgres://", "postgresql+asyncpg://")
else:
    ASYNC_DATABASE_URL = RAW_DB_URL

# SQLite connect arguments
connect_args = (
    {"check_same_thread": False}
    if ASYNC_DATABASE_URL.startswith("sqlite")
    else {}
)

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an asynchronous database session.

    Ensures that each HTTP request operates within its own non-blocking
    AsyncSession and guarantees session closure and rollback on exception.

    Yields:
        AsyncSession: Active SQLAlchemy async session instance.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
