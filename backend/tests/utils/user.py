from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app import crud
from app.core.config import settings
from app.models import User, UserCreate, UserUpdate
from tests.utils.utils import random_lower_string


def user_authentication_headers(
    *, client: TestClient, username: str, password: str
) -> dict[str, str]:
    data = {"username": username, "password": password}

    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=data)
    response = r.json()
    auth_token = response["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}
    return headers


def create_random_user(db: Session) -> User:
    password = random_lower_string()
    username = random_lower_string()[:20]
    user_in = UserCreate(password=password, username=username)
    user = crud.create_user(session=db, user_create=user_in)
    return user


def authentication_token_from_username(
    *, client: TestClient, username: str, db: Session
) -> dict[str, str]:
    """
    Return a valid token for the user with given username.
    If the user doesn't exist it is created first.
    """
    password = random_lower_string()
    user = db.exec(select(User).where(User.username == username)).first()
    if not user:
        user_in_create = UserCreate(password=password, username=username)
        user = crud.create_user(session=db, user_create=user_in_create)
    else:
        user_in_update = UserUpdate(password=password)
        if not user.id:
            raise Exception("User id not set")
        user = crud.update_user(session=db, db_user=user, user_in=user_in_update)

    return user_authentication_headers(
        client=client, username=username, password=password
    )
