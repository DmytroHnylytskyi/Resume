"""
GlobeScope FastAPI Backend Application Entrypoint.

Initializes SQLite database schemas, configures CORS middleware,
and mounts API sub-routers (/api/auth, /api/layers, /api/views).
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from .database import engine, Base
from .routers import auth, layers, views

# Shared HTTPX AsyncClient instance across application lifespan
http_client: httpx.AsyncClient = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.
    Handles startup database initialization and HTTP client pool setup/teardown.
    """
    global http_client
    # Startup: Initialize database tables & connection pool
    Base.metadata.create_all(bind=engine)
    http_client = httpx.AsyncClient(timeout=15.0)
    layers.set_http_client(http_client)
    yield
    # Shutdown: Close HTTP client connection pool gracefully
    if http_client:
        await http_client.aclose()

app = FastAPI(
    title="GlobeScope API",
    description="High-performance FastAPI backend service providing cached geospatial data layers and JWT user session management.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure Cross-Origin Resource Sharing (CORS) with explicit origins
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount application routers
app.include_router(auth.router, prefix="/api/auth")
app.include_router(layers.router, prefix="/api/layers")
app.include_router(views.router, prefix="/api/views")

@app.get("/", tags=["Health Check"])
def root():
    """
    Root API health check endpoint.
    
    Returns:
        dict: Welcome message and link to OpenAPI interactive documentation (/docs).
    """
    return {
        "status": "online",
        "message": "Welcome to GlobeScope API",
        "docs": "/docs"
    }
