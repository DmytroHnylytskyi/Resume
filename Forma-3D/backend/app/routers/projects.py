"""3D Scene Projects Cloud Storage REST API Router Module.

Handles:
    - Listing user's saved 3D scene projects (GET /projects/)
    - Creating/saving a new 3D project (POST /projects/)
    - Inspecting a single project details (GET /projects/{project_id})
    - Updating project name/layout data (PUT /projects/{project_id})
    - Deleting project (DELETE /projects/{project_id})

Author: 3D Furniture Configurator Team
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_db
from ..models import Project, User
from ..schemas import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=List[ProjectResponse], summary="List user's 3D projects")
async def get_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Project]:
    """Retrieves all 3D scene projects created by the authenticated user, ordered by last update."""
    result = await db.execute(
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.updated_at.desc())
    )
    return list(result.scalars().all())


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED, summary="Create new 3D project")
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Saves a new 3D scene configuration (placed models, coordinates, sub-mesh colors) to the cloud."""
    new_project = Project(
        name=project_data.name,
        data=project_data.data,
        user_id=current_user.id,
    )
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return new_project


@router.get("/{project_id}", response_model=ProjectResponse, summary="Get single project by ID")
async def get_project_by_id(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Fetches full details of a specific 3D scene project."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or you do not have permission to view it",
        )
    return project


@router.put("/{project_id}", response_model=ProjectResponse, summary="Update 3D project")
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Updates the title or 3D scene data payload of an existing project."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or you do not have permission to edit it",
        )

    if project_update.name is not None:
        project.name = project_update.name
    if project_update.data is not None:
        project.data = project_update.data

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete 3D project")
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Permanently deletes a 3D scene project."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or you do not have permission to delete it",
        )

    await db.delete(project)
    await db.commit()
