"""
Application configuration using Pydantic Settings.
Loads environment variables from .env file.
"""

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = Field(default="Dream LMS API", alias="APP_NAME")
    app_version: str = Field(default="0.1.0", alias="APP_VERSION")

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://dream_user:dream_pass@postgres:5432/dream_lms",
        alias="DATABASE_URL",
    )
    alembic_database_url: str = Field(
        default="postgresql+psycopg://dream_user:dream_pass@postgres:5432/dream_lms",
        alias="ALEMBIC_DATABASE_URL",
    )

    # JWT Authentication
    jwt_secret_key: str = Field(
        default="change_this_to_a_random_secret_key", alias="JWT_SECRET_KEY"
    )
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_access_token_expire_minutes: int = Field(
        default=60, alias="JWT_ACCESS_TOKEN_EXPIRE_MINUTES"
    )

    # CORS
    cors_origins: str = Field(default="http://localhost:5173", alias="CORS_ORIGINS")

    # Dream Central Storage Integration (Story 2.1)
    dream_storage_api_url: str = Field(
        default="http://localhost:8000", alias="DREAM_STORAGE_API_URL"
    )
    dream_storage_admin_email: str = Field(
        default="admin@dreamcentral.com", alias="DREAM_STORAGE_ADMIN_EMAIL"
    )
    dream_storage_admin_password: str = Field(
        default="secure_password_here", alias="DREAM_STORAGE_ADMIN_PASSWORD"
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance (singleton pattern).
    Uses lru_cache to ensure settings are loaded only once.
    """
    return Settings()
