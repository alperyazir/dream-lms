"""
Authentication service layer for business logic.
Handles user authentication, token payload building, and token blacklisting.
"""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models.publisher import Publisher
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole

# In-memory token blacklist for MVP
# Note: This will reset on server restart. For production, use Redis with TTL.
blacklisted_tokens: set = set()


async def authenticate_user(email: str, password: str, db: AsyncSession) -> Optional[User]:
    """
    Authenticate user with email and password.

    Args:
        email: User email address
        password: Plain text password
        db: Async database session

    Returns:
        User object if authentication succeeds, None otherwise
        (Returns None without leaking whether user exists for security)
    """
    # Query user by email
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # Return None if user doesn't exist (don't leak user existence)
    if not user:
        return None

    # Return None if password doesn't match (don't leak user existence)
    if not verify_password(password, user.password_hash):
        return None

    # Return None if user is inactive
    if not user.is_active:
        return None

    return user


async def build_token_payload(user: User, db: AsyncSession) -> dict:
    """
    Build JWT payload with user info and role-specific IDs.

    Args:
        user: Authenticated User object
        db: Async database session

    Returns:
        Dictionary containing user_id, email, role, and role-specific ID
    """
    payload = {
        "user_id": str(user.id),
        "email": user.email,
        "role": user.role.value,
    }

    # Add role-specific ID based on user role
    if user.role == UserRole.publisher:
        stmt = select(Publisher).where(Publisher.user_id == user.id)
        result = await db.execute(stmt)
        publisher = result.scalar_one_or_none()
        if publisher:
            payload["publisher_id"] = str(publisher.id)

    elif user.role == UserRole.teacher:
        stmt = select(Teacher).where(Teacher.user_id == user.id)
        result = await db.execute(stmt)
        teacher = result.scalar_one_or_none()
        if teacher:
            payload["teacher_id"] = str(teacher.id)

    elif user.role == UserRole.student:
        stmt = select(Student).where(Student.user_id == user.id)
        result = await db.execute(stmt)
        student = result.scalar_one_or_none()
        if student:
            payload["student_id"] = str(student.id)

    return payload


def logout_user(refresh_token: str) -> None:
    """
    Invalidate refresh token by adding it to blacklist.

    Args:
        refresh_token: Refresh token to blacklist

    Note:
        In-memory blacklist will reset on server restart.
        For production with multiple server instances, use Redis.
    """
    blacklisted_tokens.add(refresh_token)


def is_token_blacklisted(token: str) -> bool:
    """
    Check if a token is blacklisted.

    Args:
        token: Token to check

    Returns:
        True if token is blacklisted, False otherwise
    """
    return token in blacklisted_tokens
