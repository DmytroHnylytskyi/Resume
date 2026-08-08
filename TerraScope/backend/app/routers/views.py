"""
Saved Globe Views Sub-Router Module.

Provides endpoints for creating, listing, retrieving, and deleting personalized 3D globe
camera position presets and active layer filter state snapshots for authenticated users.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, database, auth_utils

router = APIRouter(tags=["views"])

@router.get("/", response_model=List[schemas.SavedViewResponse])
def get_user_views(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Retrieves all saved 3D globe views belonging to the authenticated user.

    Args:
        db (Session): Database session dependency.
        current_user (models.User): Authenticated user dependency.

    Returns:
        List[schemas.SavedViewResponse]: Array of saved view objects ordered by creation date desc.
    """
    views = (
        db.query(models.SavedView)
        .filter(models.SavedView.user_id == current_user.id)
        .order_by(models.SavedView.created_at.desc())
        .all()
    )
    return views

@router.post("/", response_model=schemas.SavedViewResponse, status_code=status.HTTP_201_CREATED)
def create_saved_view(
    view_in: schemas.SavedViewCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Creates a new saved 3D globe camera/layer configuration preset for the current user.

    Args:
        view_in (schemas.SavedViewCreate): View configuration input payload.
        db (Session): Database session dependency.
        current_user (models.User): Authenticated user dependency.

    Returns:
        schemas.SavedViewResponse: Created saved view model instance.
    """
    new_view = models.SavedView(
        user_id=current_user.id,
        name=view_in.name,
        description=view_in.description,
        camera_position=view_in.camera_position,
        camera_target=view_in.camera_target,
        active_layers=view_in.active_layers,
        layer_filters=view_in.layer_filters
    )
    db.add(new_view)
    db.commit()
    db.refresh(new_view)
    return new_view

@router.get("/{id}", response_model=schemas.SavedViewResponse)
def get_saved_view_by_id(
    id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Retrieves a specific saved view preset by unique ID for the authenticated owner.

    Args:
        id (int): Saved view primary key ID.
        db (Session): Database session dependency.
        current_user (models.User): Authenticated user dependency.

    Returns:
        schemas.SavedViewResponse: Matching saved view object.

    Raises:
        HTTPException: 404 Not Found if view missing, 403 Forbidden if user is not owner.
    """
    view = db.query(models.SavedView).filter(models.SavedView.id == id).first()
    if not view:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved view not found"
        )
    if view.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this view"
        )
    return view

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_saved_view(
    id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    Deletes a saved view preset by ID.

    Requires authentication and checks that the owner matches current_user.

    Args:
        id (int): Saved view primary key ID.
        db (Session): Database session dependency.
        current_user (models.User): Authenticated user dependency.

    Returns:
        dict: Success detail dictionary.

    Raises:
        HTTPException: 404 Not Found if view missing, 403 Forbidden if user is not owner.
    """
    view = db.query(models.SavedView).filter(models.SavedView.id == id).first()
    if not view:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved view not found"
        )
    if view.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this view"
        )
    
    db.delete(view)
    db.commit()
    return {"detail": "Saved view deleted successfully"}
