"""
Authentication & Authorization Unit Tests for TerraScope Backend.

Tests:
    - Root and health check endpoints.
    - User registration (success, duplicate rejection, format validation).
    - OAuth2 password grant login (success, invalid password).
    - JWT token refresh flow.
    - Protected user profile endpoint (/api/auth/me).
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Verify health check and root endpoints return 200 OK."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"

    resp_root = await client.get("/")
    assert resp_root.status_code == 200
    assert resp_root.json()["status"] == "online"


@pytest.mark.asyncio
async def test_user_registration(client: AsyncClient):
    """Verify user registration returns 201 Created and persists email."""
    payload = {"email": "surveyor@terrascope.app", "password": "supersecurepassword123"}
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "surveyor@terrascope.app"
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_duplicate_registration_fails(client: AsyncClient):
    """Verify duplicate email registration is rejected with 400 Bad Request."""
    payload = {"email": "duplicate@terrascope.app", "password": "securepassword123"}
    resp1 = await client.post("/api/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = await client.post("/api/auth/register", json=payload)
    assert resp2.status_code == 400
    assert "already registered" in resp2.json()["detail"]


@pytest.mark.asyncio
async def test_invalid_email_format_fails(client: AsyncClient):
    """Verify malformed email string is rejected with 422 Unprocessable Entity by Pydantic."""
    bad_payload = {"email": "not-an-email", "password": "securepassword123"}
    resp = await client.post("/api/auth/register", json=bad_payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_user_login_and_refresh_flow(client: AsyncClient):
    """Verify login issues valid JWT token and /refresh rotates it."""
    reg_payload = {"email": "pilot@terrascope.app", "password": "strongpassword123"}
    await client.post("/api/auth/register", json=reg_payload)

    # Valid login
    login_resp = await client.post(
        "/api/auth/token",
        data={"username": "pilot@terrascope.app", "password": "strongpassword123"},
    )
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # Invalid login
    bad_login = await client.post(
        "/api/auth/token",
        data={"username": "pilot@terrascope.app", "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401

    # Access protected profile
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = await client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "pilot@terrascope.app"

    # Refresh token
    refresh_resp = await client.post("/api/auth/refresh", headers=headers)
    assert refresh_resp.status_code == 200
    assert "access_token" in refresh_resp.json()
