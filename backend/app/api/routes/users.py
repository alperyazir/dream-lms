import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import func, select
from starlette.requests import Request

from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.core.rate_limit import RateLimits, limiter
from app.core.security import (
    encrypt_viewable_password,
    get_password_hash,
    verify_password,
)
from app.models import (
    ChangeInitialPasswordRequest,
    ChangePasswordResponse,
    Message,
    UpdatePassword,
    User,
    UserCreate,
    UserPublic,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
)
from app.services.cache_events import invalidate_for_event_sync

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UsersPublic,
)
@limiter.limit(RateLimits.READ)
def read_users(
    request: Request, session: SessionDep, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve users.
    """

    count_statement = select(func.count()).select_from(User)
    count = session.exec(count_statement).one()

    statement = select(User).offset(skip).limit(limit)
    users = session.exec(statement).all()

    return UsersPublic(data=users, count=count)


@router.post(
    "/", dependencies=[Depends(get_current_active_superuser)], response_model=UserPublic
)
@limiter.limit(RateLimits.WRITE)
def create_user(request: Request, *, session: SessionDep, user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    user = crud.create_user(session=session, user_create=user_in)
    return user


@router.patch("/me", response_model=UserPublic)
@limiter.limit(RateLimits.WRITE)
def update_user_me(
    request: Request,
    *,
    session: SessionDep,
    user_in: UserUpdateMe,
    current_user: CurrentUser,
) -> Any:
    """
    Update own user.
    """
    user_data = user_in.model_dump(exclude_unset=True)
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    invalidate_for_event_sync("user_profile_updated", user_id=str(current_user.id))
    return current_user


@router.patch("/me/password", response_model=Message)
@limiter.limit(RateLimits.WRITE)
def update_password_me(
    request: Request,
    *,
    session: SessionDep,
    body: UpdatePassword,
    current_user: CurrentUser,
) -> Any:
    """
    Update own password.
    Also clears must_change_password flag if set.
    All roles (including students) can change their own password.
    """
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    hashed_password = get_password_hash(body.new_password)
    current_user.hashed_password = hashed_password
    current_user.must_change_password = False
    try:
        current_user.viewable_password_encrypted = encrypt_viewable_password(
            body.new_password
        )
    except ValueError:
        pass
    session.add(current_user)
    session.commit()
    invalidate_for_event_sync("user_profile_updated", user_id=str(current_user.id))
    return Message(message="Password updated successfully")


@router.post("/me/change-initial-password", response_model=ChangePasswordResponse)
@limiter.limit(RateLimits.WRITE)
def change_initial_password(
    request: Request,
    *,
    session: SessionDep,
    current_user: CurrentUser,
    body: ChangeInitialPasswordRequest,
) -> ChangePasswordResponse:
    """
    Change password for first login (when must_change_password is true).
    Also works as a general password change.

    - Validates current password
    - Updates to new password
    - Clears must_change_password flag

    All roles (including students) can change their own password.
    """
    # Verify current password
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Validate new password is different
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password",
        )

    # Update password and clear must_change_password flag
    current_user.hashed_password = get_password_hash(body.new_password)
    current_user.must_change_password = False
    try:
        current_user.viewable_password_encrypted = encrypt_viewable_password(
            body.new_password
        )
    except ValueError:
        pass
    session.add(current_user)
    session.commit()
    invalidate_for_event_sync("user_profile_updated", user_id=str(current_user.id))

    return ChangePasswordResponse(success=True, message="Password changed successfully")


@router.post("/me/complete-tour", response_model=Message)
@limiter.limit(RateLimits.WRITE)
def complete_tour(
    request: Request, session: SessionDep, current_user: CurrentUser
) -> Message:
    """
    Mark onboarding tour as completed for the current user.
    This endpoint is idempotent - calling multiple times is safe.
    """
    current_user.has_completed_tour = True
    session.add(current_user)
    session.commit()
    invalidate_for_event_sync("user_profile_updated", user_id=str(current_user.id))
    return Message(message="Tour completed successfully")


@router.get("/me", response_model=UserPublic)
@limiter.limit(RateLimits.READ)
def read_user_me(request: Request, current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return current_user


@router.delete("/me", response_model=Message)
@limiter.limit(RateLimits.WRITE)
def delete_user_me(
    request: Request, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Delete own user.
    """
    if current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    invalidate_for_event_sync("user_profile_updated", user_id=str(current_user.id))
    session.delete(current_user)
    session.commit()
    return Message(message="User deleted successfully")


@router.get("/{user_id}", response_model=UserPublic)
@limiter.limit(RateLimits.READ)
def read_user_by_id(
    request: Request, user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    user = session.get(User, user_id)
    if user == current_user:
        return user
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="The user doesn't have enough privileges",
        )
    return user


@router.patch(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
@limiter.limit(RateLimits.WRITE)
def update_user(
    request: Request,
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    user_in: UserUpdate,
) -> Any:
    """
    Update a user.
    """

    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    db_user = crud.update_user(session=session, db_user=db_user, user_in=user_in)
    invalidate_for_event_sync("user_profile_updated", user_id=str(user_id))
    return db_user


@router.delete("/{user_id}", dependencies=[Depends(get_current_active_superuser)])
@limiter.limit(RateLimits.WRITE)
def delete_user(
    request: Request, session: SessionDep, current_user: CurrentUser, user_id: uuid.UUID
) -> Message:
    """
    Delete a user.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    invalidate_for_event_sync("user_profile_updated", user_id=str(user_id))
    session.delete(user)
    session.commit()
    return Message(message="User deleted successfully")
