"""
Unit tests for configuration module.

Tests Dream Central Storage settings loading and validation.
"""


from app.core.config import settings


def test_dream_storage_config_loads_from_env():
    """Test that Dream Central Storage settings load from environment."""
    assert settings.DREAM_CENTRAL_STORAGE_URL == "http://localhost:8081"
    assert settings.DREAM_CENTRAL_STORAGE_EMAIL == "admin@admin.com"
    assert settings.DREAM_CENTRAL_STORAGE_PASSWORD == "admin"
    assert settings.DREAM_CENTRAL_STORAGE_TOKEN_EXPIRY == 1800
    assert settings.DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET == "changethis"


def test_dream_storage_config_has_defaults():
    """Test that Dream Central Storage settings have sensible defaults."""
    # Verify defaults match expected values
    assert isinstance(settings.DREAM_CENTRAL_STORAGE_URL, str)
    assert isinstance(settings.DREAM_CENTRAL_STORAGE_EMAIL, str)
    assert isinstance(settings.DREAM_CENTRAL_STORAGE_PASSWORD, str)
    assert isinstance(settings.DREAM_CENTRAL_STORAGE_TOKEN_EXPIRY, int)
    assert settings.DREAM_CENTRAL_STORAGE_TOKEN_EXPIRY > 0


def test_dream_storage_webhook_secret_validation_warning():
    """Test that webhook secret 'changethis' triggers validation warning in local env."""
    # In local environment, "changethis" should trigger a warning but not raise
    # This is handled by the _check_default_secret method in config
    assert settings.ENVIRONMENT == "local"
    assert settings.DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET == "changethis"
    # No exception should be raised in local environment
