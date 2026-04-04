"""
Rate limiting configuration for the application.

Uses slowapi backed by Redis for per-user and per-IP rate limiting.
Fail-open: if Redis is unavailable, requests are allowed through.
"""

import logging

import jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.core.config import settings

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"


def get_user_id_or_ip(request: Request) -> str:
    """Extract user ID from JWT for authenticated requests, IP for anonymous."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except (jwt.InvalidTokenError, Exception):
            pass
    return f"ip:{get_remote_address(request)}"


class RateLimits:
    AUTH = settings.RATE_LIMIT_AUTH
    AI = settings.RATE_LIMIT_AI
    WRITE = settings.RATE_LIMIT_WRITE
    READ = settings.RATE_LIMIT_READ
    ADMIN = settings.RATE_LIMIT_ADMIN
    UPLOAD = settings.RATE_LIMIT_UPLOAD


limiter = Limiter(
    key_func=get_user_id_or_ip,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    storage_uri=settings.RATE_LIMIT_REDIS_URL,
    strategy="fixed-window",
    enabled=settings.RATE_LIMIT_ENABLED,
)
