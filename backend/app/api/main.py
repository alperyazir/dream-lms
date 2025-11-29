from fastapi import APIRouter

from app.api.routes import (
    admin,
    assignments,
    book_assets,
    books,
    classes,
    dev,
    login,
    private,
    publishers,
    reports,
    students,
    teachers,
    users,
    utils,
    webhooks,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(admin.router)
api_router.include_router(publishers.router)
api_router.include_router(teachers.router)
api_router.include_router(students.router)
api_router.include_router(classes.router)
api_router.include_router(books.router, prefix="/books", tags=["books"])
api_router.include_router(book_assets.router)
api_router.include_router(assignments.router)
api_router.include_router(reports.router)
api_router.include_router(webhooks.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)

# Development-only endpoints (quick login, etc.)
if settings.ENVIRONMENT != "production":
    api_router.include_router(dev.router, prefix="/dev", tags=["dev"])
