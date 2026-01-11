from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from cryptography.fernet import Fernet, InvalidToken
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fernet cipher for reversible password encryption (student passwords)
_fernet_cipher: Fernet | None = None


def _get_fernet() -> Fernet:
    """Get or create Fernet cipher instance."""
    global _fernet_cipher
    if _fernet_cipher is None:
        if not settings.PASSWORD_ENCRYPTION_KEY:
            raise ValueError(
                "PASSWORD_ENCRYPTION_KEY not configured. "
                "Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        _fernet_cipher = Fernet(settings.PASSWORD_ENCRYPTION_KEY.encode())
    return _fernet_cipher


def encrypt_viewable_password(plain_password: str) -> str:
    """
    Encrypt password for reversible storage (student passwords).

    Uses Fernet symmetric encryption (AES-128-CBC).

    Args:
        plain_password: The plain text password to encrypt

    Returns:
        Base64-encoded encrypted password string
    """
    fernet = _get_fernet()
    return fernet.encrypt(plain_password.encode()).decode()


def decrypt_viewable_password(encrypted_password: str) -> str | None:
    """
    Decrypt password for viewing (student passwords).

    Args:
        encrypted_password: The encrypted password string

    Returns:
        Plain text password, or None if decryption fails
    """
    try:
        fernet = _get_fernet()
        return fernet.decrypt(encrypted_password.encode()).decode()
    except (InvalidToken, ValueError):
        return None


ALGORITHM = "HS256"


def create_access_token(subject: str | Any, expires_delta: timedelta, extra_claims: dict[str, Any] | None = None) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"exp": expire, "sub": str(subject)}
    if extra_claims:
        to_encode.update(extra_claims)
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
