"""arq worker settings for background task processing."""

from arq.connections import RedisSettings

from app.core.config import settings

# Use Redis DB 1 for arq (DB 0 is cache)
REDIS_SETTINGS = RedisSettings.from_dsn(settings.REDIS_URL.replace("/0", "/1"))


async def startup(ctx: dict) -> None:
    """Worker startup — create async DB engine + session factory."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    engine = create_async_engine(
        str(settings.SQLALCHEMY_DATABASE_URI),
        pool_size=5,
        max_overflow=5,
        pool_pre_ping=True,
    )
    ctx["db_engine"] = engine
    ctx["db_session_factory"] = async_sessionmaker(engine, expire_on_commit=False)


async def shutdown(ctx: dict) -> None:
    """Worker shutdown — dispose DB engine."""
    await ctx["db_engine"].dispose()


class WorkerSettings:
    """arq worker configuration."""

    from app.tasks.messaging import (
        task_create_system_message,
        task_create_system_messages_bulk,
    )

    functions = [task_create_system_message, task_create_system_messages_bulk]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = REDIS_SETTINGS
    max_jobs = 20
    job_timeout = 60
    max_tries = 3
    retry_delay = 5  # seconds
