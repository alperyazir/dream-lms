"""Tests for Book Assignment Service - Story 9.4 QA Fix."""

import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import School, Teacher, User, UserRole
from app.services import book_assignment_service


@pytest_asyncio.fixture
async def test_user_with_book_id(async_session: AsyncSession):
    """Create a test user and return a mock DCS book ID."""
    # Create admin user to act as "assigned_by"
    user = User(
        id=uuid.uuid4(),
        email="service_test_admin@example.com",
        username="servicetestadmin",
        hashed_password="hashed",
        role=UserRole.admin,
        is_active=True,
        full_name="Service Test Admin"
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    return {"user": user, "book_id": 123}


@pytest_asyncio.fixture
async def school_with_teacher(async_session: AsyncSession):
    """Create a school with a teacher for testing."""
    # Create school
    school = School(
        id=uuid.uuid4(),
        name="Service Test School",
        dcs_publisher_id=456  # Mock DCS publisher ID
    )
    async_session.add(school)
    await async_session.commit()
    await async_session.refresh(school)

    # Create teacher user
    teacher_user = User(
        id=uuid.uuid4(),
        email="service_test_teacher@example.com",
        username="servicetestteacher",
        hashed_password="hashed",
        role=UserRole.teacher,
        is_active=True,
        full_name="Service Test Teacher"
    )
    async_session.add(teacher_user)
    await async_session.commit()
    await async_session.refresh(teacher_user)

    # Create teacher record
    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id
    )
    async_session.add(teacher)
    await async_session.commit()
    await async_session.refresh(teacher)

    return {"school": school, "teacher": teacher, "teacher_user": teacher_user}


class TestCreateAssignment:
    """Tests for create_assignment service function."""

    @pytest.mark.asyncio
    async def test_create_assignment_with_school(
        self, async_session: AsyncSession, test_user_with_book_id, school_with_teacher
    ):
        """Test creating a school-level book assignment."""
        book_id = test_user_with_book_id["book_id"]
        user = test_user_with_book_id["user"]
        school = school_with_teacher["school"]

        assignment = await book_assignment_service.create_assignment(
            db=async_session,
            book_id=book_id,
            assigned_by=user.id,
            school_id=school.id,
            teacher_id=None
        )

        assert assignment is not None
        assert assignment.dcs_book_id == book_id
        assert assignment.school_id == school.id
        assert assignment.teacher_id is None
        assert assignment.assigned_by == user.id

    @pytest.mark.asyncio
    async def test_create_assignment_with_teacher(
        self, async_session: AsyncSession, test_user_with_book_id, school_with_teacher
    ):
        """Test creating a teacher-level book assignment."""
        book_id = test_user_with_book_id["book_id"]
        user = test_user_with_book_id["user"]
        school = school_with_teacher["school"]
        teacher = school_with_teacher["teacher"]

        assignment = await book_assignment_service.create_assignment(
            db=async_session,
            book_id=book_id,
            assigned_by=user.id,
            school_id=school.id,
            teacher_id=teacher.id
        )

        assert assignment is not None
        assert assignment.dcs_book_id == book_id
        assert assignment.school_id == school.id
        assert assignment.teacher_id == teacher.id

    @pytest.mark.asyncio
    async def test_create_assignment_requires_target(
        self, async_session: AsyncSession, test_user_with_book_id
    ):
        """Test that assignment requires school_id or teacher_id."""
        book_id = test_user_with_book_id["book_id"]
        user = test_user_with_book_id["user"]

        with pytest.raises(ValueError, match="At least one of school_id or teacher_id"):
            await book_assignment_service.create_assignment(
                db=async_session,
                book_id=book_id,
                assigned_by=user.id,
                school_id=None,
                teacher_id=None
            )


class TestCreateBulkAssignments:
    """Tests for create_bulk_assignments service function."""

    @pytest.mark.asyncio
    async def test_bulk_assign_to_all_teachers(
        self, async_session: AsyncSession, test_user_with_book_id, school_with_teacher
    ):
        """Test bulk assignment to entire school (all teachers)."""
        book_id = test_user_with_book_id["book_id"]
        user = test_user_with_book_id["user"]
        school = school_with_teacher["school"]

        assignments = await book_assignment_service.create_bulk_assignments(
            db=async_session,
            book_id=book_id,
            school_id=school.id,
            assigned_by=user.id,
            assign_to_all=True
        )

        assert len(assignments) == 1
        assert assignments[0].school_id == school.id
        assert assignments[0].teacher_id is None  # School-level assignment

    @pytest.mark.asyncio
    async def test_bulk_assign_to_specific_teachers(
        self, async_session: AsyncSession, test_user_with_book_id, school_with_teacher
    ):
        """Test bulk assignment to specific teachers."""
        book_id = test_user_with_book_id["book_id"]
        user = test_user_with_book_id["user"]
        school = school_with_teacher["school"]
        teacher = school_with_teacher["teacher"]

        # Create a second teacher
        teacher_user2 = User(
            id=uuid.uuid4(),
            email="service_test_teacher2@example.com",
            username="servicetestteacher2",
            hashed_password="hashed",
            role=UserRole.teacher,
            is_active=True,
            full_name="Service Test Teacher 2"
        )
        async_session.add(teacher_user2)
        await async_session.commit()

        teacher2 = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user2.id,
            school_id=school.id
        )
        async_session.add(teacher2)
        await async_session.commit()

        assignments = await book_assignment_service.create_bulk_assignments(
            db=async_session,
            book_id=book_id,
            school_id=school.id,
            assigned_by=user.id,
            teacher_ids=[teacher.id, teacher2.id],
            assign_to_all=False
        )

        assert len(assignments) == 2
        teacher_ids = [a.teacher_id for a in assignments]
        assert teacher.id in teacher_ids
        assert teacher2.id in teacher_ids


class TestCheckTeacherBookAccess:
    """Tests for check_teacher_book_access service function."""

    @pytest.mark.asyncio
    async def test_teacher_has_direct_access(
        self, async_session: AsyncSession, test_user_with_book_id, school_with_teacher
    ):
        """Test teacher with direct assignment has access."""
        book_id = test_user_with_book_id["book_id"]
        user = test_user_with_book_id["user"]
        school = school_with_teacher["school"]
        teacher = school_with_teacher["teacher"]

        # Create direct teacher assignment
        await book_assignment_service.create_assignment(
            db=async_session,
            book_id=book_id,
            assigned_by=user.id,
            school_id=school.id,
            teacher_id=teacher.id
        )

        has_access = await book_assignment_service.check_teacher_book_access(
            db=async_session,
            teacher_id=teacher.id,
            book_id=book_id
        )

        assert has_access is True

    @pytest.mark.asyncio
    async def test_teacher_has_school_level_access(
        self, async_session: AsyncSession, test_user_with_book_id, school_with_teacher
    ):
        """Test teacher with school-level assignment has access."""
        book_id = test_user_with_book_id["book_id"]
        user = test_user_with_book_id["user"]
        school = school_with_teacher["school"]
        teacher = school_with_teacher["teacher"]

        # Create school-level assignment (teacher_id = None)
        await book_assignment_service.create_assignment(
            db=async_session,
            book_id=book_id,
            assigned_by=user.id,
            school_id=school.id,
            teacher_id=None
        )

        has_access = await book_assignment_service.check_teacher_book_access(
            db=async_session,
            teacher_id=teacher.id,
            book_id=book_id
        )

        assert has_access is True

    @pytest.mark.asyncio
    async def test_teacher_without_access(
        self, async_session: AsyncSession, test_user_with_book_id, school_with_teacher
    ):
        """Test teacher without assignment has no access."""
        book_id = test_user_with_book_id["book_id"]
        teacher = school_with_teacher["teacher"]

        # No assignment created

        has_access = await book_assignment_service.check_teacher_book_access(
            db=async_session,
            teacher_id=teacher.id,
            book_id=book_id
        )

        assert has_access is False


class TestGetAccessibleBookIds:
    """Tests for get_accessible_book_ids service function."""

    @pytest.mark.asyncio
    async def test_get_accessible_books_direct_assignment(
        self, async_session: AsyncSession, test_user_with_book_id, school_with_teacher
    ):
        """Test getting accessible books with direct teacher assignment."""
        book_id = test_user_with_book_id["book_id"]
        user = test_user_with_book_id["user"]
        school = school_with_teacher["school"]
        teacher = school_with_teacher["teacher"]

        # Create direct assignment
        await book_assignment_service.create_assignment(
            db=async_session,
            book_id=book_id,
            assigned_by=user.id,
            school_id=school.id,
            teacher_id=teacher.id
        )

        accessible_ids = await book_assignment_service.get_accessible_book_ids(
            db=async_session,
            teacher_id=teacher.id
        )

        assert book_id in accessible_ids

    @pytest.mark.asyncio
    async def test_get_accessible_books_no_assignments(
        self, async_session: AsyncSession, school_with_teacher
    ):
        """Test getting accessible books when none assigned."""
        teacher = school_with_teacher["teacher"]

        accessible_ids = await book_assignment_service.get_accessible_book_ids(
            db=async_session,
            teacher_id=teacher.id
        )

        assert len(accessible_ids) == 0


class TestDeleteAssignment:
    """Tests for delete_assignment service function (DEPRECATED)."""

    @pytest.mark.asyncio
    async def test_delete_assignment_deprecated(
        self, async_session: AsyncSession, test_user_with_book_id
    ):
        """Test that delete_assignment is deprecated and returns False."""
        # delete_assignment is deprecated - publisher role removed
        # Function always returns False now
        result = await book_assignment_service.delete_assignment(
            db=async_session,
            assignment_id=uuid.uuid4(),
            publisher_id=uuid.uuid4()
        )

        assert result is False
