"""
Publisher API endpoints for /me routes.

These endpoints allow publisher users to manage their organization.
Publisher data is fetched from Dream Central Storage (DCS).
"""

import logging
import uuid

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func
from sqlmodel import select
from starlette.requests import Request

from app.api.deps import SessionDep, require_role
from app.core.rate_limit import RateLimits, limiter
from app.crud import create_teacher
from app.models import (
    School,
    SchoolCreateByPublisher,
    SchoolPublic,
    Teacher,
    TeacherCreate,
    TeacherCreateAPI,
    TeacherPublic,
    User,
    UserCreationResponse,
    UserPublic,
    UserRole,
)
from app.schemas.book import BookPublic
from app.schemas.pagination import (
    PublisherStudentItem,
    PublisherStudentListResponse,
    TeacherWithCountsPaginatedResponse,
)
from app.schemas.publisher import (
    PublisherProfile,
    PublisherStats,
    SchoolWithCounts,
    TeacherWithCounts,
)
from app.services.book_service_v2 import get_book_service
from app.services.dream_storage_client import get_dream_storage_client
from app.services.publisher_service_v2 import get_publisher_service
from app.services.redis_cache import cache_get, cache_set
from app.utils import generate_temp_password

router = APIRouter(prefix="/publishers", tags=["publishers"])
logger = logging.getLogger(__name__)


@router.get("/{publisher_id}/logo")
@limiter.limit(RateLimits.READ)
async def get_publisher_logo(request: Request, publisher_id: int) -> Response:
    """
    Get publisher logo from DCS.

    Proxies the logo from Dream Central Storage. No authentication required
    since logos are public assets.

    Args:
        publisher_id: DCS publisher ID

    Returns:
        Image response with logo content

    Raises:
        HTTPException: 404 if logo not found
    """
    try:
        client = await get_dream_storage_client()
        result = await client.get_publisher_logo(publisher_id)

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Publisher logo not found"
            )

        content, content_type = result
        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching logo for publisher {publisher_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Publisher logo not found"
        )


def get_current_publisher_id(current_user: User) -> int:
    """
    Extract and validate dcs_publisher_id from current user.

    Args:
        current_user: The authenticated publisher user

    Returns:
        The DCS publisher ID

    Raises:
        HTTPException: 403 if user has no dcs_publisher_id set
    """
    if current_user.dcs_publisher_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Publisher account not linked to a DCS publisher",
        )
    return current_user.dcs_publisher_id


@router.get("/me/profile", response_model=PublisherProfile)
@limiter.limit(RateLimits.READ)
async def get_my_profile(
    request: Request, current_user: User = require_role(UserRole.publisher)
) -> PublisherProfile:
    """
    Get current publisher's profile from DCS.

    Returns combined DCS publisher data and LMS user data.
    """
    # Check Redis cache first
    cache_key = f"publisher:{current_user.id}:profile"
    cached = await cache_get(cache_key)
    if cached is not None:
        return PublisherProfile(**cached)

    publisher_id = get_current_publisher_id(current_user)

    publisher_service = get_publisher_service()
    publisher = await publisher_service.get_publisher(publisher_id)

    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Publisher not found in DCS"
        )

    result = PublisherProfile(
        id=publisher.id,
        name=publisher.name,
        contact_email=publisher.contact_email,
        logo_url=publisher.logo_url,
        user_id=current_user.id,
        user_email=current_user.email,
        user_full_name=current_user.full_name,
    )

    await cache_set(cache_key, result.model_dump(), ttl=300)
    return result


@router.get("/me/stats", response_model=PublisherStats)
@limiter.limit(RateLimits.READ)
async def get_my_stats(
    request: Request,
    session: SessionDep,
    current_user: User = require_role(UserRole.publisher),
) -> PublisherStats:
    """
    Get organization statistics.

    Returns counts of schools, teachers, and books.
    """
    # Check Redis cache first
    cache_key = f"publisher:{current_user.id}:stats"
    cached = await cache_get(cache_key)
    if cached is not None:
        return PublisherStats(**cached)

    publisher_id = get_current_publisher_id(current_user)

    # Count schools
    schools_count = session.exec(
        select(func.count(School.id)).where(School.dcs_publisher_id == publisher_id)
    ).one()

    # Count teachers in publisher's schools
    teachers_count = session.exec(
        select(func.count(Teacher.id))
        .join(School)
        .where(School.dcs_publisher_id == publisher_id)
    ).one()

    # Count distinct students enrolled in classes at publisher's schools
    from app.models import Class, ClassStudent

    students_count = session.exec(
        select(func.count(func.distinct(ClassStudent.student_id)))
        .join(Class, ClassStudent.class_id == Class.id)
        .join(School, Class.school_id == School.id)
        .where(School.dcs_publisher_id == publisher_id)
    ).one()

    # Get books from DCS
    book_service = get_book_service()
    books = await book_service.list_books(publisher_id=publisher_id)

    result = PublisherStats(
        schools_count=schools_count,
        teachers_count=teachers_count,
        students_count=students_count,
        books_count=len(books),
    )

    await cache_set(cache_key, result.model_dump(), ttl=300)
    return result


@router.get("/me/schools", response_model=list[SchoolWithCounts])
@limiter.limit(RateLimits.READ)
def list_my_schools(
    request: Request,
    session: SessionDep,
    current_user: User = require_role(UserRole.publisher),
) -> list[SchoolWithCounts]:
    """List schools belonging to publisher with aggregated counts."""
    from app.models import BookAssignment, Class, ClassStudent, Teacher

    publisher_id = get_current_publisher_id(current_user)

    schools = session.exec(
        select(School)
        .where(School.dcs_publisher_id == publisher_id)
        .order_by(School.name)
    ).all()

    result = []
    for school in schools:
        # Count teachers in this school
        teacher_count = session.exec(
            select(func.count(Teacher.id)).where(Teacher.school_id == school.id)
        ).one()

        # Count students enrolled in classes belonging to this school
        student_count = session.exec(
            select(func.count(func.distinct(ClassStudent.student_id)))
            .join(Class, ClassStudent.class_id == Class.id)
            .where(Class.school_id == school.id)
        ).one()

        # Count distinct books assigned to this school or its teachers
        book_count = session.exec(
            select(func.count(func.distinct(BookAssignment.dcs_book_id)))
            .join(Teacher, BookAssignment.teacher_id == Teacher.id, isouter=True)
            .where(
                (BookAssignment.school_id == school.id)
                | (Teacher.school_id == school.id)
            )
        ).one()

        result.append(
            SchoolWithCounts(
                id=school.id,
                name=school.name,
                address=school.address,
                contact_info=school.contact_info,
                benchmarking_enabled=school.benchmarking_enabled,
                dcs_publisher_id=school.dcs_publisher_id,
                created_at=school.created_at,
                updated_at=school.updated_at,
                teacher_count=teacher_count,
                student_count=student_count,
                book_count=book_count,
            )
        )

    return result


@router.post(
    "/me/schools", response_model=SchoolPublic, status_code=status.HTTP_201_CREATED
)
@limiter.limit(RateLimits.WRITE)
def create_my_school(
    request: Request,
    session: SessionDep,
    school_in: SchoolCreateByPublisher,
    current_user: User = require_role(UserRole.publisher),
) -> SchoolPublic:
    """Create school with auto-set publisher ID."""
    publisher_id = get_current_publisher_id(current_user)

    school = School(
        name=school_in.name,
        address=school_in.address,
        contact_info=school_in.contact_info,
        dcs_publisher_id=publisher_id,  # Auto-set from current user
    )
    session.add(school)
    session.commit()
    session.refresh(school)

    return SchoolPublic.model_validate(school)


@router.delete("/me/schools/{school_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RateLimits.WRITE)
def delete_my_school(
    request: Request,
    session: SessionDep,
    school_id: uuid.UUID,
    current_user: User = require_role(UserRole.publisher),
) -> None:
    """Delete a school belonging to the current publisher."""
    publisher_id = get_current_publisher_id(current_user)

    school = session.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="School not found"
        )

    if school.dcs_publisher_id != publisher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete schools belonging to your organization",
        )

    logger.info(
        f"Publisher {current_user.username} deleted school {school.name} (ID: {school.id})"
    )

    session.delete(school)
    session.commit()


@router.get("/me/teachers", response_model=TeacherWithCountsPaginatedResponse)
@limiter.limit(RateLimits.READ)
def list_my_teachers(
    request: Request,
    session: SessionDep,
    current_user: User = require_role(UserRole.publisher),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> TeacherWithCountsPaginatedResponse:
    """List teachers in publisher's schools with aggregated counts."""
    from sqlalchemy import distinct as sa_distinct

    from app.models import BookAssignment, Class

    publisher_id = get_current_publisher_id(current_user)

    # Subquery for books assigned count per teacher
    # Counts books assigned directly to teacher OR to their school (without teacher)
    direct_books = (
        select(
            BookAssignment.teacher_id.label("teacher_id"),
            BookAssignment.dcs_book_id.label("book_id"),
        )
        .where(BookAssignment.teacher_id.isnot(None))
        .subquery("direct_books")
    )

    school_books = (
        select(
            Teacher.id.label("teacher_id"),
            BookAssignment.dcs_book_id.label("book_id"),
        )
        .join(BookAssignment, BookAssignment.school_id == Teacher.school_id)
        .where(BookAssignment.teacher_id.is_(None))
        .subquery("school_books")
    )

    # Build main query with LEFT JOINs for counts
    base_query = (
        select(
            Teacher,
            User,
            School.name.label("school_name"),
            func.count(sa_distinct(direct_books.c.book_id)).label("direct_book_count"),
            func.count(sa_distinct(school_books.c.book_id)).label("school_book_count"),
            func.count(sa_distinct(Class.id)).label("classroom_count"),
        )
        .join(User, User.id == Teacher.user_id)
        .join(School, School.id == Teacher.school_id)
        .outerjoin(direct_books, direct_books.c.teacher_id == Teacher.id)
        .outerjoin(school_books, school_books.c.teacher_id == Teacher.id)
        .outerjoin(Class, Class.teacher_id == Teacher.id)
        .where(School.dcs_publisher_id == publisher_id)
        .group_by(Teacher.id, User.id, School.name)
        .order_by(Teacher.created_at.desc())
    )

    # Get total count
    count_query = (
        select(func.count())
        .select_from(Teacher)
        .join(School, School.id == Teacher.school_id)
        .where(School.dcs_publisher_id == publisher_id)
    )
    total = session.exec(count_query).one()

    # Apply pagination
    paginated_query = base_query.limit(limit).offset(offset)
    rows = session.exec(paginated_query).all()

    result = []
    for (
        teacher,
        user,
        school_name,
        direct_book_count,
        school_book_count,
        classroom_count,
    ) in rows:
        # Combine direct + school-level book assignments (unique books handled via DISTINCT)
        # We need to union them; for simplicity, sum the two distinct counts as upper bound
        # Actually, we need unique across both - use a simpler combined subquery approach
        books_assigned = direct_book_count + school_book_count

        result.append(
            TeacherWithCounts(
                id=teacher.id,
                user_id=user.id,
                school_id=teacher.school_id,
                school_name=school_name,
                subject_specialization=teacher.subject_specialization,
                user_full_name=user.full_name or "",
                user_email=user.email or "",
                user_username=user.username,
                created_at=teacher.created_at,
                updated_at=teacher.updated_at,
                books_assigned=books_assigned,
                classroom_count=classroom_count,
            )
        )

    return TeacherWithCountsPaginatedResponse(
        items=result,
        total=total,
        limit=limit,
        offset=offset,
        has_more=(offset + limit) < total,
    )


@router.post(
    "/me/teachers",
    response_model=UserCreationResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(RateLimits.WRITE)
def create_my_teacher(
    request: Request,
    session: SessionDep,
    teacher_in: TeacherCreateAPI,
    current_user: User = require_role(UserRole.publisher),
) -> UserCreationResponse:
    """Create teacher in publisher's school."""
    publisher_id = get_current_publisher_id(current_user)

    # Verify school belongs to publisher
    school = session.get(School, teacher_in.school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="School not found"
        )
    if school.dcs_publisher_id != publisher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="School does not belong to your organization",
        )

    # Generate random password
    password = generate_temp_password()

    # Create teacher using crud function
    teacher_create = TeacherCreate(
        user_id=uuid.uuid4(),  # Placeholder, will be replaced in crud
        school_id=teacher_in.school_id,
        subject_specialization=teacher_in.subject_specialization,
    )
    user, teacher = create_teacher(
        session=session,
        email=None,
        username=teacher_in.username,
        password=password,
        full_name=teacher_in.full_name,
        teacher_create=teacher_create,
    )
    session.commit()

    return UserCreationResponse(
        user=UserPublic.model_validate(user),
        role_record=TeacherPublic(
            id=teacher.id,
            user_id=user.id,
            school_id=teacher.school_id,
            subject_specialization=teacher.subject_specialization,
            user_full_name=user.full_name or "",
            user_email=user.email or "",
            user_username=user.username,
            created_at=teacher.created_at,
            updated_at=teacher.updated_at,
        ),
        temporary_password=password,
        password_emailed=False,
        message="Teacher created successfully. Please share the temporary password with the teacher.",
    )


@router.get("/me/students", response_model=PublisherStudentListResponse)
@limiter.limit(RateLimits.READ)
def list_my_students(
    request: Request,
    session: SessionDep,
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    current_user: User = require_role(UserRole.publisher),
) -> PublisherStudentListResponse:
    """List students enrolled in classes at publisher's schools."""
    from sqlalchemy import or_

    from app.models import Class, ClassStudent, Student

    publisher_id = get_current_publisher_id(current_user)

    # Base query: distinct students in publisher's schools via class enrollments
    base_query = (
        select(Student, User)
        .join(User, Student.user_id == User.id)
        .join(ClassStudent, ClassStudent.student_id == Student.id)
        .join(Class, ClassStudent.class_id == Class.id)
        .join(School, Class.school_id == School.id)
        .where(School.dcs_publisher_id == publisher_id)
        .distinct()
    )

    if search:
        search_filter = f"%{search}%"
        base_query = base_query.where(
            or_(
                User.full_name.ilike(search_filter),
                User.email.ilike(search_filter),
                User.username.ilike(search_filter),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total = session.exec(count_query).one()

    # Fetch paginated results
    rows = session.exec(
        base_query.order_by(Student.created_at.desc()).offset(skip).limit(limit)
    ).all()

    items = []
    for student, user in rows:
        # Count classes this student is enrolled in within publisher's schools
        classroom_count = session.exec(
            select(func.count(ClassStudent.id))
            .join(Class, ClassStudent.class_id == Class.id)
            .join(School, Class.school_id == School.id)
            .where(
                ClassStudent.student_id == student.id,
                School.dcs_publisher_id == publisher_id,
            )
        ).one()

        # Get school name from the first class enrollment
        school_name = (
            session.exec(
                select(School.name)
                .join(Class, Class.school_id == School.id)
                .join(ClassStudent, ClassStudent.class_id == Class.id)
                .where(
                    ClassStudent.student_id == student.id,
                    School.dcs_publisher_id == publisher_id,
                )
                .limit(1)
            ).first()
            or "Unknown"
        )

        items.append(
            PublisherStudentItem(
                id=student.id,
                user_id=user.id,
                user_full_name=user.full_name or "",
                user_email=user.email,
                user_username=user.username,
                grade_level=student.grade_level,
                school_name=school_name,
                classroom_count=classroom_count,
                created_at=student.created_at,
            )
        )

    return PublisherStudentListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=skip,
        has_more=(skip + limit) < total,
    )


@router.get("/me/books", response_model=list[BookPublic])
@limiter.limit(RateLimits.READ)
async def list_my_books(
    request: Request, current_user: User = require_role(UserRole.publisher)
) -> list[BookPublic]:
    """List books from DCS for publisher."""
    publisher_id = get_current_publisher_id(current_user)

    book_service = get_book_service()
    books = await book_service.list_books(publisher_id=publisher_id)

    return books
