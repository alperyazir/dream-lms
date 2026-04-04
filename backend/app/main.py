import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import ORJSONResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.api.main import api_router
from app.core.config import settings
from app.core.rate_limit import limiter
from app.services.redis_cache import close_redis, init_redis

# Note: Publisher sync no longer needed - publishers managed via DCS caching service
from app.services.webhook_registration import webhook_registration_service

logger = logging.getLogger(__name__)


class RequestTimingMiddleware:
    """Pure ASGI middleware — log slow requests (>500ms) without BaseHTTPMiddleware overhead."""

    SLOW_THRESHOLD_MS = 500

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        status_code = 0

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        await self.app(scope, receive, send_wrapper)

        duration_ms = (time.perf_counter() - start) * 1000
        if duration_ms > self.SLOW_THRESHOLD_MS:
            request = Request(scope)
            logger.warning(
                "SLOW %s %s → %d (%.0fms)",
                request.method,
                request.url.path,
                status_code,
                duration_ms,
            )


class BotBlockerMiddleware:
    """Pure ASGI middleware — silently block common bot/scanner requests."""

    BLOCKED_PATHS = {"/api/clients", "/api/client"}

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope["path"] in self.BLOCKED_PATHS:
            await send({"type": "http.response.start", "status": 404, "headers": []})
            await send({"type": "http.response.body", "body": b""})
            return
        await self.app(scope, receive, send)


# ─── Prometheus Metrics ─────────────────────────────────────
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)
REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)
REQUESTS_IN_PROGRESS = Gauge(
    "http_requests_in_progress",
    "Number of HTTP requests in progress",
)


def _normalize_path(path: str) -> str:
    """Collapse dynamic path segments to prevent high-cardinality labels."""
    import re
    # Replace UUIDs
    path = re.sub(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        ":id", path,
    )
    # Replace numeric IDs
    path = re.sub(r"/\d+(?=/|$)", "/:id", path)
    return path


class PrometheusMiddleware:
    """Pure ASGI middleware — track request count, duration, and in-progress."""

    SKIP_PATHS = {"/metrics", "/health", "/version"}

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if path in self.SKIP_PATHS:
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        endpoint = _normalize_path(path)
        status_code = 0

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        REQUESTS_IN_PROGRESS.inc()
        start = time.perf_counter()
        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration = time.perf_counter() - start
            REQUESTS_IN_PROGRESS.dec()
            status_group = f"{status_code // 100}xx"
            REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status_group).inc()
            REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Runs on startup and shutdown.
    """
    # Startup
    logger.info("Starting Flow Learn backend...")

    # Connect to Redis cache
    await init_redis()

    # Create arq pool for background task queue
    from arq import create_pool

    from app.worker import REDIS_SETTINGS

    app.state.arq_pool = await create_pool(REDIS_SETTINGS)

    # Register webhooks with Dream Central Storage (background retry, single worker only)
    # Gunicorn spawns multiple workers — use a file lock to avoid duplicate registrations
    import tempfile

    lock_path = os.path.join(tempfile.gettempdir(), "fl_webhook_registered")
    if not os.path.exists(lock_path):
        try:
            with open(lock_path, "w") as f:
                f.write(str(os.getpid()))
        except OSError:
            pass

        async def _register_webhooks_with_retry():
            max_retries = 10
            retry_delay = 30
            for attempt in range(1, max_retries + 1):
                logger.info(
                    f"Attempting webhook registration with FCS (attempt {attempt}/{max_retries})..."
                )
                try:
                    result = await webhook_registration_service.register_webhook()
                    if result["success"]:
                        logger.info(f"✅ {result['message']}")
                        return
                    else:
                        logger.warning(
                            f"⚠️  Webhook registration failed: {result['message']}"
                        )
                except Exception as e:
                    logger.error(f"❌ Error during webhook registration: {e}")

                if attempt < max_retries:
                    logger.info(f"   Retrying in {retry_delay}s...")
                    await asyncio.sleep(retry_delay)

            logger.error(
                "❌ Webhook registration failed after all retries. "
                "Use admin sync endpoint to register manually."
            )

        asyncio.create_task(_register_webhooks_with_retry())
    else:
        logger.debug("Webhook registration skipped — already handled by another worker")

    # Note: Publishers no longer synced to local DB - managed via DCS caching service
    # Publishers are fetched on-demand from DCS and cached (see publisher_service_v2.py)
    logger.info("Publisher data will be fetched on-demand from Dream Central Storage")

    # Optional: Warm up cache for common data
    if settings.DCS_CACHE_WARMUP_ENABLED:
        from app.services.book_service_v2 import get_book_service
        from app.services.dcs_cache import get_dcs_cache
        from app.services.publisher_service_v2 import get_publisher_service

        get_dcs_cache()
        publisher_service = get_publisher_service()
        get_book_service()

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
    logger.info("Shutting down Flow Learn backend...")
    # Clean up webhook lock file
    import tempfile

    lock_path = os.path.join(tempfile.gettempdir(), "fl_webhook_registered")
    if os.path.exists(lock_path):
        try:
            os.remove(lock_path)
        except OSError:
            pass
    await app.state.arq_pool.close()
    await close_redis()


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

# Add rate limiter to app state (Story 4.8 QA Fix)
app.state.limiter = limiter


def _read_version() -> str:
    try:
        with open("/app/VERSION") as f:
            return f.read().strip()
    except FileNotFoundError:
        return "dev"


@app.get("/version", tags=["system"])
def get_version():
    return {"service": "flow-learn", "version": _read_version()}


@app.get("/metrics", include_in_schema=False)
def metrics():
    from starlette.responses import Response
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


# Rate limit exception handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceeded errors with proper HTTP 429 response."""
    # slowapi may pass ConnectionError (Redis down) instead of RateLimitExceeded —
    # fail open by letting the request through
    if not hasattr(exc, "detail"):
        logger.warning("Rate limiter Redis unavailable — failing open")
        return None  # type: ignore[return-value]
    retry_after = getattr(exc, "retry_after", 60)
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded. Try again in {retry_after} seconds.",
            "retry_after": retry_after,
        },
        headers={"Retry-After": str(retry_after)},
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


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "0"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
    return response


# Add SlowAPI middleware for rate limiting (Story 4.8 QA Fix)
# Skip middleware entirely when disabled — avoids BaseHTTPMiddleware overhead
if settings.RATE_LIMIT_ENABLED:
    app.add_middleware(SlowAPIMiddleware)

# Block common bot/scanner paths to reduce log noise
app.add_middleware(BotBlockerMiddleware)

# Prometheus metrics — track request count, duration, in-progress
app.add_middleware(PrometheusMiddleware)

# Log slow requests (>500ms) — outermost to capture full request time
app.add_middleware(RequestTimingMiddleware)

# Mount static files directory for serving uploaded content (logos, etc.)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "logos"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(api_router, prefix=settings.API_V1_STR)
