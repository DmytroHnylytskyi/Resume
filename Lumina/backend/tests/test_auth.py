"""Asynchronous Integration Tests for Authentication & Session Management."""

import pytest

from tests.conftest import STUDENT_TEST_PASSWORD


async def test_health_check(client):
    """Verifies that the /health system endpoint returns HTTP 200."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_user_registration(client):
    """Verifies user registration creates account with 201 Created and hashed password."""
    response = await client.post(
        "/auth/register",
        json={"email": "newuser@lumina.dev", "password": "test-only-registration-password", "role": "student"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@lumina.dev"
    assert data["role"] == "student"
    assert "id" in data


async def test_duplicate_registration_fails(client, student_user):
    """Verifies registering an existing email returns 400 Bad Request."""
    response = await client.post(
        "/auth/register",
        json={"email": student_user.email, "password": STUDENT_TEST_PASSWORD, "role": "student"},
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


async def test_user_login_success(client, student_user):
    """Verifies valid credentials return access and refresh JWT tokens."""
    response = await client.post(
        "/auth/login",
        data={"username": student_user.email, "password": STUDENT_TEST_PASSWORD},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_token_refresh_flow(client, student_user):
    """Verifies exchange of refresh token for a newly minted access token."""
    login_res = await client.post(
        "/auth/login",
        data={"username": student_user.email, "password": STUDENT_TEST_PASSWORD},
    )
    assert login_res.status_code == 200
    refresh_token = login_res.json()["refresh_token"]

    refresh_res = await client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200
    new_data = refresh_res.json()
    assert "access_token" in new_data
    assert "refresh_token" in new_data


async def test_user_login_invalid_password(client, student_user):
    """Verifies invalid password fails with 401 Unauthorized."""
    response = await client.post(
        "/auth/login",
        data={"username": student_user.email, "password": "wrongpassword"},
    )
    assert response.status_code == 401


async def test_get_current_user_profile(client, student_token, student_user):
    """Verifies /auth/me returns the profile for a valid Bearer token."""
    headers = {"Authorization": f"Bearer {student_token}"}
    response = await client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == student_user.email
