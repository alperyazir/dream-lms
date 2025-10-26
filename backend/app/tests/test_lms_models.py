"""
Unit tests for LMS domain models (Publisher, School, Teacher, Student)
"""
import pytest
from sqlmodel import Session, select

from app.core.security import get_password_hash
from app.models import (
    User,
    UserRole,
    Publisher,
    School,
    Teacher,
    Student,
)


@pytest.mark.asyncio
class TestPublisherModel:
    """Tests for Publisher model"""

    def test_create_publisher_with_user(self, session: Session) -> None:
        """Test creating publisher linked to user"""
        # Create user
        user = User(
            email="pub@test.com",
            role=UserRole.publisher,
            hashed_password=get_password_hash("test123"),
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create publisher
        publisher = Publisher(
            user_id=user.id,
            name="Test Publisher",
            contact_email="contact@test.com",
        )
        session.add(publisher)
        session.commit()
        session.refresh(publisher)

        assert publisher.id is not None
        assert publisher.user_id == user.id
        assert publisher.name == "Test Publisher"
        assert publisher.contact_email == "contact@test.com"
        assert publisher.created_at is not None
        assert publisher.updated_at is not None

    def test_publisher_user_relationship(self, session: Session) -> None:
        """Test Publisher.user relationship"""
        user = User(
            email="pub@test.com",
            role=UserRole.publisher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        publisher = Publisher(
            user_id=user.id,
            name="Test Publisher",
        )
        session.add(publisher)
        session.commit()
        session.refresh(publisher)

        # Test relationship
        assert publisher.user.id == user.id
        assert publisher.user.email == "pub@test.com"

    def test_publisher_cascade_delete(self, session: Session) -> None:
        """Test that deleting user cascades to publisher"""
        user = User(
            email="pub@test.com",
            role=UserRole.publisher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        publisher = Publisher(user_id=user.id, name="Test Publisher")
        session.add(publisher)
        session.commit()
        publisher_id = publisher.id

        # Delete user
        session.delete(user)
        session.commit()

        # Publisher should be deleted
        result = session.exec(select(Publisher).where(Publisher.id == publisher_id))
        assert result.first() is None


@pytest.mark.asyncio
class TestSchoolModel:
    """Tests for School model"""

    def test_create_school_linked_to_publisher(self, session: Session) -> None:
        """Test creating school linked to publisher"""
        # Create publisher (with user)
        user = User(
            email="pub@test.com",
            role=UserRole.publisher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        publisher = Publisher(user_id=user.id, name="Test Publisher")
        session.add(publisher)
        session.commit()
        session.refresh(publisher)

        # Create school
        school = School(
            name="Test School",
            publisher_id=publisher.id,
            address="123 Main St",
            contact_info="school@test.com",
        )
        session.add(school)
        session.commit()
        session.refresh(school)

        assert school.id is not None
        assert school.publisher_id == publisher.id
        assert school.name == "Test School"
        assert school.address == "123 Main St"

    def test_school_publisher_relationship(self, session: Session) -> None:
        """Test School.publisher relationship"""
        user = User(
            email="pub@test.com",
            role=UserRole.publisher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        publisher = Publisher(user_id=user.id, name="Test Publisher")
        session.add(publisher)
        session.commit()
        session.refresh(publisher)

        school = School(name="Test School", publisher_id=publisher.id)
        session.add(school)
        session.commit()
        session.refresh(school)

        # Test relationship
        assert school.publisher.id == publisher.id
        assert school.publisher.name == "Test Publisher"

    def test_school_cascade_delete_from_publisher(self, session: Session) -> None:
        """Test that deleting publisher cascades to schools"""
        user = User(
            email="pub@test.com",
            role=UserRole.publisher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        publisher = Publisher(user_id=user.id, name="Test Publisher")
        session.add(publisher)
        session.commit()
        session.refresh(publisher)

        school = School(name="Test School", publisher_id=publisher.id)
        session.add(school)
        session.commit()
        school_id = school.id

        # Delete publisher
        session.delete(publisher)
        session.commit()

        # School should be deleted
        result = session.exec(select(School).where(School.id == school_id))
        assert result.first() is None


@pytest.mark.asyncio
class TestTeacherModel:
    """Tests for Teacher model"""

    def test_create_teacher_with_user_and_school(self, session: Session) -> None:
        """Test creating teacher with user and school relationships"""
        # Create publisher user + publisher + school
        pub_user = User(
            email="pub@test.com",
            role=UserRole.publisher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(pub_user)
        session.commit()
        session.refresh(pub_user)

        publisher = Publisher(user_id=pub_user.id, name="Publisher")
        session.add(publisher)
        session.commit()
        session.refresh(publisher)

        school = School(name="School", publisher_id=publisher.id)
        session.add(school)
        session.commit()
        session.refresh(school)

        # Create teacher user
        teacher_user = User(
            email="teacher@test.com",
            role=UserRole.teacher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(teacher_user)
        session.commit()
        session.refresh(teacher_user)

        # Create teacher
        teacher = Teacher(
            user_id=teacher_user.id,
            school_id=school.id,
            subject_specialization="Science",
        )
        session.add(teacher)
        session.commit()
        session.refresh(teacher)

        assert teacher.id is not None
        assert teacher.user_id == teacher_user.id
        assert teacher.school_id == school.id
        assert teacher.subject_specialization == "Science"

    def test_teacher_cascade_delete_from_user(self, session: Session) -> None:
        """Test that deleting teacher user cascades to teacher"""
        # Setup
        pub_user = User(
            email="pub@test.com",
            role=UserRole.publisher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(pub_user)
        session.commit()
        session.refresh(pub_user)

        publisher = Publisher(user_id=pub_user.id, name="Publisher")
        session.add(publisher)
        session.commit()
        session.refresh(publisher)

        school = School(name="School", publisher_id=publisher.id)
        session.add(school)
        session.commit()
        session.refresh(school)

        teacher_user = User(
            email="teacher@test.com",
            role=UserRole.teacher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(teacher_user)
        session.commit()
        session.refresh(teacher_user)

        teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
        session.add(teacher)
        session.commit()
        teacher_id = teacher.id

        # Delete teacher user
        session.delete(teacher_user)
        session.commit()

        # Teacher should be deleted
        result = session.exec(select(Teacher).where(Teacher.id == teacher_id))
        assert result.first() is None

    def test_teacher_cascade_delete_from_school(self, session: Session) -> None:
        """Test that deleting school cascades to teachers"""
        # Setup
        pub_user = User(
            email="pub@test.com",
            role=UserRole.publisher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(pub_user)
        session.commit()
        session.refresh(pub_user)

        publisher = Publisher(user_id=pub_user.id, name="Publisher")
        session.add(publisher)
        session.commit()
        session.refresh(publisher)

        school = School(name="School", publisher_id=publisher.id)
        session.add(school)
        session.commit()
        session.refresh(school)

        teacher_user = User(
            email="teacher@test.com",
            role=UserRole.teacher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(teacher_user)
        session.commit()
        session.refresh(teacher_user)

        teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
        session.add(teacher)
        session.commit()
        teacher_id = teacher.id

        # Delete school
        session.delete(school)
        session.commit()

        # Teacher should be deleted
        result = session.exec(select(Teacher).where(Teacher.id == teacher_id))
        assert result.first() is None


@pytest.mark.asyncio
class TestStudentModel:
    """Tests for Student model"""

    def test_create_student_with_user(self, session: Session) -> None:
        """Test creating student linked to user"""
        user = User(
            email="student@test.com",
            role=UserRole.student,
            hashed_password=get_password_hash("test123"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        student = Student(
            user_id=user.id,
            grade_level="Grade 10",
            parent_email="parent@test.com",
        )
        session.add(student)
        session.commit()
        session.refresh(student)

        assert student.id is not None
        assert student.user_id == user.id
        assert student.grade_level == "Grade 10"
        assert student.parent_email == "parent@test.com"

    def test_student_cascade_delete_from_user(self, session: Session) -> None:
        """Test that deleting user cascades to student"""
        user = User(
            email="student@test.com",
            role=UserRole.student,
            hashed_password=get_password_hash("test123"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        student = Student(user_id=user.id, grade_level="Grade 10")
        session.add(student)
        session.commit()
        student_id = student.id

        # Delete user
        session.delete(user)
        session.commit()

        # Student should be deleted
        result = session.exec(select(Student).where(Student.id == student_id))
        assert result.first() is None


@pytest.mark.asyncio
class TestUserRelationships:
    """Tests for User model relationships to Publisher, Teacher, Student"""

    def test_user_publisher_relationship(self, session: Session) -> None:
        """Test accessing user.publisher relationship"""
        user = User(
            email="pub@test.com",
            role=UserRole.publisher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        publisher = Publisher(user_id=user.id, name="Test Publisher")
        session.add(publisher)
        session.commit()

        # Reload user
        session.refresh(user)

        # Test relationship
        assert user.publisher is not None
        assert user.publisher.id == publisher.id
        assert user.teacher is None
        assert user.student is None

    def test_user_teacher_relationship(self, session: Session) -> None:
        """Test accessing user.teacher relationship"""
        # Setup school first
        pub_user = User(
            email="pub@test.com",
            role=UserRole.publisher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(pub_user)
        session.commit()
        session.refresh(pub_user)

        publisher = Publisher(user_id=pub_user.id, name="Publisher")
        session.add(publisher)
        session.commit()
        session.refresh(publisher)

        school = School(name="School", publisher_id=publisher.id)
        session.add(school)
        session.commit()
        session.refresh(school)

        # Create teacher user
        user = User(
            email="teacher@test.com",
            role=UserRole.teacher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        teacher = Teacher(user_id=user.id, school_id=school.id)
        session.add(teacher)
        session.commit()

        # Reload user
        session.refresh(user)

        # Test relationship
        assert user.teacher is not None
        assert user.teacher.id == teacher.id
        assert user.publisher is None
        assert user.student is None

    def test_user_student_relationship(self, session: Session) -> None:
        """Test accessing user.student relationship"""
        user = User(
            email="student@test.com",
            role=UserRole.student,
            hashed_password=get_password_hash("test123"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        student = Student(user_id=user.id, grade_level="Grade 9")
        session.add(student)
        session.commit()

        # Reload user
        session.refresh(user)

        # Test relationship
        assert user.student is not None
        assert user.student.id == student.id
        assert user.publisher is None
        assert user.teacher is None
