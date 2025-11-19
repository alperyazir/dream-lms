"""
Unit tests for user CRUD operations with username field
"""
import pytest
from fastapi import HTTPException
from sqlmodel import Session

from app import crud
from app.models import UserCreate, UserRole


def test_create_user_with_valid_username_succeeds(session: Session) -> None:
    """Test creating user with valid username succeeds."""
    # Arrange
    user_create = UserCreate(
        email="test@example.com",
        username="validuser123",
        password="password123",
        role=UserRole.student,
    )

    # Act
    user = crud.create_user(session=session, user_create=user_create)

    # Assert
    assert user.email == "test@example.com"
    assert user.username == "validuser123"
    assert user.role == UserRole.student


def test_create_user_with_duplicate_username_fails(session: Session) -> None:
    """Test creating user with duplicate username fails with 400."""
    # Arrange
    user1 = UserCreate(
        email="user1@example.com",
        username="duplicate",
        password="password123",
        role=UserRole.student,
    )
    crud.create_user(session=session, user_create=user1)

    user2 = UserCreate(
        email="user2@example.com",
        username="duplicate",
        password="password456",
        role=UserRole.student,
    )

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        crud.create_user(session=session, user_create=user2)

    assert exc_info.value.status_code == 400
    assert "Username already taken" in str(exc_info.value.detail)


def test_create_user_with_duplicate_email_fails(session: Session) -> None:
    """Test creating user with duplicate email fails with 400."""
    # Arrange
    user1 = UserCreate(
        email="duplicate@example.com",
        username="user1",
        password="password123",
        role=UserRole.student,
    )
    crud.create_user(session=session, user_create=user1)

    user2 = UserCreate(
        email="duplicate@example.com",
        username="user2",
        password="password456",
        role=UserRole.student,
    )

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        crud.create_user(session=session, user_create=user2)

    assert exc_info.value.status_code == 400
    assert "Email already registered" in str(exc_info.value.detail)


def test_create_user_with_short_username_fails_validation(session: Session) -> None:
    """Test creating user with username < 3 chars fails validation."""
    # Act & Assert
    # Pydantic validation should raise ValidationError before it reaches CRUD
    from pydantic import ValidationError
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(
            email="test@example.com",
            username="ab",  # Only 2 characters
            password="password123",
            role=UserRole.student,
        )

    assert "at least 3 characters" in str(exc_info.value).lower()


def test_create_user_with_long_username_fails_validation(session: Session) -> None:
    """Test creating user with username > 50 chars fails validation."""
    # Arrange
    long_username = "a" * 51  # 51 characters

    # Act & Assert
    from pydantic import ValidationError
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(
            email="test@example.com",
            username=long_username,
            password="password123",
            role=UserRole.student,
        )

    assert "at most 50 characters" in str(exc_info.value).lower()


def test_create_user_with_invalid_characters_in_username_fails(session: Session) -> None:
    """Test creating user with invalid characters in username fails."""
    # Arrange - username with spaces and special characters
    invalid_usernames = [
        "user name",  # Space
        "user@name",  # @ symbol
        "user.name",  # Dot
        "user#name",  # Hash
        "user!name",  # Exclamation
    ]

    # Act & Assert
    from pydantic import ValidationError
    for invalid_username in invalid_usernames:
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                username=invalid_username,
                password="password123",
                role=UserRole.student,
            )

        assert "letters, numbers, underscores, and hyphens" in str(exc_info.value).lower()


def test_get_user_by_username_returns_correct_user(session: Session) -> None:
    """Test get_user_by_username() returns correct user."""
    # Arrange
    user_create = UserCreate(
        email="find@example.com",
        username="findme",
        password="password123",
        role=UserRole.student,
    )
    created_user = crud.create_user(session=session, user_create=user_create)

    # Act
    found_user = crud.get_user_by_username(session=session, username="findme")

    # Assert
    assert found_user is not None
    assert found_user.id == created_user.id
    assert found_user.username == "findme"
    assert found_user.email == "find@example.com"


def test_get_user_by_username_returns_none_for_nonexistent(session: Session) -> None:
    """Test get_user_by_username() returns None for non-existent username."""
    # Act
    found_user = crud.get_user_by_username(session=session, username="nonexistent")

    # Assert
    assert found_user is None
