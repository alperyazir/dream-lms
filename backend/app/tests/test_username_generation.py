"""Unit tests for username generation utility."""

import pytest
from sqlmodel import Session

from app.utils import generate_username
from app import crud
from app.models import UserCreate, UserRole


def test_generate_username_from_full_name(session: Session) -> None:
    """Basic username generation: 'John Doe' -> 'jdoe'"""
    username = generate_username("John Doe", session)
    assert username == "jdoe"


def test_generate_username_handles_duplicates(session: Session) -> None:
    """Duplicate names get incremented: jdoe, jdoe1, jdoe2"""
    # Create first user with username "jdoe"
    user1 = crud.create_user(
        session=session,
        user_create=UserCreate(
            email="john1@example.com",
            username="jdoe",
            password="password123",
            full_name="John Doe",
            role=UserRole.student
        )
    )
    assert user1.username == "jdoe"

    # Generate username for another "John Doe" - should be jdoe1
    username2 = generate_username("John Doe", session)
    assert username2 == "jdoe1"

    # Create second user with jdoe1
    user2 = crud.create_user(
        session=session,
        user_create=UserCreate(
            email="john2@example.com",
            username=username2,
            password="password123",
            full_name="John Doe",
            role=UserRole.student
        )
    )
    assert user2.username == "jdoe1"

    # Generate username for third "John Doe" - should be jdoe2
    username3 = generate_username("John Doe", session)
    assert username3 == "jdoe2"


def test_generate_username_single_name(session: Session) -> None:
    """Single name: 'Madonna' -> 'madonna'"""
    username = generate_username("Madonna", session)
    assert username == "madonna"


def test_generate_username_special_characters(session: Session) -> None:
    """Special chars stripped: 'José García' -> 'jgarcia'"""
    username = generate_username("José García", session)
    assert username == "jgarcia"


def test_generate_username_empty_name_raises(session: Session) -> None:
    """Empty full_name raises ValueError"""
    with pytest.raises(ValueError, match="Full name cannot be empty"):
        generate_username("", session)

    with pytest.raises(ValueError, match="Full name cannot be empty"):
        generate_username("   ", session)


def test_generate_username_with_multiple_spaces(session: Session) -> None:
    """Multiple spaces handled: 'John   Doe' -> 'jdoe'"""
    username = generate_username("John   Doe", session)
    assert username == "jdoe"


def test_generate_username_with_middle_name(session: Session) -> None:
    """Middle name ignored: 'John Michael Doe' -> 'jdoe' (first initial + last name)"""
    username = generate_username("John Michael Doe", session)
    assert username == "jdoe"


def test_generate_username_special_chars_only_raises(session: Session) -> None:
    """Name with only special characters raises ValueError"""
    with pytest.raises(ValueError, match="Full name must contain at least one valid character"):
        generate_username("@#$%", session)
