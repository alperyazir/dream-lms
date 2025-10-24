"""
Unit tests for authentication service layer.
Tests authenticate_user, build_token_payload, and token blacklist functionality.
"""

import pytest

from app.core.security import hash_password
from app.models.publisher import Publisher
from app.models.school import School
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole
from app.services.auth_service import (
    authenticate_user,
    build_token_payload,
    is_token_blacklisted,
    logout_user,
)


@pytest.mark.asyncio
class TestAuthenticateUser:
    """Test user authentication functionality."""

    async def test_authenticate_user_valid_credentials(self, db_session):
        """Test authenticate_user returns user with valid credentials."""
        # Create test user with known password
        password = "TestPassword123"
        user = User(
            email="test@example.com",
            password_hash=hash_password(password),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        # Authenticate with valid credentials
        authenticated_user = await authenticate_user("test@example.com", password, db_session)

        assert authenticated_user is not None
        assert authenticated_user.email == "test@example.com"
        assert authenticated_user.role == UserRole.admin

    async def test_authenticate_user_invalid_password(self, db_session):
        """Test authenticate_user returns None with invalid password."""
        # Create test user
        user = User(
            email="test@example.com",
            password_hash=hash_password("TestPassword123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        # Attempt authentication with wrong password
        authenticated_user = await authenticate_user(
            "test@example.com", "WrongPassword", db_session
        )

        assert authenticated_user is None

    async def test_authenticate_user_nonexistent_email(self, db_session):
        """Test authenticate_user returns None for non-existent email."""
        # No user created
        authenticated_user = await authenticate_user(
            "nonexistent@example.com", "SomePassword123", db_session
        )

        assert authenticated_user is None

    async def test_authenticate_user_inactive_user(self, db_session):
        """Test authenticate_user returns None for inactive user."""
        # Create inactive user
        password = "TestPassword123"
        user = User(
            email="inactive@example.com",
            password_hash=hash_password(password),
            role=UserRole.admin,
            is_active=False,  # Inactive user
        )
        db_session.add(user)
        await db_session.commit()

        # Attempt authentication
        authenticated_user = await authenticate_user("inactive@example.com", password, db_session)

        assert authenticated_user is None


@pytest.mark.asyncio
class TestBuildTokenPayload:
    """Test JWT token payload building with role-specific IDs."""

    async def test_build_token_payload_admin(self, db_session):
        """Test token payload for admin user (no role-specific ID)."""
        # Create admin user
        user = User(
            email="admin@example.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        # Build payload
        payload = await build_token_payload(user, db_session)

        assert payload["user_id"] == str(user.id)
        assert payload["email"] == "admin@example.com"
        assert payload["role"] == "admin"
        # Admin has no role-specific ID
        assert "publisher_id" not in payload
        assert "teacher_id" not in payload
        assert "student_id" not in payload

    async def test_build_token_payload_publisher(self, db_session):
        """Test token payload includes publisher_id for publisher user."""
        # Create publisher user
        user = User(
            email="publisher@example.com",
            password_hash=hash_password("PublisherPass123"),
            role=UserRole.publisher,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        # Create publisher record
        publisher = Publisher(
            user_id=user.id,
            name="Test Publishing Co",
        )
        db_session.add(publisher)
        await db_session.commit()
        await db_session.refresh(publisher)

        # Build payload
        payload = await build_token_payload(user, db_session)

        assert payload["user_id"] == str(user.id)
        assert payload["email"] == "publisher@example.com"
        assert payload["role"] == "publisher"
        assert payload["publisher_id"] == str(publisher.id)

    async def test_build_token_payload_teacher(self, db_session):
        """Test token payload includes teacher_id for teacher user."""
        # Create publisher user for school
        pub_user = User(
            email="pub@example.com",
            password_hash=hash_password("PubPass123"),
            role=UserRole.publisher,
            is_active=True,
        )
        db_session.add(pub_user)
        await db_session.commit()
        await db_session.refresh(pub_user)

        # Create publisher
        publisher = Publisher(user_id=pub_user.id, name="Test Publisher")
        db_session.add(publisher)
        await db_session.commit()
        await db_session.refresh(publisher)

        # Create school
        school = School(publisher_id=publisher.id, name="Test School")
        db_session.add(school)
        await db_session.commit()
        await db_session.refresh(school)

        # Create teacher user
        user = User(
            email="teacher@example.com",
            password_hash=hash_password("TeacherPass123"),
            role=UserRole.teacher,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        # Create teacher record
        teacher = Teacher(
            user_id=user.id,
            school_id=school.id,
        )
        db_session.add(teacher)
        await db_session.commit()
        await db_session.refresh(teacher)

        # Build payload
        payload = await build_token_payload(user, db_session)

        assert payload["user_id"] == str(user.id)
        assert payload["email"] == "teacher@example.com"
        assert payload["role"] == "teacher"
        assert payload["teacher_id"] == str(teacher.id)

    async def test_build_token_payload_student(self, db_session):
        """Test token payload includes student_id for student user."""
        # Create student user
        user = User(
            email="student@example.com",
            password_hash=hash_password("StudentPass123"),
            role=UserRole.student,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        # Create student record
        student = Student(
            user_id=user.id,
        )
        db_session.add(student)
        await db_session.commit()
        await db_session.refresh(student)

        # Build payload
        payload = await build_token_payload(user, db_session)

        assert payload["user_id"] == str(user.id)
        assert payload["email"] == "student@example.com"
        assert payload["role"] == "student"
        assert payload["student_id"] == str(student.id)


class TestTokenBlacklist:
    """Test token blacklist functionality for logout."""

    def test_logout_user_adds_to_blacklist(self):
        """Test logout_user adds token to blacklist."""
        token = "test_refresh_token_123"

        # Initially not blacklisted
        assert is_token_blacklisted(token) is False

        # Logout (add to blacklist)
        logout_user(token)

        # Now blacklisted
        assert is_token_blacklisted(token) is True

    def test_is_token_blacklisted_false_for_new_token(self):
        """Test new tokens are not blacklisted."""
        token = "brand_new_token_456"
        assert is_token_blacklisted(token) is False

    def test_logout_user_multiple_tokens(self):
        """Test multiple tokens can be blacklisted independently."""
        token1 = "token_one_789"
        token2 = "token_two_101"

        logout_user(token1)

        assert is_token_blacklisted(token1) is True
        assert is_token_blacklisted(token2) is False

        logout_user(token2)

        assert is_token_blacklisted(token1) is True
        assert is_token_blacklisted(token2) is True
