import logging
import sentry_sdk
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.services.webhook_registration import webhook_registration_service

logger = logging.getLogger(__name__)


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

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
