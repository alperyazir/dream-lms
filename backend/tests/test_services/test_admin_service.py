"""
Unit tests for admin service layer.
Tests business logic and database operations for admin functionality.
"""

import time
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.models.publisher import Publisher
from app.models.school import School
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole
from app.services import admin_service


def unique_email(base: str) -> str:
    """Generate unique email to avoid test collisions."""
    timestamp = int(time.time() * 1000000)
    return f"{base}_{timestamp}@test.com"


class TestPasswordGeneration:
    """Test temporary password generation utility."""

    def test_generate_temporary_password_length(self):
        """Test that generated password is exactly 12 characters."""
        password = admin_service.generate_temporary_password()
        assert len(password) == 12

    def test_generate_temporary_password_character_set(self):
        """Test that generated password contains valid characters."""
        password = admin_service.generate_temporary_password()
        valid_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
        assert all(char in valid_chars for char in password)

    def test_generate_temporary_password_uniqueness(self):
        """Test that multiple calls generate different passwords."""
        passwords = [admin_service.generate_temporary_password() for _ in range(100)]
        # Highly unlikely to get duplicates in 100 random 12-char strings
        assert len(set(passwords)) == 100


class TestDashboardStats:
    """Test dashboard statistics retrieval."""

    @pytest.mark.asyncio
    async def test_get_dashboard_stats_all_zero(self, db_session):
        """Test dashboard stats when database is empty."""
        stats = await admin_service.get_dashboard_stats(db_session)

        assert stats["total_publishers"] == 0
        assert stats["total_schools"] == 0
        assert stats["total_teachers"] == 0
        assert stats["total_students"] == 0

    @pytest.mark.asyncio
    async def test_get_dashboard_stats_with_data(self, db_session):
        """Test dashboard stats with actual data."""
        # Create active publisher
        pub_user = User(
            email=unique_email("pub"),
            password_hash="hash",
            role=UserRole.publisher,
            is_active=True,
        )
        db_session.add(pub_user)
        await db_session.flush()

        publisher = Publisher(user_id=pub_user.id, name="Test Pub", contact_email=pub_user.email)
        db_session.add(publisher)
        await db_session.flush()

        # Create active school
        school = School(
            name="Test School",
            publisher_id=publisher.id,
            contact_info=unique_email("school"),
        )
        db_session.add(school)
        await db_session.flush()

        # Create active teacher
        teacher_user = User(
            email=unique_email("teacher"),
            password_hash="hash",
            role=UserRole.teacher,
            is_active=True,
        )
        db_session.add(teacher_user)
        await db_session.flush()

        teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
        db_session.add(teacher)
        await db_session.flush()

        # Create active student
        student_user = User(
            email=unique_email("student"),
            password_hash="hash",
            role=UserRole.student,
            is_active=True,
        )
        db_session.add(student_user)
        await db_session.flush()

        student = Student(user_id=student_user.id)
        db_session.add(student)
        await db_session.commit()

        # Get stats
        stats = await admin_service.get_dashboard_stats(db_session)

        assert stats["total_publishers"] == 1
        assert stats["total_schools"] == 1
        assert stats["total_teachers"] == 1
        assert stats["total_students"] == 1

    @pytest.mark.asyncio
    async def test_get_dashboard_stats_excludes_inactive(self, db_session):
        """Test that dashboard stats exclude inactive users."""
        # Create inactive publisher
        pub_user = User(
            email="pub@test.com",
            password_hash="hash",
            role=UserRole.publisher,
            is_active=False,  # Inactive
        )
        db_session.add(pub_user)
        await db_session.flush()

        publisher = Publisher(
            user_id=pub_user.id, name="Inactive Pub", contact_email=unique_email("pub")
        )
        db_session.add(publisher)
        await db_session.commit()

        stats = await admin_service.get_dashboard_stats(db_session)

        assert stats["total_publishers"] == 0


class TestPublisherCRUD:
    """Test publisher CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_publisher_success(self, db_session):
        """Test successful publisher creation with User record."""
        publisher, temp_password = await admin_service.create_publisher(
            db=db_session, name="New Publisher", contact_email=unique_email("newpub")
        )

        # Verify publisher created
        assert publisher.id is not None
        assert publisher.name == "New Publisher"
        assert "newpub" in publisher.contact_email
        assert publisher.user_id is not None

        # Verify temporary password returned
        assert isinstance(temp_password, str)
        assert len(temp_password) == 12

        # Verify User record created
        result = await db_session.execute(select(User).where(User.id == publisher.user_id))
        user = result.scalar_one()
        assert "newpub" in user.email
        assert user.role == UserRole.publisher
        assert user.is_active is True

    @pytest.mark.asyncio
    async def test_create_publisher_duplicate_email(self, db_session):
        """Test that creating publisher with duplicate email raises error."""
        # Generate email once to use for both
        dup_email = unique_email("dup")

        # Create first publisher
        await admin_service.create_publisher(
            db=db_session, name="First Pub", contact_email=dup_email
        )

        # Try to create second with same email
        with pytest.raises(HTTPException) as exc_info:
            await admin_service.create_publisher(
                db=db_session, name="Second Pub", contact_email=dup_email
            )

        assert exc_info.value.status_code == 409
        assert "already exists" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_list_publishers_pagination(self, db_session):
        """Test publisher listing with pagination."""
        # Create 3 publishers
        for i in range(3):
            await admin_service.create_publisher(
                db=db_session, name=f"Pub {i}", contact_email=unique_email(f"pub{i}")
            )

        # Get first page (2 items)
        publishers, pagination = await admin_service.list_publishers(
            db=db_session, page=1, per_page=2
        )

        assert len(publishers) == 2
        assert pagination["total"] == 3
        assert pagination["page"] == 1
        assert pagination["per_page"] == 2

        # Get second page (1 item)
        publishers, pagination = await admin_service.list_publishers(
            db=db_session, page=2, per_page=2
        )

        assert len(publishers) == 1
        assert pagination["total"] == 3

    @pytest.mark.asyncio
    async def test_list_publishers_search(self, db_session):
        """Test publisher listing with search filter."""
        # Create publishers with different names
        await admin_service.create_publisher(
            db=db_session, name="ABC Publishing", contact_email=unique_email("abc")
        )
        await admin_service.create_publisher(
            db=db_session, name="XYZ Media", contact_email=unique_email("xyz")
        )
        await admin_service.create_publisher(
            db=db_session, name="ABC Books", contact_email=unique_email("books")
        )

        # Search for "ABC"
        publishers, pagination = await admin_service.list_publishers(
            db=db_session, search="ABC", page=1, per_page=10
        )

        assert len(publishers) == 2
        assert pagination["total"] == 2
        assert all("ABC" in pub["name"] for pub in publishers)

    @pytest.mark.asyncio
    async def test_update_publisher_success(self, db_session):
        """Test updating publisher details."""
        publisher, _ = await admin_service.create_publisher(
            db=db_session, name="Old Name", contact_email=unique_email("old")
        )

        updated = await admin_service.update_publisher(
            db=db_session,
            publisher_id=publisher.id,
            name="New Name",
            contact_email="new@test.com",
        )

        assert updated.name == "New Name"
        assert updated.contact_email == "new@test.com"

    @pytest.mark.asyncio
    async def test_update_publisher_partial(self, db_session):
        """Test partial update of publisher (only name)."""
        publisher, _ = await admin_service.create_publisher(
            db=db_session, name="Old Name", contact_email="original@test.com"
        )

        updated = await admin_service.update_publisher(
            db=db_session, publisher_id=publisher.id, name="New Name", contact_email=None
        )

        assert updated.name == "New Name"
        assert updated.contact_email == "original@test.com"  # Unchanged

    @pytest.mark.asyncio
    async def test_soft_delete_publisher_sets_inactive(self, db_session):
        """Test that soft delete sets User.is_active to False."""
        publisher, _ = await admin_service.create_publisher(
            db=db_session, name="To Delete", contact_email=unique_email("delete")
        )

        # Verify user is active
        result = await db_session.execute(select(User).where(User.id == publisher.user_id))
        user = result.scalar_one()
        assert user.is_active is True

        # Soft delete
        await admin_service.soft_delete_publisher(db=db_session, publisher_id=publisher.id)

        # Verify user is now inactive
        await db_session.refresh(user)
        assert user.is_active is False

    @pytest.mark.asyncio
    async def test_soft_delete_publisher_not_found(self, db_session):
        """Test soft deleting non-existent publisher raises 404."""
        fake_id = uuid4()

        with pytest.raises(HTTPException) as exc_info:
            await admin_service.soft_delete_publisher(db=db_session, publisher_id=fake_id)

        assert exc_info.value.status_code == 404


class TestSchoolCRUD:
    """Test school CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_school_success(self, db_session):
        """Test successful school creation."""
        # Create publisher first
        publisher, _ = await admin_service.create_publisher(
            db=db_session, name="Pub", contact_email=unique_email("pub")
        )

        # Create school
        school = await admin_service.create_school(
            db=db_session,
            name="Test School",
            publisher_id=publisher.id,
            address="123 Main St",
            contact_info="school@test.com",
        )

        assert school.id is not None
        assert school.name == "Test School"
        assert school.publisher_id == publisher.id
        assert school.address == "123 Main St"
        assert school.contact_info == "school@test.com"

    @pytest.mark.asyncio
    async def test_create_school_invalid_publisher_id(self, db_session):
        """Test that creating school with invalid publisher_id raises 404."""
        fake_publisher_id = uuid4()

        with pytest.raises(HTTPException) as exc_info:
            await admin_service.create_school(
                db=db_session,
                name="Test School",
                publisher_id=fake_publisher_id,
                address="123 Main St",
                contact_info="school@test.com",
            )

        assert exc_info.value.status_code == 404
        assert "Publisher not found" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_list_schools_pagination(self, db_session):
        """Test school listing with pagination."""
        # Create publisher
        publisher, _ = await admin_service.create_publisher(
            db=db_session, name="Pub", contact_email=unique_email("pub")
        )

        # Create 3 schools
        for i in range(3):
            await admin_service.create_school(
                db=db_session,
                name=f"School {i}",
                publisher_id=publisher.id,
                contact_info=f"school{i}@test.com",
            )

        # Get first page
        schools, pagination = await admin_service.list_schools(db=db_session, page=1, per_page=2)

        assert len(schools) == 2
        assert pagination["total"] == 3

    @pytest.mark.asyncio
    async def test_list_schools_search(self, db_session):
        """Test school listing with search filter."""
        # Create publisher
        publisher, _ = await admin_service.create_publisher(
            db=db_session, name="Pub", contact_email=unique_email("pub")
        )

        # Create schools
        await admin_service.create_school(
            db=db_session,
            name="Lincoln High School",
            publisher_id=publisher.id,
            contact_info="lincoln@test.com",
        )
        await admin_service.create_school(
            db=db_session,
            name="Washington Elementary",
            publisher_id=publisher.id,
            contact_info="wash@test.com",
        )

        # Search for "Lincoln"
        schools, pagination = await admin_service.list_schools(
            db=db_session, search="Lincoln", page=1, per_page=10
        )

        assert len(schools) == 1
        assert pagination["total"] == 1
        assert schools[0]["name"] == "Lincoln High School"

    @pytest.mark.asyncio
    async def test_update_school_success(self, db_session):
        """Test updating school details."""
        # Create publisher and school
        publisher, _ = await admin_service.create_publisher(
            db=db_session, name="Pub", contact_email=unique_email("pub")
        )
        school = await admin_service.create_school(
            db=db_session,
            name="Old Name",
            publisher_id=publisher.id,
            address="Old Address",
            contact_info="old@test.com",
        )

        # Update school
        updated = await admin_service.update_school(
            db=db_session,
            school_id=school.id,
            name="New Name",
            address="New Address",
            contact_info="new@test.com",
        )

        assert updated.name == "New Name"
        assert updated.address == "New Address"
        assert updated.contact_info == "new@test.com"

    @pytest.mark.asyncio
    async def test_soft_delete_school_deletes(self, db_session):
        """Test that soft delete actually deletes the school."""
        # Create publisher and school
        publisher, _ = await admin_service.create_publisher(
            db=db_session, name="Pub", contact_email=unique_email("pub")
        )
        school = await admin_service.create_school(
            db=db_session,
            name="To Delete",
            publisher_id=publisher.id,
            contact_info="delete@test.com",
        )

        school_id = school.id

        # Delete school
        await admin_service.soft_delete_school(db=db_session, school_id=school_id)

        # Verify school is deleted
        from sqlalchemy import select
        from app.models.school import School

        stmt = select(School).where(School.id == school_id)
        result = await db_session.execute(stmt)
        deleted_school = result.scalar_one_or_none()
        assert deleted_school is None


class TestListEndpoints:
    """Test teacher and student list endpoints."""

    @pytest.mark.asyncio
    async def test_list_teachers_with_joins(self, db_session):
        """Test listing teachers includes user and school data."""
        # Create publisher
        publisher, _ = await admin_service.create_publisher(
            db=db_session, name="Pub", contact_email=unique_email("pub")
        )

        # Create school
        school = await admin_service.create_school(
            db=db_session,
            name="Test School",
            publisher_id=publisher.id,
            contact_info="school@test.com",
        )

        # Create teacher
        teacher_user = User(
            email=unique_email("teacher"),
            password_hash="hash",
            role=UserRole.teacher,
            is_active=True,
        )
        db_session.add(teacher_user)
        await db_session.flush()

        teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
        db_session.add(teacher)
        await db_session.commit()

        # List teachers
        teachers, pagination = await admin_service.list_teachers(db=db_session, page=1, per_page=10)

        assert len(teachers) == 1
        assert pagination["total"] == 1
        assert "teacher" in teachers[0]["email"]
        assert teachers[0]["school_name"] == "Test School"

    @pytest.mark.asyncio
    async def test_list_students_with_joins(self, db_session):
        """Test listing students includes user data."""
        # Create student
        student_user = User(
            email=unique_email("student"),
            password_hash="hash",
            role=UserRole.student,
            is_active=True,
        )
        db_session.add(student_user)
        await db_session.flush()

        student = Student(user_id=student_user.id)
        db_session.add(student)
        await db_session.commit()

        # List students
        students, pagination = await admin_service.list_students(db=db_session, page=1, per_page=10)

        assert len(students) == 1
        assert pagination["total"] == 1
        assert "student" in students[0]["email"]

    @pytest.mark.asyncio
    async def test_list_teachers_includes_inactive(self, db_session):
        """Test that inactive teachers are included in list with is_active flag."""
        # Create publisher and school
        publisher, _ = await admin_service.create_publisher(
            db=db_session, name="Pub", contact_email=unique_email("pub")
        )
        school = await admin_service.create_school(
            db=db_session,
            name="School",
            publisher_id=publisher.id,
            contact_info="school@test.com",
        )

        # Create inactive teacher
        teacher_user = User(
            email=unique_email("teacher"),
            password_hash="hash",
            role=UserRole.teacher,
            is_active=False,  # Inactive
        )
        db_session.add(teacher_user)
        await db_session.flush()

        teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
        db_session.add(teacher)
        await db_session.commit()

        # List teachers
        teachers, pagination = await admin_service.list_teachers(db=db_session, page=1, per_page=10)

        assert len(teachers) == 1
        assert pagination["total"] == 1
        assert teachers[0]["is_active"] is False


class TestErrorHandling:
    """Test error handling scenarios."""

    @pytest.mark.asyncio
    async def test_create_publisher_handles_database_error(self, db_session):
        """Test that database errors are properly handled."""
        # Mock db.commit to raise an error
        original_commit = db_session.commit

        async def mock_commit():
            raise Exception("Database connection error")

        db_session.commit = mock_commit

        with pytest.raises(Exception) as exc_info:
            await admin_service.create_publisher(
                db=db_session, name="Test", contact_email=unique_email("test")
            )

        assert "Database connection error" in str(exc_info.value)

        # Restore original
        db_session.commit = original_commit

    @pytest.mark.asyncio
    async def test_update_publisher_allows_duplicate_contact_email(self, db_session):
        """Test that updating publisher contact_email doesn't validate uniqueness
        (only updates Publisher table)."""
        # Create two publishers
        pub1, _ = await admin_service.create_publisher(
            db=db_session, name="Pub 1", contact_email="pub1@test.com"
        )
        pub2, _ = await admin_service.create_publisher(
            db=db_session, name="Pub 2", contact_email="pub2@test.com"
        )

        # Update pub2's contact_email to match pub1
        # (this only updates Publisher.contact_email, not User.email)
        updated = await admin_service.update_publisher(
            db=db_session, publisher_id=pub2.id, contact_email="pub1@test.com"
        )

        # Should succeed because contact_email is just a field in Publisher,
        # not a unique constraint
        assert updated.contact_email == "pub1@test.com"
