"""Lumina Learning Platform Main Application Entry Point.

Configures FastAPI application instance, lifespan events, CORS middleware,
X-Request-ID correlation tracking, static file serving, rate limiting, and core routers.
"""

import os
import uuid
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .database import async_engine, Base
from .routers import analytics, auth, courses, teacher

load_dotenv()

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager handling application startup and graceful shutdown."""
    os.makedirs("uploads", exist_ok=True)
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await async_engine.dispose()


app = FastAPI(
    title="Lumina Learning Platform API",
    description="Asynchronous Full-stack LMS REST API with RBAC, lesson progression, and course assignments.",
    version="2.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
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


# Static file serving for uploads
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173,http://localhost:3000,https://lumina-five-rose.vercel.app",
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

from fastapi.responses import FileResponse

# Register feature routers (both root and /api prefixes)
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(teacher.router)
app.include_router(analytics.router)

app.include_router(auth.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(teacher.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.get("/health", tags=["system"], summary="Health check endpoint")
@app.get("/api/health", tags=["system"], summary="API health check alias")
async def health_check():
    """System health check endpoint for container orchestrators and uptime monitoring."""
    return {"status": "ok", "service": "lumina-api", "version": "2.0.0"}


# Serve Vite SPA Frontend if built
if os.path.exists("dist"):
    if os.path.exists("dist/assets"):
        app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join("dist", full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join("dist", "index.html"))
else:
    @app.get("/", tags=["system"], summary="Root service discovery")
    async def root():
        """Root endpoint providing links to interactive API documentation."""
        return {"message": "Welcome to Lumina Learning Platform API", "docs": "/docs"}
