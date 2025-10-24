"""
Admin router for system management and user administration.
Provides endpoints for managing publishers, schools, and viewing teachers/students.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies.auth import get_current_admin
from app.models.user import User
from app.schemas.admin import (
    DashboardStats,
    PaginationMeta,
    PublisherCreate,
    PublisherResponse,
    PublisherUpdate,
    SchoolCreate,
    SchoolResponse,
    SchoolUpdate,
    StudentListResponse,
    TeacherListResponse,
)
from app.services import admin_service

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get(
    "/dashboard/stats",
    response_model=DashboardStats,
    status_code=status.HTTP_200_OK,
    summary="Get dashboard statistics",
    description="Returns system-wide counts for publishers, schools, teachers, and students",
)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> DashboardStats:
    """
    Get dashboard statistics for admin overview.

    Requires admin role.

    Returns:
        DashboardStats with total counts
    """
    stats = await admin_service.get_dashboard_stats(db)
    return DashboardStats(**stats)


# Publisher Endpoints


@router.get(
    "/publishers",
    status_code=status.HTTP_200_OK,
    summary="List publishers",
    description="List all publishers with pagination and optional search",
)
async def list_publishers(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List publishers with pagination and search.

    Requires admin role.

    Args:
        page: Page number (1-indexed)
        per_page: Items per page (max 100)
        search: Optional search term for name or email

    Returns:
        Dictionary with 'data' (list of publishers) and 'pagination' metadata
    """
    publishers, pagination = await admin_service.list_publishers(
        db, page=page, per_page=per_page, search=search
    )

    return {
        "success": True,
        "data": [PublisherResponse(**p) for p in publishers],
        "pagination": PaginationMeta(**pagination),
    }


@router.post(
    "/publishers",
    status_code=status.HTTP_201_CREATED,
    summary="Create publisher",
    description="Create a new publisher with user account and auto-generated password",
)
async def create_publisher(
    publisher_data: PublisherCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Create a new publisher.

    Requires admin role.

    Args:
        publisher_data: Publisher creation data (name, contact_email)

    Returns:
        Created publisher and temporary password

    Raises:
        HTTPException: 409 if email already exists
    """
    publisher, temp_password = await admin_service.create_publisher(
        db,
        name=publisher_data.name,
        contact_email=publisher_data.contact_email,
    )

    return {
        "success": True,
        "data": {
            "id": publisher.id,
            "name": publisher.name,
            "contact_email": publisher.contact_email,
            "temp_password": temp_password,  # Display once
        },
    }


@router.put(
    "/publishers/{publisher_id}",
    response_model=PublisherResponse,
    status_code=status.HTTP_200_OK,
    summary="Update publisher",
    description="Update publisher details",
)
async def update_publisher(
    publisher_id: UUID,
    publisher_data: PublisherUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> PublisherResponse:
    """
    Update publisher details.

    Requires admin role.

    Args:
        publisher_id: Publisher UUID
        publisher_data: Update data (name, contact_email)

    Returns:
        Updated publisher

    Raises:
        HTTPException: 404 if publisher not found
    """
    publisher = await admin_service.update_publisher(
        db,
        publisher_id=publisher_id,
        name=publisher_data.name,
        contact_email=publisher_data.contact_email,
    )

    # Need to get user info for response
    await db.refresh(publisher, ["user"])

    return PublisherResponse(
        id=publisher.id,
        user_id=publisher.user_id,
        name=publisher.name,
        contact_email=publisher.contact_email,
        created_at=publisher.created_at,
        updated_at=publisher.updated_at,
        email=publisher.user.email,
        is_active=publisher.user.is_active,
    )


@router.delete(
    "/publishers/{publisher_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete publisher",
    description="Soft delete publisher by setting is_active=False",
)
async def delete_publisher(
    publisher_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Soft delete a publisher.

    Requires admin role.

    Args:
        publisher_id: Publisher UUID

    Raises:
        HTTPException: 404 if publisher not found
    """
    await admin_service.soft_delete_publisher(db, publisher_id)


# School Endpoints


@router.get(
    "/schools",
    status_code=status.HTTP_200_OK,
    summary="List schools",
    description="List all schools with pagination, search, and optional publisher filter",
)
async def list_schools(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    publisher_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List schools with pagination and filters.

    Requires admin role.

    Args:
        page: Page number (1-indexed)
        per_page: Items per page (max 100)
        search: Optional search term for school name
        publisher_id: Optional filter by publisher

    Returns:
        Dictionary with 'data' (list of schools) and 'pagination' metadata
    """
    schools, pagination = await admin_service.list_schools(
        db, page=page, per_page=per_page, search=search, publisher_id=publisher_id
    )

    return {
        "success": True,
        "data": [SchoolResponse(**s) for s in schools],
        "pagination": PaginationMeta(**pagination),
    }


@router.post(
    "/schools",
    response_model=SchoolResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create school",
    description="Create a new school associated with a publisher",
)
async def create_school(
    school_data: SchoolCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> SchoolResponse:
    """
    Create a new school.

    Requires admin role.

    Args:
        school_data: School creation data

    Returns:
        Created school with publisher name

    Raises:
        HTTPException: 404 if publisher not found
    """
    school = await admin_service.create_school(
        db,
        name=school_data.name,
        publisher_id=school_data.publisher_id,
        address=school_data.address,
        contact_info=school_data.contact_info,
    )

    # Get publisher name for response
    await db.refresh(school, ["publisher"])

    return SchoolResponse(
        id=school.id,
        name=school.name,
        publisher_id=school.publisher_id,
        address=school.address,
        contact_info=school.contact_info,
        created_at=school.created_at,
        updated_at=school.updated_at,
        publisher_name=school.publisher.name,
    )


@router.put(
    "/schools/{school_id}",
    response_model=SchoolResponse,
    status_code=status.HTTP_200_OK,
    summary="Update school",
    description="Update school details",
)
async def update_school(
    school_id: UUID,
    school_data: SchoolUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> SchoolResponse:
    """
    Update school details.

    Requires admin role.

    Args:
        school_id: School UUID
        school_data: Update data

    Returns:
        Updated school

    Raises:
        HTTPException: 404 if school or publisher not found
    """
    school = await admin_service.update_school(
        db,
        school_id=school_id,
        name=school_data.name,
        publisher_id=school_data.publisher_id,
        address=school_data.address,
        contact_info=school_data.contact_info,
    )

    # Get publisher name for response
    await db.refresh(school, ["publisher"])

    return SchoolResponse(
        id=school.id,
        name=school.name,
        publisher_id=school.publisher_id,
        address=school.address,
        contact_info=school.contact_info,
        created_at=school.created_at,
        updated_at=school.updated_at,
        publisher_name=school.publisher.name,
    )


@router.delete(
    "/schools/{school_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete school",
    description="Delete school (cascades to teachers)",
)
async def delete_school(
    school_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a school.

    Requires admin role.

    Args:
        school_id: School UUID

    Raises:
        HTTPException: 404 if school not found
    """
    await admin_service.soft_delete_school(db, school_id)


# Teacher and Student List Endpoints (Read-only for admin)


@router.get(
    "/teachers",
    status_code=status.HTTP_200_OK,
    summary="List teachers",
    description="List all teachers with school and publisher information",
)
async def list_teachers(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List teachers with pagination and search.

    Requires admin role.

    Args:
        page: Page number (1-indexed)
        per_page: Items per page (max 100)
        search: Optional search term for email or school name

    Returns:
        Dictionary with 'data' (list of teachers) and 'pagination' metadata
    """
    teachers, pagination = await admin_service.list_teachers(
        db, page=page, per_page=per_page, search=search
    )

    return {
        "success": True,
        "data": [TeacherListResponse(**t) for t in teachers],
        "pagination": PaginationMeta(**pagination),
    }


@router.get(
    "/students",
    status_code=status.HTTP_200_OK,
    summary="List students",
    description="List all students with user information",
)
async def list_students(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List students with pagination and search.

    Requires admin role.

    Args:
        page: Page number (1-indexed)
        per_page: Items per page (max 100)
        search: Optional search term for email

    Returns:
        Dictionary with 'data' (list of students) and 'pagination' metadata
    """
    students, pagination = await admin_service.list_students(
        db, page=page, per_page=per_page, search=search
    )

    return {
        "success": True,
        "data": [StudentListResponse(**s) for s in students],
        "pagination": PaginationMeta(**pagination),
    }
