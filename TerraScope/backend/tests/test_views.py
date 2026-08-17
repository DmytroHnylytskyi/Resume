"""
Saved Globe Views Unit Tests for TerraScope Backend.

Tests:
    - Creating and listing saved view presets.
    - Retrieving a view by ID.
    - Deleting views and verifying deletion.
    - Multi-tenant data isolation and unauthorized access rejection.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_saved_views_crud_and_isolation(client: AsyncClient):
    """Test full CRUD lifecycle for saved 3D globe views and verify user isolation."""
    # Register User A
    user_a = {"email": "usera@terrascope.app", "password": "passwordA123"}
    await client.post("/api/auth/register", json=user_a)
    login_a = await client.post("/api/auth/token", data={"username": user_a["email"], "password": user_a["password"]})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register User B
    user_b = {"email": "userb@terrascope.app", "password": "passwordB123"}
    await client.post("/api/auth/register", json=user_b)
    login_b = await client.post("/api/auth/token", data={"username": user_b["email"], "password": user_b["password"]})
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Create view for User A
    view_payload = {
        "name": "Pacific Ring of Fire",
        "description": "Seismic earthquake focus over Japan and Pacific",
        "camera_target": {"lat": 35.6762, "lng": 139.6503, "zoom": 2.2},
        "active_layers": {"earthquakes": True, "flights": False}
    }
    create_resp = await client.post("/api/views/", json=view_payload, headers=headers_a)
    assert create_resp.status_code == 201
    view_data = create_resp.json()
    assert view_data["name"] == "Pacific Ring of Fire"
    view_id = view_data["id"]

    # List views for User A
    list_a = await client.get("/api/views/", headers=headers_a)
    assert list_a.status_code == 200
    assert len(list_a.json()) == 1

    # User B should see empty list (data isolation)
    list_b = await client.get("/api/views/", headers=headers_b)
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

    # User B cannot access or delete User A's view
    forbidden_get = await client.get(f"/api/views/{view_id}", headers=headers_b)
    assert forbidden_get.status_code == 403

    forbidden_del = await client.delete(f"/api/views/{view_id}", headers=headers_b)
    assert forbidden_del.status_code == 403

    # User A deletes their view
    del_resp = await client.delete(f"/api/views/{view_id}", headers=headers_a)
    assert del_resp.status_code == 200

    # View should be gone
    get_404 = await client.get(f"/api/views/{view_id}", headers=headers_a)
    assert get_404.status_code == 404
