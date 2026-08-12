"""3D Scene Projects CRUD Integration Tests for Forma-3D."""

import pytest
from httpx import AsyncClient


async def get_auth_token(client: AsyncClient, email: str = "architect@forma3d.io") -> str:
    """Helper to register and authenticate a user, returning access token."""
    await client.post(
        "/register",
        json={"email": email, "name": "Architect", "password": "Password123!"},
    )
    res = await client.post(
        "/token",
        data={"username": email, "password": "Password123!"},
    )
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_create_and_list_projects(client: AsyncClient):
    """Tests saving a 3D scene project and retrieving project lists."""
    token = await get_auth_token(client, "create_test@forma3d.io")
    headers = {"Authorization": f"Bearer {token}"}

    # Create project
    project_payload = {
        "name": "Modern Minimalist Villa",
        "data": '{"objects":[{"id":"obj-1","modelPath":"/model/walls/wall_5x5.glb","position":[0,0,0],"rotation":[0,0,0],"scale":1}]}',
    }
    create_res = await client.post("/projects/", json=project_payload, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["name"] == "Modern Minimalist Villa"
    assert "obj-1" in created_data["data"]
    assert "id" in created_data

    # List projects
    list_res = await client.get("/projects/", headers=headers)
    assert list_res.status_code == 200
    projects = list_res.json()
    assert len(projects) == 1
    assert projects[0]["name"] == "Modern Minimalist Villa"


@pytest.mark.asyncio
async def test_get_and_update_project(client: AsyncClient):
    """Tests getting project by ID and modifying its 3D scene payload."""
    token = await get_auth_token(client, "update_test@forma3d.io")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = await client.post(
        "/projects/",
        json={"name": "Gothic Castle", "data": '{"objects":[]}'},
        headers=headers,
    )
    project_id = create_res.json()["id"]

    # Get single project
    get_res = await client.get(f"/projects/{project_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Gothic Castle"

    # Update project
    update_res = await client.put(
        f"/projects/{project_id}",
        json={"name": "Gothic Castle Renovated", "data": '{"objects":[{"id":"col-1"}]}'},
        headers=headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["name"] == "Gothic Castle Renovated"
    assert "col-1" in updated_data["data"]


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient):
    """Tests deleting a project."""
    token = await get_auth_token(client, "delete_test@forma3d.io")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = await client.post(
        "/projects/",
        json={"name": "Temporary Scene", "data": "{}"},
        headers=headers,
    )
    project_id = create_res.json()["id"]

    # Delete
    del_res = await client.delete(f"/projects/{project_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify not found
    get_res = await client.get(f"/projects/{project_id}", headers=headers)
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_unauthorized_and_isolation(client: AsyncClient):
    """Ensures unauthenticated access fails and users cannot access other users' scenes."""
    # Unauthenticated list
    unauth_res = await client.get("/projects/")
    assert unauth_res.status_code == 401

    # User A creates project
    token_a = await get_auth_token(client, "user_a@forma3d.io")
    res_a = await client.post(
        "/projects/",
        json={"name": "User A Private Scene", "data": "{}"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    project_a_id = res_a.json()["id"]

    # User B tries to view/edit User A's project
    token_b = await get_auth_token(client, "user_b@forma3d.io")
    res_b = await client.get(
        f"/projects/{project_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_b.status_code == 404
