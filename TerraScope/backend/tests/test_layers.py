"""
Geospatial Data Layers Unit Tests for TerraScope Backend.

Tests:
    - Live earthquakes endpoint (/api/layers/earthquakes).
    - Real-time weather endpoint (/api/layers/weather).
    - Countries reference endpoint (/api/layers/countries).
    - Near-Earth Objects asteroids endpoint (/api/layers/neo).
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_earthquakes_layer(client: AsyncClient):
    """Verify earthquakes GeoJSON endpoint returns 200 OK with valid feature data for periods."""
    # Default 7days
    resp = await client.get("/api/layers/earthquakes")
    assert resp.status_code == 200
    data = resp.json()
    assert "type" in data or "features" in data

    # Today (24 hours)
    resp_today = await client.get("/api/layers/earthquakes?period=today")
    assert resp_today.status_code == 200
    assert "type" in resp_today.json() or "features" in resp_today.json()

    # 30 days
    resp_30d = await client.get("/api/layers/earthquakes?period=30days")
    assert resp_30d.status_code == 200
    assert "type" in resp_30d.json() or "features" in resp_30d.json()


@pytest.mark.asyncio
async def test_get_flights_layer(client: AsyncClient):
    """Verify live OpenSky flights endpoint returns 200 OK."""
    resp = await client.get("/api/layers/flights")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_get_weather_layer(client: AsyncClient):
    """Verify live Open-Meteo weather endpoint returns valid array of capital metrics."""
    resp = await client.get("/api/layers/weather")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "name" in first
    assert "temp" in first
    assert "desc" in first


@pytest.mark.asyncio
async def test_get_countries_layer(client: AsyncClient):
    """Verify countries metadata endpoint returns 200 OK."""
    resp = await client.get("/api/layers/countries")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_neo_asteroids_layer(client: AsyncClient):
    """Verify NASA NEO asteroids endpoint returns 200 OK."""
    resp = await client.get("/api/layers/neo")
    assert resp.status_code == 200
    data = resp.json()
    assert "near_earth_objects" in data or "element_count" in data
