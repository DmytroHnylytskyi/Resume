"""3D Furniture & Architectural Configurator (Forma-3D) FastAPI Application Entry Point.

Configures:
    - FastAPI application instance with lifespan startup/shutdown management.
    - CORS middleware with support for localhost and local network Wi-Fi IP devices.
    - X-Request-ID correlation tracking middleware for distributed request tracing.
    - SlowAPI rate limiting to prevent brute-force authentication attacks.
    - Core feature routers (auth, projects).
    - System health check (/health) and root discovery (/) endpoints.

Author: 3D Furniture Configurator Team
"""

import os
import uuid
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .database import Base, engine
from .routers import auth, projects

load_dotenv()

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["300/minute"])


import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("forma-3d-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager handling asynchronous database schema initialization."""
    logger.info("Initializing database schema on startup...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized successfully.")
    yield
    logger.info("Disposing database connection engine on shutdown...")
    await engine.dispose()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="Forma-3D Architectural Configurator API",
    description="Asynchronous REST API for 3D furniture customization, user authentication, and cloud scene storage.",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Register Rate Limiter exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next) -> Response:
    """Attaches a unique X-Request-ID to every HTTP request and response for traceability."""
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    response: Response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# Configure Cross-Origin Resource Sharing (CORS)
frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173",
)
allowed_origins = [origin.strip() for origin in frontend_url.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register feature routers
app.include_router(auth.router)
app.include_router(projects.router)


@app.get("/health", tags=["system"], summary="Health check endpoint")
async def health_check():
    """System health check endpoint for container orchestrators and uptime monitoring."""
    return {"status": "ok", "service": "forma-3d-api", "version": "2.0.0"}


@app.get("/", tags=["system"], summary="Root service discovery")
async def root():
    """Root endpoint providing links to interactive API documentation."""
    return {
        "message": "Welcome to Forma-3D Architectural Configurator API",
        "docs": "/docs",
        "health": "/health",
    }
