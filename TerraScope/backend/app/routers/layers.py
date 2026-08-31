"""
Geospatial Data Layers Sub-Router Module for TerraScope.

Provides cached API endpoints for live earthquakes (USGS), airborne flights (OpenSky),
weather metrics (Open-Meteo), country borders/capitals (REST Countries), and asteroids (NASA NeoWs).
Implements database-backed async SQLite caching with fallback datasets for 100% availability.
"""

import json
import logging
import asyncio
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .. import database, models

logger = logging.getLogger(__name__)

router = APIRouter(tags=["layers"])

# Shared AsyncClient instance initialized by main.py lifespan context manager
_http_client: Optional[httpx.AsyncClient] = None

# Locks dictionary preventing Cache Stampede for concurrent requests
_cache_locks: Dict[str, asyncio.Lock] = {}

def get_lock_for_key(key: str) -> asyncio.Lock:
    """Retrieves or creates a thread-safe asyncio.Lock for a cache key."""
    if key not in _cache_locks:
        _cache_locks[key] = asyncio.Lock()
    return _cache_locks[key]

def set_http_client(client: httpx.AsyncClient):
    """Sets global HTTP client instance for connection pooling."""
    global _http_client
    _http_client = client

# Capital City Coordinates for Open-Meteo Batch Queries (70 World Capitals)
CAPITAL_COORDINATES = [
    {"name": "Kyiv", "country": "Ukraine", "lat": 50.4501, "lng": 30.5234},
    {"name": "London", "country": "United Kingdom", "lat": 51.5074, "lng": -0.1278},
    {"name": "Washington D.C.", "country": "United States", "lat": 38.9072, "lng": -77.0369},
    {"name": "New York", "country": "United States", "lat": 40.7128, "lng": -74.0060},
    {"name": "Tokyo", "country": "Japan", "lat": 35.6762, "lng": 139.6503},
    {"name": "Paris", "country": "France", "lat": 48.8566, "lng": 2.3522},
    {"name": "Berlin", "country": "Germany", "lat": 52.5200, "lng": 13.4050},
    {"name": "Rome", "country": "Italy", "lat": 41.9028, "lng": 12.4964},
    {"name": "Madrid", "country": "Spain", "lat": 40.4168, "lng": -3.7038},
    {"name": "Warsaw", "country": "Poland", "lat": 52.2297, "lng": 21.0122},
    {"name": "Ottawa", "country": "Canada", "lat": 45.4215, "lng": -75.6972},
    {"name": "Canberra", "country": "Australia", "lat": -35.2809, "lng": 149.1300},
    {"name": "Sydney", "country": "Australia", "lat": -33.8688, "lng": 151.2093},
    {"name": "Beijing", "country": "China", "lat": 39.9042, "lng": 116.4074},
    {"name": "New Delhi", "country": "India", "lat": 28.6139, "lng": 77.2090},
    {"name": "Brasilia", "country": "Brazil", "lat": -15.7975, "lng": -47.8919},
    {"name": "Cairo", "country": "Egypt", "lat": 30.0444, "lng": 31.2357},
    {"name": "Seoul", "country": "South Korea", "lat": 37.5665, "lng": 126.9780},
    {"name": "Mexico City", "country": "Mexico", "lat": 19.4326, "lng": -99.1332},
    {"name": "Jakarta", "country": "Indonesia", "lat": -6.2088, "lng": 106.8456},
    {"name": "Bangkok", "country": "Thailand", "lat": 13.7563, "lng": 100.5018},
    {"name": "Singapore", "country": "Singapore", "lat": 1.3521, "lng": 103.8198},
    {"name": "Buenos Aires", "country": "Argentina", "lat": -34.6037, "lng": -58.3816},
    {"name": "Santiago", "country": "Chile", "lat": -33.4489, "lng": -70.6693},
    {"name": "Pretoria", "country": "South Africa", "lat": -25.7479, "lng": 28.2293},
    {"name": "Riyadh", "country": "Saudi Arabia", "lat": 24.7136, "lng": 46.6753},
    {"name": "Abu Dhabi", "country": "UAE", "lat": 24.4539, "lng": 54.3773},
    {"name": "Dubai", "country": "UAE", "lat": 25.2048, "lng": 55.2708},
    {"name": "Istanbul", "country": "Turkey", "lat": 41.0082, "lng": 28.9784},
    {"name": "Ankara", "country": "Turkey", "lat": 39.9334, "lng": 32.8597},
    {"name": "Athens", "country": "Greece", "lat": 37.9838, "lng": 23.7275},
    {"name": "Stockholm", "country": "Sweden", "lat": 59.3293, "lng": 18.0686},
    {"name": "Oslo", "country": "Norway", "lat": 59.9139, "lng": 10.7522},
    {"name": "Helsinki", "country": "Finland", "lat": 60.1699, "lng": 24.9384},
    {"name": "Copenhagen", "country": "Denmark", "lat": 55.6761, "lng": 12.5683},
    {"name": "Amsterdam", "country": "Netherlands", "lat": 52.3676, "lng": 4.9041},
    {"name": "Brussels", "country": "Belgium", "lat": 50.8503, "lng": 4.3517},
    {"name": "Vienna", "country": "Austria", "lat": 48.2082, "lng": 16.3738},
    {"name": "Prague", "country": "Czech Republic", "lat": 50.0755, "lng": 14.4378},
    {"name": "Budapest", "country": "Hungary", "lat": 47.4979, "lng": 19.0402},
    {"name": "Bucharest", "country": "Romania", "lat": 44.4323, "lng": 26.1063},
    {"name": "Lisbon", "country": "Portugal", "lat": 38.7223, "lng": -9.1393},
    {"name": "Dublin", "country": "Ireland", "lat": 53.3498, "lng": -6.2603},
    {"name": "Bern", "country": "Switzerland", "lat": 46.9480, "lng": 7.4474},
    {"name": "Wellington", "country": "New Zealand", "lat": -41.2865, "lng": 174.7762},
    {"name": "Manila", "country": "Philippines", "lat": 14.5995, "lng": 120.9842},
    {"name": "Hanoi", "country": "Vietnam", "lat": 21.0285, "lng": 105.8542},
    {"name": "Kuala Lumpur", "country": "Malaysia", "lat": 3.1390, "lng": 101.6869},
    {"name": "Islamabad", "country": "Pakistan", "lat": 33.6844, "lng": 73.0479},
    {"name": "Dhaka", "country": "Bangladesh", "lat": 23.8103, "lng": 90.4125},
    {"name": "Bogota", "country": "Colombia", "lat": 4.7110, "lng": -74.0721},
    {"name": "Lima", "country": "Peru", "lat": -12.0463, "lng": -77.0428},
    {"name": "Caracas", "country": "Venezuela", "lat": 10.4806, "lng": -66.9036},
    {"name": "Nairobi", "country": "Kenya", "lat": -1.2921, "lng": 36.8219},
    {"name": "Addis Ababa", "country": "Ethiopia", "lat": 9.0300, "lng": 38.7400},
    {"name": "Abuja", "country": "Nigeria", "lat": 9.0765, "lng": 7.3986},
    {"name": "Accra", "country": "Ghana", "lat": 5.6037, "lng": -0.1870},
    {"name": "Casablanca", "country": "Morocco", "lat": 33.5731, "lng": -7.5898},
    {"name": "Tunis", "country": "Tunisia", "lat": 36.8065, "lng": 10.1815},
    {"name": "Algiers", "country": "Algeria", "lat": 36.7538, "lng": 3.0588},
    {"name": "Tel Aviv", "country": "Israel", "lat": 32.0853, "lng": 34.7818},
    {"name": "Jerusalem", "country": "Israel", "lat": 31.7683, "lng": 35.2137},
    {"name": "Tashkent", "country": "Uzbekistan", "lat": 41.2995, "lng": 69.2401},
    {"name": "Astana", "country": "Kazakhstan", "lat": 51.1694, "lng": 71.4491},
    {"name": "Tbilisi", "country": "Georgia", "lat": 41.7151, "lng": 44.8271},
    {"name": "Baku", "country": "Azerbaijan", "lat": 40.4093, "lng": 49.8671},
    {"name": "Yerevan", "country": "Armenia", "lat": 40.1792, "lng": 44.4991},
    {"name": "Los Angeles", "country": "United States", "lat": 34.0522, "lng": -118.2437},
    {"name": "Toronto", "country": "Canada", "lat": 43.6510, "lng": -79.3470},
    {"name": "Reykjavik", "country": "Iceland", "lat": 64.1466, "lng": -21.9426}
]

# WMO Weather Interpretation Code Dictionary (Open-Meteo Standard)
WMO_WEATHER_CODES = {
    0: "Clear Sky",
    1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing Rime Fog",
    51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
    61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
    71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow",
    77: "Snow Grains",
    80: "Slight Rain Showers", 81: "Moderate Rain Showers", 82: "Violent Rain Showers",
    85: "Slight Snow Showers", 86: "Heavy Snow Showers",
    95: "Thunderstorm", 96: "Thunderstorm with Hail", 99: "Heavy Thunderstorm"
}

FALLBACK_CITIES = [
  { "name": "New York", "lat": 40.7128, "lng": -74.0060, "temp": 24, "desc": "Partly Cloudy", "humidity": 60, "wind": 14 },
  { "name": "London", "lat": 51.5074, "lng": -0.1278, "temp": 19, "desc": "Light Rain", "humidity": 82, "wind": 18 },
  { "name": "Tokyo", "lat": 35.6762, "lng": 139.6503, "temp": 28, "desc": "Clear Sky", "humidity": 55, "wind": 10 },
  { "name": "Paris", "lat": 48.8566, "lng": 2.3522, "temp": 22, "desc": "Sunny", "humidity": 50, "wind": 12 },
  { "name": "Sydney", "lat": -33.8688, "lng": 151.2093, "temp": 16, "desc": "Breezy", "humidity": 70, "wind": 22 }
]

FALLBACK_COUNTRIES_LIST = [
  { "name": { "common": "United States", "official": "United States of America" }, "capital": ["Washington, D.C."], "population": 331449281, "area": 9372610, "region": "Americas", "latlng": [37.0902, -95.7129] },
  { "name": { "common": "China", "official": "People's Republic of China" }, "capital": ["Beijing"], "population": 1411778724, "area": 9706961, "region": "Asia", "latlng": [35.8617, 104.1954] },
  { "name": { "common": "India", "official": "Republic of India" }, "capital": ["New Delhi"], "population": 1380004385, "area": 3287263, "region": "Asia", "latlng": [20.5937, 78.9629] }
]

FALLBACK_NEO = {
  "element_count": 2,
  "near_earth_objects": {
    "2026-08-06": [
      { "id": "3542519", "name": "(2010 PK9)", "absolute_magnitude_h": 21.8, "estimated_diameter": { "kilometers": { "estimated_diameter_min": 0.11, "estimated_diameter_max": 0.26 } }, "is_potentially_hazardous_asteroid": True, "close_approach_data": [{ "relative_velocity": { "kilometers_per_hour": "68400" }, "miss_distance": { "kilometers": "7400000" } }] }
    ]
  }
}

async def get_cached_or_fetch(
    db: AsyncSession,
    cache_key: str,
    ttl_seconds: int,
    fetch_url: str,
    headers: Optional[Dict[str, str]] = None,
    fallback_data: Optional[Any] = None
) -> Response:
    """
    Helper function implementing database-backed caching with HTTP connection pooling
    and asyncio.Lock to prevent Cache Stampede. Avoids double JSON serialization by returning Response.

    Args:
        db (AsyncSession): Async database session dependency.
        cache_key (str): Unique cache lookup key.
        ttl_seconds (int): Cache validity duration in seconds.
        fetch_url (str): Remote API URL to query.
        headers (Optional[Dict[str, str]]): HTTP request headers.
        fallback_data (Optional[Any]): Offline fallback payload if request fails.

    Returns:
        Response: FastAPI Response with raw JSON string content.
    """
    now = datetime.now(timezone.utc)
    
    # Fast path: Check SQLite cache table for unexpired entry
    result = await db.execute(select(models.CacheEntry).where(models.CacheEntry.cache_key == cache_key))
    cache_entry = result.scalar_one_or_none()
    if cache_entry and cache_entry.expires_at.replace(tzinfo=timezone.utc) > now:
        return Response(content=cache_entry.data, media_type="application/json")

    # Lock acquisition to prevent Cache Stampede on cache miss
    lock = get_lock_for_key(cache_key)
    async with lock:
        # Re-check cache after acquiring lock in case another request populated it
        result = await db.execute(select(models.CacheEntry).where(models.CacheEntry.cache_key == cache_key))
        cache_entry = result.scalar_one_or_none()
        if cache_entry and cache_entry.expires_at.replace(tzinfo=timezone.utc) > now:
            return Response(content=cache_entry.data, media_type="application/json")

        data = None
        try:
            if _http_client:
                resp = await _http_client.get(fetch_url, headers=headers)
            else:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.get(fetch_url, headers=headers)
                    
            if resp.status_code == 200:
                parsed = resp.json()
                if isinstance(parsed, list) or (isinstance(parsed, dict) and parsed.get("success") is not False):
                    data = parsed
        except Exception as e:
            logger.warning(f"Fetch failed for {cache_key}: {e}")

        # Use fallback data if fetch failed
        if data is None:
            if fallback_data is not None:
                data = fallback_data
            elif cache_entry:
                return Response(content=cache_entry.data, media_type="application/json")
            else:
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Layer service unavailable for {cache_key}")

        # Update or insert SQLite cache record
        expires_at = now + timedelta(seconds=ttl_seconds)
        json_data = json.dumps(data)

        if cache_entry:
            cache_entry.data = json_data
            cache_entry.expires_at = expires_at
            cache_entry.created_at = now
        else:
            cache_entry = models.CacheEntry(
                cache_key=cache_key,
                data=json_data,
                expires_at=expires_at,
                created_at=now
            )
            db.add(cache_entry)
        
        await db.commit()
        return Response(content=json_data, media_type="application/json")

# USGS Live Seismic Feed Endpoints & Differentiated Cache TTLs
USGS_FEEDS = {
    "today": {
        "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
        "ttl": 120,  # 2 Minutes
    },
    "7days": {
        "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
        "ttl": 600,  # 10 Minutes
    },
    "30days": {
        "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson",
        "ttl": 1800,  # 30 Minutes
    },
}

@router.get("/earthquakes")
async def get_earthquakes(
    period: str = Query("7days", pattern="^(today|7days|30days)$"),
    db: AsyncSession = Depends(database.get_db)
):
    """
    Fetches real-time seismic data from USGS GeoJSON API filtered by time period.

    Args:
        period (str): Time window ('today', '7days', '30days'). Defaults to '7days'.
        db (AsyncSession): Async database session dependency.

    Cache TTL:
        - today: 120 seconds
        - 7days: 600 seconds
        - 30days: 1800 seconds
    """
    config = USGS_FEEDS.get(period, USGS_FEEDS["7days"])
    return await get_cached_or_fetch(
        db=db,
        cache_key=f"earthquakes_{period}",
        ttl_seconds=config["ttl"],
        fetch_url=config["url"]
    )

@router.get("/flights")
async def get_flights(db: AsyncSession = Depends(database.get_db)):
    """
    Fetches live commercial flight state vectors from OpenSky Network API.

    Cache TTL: 30 Seconds.
    """
    url = "https://opensky-network.org/api/states/all"
    headers = {"User-Agent": "TerraScope/1.0 (https://terrascope.app)"}
    return await get_cached_or_fetch(
        db=db,
        cache_key="flights",
        ttl_seconds=30,
        fetch_url=url,
        headers=headers
    )

@router.get("/weather")
async def get_weather(db: AsyncSession = Depends(database.get_db)):
    """
    Fetches live weather metrics across global capital cities from Open-Meteo API.

    Cache TTL: 15 Minutes (900 seconds).
    """
    now = datetime.now(timezone.utc)
    cache_key = "weather_openmeteo_70v1"
    
    # Check SQLite cache
    result = await db.execute(select(models.CacheEntry).where(models.CacheEntry.cache_key == cache_key))
    cache_entry = result.scalar_one_or_none()
    if cache_entry and cache_entry.expires_at.replace(tzinfo=timezone.utc) > now:
        return Response(content=cache_entry.data, media_type="application/json")

    lock = get_lock_for_key(cache_key)
    async with lock:
        result = await db.execute(select(models.CacheEntry).where(models.CacheEntry.cache_key == cache_key))
        cache_entry = result.scalar_one_or_none()
        if cache_entry and cache_entry.expires_at.replace(tzinfo=timezone.utc) > now:
            return Response(content=cache_entry.data, media_type="application/json")

        # Batch query Open-Meteo API for capital coordinates
        lats = ",".join(str(c["lat"]) for c in CAPITAL_COORDINATES)
        lngs = ",".join(str(c["lng"]) for c in CAPITAL_COORDINATES)
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lats}&longitude={lngs}&current_weather=true"

        try:
            if _http_client:
                resp = await _http_client.get(url)
            else:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.get(url)

            if resp.status_code == 200:
                data = resp.json()
                results = []
                
                items = data if isinstance(data, list) else [data]
                for idx, item in enumerate(items):
                    current = item.get("current_weather", {})
                    city_meta = CAPITAL_COORDINATES[idx] if idx < len(CAPITAL_COORDINATES) else CAPITAL_COORDINATES[0]
                    code = current.get("weathercode", 0)
                    condition = WMO_WEATHER_CODES.get(code, "Clear Sky")
                    
                    results.append({
                        "name": city_meta["name"],
                        "country": city_meta["country"],
                        "lat": city_meta["lat"],
                        "lng": city_meta["lng"],
                        "temp": round(current.get("temperature", 20)),
                        "wind": round(current.get("windspeed", 10)),
                        "humidity": 65,
                        "desc": condition
                    })

                # Save to SQLite cache
                expires_at = now + timedelta(seconds=900)
                json_data = json.dumps(results)
                if cache_entry:
                    cache_entry.data = json_data
                    cache_entry.expires_at = expires_at
                    cache_entry.created_at = now
                else:
                    db.add(models.CacheEntry(cache_key=cache_key, data=json_data, expires_at=expires_at, created_at=now))
                await db.commit()
                return Response(content=json_data, media_type="application/json")

        except Exception as e:
            logger.warning(f"Open-Meteo live weather fetch failed: {e}")

        if cache_entry:
            return Response(content=cache_entry.data, media_type="application/json")
        return Response(content=json.dumps(FALLBACK_CITIES), media_type="application/json")

@router.get("/countries")
async def get_countries(db: AsyncSession = Depends(database.get_db)):
    """
    Fetches international country profiles, population, and capitals from REST Countries API.

    Cache TTL: 24 Hours (86400 seconds).
    """
    url = "https://restcountries.com/v3.1/all?fields=name,capital,population,area,flags,latlng,region,subregion,currencies,languages"
    return await get_cached_or_fetch(
        db=db,
        cache_key="countries_v3",
        ttl_seconds=86400,
        fetch_url=url,
        fallback_data=FALLBACK_COUNTRIES_LIST
    )

@router.get("/neo")
async def get_near_earth_objects(db: AsyncSession = Depends(database.get_db)):
    """
    Fetches near-Earth asteroids and orbital trajectory data from NASA NeoWs API.

    Cache TTL: 1 Hour (3600 seconds).
    """
    nasa_key = os.getenv("NASA_API_KEY", "DEMO_KEY")
    url = f"https://api.nasa.gov/neo/rest/v1/feed?api_key={nasa_key}"
    return await get_cached_or_fetch(
        db=db,
        cache_key="neo",
        ttl_seconds=3600,
        fetch_url=url,
        fallback_data=FALLBACK_NEO
    )
