"""
Tests for password encryption utilities - Story 28.1
"""
from unittest.mock import patch, MagicMock

import pytest


class TestPasswordEncryption:
    """Tests for encrypt_viewable_password and decrypt_viewable_password functions."""

    def test_encrypt_decrypt_round_trip(self):
        """Test that encrypting and decrypting returns original password."""
        # Mock settings with a valid Fernet key
        mock_settings = MagicMock()
        # Generate a valid Fernet key for testing
        from cryptography.fernet import Fernet
        test_key = Fernet.generate_key().decode()
        mock_settings.PASSWORD_ENCRYPTION_KEY = test_key

        with patch("app.core.security.settings", mock_settings):
            # Reset the cached cipher
            import app.core.security as security_module
            security_module._fernet_cipher = None

            from app.core.security import encrypt_viewable_password, decrypt_viewable_password

            original_password = "mysecretpassword123"

            # Encrypt
            encrypted = encrypt_viewable_password(original_password)

            # Verify encrypted value is different from original
            assert encrypted != original_password

            # Decrypt
            decrypted = decrypt_viewable_password(encrypted)

            # Verify decrypted matches original
            assert decrypted == original_password

            # Clean up
            security_module._fernet_cipher = None

    def test_encrypt_raises_without_key(self):
        """Test that encrypt raises error when PASSWORD_ENCRYPTION_KEY is not set."""
        mock_settings = MagicMock()
        mock_settings.PASSWORD_ENCRYPTION_KEY = None

        with patch("app.core.security.settings", mock_settings):
            # Reset the cached cipher
            import app.core.security as security_module
            security_module._fernet_cipher = None

            from app.core.security import encrypt_viewable_password

            with pytest.raises(ValueError) as exc_info:
                encrypt_viewable_password("test")

            assert "PASSWORD_ENCRYPTION_KEY not configured" in str(exc_info.value)

            # Clean up
            security_module._fernet_cipher = None

    def test_decrypt_returns_none_for_invalid_token(self):
        """Test that decrypt returns None for invalid encrypted data."""
        mock_settings = MagicMock()
        from cryptography.fernet import Fernet
        test_key = Fernet.generate_key().decode()
        mock_settings.PASSWORD_ENCRYPTION_KEY = test_key

        with patch("app.core.security.settings", mock_settings):
            # Reset the cached cipher
            import app.core.security as security_module
            security_module._fernet_cipher = None

            from app.core.security import decrypt_viewable_password

            # Try to decrypt invalid data
            result = decrypt_viewable_password("invalid_encrypted_data")

            assert result is None

            # Clean up
            security_module._fernet_cipher = None

    def test_encrypt_produces_different_output_for_same_input(self):
        """Test that encryption is non-deterministic (Fernet uses random IV)."""
        mock_settings = MagicMock()
        from cryptography.fernet import Fernet
        test_key = Fernet.generate_key().decode()
        mock_settings.PASSWORD_ENCRYPTION_KEY = test_key

        with patch("app.core.security.settings", mock_settings):
            # Reset the cached cipher
            import app.core.security as security_module
            security_module._fernet_cipher = None

            from app.core.security import encrypt_viewable_password

            password = "samepassword"

            encrypted1 = encrypt_viewable_password(password)
            encrypted2 = encrypt_viewable_password(password)

            # Same password should produce different ciphertext due to random IV
            assert encrypted1 != encrypted2

            # Clean up
            security_module._fernet_cipher = None

    def test_empty_password_encryption(self):
        """Test encryption handles empty password."""
        mock_settings = MagicMock()
        from cryptography.fernet import Fernet
        test_key = Fernet.generate_key().decode()
        mock_settings.PASSWORD_ENCRYPTION_KEY = test_key

        with patch("app.core.security.settings", mock_settings):
            # Reset the cached cipher
            import app.core.security as security_module
            security_module._fernet_cipher = None

            from app.core.security import encrypt_viewable_password, decrypt_viewable_password

            empty_password = ""

            encrypted = encrypt_viewable_password(empty_password)
            decrypted = decrypt_viewable_password(encrypted)

            assert decrypted == empty_password

            # Clean up
            security_module._fernet_cipher = None

    def test_unicode_password_encryption(self):
        """Test encryption handles unicode characters."""
        mock_settings = MagicMock()
        from cryptography.fernet import Fernet
        test_key = Fernet.generate_key().decode()
        mock_settings.PASSWORD_ENCRYPTION_KEY = test_key

        with patch("app.core.security.settings", mock_settings):
            # Reset the cached cipher
            import app.core.security as security_module
            security_module._fernet_cipher = None

            from app.core.security import encrypt_viewable_password, decrypt_viewable_password

            unicode_password = "şifre123çöğü"

            encrypted = encrypt_viewable_password(unicode_password)
            decrypted = decrypt_viewable_password(encrypted)

            assert decrypted == unicode_password

            # Clean up
            security_module._fernet_cipher = None
