"""
Database Engine & Async Session Management Module for TerraScope.

Configures:
    - Async SQLAlchemy 2.0 engine (supporting sqlite+aiosqlite and postgresql+asyncpg).
    - Async session factory (async_sessionmaker[AsyncSession]).
    - Declarative ORM base class.
    - Async generator dependency get_db() for FastAPI request session context management.
"""

import os
from pathlib import Path
from typing import AsyncGenerator
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = f"sqlite+aiosqlite:///{BASE_DIR / 'sql_app.db'}"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_PATH)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("sqlite://") and not DATABASE_URL.startswith("sqlite+aiosqlite://"):
    DATABASE_URL = DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://", 1)

SCHEMA_NAME = "terrascope"

connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args["check_same_thread"] = False
else:
    connect_args["server_settings"] = {"search_path": f"{SCHEMA_NAME},public"}

engine_kwargs = {
    "echo": False,
    "future": True,
    "connect_args": connect_args,
    "pool_pre_ping": True,
}
if not DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update({
        "pool_size": 3,
        "max_overflow": 2,
        "pool_recycle": 300,
    })

engine = create_async_engine(
    DATABASE_URL,
    **engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI async dependency generator yielding an AsyncSession per HTTP request.

    Ensures that database connections are properly opened, rolled back on exceptions,
    and safely closed in an async with block.

    Yields:
        AsyncSession: Active SQLAlchemy async database session.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
