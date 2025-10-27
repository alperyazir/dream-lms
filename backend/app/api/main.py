from fastapi import APIRouter

from app.api.routes import admin, login, private, publishers, teachers, users, utils
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(admin.router)
api_router.include_router(publishers.router)
api_router.include_router(teachers.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
