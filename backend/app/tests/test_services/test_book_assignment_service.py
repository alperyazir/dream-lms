"""Tests for Book Assignment Service - Story 9.4 QA Fix."""

import uuid
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Book, BookAssignment, Publisher, School, Teacher, User, UserRole
from app.services import book_assignment_service


@pytest_asyncio.fixture
async def publisher_with_book(async_session: AsyncSession):
    """Create a publisher with a book for testing."""
    # Create publisher user
    pub_user = User(
        id=uuid.uuid4(),
        email="service_test_publisher@example.com",
        username="servicetestpub",
        hashed_password="hashed",
        role=UserRole.publisher,
        is_active=True,
        full_name="Service Test Publisher"
    )
    async_session.add(pub_user)
    await async_session.commit()
    await async_session.refresh(pub_user)

    # Create publisher record
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Service Test Publisher Co"
    )
    async_session.add(publisher)
    await async_session.commit()
    await async_session.refresh(publisher)

    # Create book with all required fields
    book = Book(
        id=uuid.uuid4(),
        dream_storage_id=f"test-book-{uuid.uuid4().hex[:8]}",
        title="Service Test Book",
        book_name="service_test_book",
        publisher_name="Service Test Publisher Co",
        publisher_id=publisher.id,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )
    async_session.add(book)
    await async_session.commit()
    await async_session.refresh(book)

    return {"user": pub_user, "publisher": publisher, "book": book}


@pytest_asyncio.fixture
async def school_with_teacher(async_session: AsyncSession, publisher_with_book):
    """Create a school with a teacher for testing."""
    publisher = publisher_with_book["publisher"]

    # Create school
    school = School(
        id=uuid.uuid4(),
        name="Service Test School",
        publisher_id=publisher.id
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
        self, async_session: AsyncSession, publisher_with_book, school_with_teacher
    ):
        """Test creating a school-level book assignment."""
        book = publisher_with_book["book"]
        pub_user = publisher_with_book["user"]
        school = school_with_teacher["school"]

        assignment = await book_assignment_service.create_assignment(
            db=async_session,
            book_id=book.id,
            assigned_by=pub_user.id,
            school_id=school.id,
            teacher_id=None
        )

        assert assignment is not None
        assert assignment.book_id == book.id
        assert assignment.school_id == school.id
        assert assignment.teacher_id is None
        assert assignment.assigned_by == pub_user.id

    @pytest.mark.asyncio
    async def test_create_assignment_with_teacher(
        self, async_session: AsyncSession, publisher_with_book, school_with_teacher
    ):
        """Test creating a teacher-level book assignment."""
        book = publisher_with_book["book"]
        pub_user = publisher_with_book["user"]
        school = school_with_teacher["school"]
        teacher = school_with_teacher["teacher"]

        assignment = await book_assignment_service.create_assignment(
            db=async_session,
            book_id=book.id,
            assigned_by=pub_user.id,
            school_id=school.id,
            teacher_id=teacher.id
        )

        assert assignment is not None
        assert assignment.book_id == book.id
        assert assignment.school_id == school.id
        assert assignment.teacher_id == teacher.id

    @pytest.mark.asyncio
    async def test_create_assignment_requires_target(
        self, async_session: AsyncSession, publisher_with_book
    ):
        """Test that assignment requires school_id or teacher_id."""
        book = publisher_with_book["book"]
        pub_user = publisher_with_book["user"]

        with pytest.raises(ValueError, match="At least one of school_id or teacher_id"):
            await book_assignment_service.create_assignment(
                db=async_session,
                book_id=book.id,
                assigned_by=pub_user.id,
                school_id=None,
                teacher_id=None
            )


class TestCreateBulkAssignments:
    """Tests for create_bulk_assignments service function."""

    @pytest.mark.asyncio
    async def test_bulk_assign_to_all_teachers(
        self, async_session: AsyncSession, publisher_with_book, school_with_teacher
    ):
        """Test bulk assignment to entire school (all teachers)."""
        book = publisher_with_book["book"]
        pub_user = publisher_with_book["user"]
        school = school_with_teacher["school"]

        assignments = await book_assignment_service.create_bulk_assignments(
            db=async_session,
            book_id=book.id,
            school_id=school.id,
            assigned_by=pub_user.id,
            assign_to_all=True
        )

        assert len(assignments) == 1
        assert assignments[0].school_id == school.id
        assert assignments[0].teacher_id is None  # School-level assignment

    @pytest.mark.asyncio
    async def test_bulk_assign_to_specific_teachers(
        self, async_session: AsyncSession, publisher_with_book, school_with_teacher
    ):
        """Test bulk assignment to specific teachers."""
        book = publisher_with_book["book"]
        pub_user = publisher_with_book["user"]
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
            book_id=book.id,
            school_id=school.id,
            assigned_by=pub_user.id,
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
        self, async_session: AsyncSession, publisher_with_book, school_with_teacher
    ):
        """Test teacher with direct assignment has access."""
        book = publisher_with_book["book"]
        pub_user = publisher_with_book["user"]
        school = school_with_teacher["school"]
        teacher = school_with_teacher["teacher"]

        # Create direct teacher assignment
        await book_assignment_service.create_assignment(
            db=async_session,
            book_id=book.id,
            assigned_by=pub_user.id,
            school_id=school.id,
            teacher_id=teacher.id
        )

        has_access = await book_assignment_service.check_teacher_book_access(
            db=async_session,
            teacher_id=teacher.id,
            book_id=book.id
        )

        assert has_access is True

    @pytest.mark.asyncio
    async def test_teacher_has_school_level_access(
        self, async_session: AsyncSession, publisher_with_book, school_with_teacher
    ):
        """Test teacher with school-level assignment has access."""
        book = publisher_with_book["book"]
        pub_user = publisher_with_book["user"]
        school = school_with_teacher["school"]
        teacher = school_with_teacher["teacher"]

        # Create school-level assignment (teacher_id = None)
        await book_assignment_service.create_assignment(
            db=async_session,
            book_id=book.id,
            assigned_by=pub_user.id,
            school_id=school.id,
            teacher_id=None
        )

        has_access = await book_assignment_service.check_teacher_book_access(
            db=async_session,
            teacher_id=teacher.id,
            book_id=book.id
        )

        assert has_access is True

    @pytest.mark.asyncio
    async def test_teacher_without_access(
        self, async_session: AsyncSession, publisher_with_book, school_with_teacher
    ):
        """Test teacher without assignment has no access."""
        book = publisher_with_book["book"]
        teacher = school_with_teacher["teacher"]

        # No assignment created

        has_access = await book_assignment_service.check_teacher_book_access(
            db=async_session,
            teacher_id=teacher.id,
            book_id=book.id
        )

        assert has_access is False


class TestGetAccessibleBookIds:
    """Tests for get_accessible_book_ids service function."""

    @pytest.mark.asyncio
    async def test_get_accessible_books_direct_assignment(
        self, async_session: AsyncSession, publisher_with_book, school_with_teacher
    ):
        """Test getting accessible books with direct teacher assignment."""
        book = publisher_with_book["book"]
        pub_user = publisher_with_book["user"]
        school = school_with_teacher["school"]
        teacher = school_with_teacher["teacher"]

        # Create direct assignment
        await book_assignment_service.create_assignment(
            db=async_session,
            book_id=book.id,
            assigned_by=pub_user.id,
            school_id=school.id,
            teacher_id=teacher.id
        )

        accessible_ids = await book_assignment_service.get_accessible_book_ids(
            db=async_session,
            teacher_id=teacher.id
        )

        assert book.id in accessible_ids

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
    """Tests for delete_assignment service function."""

    @pytest.mark.asyncio
    async def test_delete_assignment_success(
        self, async_session: AsyncSession, publisher_with_book, school_with_teacher
    ):
        """Test deleting an assignment."""
        book = publisher_with_book["book"]
        publisher = publisher_with_book["publisher"]
        pub_user = publisher_with_book["user"]
        school = school_with_teacher["school"]

        # Create assignment
        assignment = await book_assignment_service.create_assignment(
            db=async_session,
            book_id=book.id,
            assigned_by=pub_user.id,
            school_id=school.id,
            teacher_id=None
        )

        # Delete it
        result = await book_assignment_service.delete_assignment(
            db=async_session,
            assignment_id=assignment.id,
            publisher_id=publisher.id
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_delete_nonexistent_assignment(
        self, async_session: AsyncSession, publisher_with_book
    ):
        """Test deleting a non-existent assignment returns False."""
        publisher = publisher_with_book["publisher"]

        result = await book_assignment_service.delete_assignment(
            db=async_session,
            assignment_id=uuid.uuid4(),
            publisher_id=publisher.id
        )

        assert result is False
