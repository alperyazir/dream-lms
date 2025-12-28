"""Tests for utility functions."""

import pytest
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import User, UserCreate, UserRole
from app.utils import generate_username_from_name


def test_generate_username_basic(session: Session) -> None:
    """Test basic username generation from full name."""
    username = generate_username_from_name("John Doe", session)
    assert username == "john.doe"


def test_generate_username_with_accents(session: Session) -> None:
    """Test username generation removes accents."""
    username = generate_username_from_name("José García", session)
    assert username == "jose.garcia"


def test_generate_username_with_special_chars(session: Session) -> None:
    """Test username generation removes special characters."""
    username = generate_username_from_name("O'Neill-Smith", session)
    assert username == "oneillsmith"


def test_generate_username_with_multiple_spaces(session: Session) -> None:
    """Test username generation handles multiple spaces."""
    username = generate_username_from_name("John   Paul   Doe", session)
    assert username == "john.paul.doe"


def test_generate_username_uniqueness(session: Session) -> None:
    """Test username generation ensures uniqueness by appending numbers."""
    # Create first user with john.doe
    user1 = UserCreate(
        email="john1@example.com",
        username="john.doe",
        password="Test123!",
        full_name="John Doe",
        role=UserRole.student,
    )
    crud.create_user(session=session, user_create=user1)

    # Generate username for another "John Doe" - should get john.doe.2
    username = generate_username_from_name("John Doe", session)
    assert username == "john.doe.2"

    # Create second user
    user2 = UserCreate(
        email="john2@example.com",
        username=username,
        password="Test123!",
        full_name="John Doe",
        role=UserRole.student,
    )
    crud.create_user(session=session, user_create=user2)

    # Generate for third "John Doe" - should get john.doe.3
    username = generate_username_from_name("John Doe", session)
    assert username == "john.doe.3"


def test_generate_username_short_name(session: Session) -> None:
    """Test username generation handles very short names."""
    username = generate_username_from_name("Jo", session)
    # Should pad with 'user' to meet minimum length
    assert len(username) >= 3
    assert username == "jouser"


def test_generate_username_long_name(session: Session) -> None:
    """Test username generation truncates long names."""
    long_name = "A" * 100
    username = generate_username_from_name(long_name, session, max_length=50)
    assert len(username) <= 50


def test_generate_username_with_numbers(session: Session) -> None:
    """Test username generation preserves numbers."""
    username = generate_username_from_name("John Doe 2nd", session)
    assert username == "john.doe.2nd"


def test_generate_username_leading_trailing_dots(session: Session) -> None:
    """Test username generation removes leading/trailing dots."""
    username = generate_username_from_name(".John Doe.", session)
    assert not username.startswith(".")
    assert not username.endswith(".")


def test_generate_username_consecutive_dots(session: Session) -> None:
    """Test username generation removes consecutive dots."""
    username = generate_username_from_name("John...Doe", session)
    assert ".." not in username
    assert "..." not in username
