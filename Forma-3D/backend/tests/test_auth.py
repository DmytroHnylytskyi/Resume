"""Authentication & Profile Endpoint Integration Tests for Forma-3D."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Verifies that the health check and discovery endpoints return status 200."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "forma-3d-api"

    root_res = await client.get("/")
    assert root_res.status_code == 200
    assert "Forma-3D" in root_res.json()["message"]


@pytest.mark.asyncio
async def test_user_registration(client: AsyncClient):
    """Tests new user registration flow."""
    payload = {
        "email": "designer@forma3d.io",
        "name": "Alex Architect",
        "password": "SecurePassword123!",
    }
    response = await client.post("/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "designer@forma3d.io"
    assert data["name"] == "Alex Architect"
    assert "id" in data
    assert "password" not in data


@pytest.mark.asyncio
async def test_duplicate_registration_fails(client: AsyncClient):
    """Ensures duplicate email registration returns HTTP 400."""
    payload = {
        "email": "duplicate@forma3d.io",
        "name": "First User",
        "password": "Password123!",
    }
    res1 = await client.post("/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/register", json=payload)
    assert res2.status_code == 400
    assert "already registered" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_user_login_success(client: AsyncClient):
    """Tests successful authentication and JWT token generation."""
    # Register user
    await client.post(
        "/register",
        json={"email": "login@forma3d.io", "name": "Login User", "password": "Password123!"},
    )

    # Login
    response = await client.post(
        "/token",
        data={"username": "login@forma3d.io", "password": "Password123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_user_login_invalid_password(client: AsyncClient):
    """Ensures invalid credentials return HTTP 401."""
    await client.post(
        "/register",
        json={"email": "wrongpass@forma3d.io", "name": "User", "password": "CorrectPassword123!"},
    )

    response = await client.post(
        "/token",
        data={"username": "wrongpass@forma3d.io", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_token_refresh_flow(client: AsyncClient):
    """Tests JWT refresh token rotation."""
    await client.post(
        "/register",
        json={"email": "refresh@forma3d.io", "name": "Refresh User", "password": "Password123!"},
    )

    login_res = await client.post(
        "/token",
        data={"username": "refresh@forma3d.io", "password": "Password123!"},
    )
    refresh_token = login_res.json()["refresh_token"]

    refresh_res = await client.post("/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200
    new_data = refresh_res.json()
    assert "access_token" in new_data
    assert "refresh_token" in new_data


@pytest.mark.asyncio
async def test_get_current_user_profile(client: AsyncClient):
    """Tests retrieving authenticated user profile."""
    await client.post(
        "/register",
        json={"email": "profile@forma3d.io", "name": "Profile User", "password": "Password123!"},
    )

    login_res = await client.post(
        "/token",
        data={"username": "profile@forma3d.io", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]

    response = await client.get("/users/me/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "profile@forma3d.io"
    assert data["name"] == "Profile User"
