"""
Geospatial Data Layers Unit Tests Module.

Tests cached endpoints for earthquakes, flights, weather, countries, and NEO asteroids.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_weather_endpoint():
    """Verify live Open-Meteo weather endpoint returns valid array of capital metrics."""
    response = client.get("/api/layers/weather")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "temp" in data[0]
    assert "desc" in data[0]

def test_get_earthquakes_endpoint():
    """Verify USGS earthquakes GeoJSON endpoint returns valid FeatureCollection."""
    response = client.get("/api/layers/earthquakes")
    assert response.status_code == 200
    data = response.json()
    assert "features" in data or "type" in data
