"""
Database Engine & Session Management Module.

Configures SQLAlchemy engine connections for SQLite, defines the Declarative Base,
and provides the get_db dependency for FastAPI thread-safe database sessions.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Absolute SQLite database file path configuration (resolves independently of CWD)
BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = f"sqlite:///{BASE_DIR / 'sql_app.db'}"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_PATH)

# Thread safety configuration for SQLite connection pooling in FastAPI
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

# Initialize SQLAlchemy DB Engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)

# Session factory for generating scoped DB sessions per request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative ORM base model class
Base = declarative_base()

def get_db():
    """
    FastAPI Dependency yielding a thread-safe database session per HTTP request.

    Ensures that database connections are properly opened and safely closed
    in a try/finally block after request processing completes.

    Yields:
        Session: Active SQLAlchemy database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
