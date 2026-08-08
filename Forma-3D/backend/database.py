"""
Database Engine & Session Management Module.

Configures:
    - SQLite database connection URL (sql_app.db).
    - SQLAlchemy engine and SessionLocal session factory.
    - Declarative ORM base class.
    - Generator dependency get_db() for FastAPI request session context management.

Author: 3D Furniture Configurator Team
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# SQLite Database connection URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"

# Create SQLAlchemy engine instance (check_same_thread=False required for SQLite in multithreaded web servers)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

# Session factory bound to database engine
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for SQLAlchemy ORM models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency generator yielding a database session context per HTTP request.
    Automatically closes the session connection upon request completion or exception.

    Yields:
        Session: Active SQLAlchemy database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
