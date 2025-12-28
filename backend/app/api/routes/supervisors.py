"""
Supervisor management endpoints (Story 14.2)

CRUD operations for Supervisor users.
- List/Get: Accessible by Admin and Supervisor
- Create/Update/Delete/Reset Password: Admin only
"""
import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlmodel import or_, select

from app.api.deps import AdminOrSupervisor, AsyncSessionDep, SessionDep, require_role
from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    NotificationType,
    PasswordResetResponse,
    SupervisorCreateAPI,
    SupervisorCreateResponse,
    SupervisorPublic,
    SupervisorUpdate,
    User,
    UserPublic,
    UserRole,
)
from app.services import notification_service
from app.utils import (
    generate_new_account_email,
    generate_password_reset_by_admin_email,
    generate_temp_password,
    send_email,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/supervisors", tags=["supervisors"])

# Admin-only dependency for CUD operations
AdminOnly = require_role(UserRole.admin)


# ============================================================================
# List and Get Supervisors (Admin or Supervisor can access)
# ============================================================================


@router.get(
    "",
    response_model=list[SupervisorPublic],
    summary="List all supervisors",
    description="Retrieve all supervisors with optional search and pagination. Admin or Supervisor.",
)
def list_supervisors(
    *,
    session: SessionDep,
    current_user: User = AdminOrSupervisor,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
) -> Any:
    """
    List all supervisor users.

    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum number of records to return (default: 100)
    - **search**: Optional search string to filter by name or email
    """
    query = select(User).where(User.role == UserRole.supervisor)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.username.ilike(search_pattern),
            )
        )

    query = query.offset(skip).limit(limit)
    supervisors = session.exec(query).all()

    return [
        SupervisorPublic(
            id=s.id,
            full_name=s.full_name,
            email=s.email,
            username=s.username,
            is_active=s.is_active,
            created_at=None,  # User model doesn't have created_at
            must_change_password=s.must_change_password,
        )
        for s in supervisors
    ]


@router.get(
    "/{supervisor_id}",
    response_model=SupervisorPublic,
    summary="Get supervisor by ID",
    description="Retrieve a single supervisor by ID. Admin or Supervisor.",
)
def get_supervisor(
    *,
    session: SessionDep,
    supervisor_id: uuid.UUID,
    current_user: User = AdminOrSupervisor,
) -> Any:
    """
    Get a supervisor by ID.

    Returns 404 if supervisor not found or user is not a supervisor.
    """
    user = session.get(User, supervisor_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supervisor not found"
        )

    if user.role != UserRole.supervisor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supervisor not found"
        )

    return SupervisorPublic(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        username=user.username,
        is_active=user.is_active,
        created_at=None,  # User model doesn't have created_at
        must_change_password=user.must_change_password,
    )


# ============================================================================
# Create Supervisor (Admin only)
# ============================================================================


@router.post(
    "",
    response_model=SupervisorCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new supervisor",
    description="Creates a new supervisor user. Admin only.",
)
async def create_supervisor(
    *,
    session: AsyncSessionDep,
    supervisor_in: SupervisorCreateAPI,
    current_user: User = AdminOnly,
) -> Any:
    """
    Create a new supervisor user.

    - **username**: Unique username (3-50 chars)
    - **user_email**: Optional email address
    - **full_name**: Full name of the supervisor

    Returns the created supervisor with initial password.
    Admin only - Supervisors cannot create other Supervisors.
    """
    # Check email uniqueness if provided
    if supervisor_in.user_email:
        existing_email = await session.execute(
            select(User).where(User.email == supervisor_in.user_email)
        )
        if existing_email.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists"
            )

    # Check username uniqueness
    existing_username = await session.execute(
        select(User).where(User.username == supervisor_in.username)
    )
    if existing_username.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this username already exists"
        )

    # Generate temporary password
    temp_password = generate_temp_password(length=12)

    # Create the supervisor user
    new_user = User(
        id=uuid.uuid4(),
        email=supervisor_in.user_email,
        username=supervisor_in.username,
        hashed_password=get_password_hash(temp_password),
        full_name=supervisor_in.full_name,
        role=UserRole.supervisor,
        is_active=True,
        must_change_password=True,
    )

    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    # Send welcome email if email provided
    password_emailed = False
    message = ""

    if supervisor_in.user_email and settings.emails_enabled:
        try:
            email_data = generate_new_account_email(
                email_to=supervisor_in.user_email,
                username=supervisor_in.username,
                password=temp_password,
                full_name=supervisor_in.full_name,
            )
            send_email(
                email_to=supervisor_in.user_email,
                subject=email_data.subject,
                html_content=email_data.html_content,
            )
            password_emailed = True
            message = f"Welcome email sent to {supervisor_in.user_email}"
            temp_password = None  # Don't return password if emailed
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
            message = "Supervisor created. Email could not be sent - share the password manually."
    else:
        if not supervisor_in.user_email:
            message = "Supervisor created. No email provided - share the password manually."
        else:
            message = "Supervisor created. Email is disabled - share the password manually."

    logger.info(
        f"Supervisor created: Admin {current_user.username} created supervisor "
        f"{new_user.username} (ID: {new_user.id})"
    )

    return SupervisorCreateResponse(
        user=UserPublic.model_validate(new_user),
        temporary_password=temp_password,
        password_emailed=password_emailed,
        message=message,
    )


# ============================================================================
# Update Supervisor (Admin only)
# ============================================================================


@router.patch(
    "/{supervisor_id}",
    response_model=SupervisorPublic,
    summary="Update a supervisor",
    description="Update a supervisor by ID. Admin only.",
)
def update_supervisor(
    *,
    session: SessionDep,
    supervisor_id: uuid.UUID,
    supervisor_in: SupervisorUpdate,
    current_user: User = AdminOnly,
) -> Any:
    """
    Update a supervisor by ID.

    Admin only - Supervisors cannot modify other Supervisors.
    """
    user = session.get(User, supervisor_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supervisor not found"
        )

    if user.role != UserRole.supervisor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supervisor not found"
        )

    # Validate email uniqueness if changed
    if supervisor_in.email and supervisor_in.email != user.email:
        existing = session.exec(
            select(User).where(User.email == supervisor_in.email)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists"
            )

    # Validate username uniqueness if changed
    if supervisor_in.username and supervisor_in.username != user.username:
        existing = session.exec(
            select(User).where(User.username == supervisor_in.username)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this username already exists"
            )

    # Update fields
    update_data = supervisor_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    session.add(user)
    session.commit()
    session.refresh(user)

    logger.info(
        f"Supervisor updated: Admin {current_user.username} updated supervisor "
        f"{user.username} (ID: {user.id})"
    )

    return SupervisorPublic(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        username=user.username,
        is_active=user.is_active,
        created_at=None,  # User model doesn't have created_at
        must_change_password=user.must_change_password,
    )


# ============================================================================
# Delete Supervisor (Admin only)
# ============================================================================


@router.delete(
    "/{supervisor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a supervisor",
    description="Delete a supervisor by ID. Admin only.",
)
def delete_supervisor(
    *,
    session: SessionDep,
    supervisor_id: uuid.UUID,
    current_user: User = AdminOnly,
) -> None:
    """
    Delete a supervisor by ID.

    Admin only - Supervisors cannot delete other Supervisors.
    Self-deletion returns 403.
    """
    user = session.get(User, supervisor_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supervisor not found"
        )

    if user.role != UserRole.supervisor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supervisor not found"
        )

    # Check self-deletion
    if user.id == current_user.id:
        logger.warning(
            f"Deletion blocked (self-deletion): Admin {current_user.username} "
            f"attempted to delete themselves (supervisor ID: {supervisor_id})"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot delete your own account"
        )

    logger.info(
        f"Supervisor deleted: Admin {current_user.username} deleted supervisor "
        f"{user.username} (ID: {user.id})"
    )

    session.delete(user)
    session.commit()


# ============================================================================
# Password Reset (Admin only)
# ============================================================================


@router.post(
    "/{supervisor_id}/reset-password",
    response_model=PasswordResetResponse,
    summary="Reset supervisor password",
    description="Reset a supervisor's password. Admin only.",
)
async def reset_supervisor_password(
    *,
    session: AsyncSessionDep,
    supervisor_id: uuid.UUID,
    current_user: User = AdminOnly,
) -> Any:
    """
    Reset a supervisor's password.

    - Generates new secure password
    - Sets must_change_password = True
    - Sends email if configured, otherwise returns password

    Admin only - Supervisors cannot reset passwords of other Supervisors.
    """
    result = await session.execute(
        select(User).where(User.id == supervisor_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supervisor not found"
        )

    if user.role != UserRole.supervisor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supervisor not found"
        )

    # Generate new password
    new_password = generate_temp_password(length=12)
    user.hashed_password = get_password_hash(new_password)
    user.must_change_password = True

    session.add(user)
    await session.commit()

    # Create notification for the user
    await notification_service.create_notification(
        db=session,
        user_id=user.id,
        notification_type=NotificationType.password_reset,
        title="Password Reset",
        message="Your password has been reset by an administrator. Please log in with your new password.",
    )

    # Send email if possible
    password_emailed = False
    message = ""
    returned_password = new_password

    if user.email and settings.emails_enabled:
        try:
            email_content = generate_password_reset_by_admin_email(
                full_name=user.full_name or user.username,
                new_password=new_password,
            )
            send_email(
                email_to=user.email,
                subject=email_content["subject"],
                html_content=email_content["html_content"],
            )
            password_emailed = True
            message = f"New password sent to {user.email}"
            returned_password = None  # Don't return password if emailed
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            message = "Password reset. Email could not be sent - share the password manually."
    else:
        if not user.email:
            message = "Password reset. No email on file - share the password manually."
        else:
            message = "Password reset. Email is disabled - share the password manually."

    logger.info(
        f"Password reset: Admin {current_user.username} reset password for supervisor "
        f"{user.username} (ID: {user.id})"
    )

    return PasswordResetResponse(
        success=True,
        message=message,
        password_emailed=password_emailed,
        temporary_password=returned_password,
    )
