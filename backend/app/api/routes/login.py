from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from slowapi.util import get_remote_address
from starlette.requests import Request

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.core import security
from app.core.config import settings
from app.core.rate_limit import RateLimits, limiter
from app.models import Token, UserPublic

router = APIRouter(tags=["login"])


@router.post("/login/access-token")
@limiter.limit(RateLimits.AUTH, key_func=get_remote_address)
def login_access_token(
    request: Request,
    session: SessionDep,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests.
    Returns must_change_password flag to indicate if password change is required.
    """
    user = crud.authenticate_by_username(
        session=session, identifier=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=security.create_access_token(
            user.id,
            expires_delta=access_token_expires,
            extra_claims={"role": user.role},
        ),
        must_change_password=user.must_change_password,
        has_completed_tour=user.has_completed_tour,
    )


@router.post("/login/test-token", response_model=UserPublic)
def test_token(current_user: CurrentUser) -> Any:
    """
    Test access token
    """
    return current_user
