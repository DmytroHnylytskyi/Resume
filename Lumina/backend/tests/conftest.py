"""Pytest Asynchronous Test Configuration & Shared Fixtures.

Configures an isolated in-memory SQLite database using aiosqlite, overrides
the FastAPI get_db dependency, and supplies authenticated async HTTP test clients.
"""

import os
import sys
import pytest
import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Auth modules abort at import time when JWT secrets are missing (fail-fast
# policy), so tests inject fixed test-only keys BEFORE importing the app.
os.environ.setdefault("SECRET_KEY", "test-only-secret-key-not-for-production")
os.environ.setdefault("REFRESH_SECRET_KEY", "test-only-refresh-secret-not-for-production")
# Synthetic fixture passwords for the in-memory test users only. Defined once
# here so login assertions in the test modules reference the same constants.
os.environ.setdefault("TEACHER_TEST_PASSWORD", "test-only-teacher-password-not-for-production")
os.environ.setdefault("STUDENT_TEST_PASSWORD", "test-only-student-password-not-for-production")
TEACHER_TEST_PASSWORD = os.environ["TEACHER_TEST_PASSWORD"]
STUDENT_TEST_PASSWORD = os.environ["STUDENT_TEST_PASSWORD"]

from app.database import Base, get_db
from app.main import app
from app.auth_utils import get_password_hash, create_access_token
from app import models

# In-memory SQLite async database for test isolation
SQLALCHEMY_TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_async_engine = create_async_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingAsyncSessionLocal = async_sessionmaker(
    bind=test_async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(autouse=True)
async def setup_test_database():
    """Initializes schema before each test and drops tables after."""
    async with test_async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session():
    """Yields a clean AsyncSession for test assertions and direct model fixtures."""
    async with TestingAsyncSessionLocal() as session:
        yield session


@pytest.fixture
async def client():
    """Provides an httpx.AsyncClient with get_db overridden to test database."""
    async def override_get_db():
        async with TestingAsyncSessionLocal() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
async def teacher_user(db_session: AsyncSession):
    """Creates a sample teacher user in the test database."""
    user = models.User(
        email="teacher@lumina.dev",
        hashed_password=get_password_hash(TEACHER_TEST_PASSWORD),
        role="teacher",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def student_user(db_session: AsyncSession):
    """Creates a sample student user in the test database."""
    user = models.User(
        email="student@lumina.dev",
        hashed_password=get_password_hash(STUDENT_TEST_PASSWORD),
        role="student",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def teacher_token(teacher_user):
    """Generates JWT access token for the teacher user fixture."""
    return create_access_token(data={"sub": teacher_user.email})


@pytest.fixture
def student_token(student_user):
    """Generates JWT access token for the student user fixture."""
    return create_access_token(data={"sub": student_user.email})
