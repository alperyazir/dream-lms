"""
Unit tests for dcs_publisher_id field on User model.
Story 25.1: Backend User Model DCS Publisher Link
"""
import pytest
from sqlmodel import Session

from app import crud
from app.models import UserCreate, UserUpdate, UserPublic, UserRole


def test_create_user_without_dcs_publisher_id(session: Session) -> None:
    """Test creating user without dcs_publisher_id defaults to None."""
    # Arrange
    user_create = UserCreate(
        email="test@example.com",
        username="testuser",
        password="password123",
        role=UserRole.student,
    )

    # Act
    user = crud.create_user(session=session, user_create=user_create)

    # Assert
    assert user.dcs_publisher_id is None


def test_create_user_with_dcs_publisher_id(session: Session) -> None:
    """Test creating user with dcs_publisher_id."""
    # Arrange
    user_create = UserCreate(
        email="publisher@example.com",
        username="publisheruser",
        password="password123",
        role=UserRole.publisher,
        dcs_publisher_id=12345,
    )

    # Act
    user = crud.create_user(session=session, user_create=user_create)

    # Assert
    assert user.dcs_publisher_id == 12345
    assert user.role == UserRole.publisher


def test_dcs_publisher_id_exposed_in_user_public(session: Session) -> None:
    """Test that dcs_publisher_id is exposed in UserPublic schema."""
    # Arrange
    user_create = UserCreate(
        email="publisher2@example.com",
        username="publisheruser2",
        password="password123",
        role=UserRole.publisher,
        dcs_publisher_id=67890,
    )
    user = crud.create_user(session=session, user_create=user_create)

    # Act
    user_public = UserPublic.model_validate(user)

    # Assert
    assert user_public.dcs_publisher_id == 67890


def test_dcs_publisher_id_none_in_user_public(session: Session) -> None:
    """Test that dcs_publisher_id is None in UserPublic when not set."""
    # Arrange
    user_create = UserCreate(
        email="student@example.com",
        username="studentuser",
        password="password123",
        role=UserRole.student,
    )
    user = crud.create_user(session=session, user_create=user_create)

    # Act
    user_public = UserPublic.model_validate(user)

    # Assert
    assert user_public.dcs_publisher_id is None


def test_update_user_dcs_publisher_id(session: Session) -> None:
    """Test updating dcs_publisher_id via UserUpdate."""
    # Arrange
    user_create = UserCreate(
        email="updatetest@example.com",
        username="updatetestuser",
        password="password123",
        role=UserRole.publisher,
    )
    user = crud.create_user(session=session, user_create=user_create)
    assert user.dcs_publisher_id is None

    # Act
    user_update = UserUpdate(dcs_publisher_id=99999)
    updated_user = crud.update_user(session=session, db_user=user, user_in=user_update)

    # Assert
    assert updated_user.dcs_publisher_id == 99999


def test_update_user_clear_dcs_publisher_id(session: Session) -> None:
    """Test clearing dcs_publisher_id by setting to None."""
    # Arrange
    user_create = UserCreate(
        email="cleartest@example.com",
        username="cleartestuser",
        password="password123",
        role=UserRole.publisher,
        dcs_publisher_id=11111,
    )
    user = crud.create_user(session=session, user_create=user_create)
    assert user.dcs_publisher_id == 11111

    # Act - UserUpdate with explicit None should not clear the field
    # (because we only update fields that are explicitly provided)
    user_update = UserUpdate(full_name="Updated Name")
    updated_user = crud.update_user(session=session, db_user=user, user_in=user_update)

    # Assert - dcs_publisher_id should remain unchanged
    assert updated_user.dcs_publisher_id == 11111
    assert updated_user.full_name == "Updated Name"


def test_dcs_publisher_id_field_exists_on_user_create_schema() -> None:
    """Test that dcs_publisher_id field exists on UserCreate schema."""
    # Arrange & Act
    user_create = UserCreate(
        email="schema@example.com",
        username="schemauser",
        password="password123",
        role=UserRole.publisher,
        dcs_publisher_id=22222,
    )

    # Assert
    assert hasattr(user_create, 'dcs_publisher_id')
    assert user_create.dcs_publisher_id == 22222


def test_dcs_publisher_id_field_exists_on_user_update_schema() -> None:
    """Test that dcs_publisher_id field exists on UserUpdate schema."""
    # Arrange & Act
    user_update = UserUpdate(dcs_publisher_id=33333)

    # Assert
    assert hasattr(user_update, 'dcs_publisher_id')
    assert user_update.dcs_publisher_id == 33333


def test_existing_user_unaffected_by_new_field(session: Session) -> None:
    """Test that users created without dcs_publisher_id work correctly."""
    # Arrange - simulate existing user (created without dcs_publisher_id)
    user_create = UserCreate(
        email="existing@example.com",
        username="existinguser",
        password="password123",
        role=UserRole.teacher,
    )

    # Act
    user = crud.create_user(session=session, user_create=user_create)

    # Assert - user works normally, field defaults to None
    assert user.id is not None
    assert user.email == "existing@example.com"
    assert user.role == UserRole.teacher
    assert user.dcs_publisher_id is None

    # Verify user can still be updated
    user_update = UserUpdate(full_name="Teacher Name")
    updated = crud.update_user(session=session, db_user=user, user_in=user_update)
    assert updated.full_name == "Teacher Name"
    assert updated.dcs_publisher_id is None
