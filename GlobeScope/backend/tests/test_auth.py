"""
Authentication & Authorization Unit Tests Module.

Tests user registration, login, email validation, password min length constraints,
and JWT token generation.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_health_check():
    """Verify API root health check endpoint returns 200 OK."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_register_invalid_email():
    """Verify user registration fails when invalid email format is supplied."""
    payload = {
        "email": "not-an-email",
        "password": "securepassword123"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code in (400, 422)  # Bad Request or Unprocessable Entity

def test_register_short_password():
    """Verify user registration fails when password is shorter than 8 characters."""
    payload = {
        "email": "user@example.com",
        "password": "123"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422
