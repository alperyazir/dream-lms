"""
Publisher API endpoints for /me routes.

These endpoints allow publisher users to manage their organization.
Publisher data is fetched from Dream Central Storage (DCS).
"""

import logging
import uuid

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import func
from sqlmodel import select

from app.api.deps import SessionDep, require_role
from app.services.dream_storage_client import get_dream_storage_client
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
from app.schemas.publisher import (
    PublisherProfile,
    PublisherStats,
    SchoolWithCounts,
    TeacherWithCounts,
)
from app.services.book_service_v2 import get_book_service
from app.services.publisher_service_v2 import get_publisher_service
from app.utils import generate_new_account_email, generate_temp_password, send_email

router = APIRouter(prefix="/publishers", tags=["publishers"])
logger = logging.getLogger(__name__)


@router.get("/{publisher_id}/logo")
async def get_publisher_logo(publisher_id: int) -> Response:
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
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Publisher logo not found"
            )

        content, content_type = result
        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching logo for publisher {publisher_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher logo not found"
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
            detail="Publisher account not linked to a DCS publisher"
        )
    return current_user.dcs_publisher_id


@router.get("/me/profile", response_model=PublisherProfile)
async def get_my_profile(
    current_user: User = require_role(UserRole.publisher)
) -> PublisherProfile:
    """
    Get current publisher's profile from DCS.

    Returns combined DCS publisher data and LMS user data.
    """
    publisher_id = get_current_publisher_id(current_user)

    publisher_service = get_publisher_service()
    publisher = await publisher_service.get_publisher(publisher_id)

    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher not found in DCS"
        )

    return PublisherProfile(
        id=publisher.id,
        name=publisher.name,
        contact_email=publisher.contact_email,
        logo_url=publisher.logo_url,
        user_id=current_user.id,
        user_email=current_user.email,
        user_full_name=current_user.full_name,
    )


@router.get("/me/stats", response_model=PublisherStats)
async def get_my_stats(
    session: SessionDep,
    current_user: User = require_role(UserRole.publisher)
) -> PublisherStats:
    """
    Get organization statistics.

    Returns counts of schools, teachers, and books.
    """
    publisher_id = get_current_publisher_id(current_user)

    # Count schools
    schools_count = session.exec(
        select(func.count(School.id))
        .where(School.dcs_publisher_id == publisher_id)
    ).one()

    # Count teachers in publisher's schools
    teachers_count = session.exec(
        select(func.count(Teacher.id))
        .join(School)
        .where(School.dcs_publisher_id == publisher_id)
    ).one()

    # Get books from DCS
    book_service = get_book_service()
    books = await book_service.list_books(publisher_id=publisher_id)

    return PublisherStats(
        schools_count=schools_count,
        teachers_count=teachers_count,
        books_count=len(books),
    )


@router.get("/me/schools", response_model=list[SchoolWithCounts])
def list_my_schools(
    session: SessionDep,
    current_user: User = require_role(UserRole.publisher)
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
            select(func.count(Teacher.id))
            .where(Teacher.school_id == school.id)
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
                (BookAssignment.school_id == school.id) |
                (Teacher.school_id == school.id)
            )
        ).one()

        result.append(SchoolWithCounts(
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
        ))

    return result


@router.post("/me/schools", response_model=SchoolPublic, status_code=status.HTTP_201_CREATED)
def create_my_school(
    session: SessionDep,
    school_in: SchoolCreateByPublisher,
    current_user: User = require_role(UserRole.publisher)
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


@router.get("/me/teachers", response_model=list[TeacherWithCounts])
def list_my_teachers(
    session: SessionDep,
    current_user: User = require_role(UserRole.publisher)
) -> list[TeacherWithCounts]:
    """List teachers in publisher's schools with aggregated counts."""
    from app.models import BookAssignment, Class
    from sqlalchemy.orm import selectinload

    publisher_id = get_current_publisher_id(current_user)

    teachers = session.exec(
        select(Teacher)
        .join(School)
        .where(School.dcs_publisher_id == publisher_id)
        .options(selectinload(Teacher.user), selectinload(Teacher.school))
        .order_by(Teacher.created_at.desc())
    ).all()

    result = []
    for teacher in teachers:
        user = teacher.user
        school = teacher.school

        # Count distinct books assigned to this teacher (directly or via school)
        books_assigned = session.exec(
            select(func.count(func.distinct(BookAssignment.dcs_book_id)))
            .where(
                (BookAssignment.teacher_id == teacher.id) |
                ((BookAssignment.school_id == teacher.school_id) & (BookAssignment.teacher_id.is_(None)))
            )
        ).one()

        # Count classes owned by this teacher
        classroom_count = session.exec(
            select(func.count(Class.id))
            .where(Class.teacher_id == teacher.id)
        ).one()

        result.append(TeacherWithCounts(
            id=teacher.id,
            user_id=user.id,
            school_id=teacher.school_id,
            school_name=school.name if school else None,
            subject_specialization=teacher.subject_specialization,
            user_full_name=user.full_name or "",
            user_email=user.email or "",
            user_username=user.username,
            created_at=teacher.created_at,
            updated_at=teacher.updated_at,
            books_assigned=books_assigned,
            classroom_count=classroom_count,
        ))

    return result


@router.post("/me/teachers", response_model=UserCreationResponse, status_code=status.HTTP_201_CREATED)
def create_my_teacher(
    session: SessionDep,
    teacher_in: TeacherCreateAPI,
    current_user: User = require_role(UserRole.publisher)
) -> UserCreationResponse:
    """Create teacher in publisher's school."""
    publisher_id = get_current_publisher_id(current_user)

    # Verify school belongs to publisher
    school = session.get(School, teacher_in.school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )
    if school.dcs_publisher_id != publisher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="School does not belong to your organization"
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
        email=teacher_in.user_email,
        username=teacher_in.username,
        password=password,
        full_name=teacher_in.full_name,
        teacher_create=teacher_create,
    )
    session.commit()

    # Try to send welcome email
    password_emailed = False
    if user.email:
        try:
            email_data = generate_new_account_email(
                email_to=user.email,
                username=user.username,
                password=password,
                full_name=user.full_name or user.username,
            )
            send_email(
                email_to=user.email,
                subject=email_data.subject,
                html_content=email_data.html_content,
            )
            password_emailed = True
        except Exception as e:
            logger.warning(f"Failed to send welcome email to {user.email}: {e}")

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
        temporary_password=password if not password_emailed else None,
        password_emailed=password_emailed,
        message="Teacher created successfully" + (
            ". Password sent via email." if password_emailed
            else ". Please share the temporary password with the teacher."
        ),
    )


@router.get("/me/books", response_model=list[BookPublic])
async def list_my_books(
    current_user: User = require_role(UserRole.publisher)
) -> list[BookPublic]:
    """List books from DCS for publisher."""
    publisher_id = get_current_publisher_id(current_user)

    book_service = get_book_service()
    books = await book_service.list_books(publisher_id=publisher_id)

    return books
