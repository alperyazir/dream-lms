"""
Pytest configuration and fixtures for backend tests.
"""

import os
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.main import app

# Test database URL - use environment variable or default
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:password@localhost:5432/dreamlms"
)


@pytest.fixture
async def client():
    """
    Create an async test client for the FastAPI application.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(scope="function")
async def db_session():
    """
    Create a test database session.
    Creates all tables before each test and drops them after.
    """
    # Create async engine for test database
    test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session factory
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    # Provide session to test
    async with async_session() as session:
        yield session

    # Drop all tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    # Dispose engine
    await test_engine.dispose()
