"""
TerraScope FastAPI Backend Application Entrypoint.

Initializes async SQLite database schemas, configures CORS middleware,
rate limiting (SlowAPI), X-Request-ID correlation tracking,
and mounts API sub-routers (/api/auth, /api/layers, /api/views).
"""

import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .database import engine, Base
from .routers import auth, layers, views

# Initialize SlowAPI Rate Limiter using client IP
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

# Shared HTTPX AsyncClient instance across application lifespan
http_client: httpx.AsyncClient = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.
    Handles async startup database initialization and HTTP connection pool setup/teardown.
    """
    global http_client
    # Startup: Initialize database tables asynchronously
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    http_client = httpx.AsyncClient(timeout=15.0)
    layers.set_http_client(http_client)
    yield
    # Shutdown: Close HTTP client connection pool gracefully
    if http_client:
        await http_client.aclose()

app = FastAPI(
    title="TerraScope API",
    description="High-performance async FastAPI backend service providing cached geospatial 3D data layers and JWT user session management.",
    version="1.0.0",
    lifespan=lifespan
)

# Attach Rate Limiter state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Correlation Request-ID & Performance Header Middleware
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    """Injects unique X-Request-ID header to trace every HTTP transaction."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    response: Response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

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

# Mount application sub-routers
app.include_router(auth.router, prefix="/api/auth")
app.include_router(layers.router, prefix="/api/layers")
app.include_router(views.router, prefix="/api/views")

@app.get("/health", tags=["Health Check"])
async def health_check():
    """
    Dedicated Kubernetes/Docker Container Health Check endpoint.
    
    Returns:
        dict: Service health status and platform metadata.
    """
    return {
        "status": "healthy",
        "service": "TerraScope API",
        "version": "1.0.0"
    }

@app.get("/", tags=["Health Check"])
def root():
    """
    Root API welcome endpoint.
    
    Returns:
        dict: Welcome message and link to OpenAPI interactive documentation (/docs).
    """
    return {
        "status": "online",
        "service": "TerraScope 3D Geospatial Intelligence Platform",
        "docs": "/docs",
        "health": "/health"
    }
