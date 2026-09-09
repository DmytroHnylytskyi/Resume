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

FALLBACK_FLIGHTS = {'time': 1710000000, 'states': [['61a80', 'DLH400  ', 'Germany', 1710000000, 1710000000, 8.2796, 50.5122, 9118, False, 259, 358, 0, None, 9268, '1000', False, 0], ['61a81', 'BAW178  ', 'United Kingdom', 1710000000, 1710000000, -12.7676, 49.1786, 10283, False, 213, 225, 0, None, 10433, '1000', False, 0], ['61a82', 'AFR006  ', 'France', 1710000000, 1710000000, -23.807, 46.3834, 10737, False, 221, 185, 0, None, 10887, '1000', False, 0], ['61a83', 'KLM641  ', 'Netherlands', 1710000000, 1710000000, -35.6706, 46.6058, 10755, False, 225, 344, 0, None, 10905, '1000', False, 0], ['61a84', 'UAE201  ', 'UAE', 1710000000, 1710000000, -32.1188, 35.9111, 9584, False, 248, 254, 0, None, 9734, '1000', False, 0], ['61a85', 'QTR701  ', 'Qatar', 1710000000, 1710000000, -55.1298, 38.3706, 11248, False, 225, 80, 0, None, 11398, '1000', False, 0], ['61a86', 'SIA026  ', 'Singapore', 1710000000, 1710000000, 101.773, 2.4423, 10074, False, 224, 215, 0, None, 10224, '1000', False, 0], ['61a87', 'ANA205  ', 'Japan', 1710000000, 1710000000, 117.147, 37.8911, 9498, False, 243, 324, 0, None, 9648, '1000', False, 0], ['61a88', 'AAL100  ', 'United States', 1710000000, 1710000000, -47.2232, 44.04, 9763, False, 244, 109, 0, None, 9913, '1000', False, 0], ['61a89', 'UAL960  ', 'United States', 1710000000, 1710000000, -31.5657, 45.1743, 9266, False, 256, 260, 0, None, 9416, '1000', False, 0], ['61a8a', 'DAL180  ', 'United States', 1710000000, 1710000000, -23.5541, 44.7951, 9490, False, 260, 171, 0, None, 9640, '1000', False, 0], ['61a8b', 'THY001  ', 'Turkey', 1710000000, 1710000000, -60.8406, 40.4995, 11091, False, 235, 247, 0, None, 11241, '1000', False, 0], ['61a8c', 'LOT026  ', 'Poland', 1710000000, 1710000000, 17.051, 51.2825, 9687, False, 255, 186, 0, None, 9837, '1000', False, 0], ['61a8d', 'SAS909  ', 'Sweden', 1710000000, 1710000000, -1.0035, 55.6058, 9651, False, 251, 26, 0, None, 9801, '1000', False, 0], ['61a8e', 'FIN005  ', 'Finland', 1710000000, 1710000000, -12.1864, 52.6021, 10941, False, 258, 9, 0, None, 11091, '1000', False, 0], ['61a8f', 'AUA087  ', 'Austria', 1710000000, 1710000000, -33.1047, 43.8744, 10962, False, 248, 160, 0, None, 11112, '1000', False, 0], ['61a90', 'SWR016  ', 'Switzerland', 1710000000, 1710000000, -50.3219, 42.3406, 9805, False, 245, 344, 0, None, 9955, '1000', False, 0], ['61a91', 'IBE625  ', 'Spain', 1710000000, 1710000000, -65.7356, 40.9719, 9172, False, 224, 107, 0, None, 9322, '1000', False, 0], ['61a92', 'TAP201  ', 'Portugal', 1710000000, 1710000000, -13.2048, 39.3522, 9906, False, 242, 202, 0, None, 10056, '1000', False, 0], ['61a93', 'AUI111  ', 'Ukraine', 1710000000, 1710000000, 28.7191, 50.7892, 9562, False, 243, 211, 0, None, 9712, '1000', False, 0], ['61a94', 'CPA251  ', 'Hong Kong', 1710000000, 1710000000, 67.7993, 33.4756, 11410, False, 252, 159, 0, None, 11560, '1000', False, 0], ['61a95', 'QFA001  ', 'Australia', 1710000000, 1710000000, 64.6764, 14.8714, 9635, False, 241, 209, 0, None, 9785, '1000', False, 0], ['61a96', 'ANZ002  ', 'New Zealand', 1710000000, 1710000000, -42.2592, 15.9794, 10692, False, 242, 260, 0, None, 10842, '1000', False, 0], ['61a97', 'LAN500  ', 'Chile', 1710000000, 1710000000, -79.6458, 20.88, 11372, False, 244, 71, 0, None, 11522, '1000', False, 0], ['61a98', 'TAM808  ', 'Brazil', 1710000000, 1710000000, -48.2493, -18.4481, 10682, False, 224, 189, 0, None, 10832, '1000', False, 0], ['61a99', 'ETH500  ', 'Ethiopia', 1710000000, 1710000000, 9.368, 16.3328, 9872, False, 228, 261, 0, None, 10022, '1000', False, 0], ['61a9a', 'SAA203  ', 'South Africa', 1710000000, 1710000000, -14.4549, 1.5315, 9978, False, 225, 348, 0, None, 10128, '1000', False, 0], ['61a9b', 'MSR985  ', 'Egypt', 1710000000, 1710000000, -30.4029, 36.7752, 11368, False, 234, 301, 0, None, 11518, '1000', False, 0], ['61a9c', 'AIC101  ', 'India', 1710000000, 1710000000, -37.1472, 37.3948, 10788, False, 221, 355, 0, None, 10938, '1000', False, 0], ['61a9d', 'JAL004  ', 'Japan', 1710000000, 1710000000, -58.9885, 40.4079, 9523, False, 225, 281, 0, None, 9673, '1000', False, 0], ['61a9e', 'CAL008  ', 'Taiwan', 1710000000, 1710000000, 97.3437, 25.9491, 10562, False, 241, 281, 0, None, 10712, '1000', False, 0], ['61a9f', 'EVA028  ', 'Taiwan', 1710000000, 1710000000, 55.2215, 28.173, 10854, False, 231, 105, 0, None, 11004, '1000', False, 0], ['61aa0', 'MAS002  ', 'Malaysia', 1710000000, 1710000000, 56.4974, 24.5651, 11410, False, 259, 328, 0, None, 11560, '1000', False, 0], ['61aa1', 'THA910  ', 'Thailand', 1710000000, 1710000000, 39.2336, 36.4048, 11352, False, 249, 77, 0, None, 11502, '1000', False, 0], ['61aa2', 'GIA088  ', 'Indonesia', 1710000000, 1710000000, 27.2933, 39.6318, 9519, False, 232, 162, 0, None, 9669, '1000', False, 0], ['61aa3', 'PAL102  ', 'Philippines', 1710000000, 1710000000, -106.8107, 32.5243, 9347, False, 233, 105, 0, None, 9497, '1000', False, 0], ['61aa4', 'VNM037  ', 'Vietnam', 1710000000, 1710000000, 94.3604, 24.9983, 11014, False, 256, 284, 0, None, 11164, '1000', False, 0], ['61aa5', 'KZR921  ', 'Kazakhstan', 1710000000, 1710000000, 53.1034, 50.4649, 11349, False, 243, 151, 0, None, 11499, '1000', False, 0], ['61aa6', 'UZB247  ', 'Uzbekistan', 1710000000, 1710000000, 50.4017, 40.9143, 9516, False, 219, 149, 0, None, 9666, '1000', False, 0], ['61aa7', 'GEO381  ', 'Georgia', 1710000000, 1710000000, 20.0749, 48.7042, 11069, False, 224, 83, 0, None, 11219, '1000', False, 0], ['61aa8', 'AZE003  ', 'Azerbaijan', 1710000000, 1710000000, 9.2119, 49.6491, 11120, False, 210, 172, 0, None, 11270, '1000', False, 0], ['61aa9', 'ARM125  ', 'Armenia', 1710000000, 1710000000, 4.0382, 48.5534, 10505, False, 238, 13, 0, None, 10655, '1000', False, 0], ['61aaa', 'ISR001  ', 'Israel', 1710000000, 1710000000, 19.9386, 33.5458, 10259, False, 222, 207, 0, None, 10409, '1000', False, 0], ['61aab', 'RJA261  ', 'Jordan', 1710000000, 1710000000, 1.811, 34.1959, 10908, False, 223, 234, 0, None, 11058, '1000', False, 0], ['61aac', 'MEA211  ', 'Lebanon', 1710000000, 1710000000, 19.6561, 41.1008, 10613, False, 232, 170, 0, None, 10763, '1000', False, 0], ['61aad', 'RAM200  ', 'Morocco', 1710000000, 1710000000, -50.5449, 38.1997, 11287, False, 252, 222, 0, None, 11437, '1000', False, 0], ['61aae', 'TAR712  ', 'Tunisia', 1710000000, 1710000000, 4.1252, 46.4897, 10263, False, 255, 87, 0, None, 10413, '1000', False, 0], ['61aaf', 'DAH100  ', 'Algeria', 1710000000, 1710000000, 2.8408, 48.4578, 10263, False, 239, 204, 0, None, 10413, '1000', False, 0], ['61ab0', 'WZZ100  ', 'Hungary', 1710000000, 1710000000, 15.7322, 47.9674, 9812, False, 233, 185, 0, None, 9962, '1000', False, 0], ['61ab1', 'RYR200  ', 'Ireland', 1710000000, 1710000000, 5.6852, 49.0003, 10424, False, 240, 131, 0, None, 10574, '1000', False, 0]]}

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

async def fetch_flights_data() -> Optional[Dict[str, Any]]:
    """
    Fetches real-time flight telemetry from Flightradar24 global live feed,
    converting to OpenSky-compatible state vectors format.
    Falls back to OpenSky Network if needed.
    """
    fr24_url = "https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=75,-60,-170,170"
    fr24_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }
    now_ts = int(datetime.now(timezone.utc).timestamp())
    
    # 1. Primary: Flightradar24 worldwide live radar
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(fr24_url, headers=fr24_headers)
            if resp.status_code == 200:
                data = resp.json()
                states = []
                for k, v in data.items():
                    if k in ("full_count", "version", "stats") or not isinstance(v, list) or len(v) < 14:
                        continue
                    icao24 = str(v[0]).lower()
                    lat = float(v[1])
                    lng = float(v[2])
                    heading = float(v[3]) if v[3] is not None else 0.0
                    alt_meters = float(v[4]) * 0.3048 if v[4] else 10000.0
                    speed_ms = float(v[5]) * 0.514444 if v[5] else 230.0
                    callsign = str(v[13] or v[16] or v[0]).strip()
                    on_ground = bool(v[14]) if len(v) > 14 else False
                    
                    origin = v[11] if len(v) > 11 and v[11] else ""
                    dest = v[12] if len(v) > 12 and v[12] else ""
                    airline = v[18] if len(v) > 18 and v[18] else ""
                    
                    if origin and dest:
                        origin_country = f"{origin} → {dest}" + (f" ({airline})" if airline else "")
                    elif airline:
                        origin_country = f"Airline: {airline}"
                    elif len(v) > 8 and v[8]:
                        origin_country = f"Aircraft: {v[8]}"
                    else:
                        origin_country = "Commercial Aviation"
                        
                    states.append([
                        icao24,
                        callsign,
                        origin_country,
                        now_ts,
                        now_ts,
                        lng,
                        lat,
                        alt_meters,
                        on_ground,
                        speed_ms,
                        heading,
                        0.0,
                        None,
                        alt_meters,
                        None,
                        False,
                        0
                    ])
                if len(states) > 0:
                    logger.info(f"Successfully fetched {len(states)} live flights from Flightradar24")
                    return {"time": now_ts, "states": states}
    except Exception as e:
        logger.warning(f"Flightradar24 fetch failed: {e}")

    # 2. Secondary fallback: OpenSky Network (short 3.0s timeout)
    try:
        opensky_url = "https://opensky-network.org/api/states/all?lamin=20&lamax=65&lomin=-125&lomax=45"
        opensky_headers = {"User-Agent": "TerraScope/1.0 (https://terrascope.app)"}
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(opensky_url, headers=opensky_headers)
            if resp.status_code == 200:
                parsed = resp.json()
                if isinstance(parsed, dict) and "states" in parsed:
                    return parsed
    except Exception as e:
        logger.warning(f"OpenSky fallback fetch failed: {e}")

    return None

@router.get("/flights")
async def get_flights(db: AsyncSession = Depends(database.get_db)):
    """
    Fetches live commercial flight state vectors with real-time positioning.
    Uses worldwide telemetry feeds with database-backed caching to prevent rate limits.

    Cache TTL: 45 Seconds.
    """
    cache_key = "flights_live_v3"
    ttl_seconds = 45
    now = datetime.now(timezone.utc)
    
    # Fast path: Check SQLite cache table for unexpired entry
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
            
        data = await fetch_flights_data()
        if data is None:
            if cache_entry:
                return Response(content=cache_entry.data, media_type="application/json")
            data = FALLBACK_FLIGHTS
            
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
