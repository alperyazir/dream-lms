"""
Tests for Multi-Activity Assignment functionality (Story 8.1).

Tests cover:
- Assignment creation with single activity (backward compatibility)
- Assignment creation with multiple activities
- Activity ordering preservation
- Unique constraint on (assignment_id, activity_id)
- AssignmentStudentActivity records creation for each student × activity
- Combined score calculation
- API returns activities list in correct order
- Student assignment response includes activity progress

NOTE: These tests use sync SQLite fixtures for testing model logic.
Integration tests may require async PostgreSQL for full coverage.
"""

import uuid

import pytest
from sqlmodel import Session, select

from app.models import (
    Activity,
    ActivityType,
    Assignment,
    AssignmentActivity,
    AssignmentStatus,
    AssignmentStudent,
    AssignmentStudentActivity,
    AssignmentStudentActivityStatus,
    Book,
    BookStatus,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)
from app.schemas.assignment import AssignmentCreate


class TestAssignmentActivityModel:
    """Test AssignmentActivity junction table model."""

    def test_create_assignment_activity(self, session: Session):
        """Test creating an AssignmentActivity junction record."""
        # Create required entities
        publisher_user = User(
            id=uuid.uuid4(),
            email="pub@test.com",
            username="testpub",
            hashed_password="hash",
            role=UserRole.publisher,
            is_active=True,
        )
        session.add(publisher_user)
        session.flush()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher",
        )
        session.add(publisher)
        session.flush()

        school = School(
            id=uuid.uuid4(),
            name="Test School",
            publisher_id=publisher.id,
        )
        session.add(school)
        session.flush()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher@test.com",
            username="testteacher",
            hashed_password="hash",
            role=UserRole.teacher,
            is_active=True,
        )
        session.add(teacher_user)
        session.flush()

        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id,
        )
        session.add(teacher)
        session.flush()

        book = Book(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            book_name="test-book",
            publisher_name="Test Publisher",
            dream_storage_id="book-001",
            title="Test Book",
            status=BookStatus.published,
        )
        session.add(book)
        session.flush()

        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            activity_type=ActivityType.circle,
            module_name="test-module",
            page_number=1,
            section_index=0,
            title="Test Activity",
            config_json={},
            order_index=0,
        )
        session.add(activity)
        session.flush()

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            book_id=book.id,
            activity_id=activity.id,
            name="Test Assignment",
        )
        session.add(assignment)
        session.flush()

        # Create AssignmentActivity
        assignment_activity = AssignmentActivity(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            activity_id=activity.id,
            order_index=0,
        )
        session.add(assignment_activity)
        session.commit()

        # Verify
        result = session.execute(
            select(AssignmentActivity).where(
                AssignmentActivity.assignment_id == assignment.id
            )
        )
        aa = result.scalar_one()
        assert aa.assignment_id == assignment.id
        assert aa.activity_id == activity.id
        assert aa.order_index == 0

    def test_assignment_activity_unique_constraint(self, session: Session):
        """Test that duplicate (assignment_id, activity_id) raises error."""
        # Setup entities (abbreviated)
        publisher_user = User(
            id=uuid.uuid4(),
            email="pub2@test.com",
            username="testpub2",
            hashed_password="hash",
            role=UserRole.publisher,
            is_active=True,
        )
        session.add(publisher_user)
        session.flush()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher 2",
        )
        session.add(publisher)
        session.flush()

        school = School(
            id=uuid.uuid4(),
            name="Test School 2",
            publisher_id=publisher.id,
        )
        session.add(school)
        session.flush()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher2@test.com",
            username="testteacher2",
            hashed_password="hash",
            role=UserRole.teacher,
            is_active=True,
        )
        session.add(teacher_user)
        session.flush()

        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id,
        )
        session.add(teacher)
        session.flush()

        book = Book(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            book_name="test-book",
            publisher_name="Test Publisher",
            dream_storage_id="book-002",
            title="Test Book 2",
            status=BookStatus.published,
        )
        session.add(book)
        session.flush()

        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            activity_type=ActivityType.circle,
            module_name="test-module",
            page_number=1,
            section_index=0,
            title="Test Activity 2",
            config_json={},
            order_index=0,
        )
        session.add(activity)
        session.flush()

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            book_id=book.id,
            activity_id=activity.id,
            name="Test Assignment 2",
        )
        session.add(assignment)
        session.flush()

        # Create first AssignmentActivity
        aa1 = AssignmentActivity(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            activity_id=activity.id,
            order_index=0,
        )
        session.add(aa1)
        session.commit()

        # Try to create duplicate - should fail
        aa2 = AssignmentActivity(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            activity_id=activity.id,
            order_index=1,
        )
        session.add(aa2)

        with pytest.raises(Exception):  # IntegrityError
            session.commit()


class TestAssignmentStudentActivityModel:
    """Test AssignmentStudentActivity per-activity progress model."""

    def test_create_assignment_student_activity(self, session: Session):
        """Test creating per-activity progress records."""
        # Setup entities
        publisher_user = User(
            id=uuid.uuid4(),
            email="pub3@test.com",
            username="testpub3",
            hashed_password="hash",
            role=UserRole.publisher,
            is_active=True,
        )
        session.add(publisher_user)
        session.flush()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher 3",
        )
        session.add(publisher)
        session.flush()

        school = School(
            id=uuid.uuid4(),
            name="Test School 3",
            publisher_id=publisher.id,
        )
        session.add(school)
        session.flush()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher3@test.com",
            username="testteacher3",
            hashed_password="hash",
            role=UserRole.teacher,
            is_active=True,
        )
        session.add(teacher_user)
        session.flush()

        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id,
        )
        session.add(teacher)
        session.flush()

        student_user = User(
            id=uuid.uuid4(),
            email="student3@test.com",
            username="teststudent3",
            hashed_password="hash",
            role=UserRole.student,
            is_active=True,
        )
        session.add(student_user)
        session.flush()

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            school_id=school.id,
        )
        session.add(student)
        session.flush()

        book = Book(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            book_name="test-book",
            publisher_name="Test Publisher",
            dream_storage_id="book-003",
            title="Test Book 3",
            status=BookStatus.published,
        )
        session.add(book)
        session.flush()

        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            activity_type=ActivityType.circle,
            module_name="test-module",
            page_number=1,
            section_index=0,
            title="Test Activity 3",
            config_json={},
            order_index=0,
        )
        session.add(activity)
        session.flush()

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            book_id=book.id,
            activity_id=activity.id,
            name="Test Assignment 3",
        )
        session.add(assignment)
        session.flush()

        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.not_started,
        )
        session.add(assignment_student)
        session.flush()

        # Create AssignmentStudentActivity
        asa = AssignmentStudentActivity(
            id=uuid.uuid4(),
            assignment_student_id=assignment_student.id,
            activity_id=activity.id,
            status=AssignmentStudentActivityStatus.not_started,
            max_score=100.0,
        )
        session.add(asa)
        session.commit()

        # Verify
        result = session.execute(
            select(AssignmentStudentActivity).where(
                AssignmentStudentActivity.assignment_student_id == assignment_student.id
            )
        )
        progress = result.scalar_one()
        assert progress.status == AssignmentStudentActivityStatus.not_started
        assert progress.max_score == 100.0
        assert progress.score is None


class TestCombinedScoreCalculation:
    """Test AssignmentStudent combined score calculation."""

    def test_calculate_combined_score_empty(self, session: Session):
        """Test combined score with no activity progress."""
        # Setup minimal entities
        publisher_user = User(
            id=uuid.uuid4(),
            email="pub4@test.com",
            username="testpub4",
            hashed_password="hash",
            role=UserRole.publisher,
            is_active=True,
        )
        session.add(publisher_user)
        session.flush()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher 4",
        )
        session.add(publisher)
        session.flush()

        school = School(
            id=uuid.uuid4(),
            name="Test School 4",
            publisher_id=publisher.id,
        )
        session.add(school)
        session.flush()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher4@test.com",
            username="testteacher4",
            hashed_password="hash",
            role=UserRole.teacher,
            is_active=True,
        )
        session.add(teacher_user)
        session.flush()

        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id,
        )
        session.add(teacher)
        session.flush()

        student_user = User(
            id=uuid.uuid4(),
            email="student4@test.com",
            username="teststudent4",
            hashed_password="hash",
            role=UserRole.student,
            is_active=True,
        )
        session.add(student_user)
        session.flush()

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            school_id=school.id,
        )
        session.add(student)
        session.flush()

        book = Book(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            book_name="test-book",
            publisher_name="Test Publisher",
            dream_storage_id="book-004",
            title="Test Book 4",
            status=BookStatus.published,
        )
        session.add(book)
        session.flush()

        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            activity_type=ActivityType.circle,
            module_name="test-module",
            page_number=1,
            section_index=0,
            title="Test Activity 4",
            config_json={},
            order_index=0,
        )
        session.add(activity)
        session.flush()

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            book_id=book.id,
            activity_id=activity.id,
            name="Test Assignment 4",
        )
        session.add(assignment)
        session.flush()

        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.not_started,
        )
        session.add(assignment_student)
        session.commit()

        # Calculate with empty progress
        session.refresh(assignment_student, ["activity_progress"])
        score = assignment_student.calculate_combined_score()
        assert score is None

    def test_calculate_combined_score_with_progress(self, session: Session):
        """Test combined score calculation with activity progress."""
        # Setup entities
        publisher_user = User(
            id=uuid.uuid4(),
            email="pub5@test.com",
            username="testpub5",
            hashed_password="hash",
            role=UserRole.publisher,
            is_active=True,
        )
        session.add(publisher_user)
        session.flush()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher 5",
        )
        session.add(publisher)
        session.flush()

        school = School(
            id=uuid.uuid4(),
            name="Test School 5",
            publisher_id=publisher.id,
        )
        session.add(school)
        session.flush()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher5@test.com",
            username="testteacher5",
            hashed_password="hash",
            role=UserRole.teacher,
            is_active=True,
        )
        session.add(teacher_user)
        session.flush()

        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id,
        )
        session.add(teacher)
        session.flush()

        student_user = User(
            id=uuid.uuid4(),
            email="student5@test.com",
            username="teststudent5",
            hashed_password="hash",
            role=UserRole.student,
            is_active=True,
        )
        session.add(student_user)
        session.flush()

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            school_id=school.id,
        )
        session.add(student)
        session.flush()

        book = Book(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            book_name="test-book",
            publisher_name="Test Publisher",
            dream_storage_id="book-005",
            title="Test Book 5",
            status=BookStatus.published,
        )
        session.add(book)
        session.flush()

        activity1 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            activity_type=ActivityType.circle,
            module_name="test-module",
            page_number=1,
            section_index=0,
            title="Activity 1",
            config_json={},
            order_index=0,
        )
        activity2 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            activity_type=ActivityType.matchTheWords,
            module_name="test-module",
            page_number=1,
            section_index=1,
            title="Activity 2",
            config_json={},
            order_index=1,
        )
        session.add(activity1)
        session.add(activity2)
        session.flush()

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            book_id=book.id,
            activity_id=activity1.id,
            name="Multi-Activity Assignment",
        )
        session.add(assignment)
        session.flush()

        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.in_progress,
        )
        session.add(assignment_student)
        session.flush()

        # Add activity progress - 80/100 on first, 60/100 on second
        asa1 = AssignmentStudentActivity(
            id=uuid.uuid4(),
            assignment_student_id=assignment_student.id,
            activity_id=activity1.id,
            status=AssignmentStudentActivityStatus.completed,
            score=80.0,
            max_score=100.0,
        )
        asa2 = AssignmentStudentActivity(
            id=uuid.uuid4(),
            assignment_student_id=assignment_student.id,
            activity_id=activity2.id,
            status=AssignmentStudentActivityStatus.completed,
            score=60.0,
            max_score=100.0,
        )
        session.add(asa1)
        session.add(asa2)
        session.commit()

        # Calculate combined score: (80 + 60) / (100 + 100) * 100 = 70%
        session.refresh(assignment_student, ["activity_progress"])
        score = assignment_student.calculate_combined_score()
        assert score == 70.0


class TestAssignmentCreateSchema:
    """Test AssignmentCreate schema validation."""

    def test_single_activity_valid(self):
        """Test that single activity_id creates valid schema."""
        schema = AssignmentCreate(
            activity_id=uuid.uuid4(),
            book_id=uuid.uuid4(),
            name="Test Assignment",
            student_ids=[uuid.uuid4()],
        )
        activity_ids = schema.get_activity_ids()
        assert len(activity_ids) == 1

    def test_multi_activity_valid(self):
        """Test that activity_ids list creates valid schema."""
        ids = [uuid.uuid4(), uuid.uuid4(), uuid.uuid4()]
        schema = AssignmentCreate(
            activity_ids=ids,
            book_id=uuid.uuid4(),
            name="Multi Activity Assignment",
            student_ids=[uuid.uuid4()],
        )
        activity_ids = schema.get_activity_ids()
        assert len(activity_ids) == 3
        assert activity_ids == ids

    def test_both_activity_id_and_activity_ids_invalid(self):
        """Test that providing both activity_id and activity_ids raises error."""
        with pytest.raises(ValueError, match="Cannot provide both"):
            AssignmentCreate(
                activity_id=uuid.uuid4(),
                activity_ids=[uuid.uuid4()],
                book_id=uuid.uuid4(),
                name="Invalid Assignment",
                student_ids=[uuid.uuid4()],
            )

    def test_no_activity_invalid(self):
        """Test that providing neither activity_id nor activity_ids raises error."""
        with pytest.raises(ValueError, match="Either activity_id or activity_ids"):
            AssignmentCreate(
                book_id=uuid.uuid4(),
                name="Invalid Assignment",
                student_ids=[uuid.uuid4()],
            )


class TestAllActivitiesCompleted:
    """Test all_activities_completed property."""

    def test_all_completed_true(self, session: Session):
        """Test property returns True when all activities completed."""
        # Setup minimal entities
        publisher_user = User(
            id=uuid.uuid4(),
            email="pub6@test.com",
            username="testpub6",
            hashed_password="hash",
            role=UserRole.publisher,
            is_active=True,
        )
        session.add(publisher_user)
        session.flush()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher 6",
        )
        session.add(publisher)
        session.flush()

        school = School(
            id=uuid.uuid4(),
            name="Test School 6",
            publisher_id=publisher.id,
        )
        session.add(school)
        session.flush()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher6@test.com",
            username="testteacher6",
            hashed_password="hash",
            role=UserRole.teacher,
            is_active=True,
        )
        session.add(teacher_user)
        session.flush()

        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id,
        )
        session.add(teacher)
        session.flush()

        student_user = User(
            id=uuid.uuid4(),
            email="student6@test.com",
            username="teststudent6",
            hashed_password="hash",
            role=UserRole.student,
            is_active=True,
        )
        session.add(student_user)
        session.flush()

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            school_id=school.id,
        )
        session.add(student)
        session.flush()

        book = Book(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            book_name="test-book",
            publisher_name="Test Publisher",
            dream_storage_id="book-006",
            title="Test Book 6",
            status=BookStatus.published,
        )
        session.add(book)
        session.flush()

        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            activity_type=ActivityType.circle,
            module_name="test-module",
            page_number=1,
            section_index=0,
            title="Activity",
            config_json={},
            order_index=0,
        )
        session.add(activity)
        session.flush()

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            book_id=book.id,
            activity_id=activity.id,
            name="Test Assignment",
        )
        session.add(assignment)
        session.flush()

        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.completed,
        )
        session.add(assignment_student)
        session.flush()

        asa = AssignmentStudentActivity(
            id=uuid.uuid4(),
            assignment_student_id=assignment_student.id,
            activity_id=activity.id,
            status=AssignmentStudentActivityStatus.completed,
            score=100.0,
            max_score=100.0,
        )
        session.add(asa)
        session.commit()

        session.refresh(assignment_student, ["activity_progress"])
        assert assignment_student.all_activities_completed is True

    def test_all_completed_false_with_in_progress(self, session: Session):
        """Test property returns False when some activities not completed."""
        # Setup minimal entities
        publisher_user = User(
            id=uuid.uuid4(),
            email="pub7@test.com",
            username="testpub7",
            hashed_password="hash",
            role=UserRole.publisher,
            is_active=True,
        )
        session.add(publisher_user)
        session.flush()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher 7",
        )
        session.add(publisher)
        session.flush()

        school = School(
            id=uuid.uuid4(),
            name="Test School 7",
            publisher_id=publisher.id,
        )
        session.add(school)
        session.flush()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher7@test.com",
            username="testteacher7",
            hashed_password="hash",
            role=UserRole.teacher,
            is_active=True,
        )
        session.add(teacher_user)
        session.flush()

        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id,
        )
        session.add(teacher)
        session.flush()

        student_user = User(
            id=uuid.uuid4(),
            email="student7@test.com",
            username="teststudent7",
            hashed_password="hash",
            role=UserRole.student,
            is_active=True,
        )
        session.add(student_user)
        session.flush()

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            school_id=school.id,
        )
        session.add(student)
        session.flush()

        book = Book(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            book_name="test-book",
            publisher_name="Test Publisher",
            dream_storage_id="book-007",
            title="Test Book 7",
            status=BookStatus.published,
        )
        session.add(book)
        session.flush()

        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            activity_type=ActivityType.circle,
            module_name="test-module",
            page_number=1,
            section_index=0,
            title="Activity",
            config_json={},
            order_index=0,
        )
        session.add(activity)
        session.flush()

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            book_id=book.id,
            activity_id=activity.id,
            name="Test Assignment",
        )
        session.add(assignment)
        session.flush()

        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.in_progress,
        )
        session.add(assignment_student)
        session.flush()

        asa = AssignmentStudentActivity(
            id=uuid.uuid4(),
            assignment_student_id=assignment_student.id,
            activity_id=activity.id,
            status=AssignmentStudentActivityStatus.in_progress,
            max_score=100.0,
        )
        session.add(asa)
        session.commit()

        session.refresh(assignment_student, ["activity_progress"])
        assert assignment_student.all_activities_completed is False
