"""
3D Furniture Store FastAPI Application Main Module.

This module initializes the FastAPI server, configures CORS middleware,
establishes database table schemas, and provides REST API routes for:
    - User registration (/register)
    - OAuth2 password grant token authentication (/token)
    - Current user profile inspection (/users/me/)
    - Cloud 3D scene project CRUD management (/projects/)

Author: 3D Furniture Configurator Team
"""

from datetime import timedelta
import jwt
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
import auth
import database
from database import get_db, engine

# Automatically create database tables defined in SQLAlchemy ORM models if missing
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI web server instance
app = FastAPI(
    title="3D Furniture Store API",
    description="REST API for user authentication and cloud 3D scene project storage.",
    version="1.0.0"
)

# Configure Cross-Origin Resource Sharing (CORS) for Next.js frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.57.245:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define OAuth2 Password Bearer scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    """
    FastAPI dependency to extract and validate the active user from a JWT Bearer token.

    Args:
        token (str): JWT access token extracted from Authorization header.
        db (Session): SQLAlchemy database session dependency.

    Returns:
        models.User: Authenticated User ORM object instance.

    Raises:
        HTTPException: 401 Unauthorized error if token signature is invalid or user missing.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except jwt.PyJWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user


@app.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)) -> models.User:
    """
    Registers a new user account with hashed password.

    Args:
        user (schemas.UserCreate): Validated registration request body payload.
        db (Session): SQLAlchemy database session dependency.

    Returns:
        models.User: Newly created user record.

    Raises:
        HTTPException: 400 Bad Request if email address is already registered.
    """
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(email=user.email, name=user.name, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
) -> dict:
    """
    Authenticates user credentials and issues a JWT Bearer Access Token.

    Args:
        form_data (OAuth2PasswordRequestForm): OAuth2 form containing username (email) and password.
        db (Session): Database session dependency.

    Returns:
        dict: Access token string and token_type ("bearer").

    Raises:
        HTTPException: 401 Unauthorized error on incorrect credentials.
    """
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me/", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)) -> models.User:
    """
    Retrieves the authenticated user's profile details.

    Args:
        current_user (models.User): Authenticated user object injected by dependency.

    Returns:
        models.User: Current user data.
    """
    return current_user


# ------------------------------------------------------------------------------
# Cloud 3D Scene Project CRUD Endpoints
# ------------------------------------------------------------------------------

@app.post("/projects/", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
) -> models.Project:
    """
    Saves a new 3D scene project payload under the authenticated user's profile.

    Args:
        project (schemas.ProjectCreate): Project name and JSON layout data payload.
        db (Session): Database session dependency.
        current_user (models.User): Currently authenticated user.

    Returns:
        models.Project: Saved project database record.
    """
    db_project = models.Project(
        name=project.name,
        data=project.data,
        user_id=current_user.id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@app.get("/projects/", response_model=list[schemas.ProjectResponse])
def get_user_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
) -> list[models.Project]:
    """
    Retrieves all cloud 3D projects created by the authenticated user, ordered by last update.

    Args:
        db (Session): Database session dependency.
        current_user (models.User): Currently authenticated user.

    Returns:
        list[models.Project]: List of project database records.
    """
    return (
        db.query(models.Project)
        .filter(models.Project.user_id == current_user.id)
        .order_by(models.Project.updated_at.desc())
        .all()
    )


@app.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
) -> dict:
    """
    Deletes a user's cloud 3D project by ID.

    Args:
        project_id (int): Database primary key ID of target project.
        db (Session): Database session dependency.
        current_user (models.User): Currently authenticated user.

    Returns:
        dict: Success status message.

    Raises:
        HTTPException: 404 Not Found error if project does not exist or belong to user.
    """
    db_project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id
    ).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(db_project)
    db.commit()
    return {"detail": "Project deleted successfully"}
