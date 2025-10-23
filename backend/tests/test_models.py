"""
Unit tests for database models.
Tests model creation, relationships, constraints, and cascade behaviors.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.publisher import Publisher
from app.models.school import School
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_create_admin_user(db_session):
    """Test creating a user with admin role."""
    user = User(
        email="admin@test.com", password_hash="hashed_password", role=UserRole.admin, is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    assert user.id is not None
    assert user.email == "admin@test.com"
    assert user.role == UserRole.admin
    assert user.is_active is True
    assert user.created_at is not None
    assert user.updated_at is not None


@pytest.mark.asyncio
async def test_create_publisher_user(db_session):
    """Test creating a user with publisher role."""
    user = User(
        email="publisher@test.com",
        password_hash="hashed_password",
        role=UserRole.publisher,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    assert user.role == UserRole.publisher


@pytest.mark.asyncio
async def test_create_teacher_user(db_session):
    """Test creating a user with teacher role."""
    user = User(
        email="teacher@test.com",
        password_hash="hashed_password",
        role=UserRole.teacher,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    assert user.role == UserRole.teacher


@pytest.mark.asyncio
async def test_create_student_user(db_session):
    """Test creating a user with student role."""
    user = User(
        email="student@test.com",
        password_hash="hashed_password",
        role=UserRole.student,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    assert user.role == UserRole.student


@pytest.mark.asyncio
async def test_email_uniqueness_constraint(db_session):
    """Test that email uniqueness constraint is enforced."""
    # Create first user
    user1 = User(
        email="duplicate@test.com",
        password_hash="hash1",
        role=UserRole.admin,
        is_active=True,
    )
    db_session.add(user1)
    await db_session.commit()

    # Try to create second user with same email
    user2 = User(
        email="duplicate@test.com",
        password_hash="hash2",
        role=UserRole.teacher,
        is_active=True,
    )
    db_session.add(user2)

    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_create_publisher_with_relationship(db_session):
    """Test creating a publisher with user relationship."""
    # Create publisher user
    user = User(
        email="pub@test.com", password_hash="hash", role=UserRole.publisher, is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    # Create publisher record
    publisher = Publisher(user_id=user.id, name="Test Publisher", contact_email="contact@pub.com")
    db_session.add(publisher)
    await db_session.commit()
    await db_session.refresh(publisher)

    assert publisher.id is not None
    assert publisher.user_id == user.id
    assert publisher.name == "Test Publisher"
    assert publisher.contact_email == "contact@pub.com"


@pytest.mark.asyncio
async def test_create_school_with_publisher_relationship(db_session):
    """Test creating a school with publisher foreign key relationship."""
    # Create publisher user and publisher
    user = User(email="pub@test.com", password_hash="hash", role=UserRole.publisher)
    db_session.add(user)
    await db_session.flush()

    publisher = Publisher(user_id=user.id, name="Test Publisher")
    db_session.add(publisher)
    await db_session.flush()

    # Create school
    school = School(
        name="Test School",
        publisher_id=publisher.id,
        address="123 Test St",
        contact_info="555-1234",
    )
    db_session.add(school)
    await db_session.commit()
    await db_session.refresh(school)

    assert school.id is not None
    assert school.publisher_id == publisher.id
    assert school.name == "Test School"
    assert school.address == "123 Test St"


@pytest.mark.asyncio
async def test_create_teacher_with_relationships(db_session):
    """Test creating a teacher with both user_id and school_id relationships."""
    # Create publisher user and publisher
    pub_user = User(email="pub@test.com", password_hash="hash", role=UserRole.publisher)
    db_session.add(pub_user)
    await db_session.flush()

    publisher = Publisher(user_id=pub_user.id, name="Test Publisher")
    db_session.add(publisher)
    await db_session.flush()

    # Create school
    school = School(name="Test School", publisher_id=publisher.id)
    db_session.add(school)
    await db_session.flush()

    # Create teacher user
    teacher_user = User(email="teacher@test.com", password_hash="hash", role=UserRole.teacher)
    db_session.add(teacher_user)
    await db_session.flush()

    # Create teacher
    teacher = Teacher(
        user_id=teacher_user.id, school_id=school.id, subject_specialization="Mathematics"
    )
    db_session.add(teacher)
    await db_session.commit()
    await db_session.refresh(teacher)

    assert teacher.id is not None
    assert teacher.user_id == teacher_user.id
    assert teacher.school_id == school.id
    assert teacher.subject_specialization == "Mathematics"


@pytest.mark.asyncio
async def test_create_student_with_relationship(db_session):
    """Test creating a student with user_id relationship."""
    # Create student user
    user = User(email="student@test.com", password_hash="hash", role=UserRole.student)
    db_session.add(user)
    await db_session.flush()

    # Create student
    student = Student(user_id=user.id, grade_level="5th Grade", parent_email="parent@test.com")
    db_session.add(student)
    await db_session.commit()
    await db_session.refresh(student)

    assert student.id is not None
    assert student.user_id == user.id
    assert student.grade_level == "5th Grade"
    assert student.parent_email == "parent@test.com"


@pytest.mark.asyncio
async def test_publisher_schools_relationship_loading(db_session):
    """Test loading publisher.schools relationship."""
    # Create publisher
    user = User(email="pub@test.com", password_hash="hash", role=UserRole.publisher)
    publisher = Publisher(user=user, name="Test Publisher")
    db_session.add(publisher)
    await db_session.flush()

    # Create multiple schools
    school1 = School(name="School 1", publisher_id=publisher.id)
    school2 = School(name="School 2", publisher_id=publisher.id)
    db_session.add_all([school1, school2])
    await db_session.commit()

    # Refresh and load relationship
    await db_session.refresh(publisher, ["schools"])

    assert len(publisher.schools) == 2
    assert school1 in publisher.schools
    assert school2 in publisher.schools


@pytest.mark.asyncio
async def test_school_teachers_relationship_loading(db_session):
    """Test loading school.teachers relationship."""
    # Create publisher and school
    pub_user = User(email="pub@test.com", password_hash="hash", role=UserRole.publisher)
    publisher = Publisher(user=pub_user, name="Test Publisher")
    school = School(name="Test School", publisher=publisher)
    db_session.add(school)
    await db_session.flush()

    # Create multiple teachers
    teacher_user1 = User(email="teacher1@test.com", password_hash="hash", role=UserRole.teacher)
    teacher1 = Teacher(user=teacher_user1, school_id=school.id)

    teacher_user2 = User(email="teacher2@test.com", password_hash="hash", role=UserRole.teacher)
    teacher2 = Teacher(user=teacher_user2, school_id=school.id)

    db_session.add_all([teacher1, teacher2])
    await db_session.commit()

    # Refresh and load relationship
    await db_session.refresh(school, ["teachers"])

    assert len(school.teachers) == 2


@pytest.mark.asyncio
async def test_user_publisher_relationship_loading(db_session):
    """Test loading user.publisher relationship."""
    # Create user and publisher
    user = User(email="pub@test.com", password_hash="hash", role=UserRole.publisher)
    publisher = Publisher(user=user, name="Test Publisher")
    db_session.add(publisher)
    await db_session.commit()

    # Refresh user and load relationship
    await db_session.refresh(user, ["publisher"])

    assert user.publisher is not None
    assert user.publisher.name == "Test Publisher"
    assert user.publisher.user_id == user.id


@pytest.mark.asyncio
async def test_cascade_delete_user_deletes_publisher(db_session):
    """Test that deleting a user cascades to delete associated publisher."""
    # Create user and publisher
    user = User(email="pub@test.com", password_hash="hash", role=UserRole.publisher)
    publisher = Publisher(user=user, name="Test Publisher")
    db_session.add(publisher)
    await db_session.commit()

    publisher_id = publisher.id

    # Delete user
    await db_session.delete(user)
    await db_session.commit()

    # Verify publisher was also deleted
    result = await db_session.execute(select(Publisher).where(Publisher.id == publisher_id))
    deleted_publisher = result.scalar_one_or_none()

    assert deleted_publisher is None


@pytest.mark.asyncio
async def test_cascade_delete_user_deletes_teacher(db_session):
    """Test that deleting a user cascades to delete associated teacher."""
    # Create school first
    pub_user = User(email="pub@test.com", password_hash="hash", role=UserRole.publisher)
    publisher = Publisher(user=pub_user, name="Test Publisher")
    school = School(name="Test School", publisher=publisher)
    db_session.add(school)
    await db_session.flush()

    # Create teacher
    teacher_user = User(email="teacher@test.com", password_hash="hash", role=UserRole.teacher)
    teacher = Teacher(user=teacher_user, school_id=school.id)
    db_session.add(teacher)
    await db_session.commit()

    teacher_id = teacher.id

    # Delete teacher user
    await db_session.delete(teacher_user)
    await db_session.commit()

    # Verify teacher was also deleted
    result = await db_session.execute(select(Teacher).where(Teacher.id == teacher_id))
    deleted_teacher = result.scalar_one_or_none()

    assert deleted_teacher is None


@pytest.mark.asyncio
async def test_cascade_delete_user_deletes_student(db_session):
    """Test that deleting a user cascades to delete associated student."""
    # Create student
    user = User(email="student@test.com", password_hash="hash", role=UserRole.student)
    student = Student(user=user, grade_level="5th Grade")
    db_session.add(student)
    await db_session.commit()

    student_id = student.id

    # Delete user
    await db_session.delete(user)
    await db_session.commit()

    # Verify student was also deleted
    result = await db_session.execute(select(Student).where(Student.id == student_id))
    deleted_student = result.scalar_one_or_none()

    assert deleted_student is None


@pytest.mark.asyncio
async def test_cascade_delete_publisher_deletes_schools(db_session):
    """Test that deleting a publisher cascades to delete associated schools."""
    # Create publisher with schools
    user = User(email="pub@test.com", password_hash="hash", role=UserRole.publisher)
    publisher = Publisher(user=user, name="Test Publisher")
    school1 = School(name="School 1", publisher=publisher)
    school2 = School(name="School 2", publisher=publisher)
    db_session.add_all([school1, school2])
    await db_session.commit()

    school1_id = school1.id
    school2_id = school2.id

    # Delete publisher
    await db_session.delete(publisher)
    await db_session.commit()

    # Verify schools were also deleted
    result = await db_session.execute(
        select(School).where(School.id.in_([school1_id, school2_id]))
    )
    deleted_schools = result.scalars().all()

    assert len(deleted_schools) == 0
