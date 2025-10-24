"""
Dream LMS Backend API - Main Application Entry Point
FastAPI application with CORS middleware and health check endpoint.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.routers import admin, auth

settings = get_settings()

app = FastAPI(
    title="Dream LMS API",
    version="0.1.0",
    description="Dream LMS Backend API for Learning Management System",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add rate limiting state and exception handler
app.state.limiter = auth.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(admin.router)


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint.
    Returns service status, name, and version.
    """
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
    }


@app.get("/")
async def root():
    """Root endpoint - redirects to API documentation."""
    return {
        "message": "Dream LMS API",
        "version": settings.app_version,
        "docs": "/docs",
    }
