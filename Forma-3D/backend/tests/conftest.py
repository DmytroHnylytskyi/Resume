"""Pytest Test Configuration & Shared Async Fixtures for Forma-3D.

Provides:
    - In-memory SQLite async test database session fixture.
    - Test application client (httpx.AsyncClient) with dependency override.
    - Utility helpers for user creation and token generation.
"""

from typing import AsyncGenerator
import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Auth modules abort at import time when JWT secrets are missing (fail-fast
# policy), so tests inject fixed test-only keys BEFORE importing the app.
os.environ.setdefault("SECRET_KEY", "test-only-secret-key-not-for-production")

from app.database import Base, get_db
from app.main import app

# In-memory SQLite database connection for isolated testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Creates a fresh in-memory database schema for each test function and tears it down."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Yields an HTTP async client connected to the FastAPI application with mocked database."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()
