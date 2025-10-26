"""
Integration tests for LMS domain model relationships
Tests complete hierarchy and cascade delete scenarios
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
class TestCompleteHierarchy:
    """Tests for complete publisher → school → teacher → student hierarchy"""

    def test_create_complete_hierarchy(self, session: Session) -> None:
        """Test creating complete publisher → school → teacher → student chain"""
        # 1. Create publisher user + publisher
        pub_user = User(
            email="p@test.com",
            role=UserRole.publisher,
            hashed_password=get_password_hash("test123"),
            full_name="Publisher User",
        )
        session.add(pub_user)
        session.commit()
        session.refresh(pub_user)

        publisher = Publisher(
            user_id=pub_user.id,
            name="Test Publishing",
            contact_email="contact@pub.com",
        )
        session.add(publisher)
        session.commit()
        session.refresh(publisher)

        # 2. Create school
        school = School(
            name="Test School",
            publisher_id=publisher.id,
            address="123 Test St",
            contact_info="info@school.com",
        )
        session.add(school)
        session.commit()
        session.refresh(school)

        # 3. Create teacher
        teacher_user = User(
            email="t@test.com",
            role=UserRole.teacher,
            hashed_password=get_password_hash("test123"),
            full_name="Teacher User",
        )
        session.add(teacher_user)
        session.commit()
        session.refresh(teacher_user)

        teacher = Teacher(
            user_id=teacher_user.id,
            school_id=school.id,
            subject_specialization="Math",
        )
        session.add(teacher)
        session.commit()
        session.refresh(teacher)

        # 4. Create student
        student_user = User(
            email="s@test.com",
            role=UserRole.student,
            hashed_password=get_password_hash("test123"),
            full_name="Student User",
        )
        session.add(student_user)
        session.commit()
        session.refresh(student_user)

        student = Student(
            user_id=student_user.id,
            grade_level="Grade 10",
            parent_email="parent@test.com",
        )
        session.add(student)
        session.commit()

        # Verify complete hierarchy
        assert pub_user.publisher is not None
        assert pub_user.publisher.id == publisher.id

        session.refresh(publisher)
        assert len(publisher.schools) == 1
        assert publisher.schools[0].id == school.id

        session.refresh(school)
        assert school.publisher.id == publisher.id
        assert len(school.teachers) == 1
        assert school.teachers[0].id == teacher.id

        session.refresh(teacher)
        assert teacher.school.id == school.id
        assert teacher.user.id == teacher_user.id

        session.refresh(student_user)
        assert student_user.student is not None
        assert student_user.student.id == student.id

    def test_query_all_schools_for_publisher(self, session: Session) -> None:
        """Test querying all schools for a publisher"""
        # Setup
        pub_user = User(
            email="p@test.com",
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

        # Create multiple schools
        school1 = School(name="School 1", publisher_id=publisher.id)
        school2 = School(name="School 2", publisher_id=publisher.id)
        session.add(school1)
        session.add(school2)
        session.commit()

        # Query all schools
        session.refresh(publisher)
        assert len(publisher.schools) == 2
        school_names = {s.name for s in publisher.schools}
        assert school_names == {"School 1", "School 2"}

    def test_query_all_teachers_for_school(self, session: Session) -> None:
        """Test querying all teachers for a school"""
        # Setup
        pub_user = User(
            email="p@test.com",
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

        # Create multiple teachers
        teacher1_user = User(
            email="t1@test.com",
            role=UserRole.teacher,
            hashed_password=get_password_hash("test123"),
        )
        teacher2_user = User(
            email="t2@test.com",
            role=UserRole.teacher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(teacher1_user)
        session.add(teacher2_user)
        session.commit()
        session.refresh(teacher1_user)
        session.refresh(teacher2_user)

        teacher1 = Teacher(
            user_id=teacher1_user.id,
            school_id=school.id,
            subject_specialization="Math",
        )
        teacher2 = Teacher(
            user_id=teacher2_user.id,
            school_id=school.id,
            subject_specialization="Science",
        )
        session.add(teacher1)
        session.add(teacher2)
        session.commit()

        # Query all teachers
        session.refresh(school)
        assert len(school.teachers) == 2
        specializations = {t.subject_specialization for t in school.teachers}
        assert specializations == {"Math", "Science"}


@pytest.mark.asyncio
class TestCascadeDeletes:
    """Tests for cascade delete behaviors"""

    def test_delete_publisher_user_cascades_to_publisher_and_schools(
        self, session: Session
    ) -> None:
        """Test deleting publisher user cascades to publisher record and schools"""
        # Setup
        pub_user = User(
            email="p@test.com",
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
        publisher_id = publisher.id

        # Create 2 schools
        school1 = School(name="School 1", publisher_id=publisher.id)
        school2 = School(name="School 2", publisher_id=publisher.id)
        session.add(school1)
        session.add(school2)
        session.commit()
        school1_id = school1.id
        school2_id = school2.id

        # Delete publisher user
        session.delete(pub_user)
        session.commit()

        # Verify publisher is deleted
        result = session.exec(select(Publisher).where(Publisher.id == publisher_id))
        assert result.first() is None

        # Verify schools are deleted
        result = session.exec(select(School).where(School.id == school1_id))
        assert result.first() is None
        result = session.exec(select(School).where(School.id == school2_id))
        assert result.first() is None

    def test_delete_publisher_cascades_to_schools(self, session: Session) -> None:
        """Test deleting publisher record cascades to schools"""
        # Setup
        pub_user = User(
            email="p@test.com",
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

        school1 = School(name="School 1", publisher_id=publisher.id)
        school2 = School(name="School 2", publisher_id=publisher.id)
        session.add(school1)
        session.add(school2)
        session.commit()
        school1_id = school1.id
        school2_id = school2.id

        # Delete publisher (not user)
        session.delete(publisher)
        session.commit()

        # Verify schools are deleted
        result = session.exec(select(School).where(School.id == school1_id))
        assert result.first() is None
        result = session.exec(select(School).where(School.id == school2_id))
        assert result.first() is None

        # Verify user still exists
        result = session.exec(select(User).where(User.id == pub_user.id))
        assert result.first() is not None

    def test_delete_school_cascades_to_teachers(self, session: Session) -> None:
        """Test deleting school cascades to teachers"""
        # Setup complete hierarchy
        pub_user = User(
            email="p@test.com",
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

        # Create 2 teachers
        teacher1_user = User(
            email="t1@test.com",
            role=UserRole.teacher,
            hashed_password=get_password_hash("test123"),
        )
        teacher2_user = User(
            email="t2@test.com",
            role=UserRole.teacher,
            hashed_password=get_password_hash("test123"),
        )
        session.add(teacher1_user)
        session.add(teacher2_user)
        session.commit()
        session.refresh(teacher1_user)
        session.refresh(teacher2_user)

        teacher1 = Teacher(user_id=teacher1_user.id, school_id=school.id)
        teacher2 = Teacher(user_id=teacher2_user.id, school_id=school.id)
        session.add(teacher1)
        session.add(teacher2)
        session.commit()
        teacher1_id = teacher1.id
        teacher2_id = teacher2.id

        # Delete school
        session.delete(school)
        session.commit()

        # Verify teachers are deleted
        result = session.exec(select(Teacher).where(Teacher.id == teacher1_id))
        assert result.first() is None
        result = session.exec(select(Teacher).where(Teacher.id == teacher2_id))
        assert result.first() is None

        # Verify teacher users still exist
        result = session.exec(select(User).where(User.id == teacher1_user.id))
        assert result.first() is not None
        result = session.exec(select(User).where(User.id == teacher2_user.id))
        assert result.first() is not None

    def test_delete_teacher_user_cascades_to_teacher_only(
        self, session: Session
    ) -> None:
        """Test deleting teacher user cascades to teacher record only (not school)"""
        # Setup
        pub_user = User(
            email="p@test.com",
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
        school_id = school.id

        teacher_user = User(
            email="t@test.com",
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

        # Verify teacher record is deleted
        result = session.exec(select(Teacher).where(Teacher.id == teacher_id))
        assert result.first() is None

        # Verify school still exists
        result = session.exec(select(School).where(School.id == school_id))
        assert result.first() is not None

    def test_delete_student_user_cascades_to_student_only(
        self, session: Session
    ) -> None:
        """Test deleting student user cascades to student record only"""
        student_user = User(
            email="s@test.com",
            role=UserRole.student,
            hashed_password=get_password_hash("test123"),
        )
        session.add(student_user)
        session.commit()
        session.refresh(student_user)

        student = Student(user_id=student_user.id, grade_level="Grade 10")
        session.add(student)
        session.commit()
        student_id = student.id

        # Delete student user
        session.delete(student_user)
        session.commit()

        # Verify student record is deleted
        result = session.exec(select(Student).where(Student.id == student_id))
        assert result.first() is None


@pytest.mark.asyncio
class TestRelationshipQueries:
    """Tests for querying across relationships"""

    def test_query_user_from_teacher_record(self, session: Session) -> None:
        """Test querying user from teacher record"""
        # Setup
        pub_user = User(
            email="p@test.com",
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
            full_name="Jane Teacher",
        )
        session.add(teacher_user)
        session.commit()
        session.refresh(teacher_user)

        teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
        session.add(teacher)
        session.commit()
        session.refresh(teacher)

        # Query user from teacher
        assert teacher.user.id == teacher_user.id
        assert teacher.user.email == "teacher@test.com"
        assert teacher.user.full_name == "Jane Teacher"

    def test_query_user_from_student_record(self, session: Session) -> None:
        """Test querying user from student record"""
        student_user = User(
            email="student@test.com",
            role=UserRole.student,
            hashed_password=get_password_hash("test123"),
            full_name="John Student",
        )
        session.add(student_user)
        session.commit()
        session.refresh(student_user)

        student = Student(user_id=student_user.id, grade_level="Grade 9")
        session.add(student)
        session.commit()
        session.refresh(student)

        # Query user from student
        assert student.user.id == student_user.id
        assert student.user.email == "student@test.com"
        assert student.user.full_name == "John Student"
