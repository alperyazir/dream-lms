import logging
import os
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.api.main import api_router
from app.core.config import settings
from app.core.rate_limit import limiter

# Note: Publisher sync no longer needed - publishers managed via DCS caching service
from app.services.webhook_registration import webhook_registration_service

logger = logging.getLogger(__name__)


class BotBlockerMiddleware(BaseHTTPMiddleware):
    """Silently block common bot/scanner requests to reduce log noise."""

    BLOCKED_PATHS = {"/api/clients", "/api/client"}

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.BLOCKED_PATHS:
            return Response(status_code=404)
        return await call_next(request)


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Runs on startup and shutdown.
    """
    # Startup
    logger.info("Starting Dream LMS backend...")

    # Log email configuration status
    if settings.emails_enabled:
        logger.info(f"✅ Email enabled via SMTP: {settings.SMTP_HOST}")
    else:
        logger.warning("⚠️  Email disabled - SMTP not configured. New users will receive passwords in UI.")

    # Register webhooks with Dream Central Storage
    logger.info("Attempting to register webhooks with Dream Central Storage...")
    try:
        result = await webhook_registration_service.register_webhook()
        if result["success"]:
            logger.info(f"✅ {result['message']}")
        else:
            logger.warning(f"⚠️  Webhook registration failed: {result['message']}")
            logger.warning("   You can manually register via admin sync endpoint")
    except Exception as e:
        logger.error(f"❌ Error during webhook registration: {e}")
        logger.warning("   Webhook registration will be skipped. Use admin sync endpoint to register manually.")

    # Note: Publishers no longer synced to local DB - managed via DCS caching service
    # Publishers are fetched on-demand from DCS and cached (see publisher_service_v2.py)
    logger.info("Publisher data will be fetched on-demand from Dream Central Storage")

    # Optional: Warm up cache for common data
    if settings.DCS_CACHE_WARMUP_ENABLED:
        from app.services.book_service_v2 import get_book_service
        from app.services.dcs_cache import get_dcs_cache
        from app.services.publisher_service_v2 import get_publisher_service

        cache = get_dcs_cache()
        publisher_service = get_publisher_service()
        book_service = get_book_service()

        try:
            # Pre-fetch publishers
            logger.info("Warming up cache: fetching publishers...")
            await publisher_service.list_publishers()
            logger.info("✅ Cache warmed: publishers")

            # Note: Book list can be large, only warmup if needed
            # Uncomment if you want to pre-fetch all books at startup:
            # logger.info("Warming up cache: fetching books...")
            # await book_service.list_books()
            # logger.info("✅ Cache warmed: books")
        except Exception as e:
            logger.warning(f"⚠️  Cache warmup failed: {e}")
            logger.warning("   Cache will be populated on-demand")

    yield

    # Shutdown
    logger.info("Shutting down Dream LMS backend...")


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)

# Add rate limiter to app state (Story 4.8 QA Fix)
app.state.limiter = limiter


# Rate limit exception handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    """Handle rate limit exceeded errors with proper HTTP 429 response."""
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."},
    )


# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],  # Expose filename header to browser
    )

# Add SlowAPI middleware for rate limiting (Story 4.8 QA Fix)
app.add_middleware(SlowAPIMiddleware)

# Block common bot/scanner paths to reduce log noise
app.add_middleware(BotBlockerMiddleware)

# Mount static files directory for serving uploaded content (logos, etc.)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "logos"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(api_router, prefix=settings.API_V1_STR)
