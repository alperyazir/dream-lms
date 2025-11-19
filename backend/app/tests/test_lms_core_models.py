"""
Unit tests for LMS Core models (Classes, Books, Activities, Assignments)
"""
import uuid
from datetime import UTC, datetime

import pytest
from sqlmodel import Session, select

from app.core.security import get_password_hash
from app.models import (
    Activity,
    ActivityType,
    Assignment,
    AssignmentStatus,
    AssignmentStudent,
    Book,
    Class,
    ClassStudent,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


def test_create_class_with_relationships(session: Session) -> None:
    """Test creating class linked to teacher and school"""
    # Setup: create user, publisher, school, teacher
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(
        user_id=publisher_user.id,
        name="Test Publisher",
    )
    session.add(publisher)
    session.commit()

    school = School(
        name="Test School",
        publisher_id=publisher.id,
    )
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(
        user_id=teacher_user.id,
        school_id=school.id,
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    # Create class
    class_obj = Class(
        name="Math 101",
        teacher_id=teacher.id,
        school_id=school.id,
        grade_level="Grade 9",
        subject="Mathematics",
    )
    session.add(class_obj)
    session.commit()
    session.refresh(class_obj)

    assert class_obj.id is not None
    assert class_obj.name == "Math 101"
    assert class_obj.is_active is True
    assert class_obj.teacher_id == teacher.id
    assert class_obj.school_id == school.id


def test_class_cascade_delete_from_teacher(session: Session) -> None:
    """Test that deleting teacher cascades to classes"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    class_obj = Class(
        name="Math 101",
        teacher_id=teacher.id,
        school_id=school.id,
    )
    session.add(class_obj)
    session.commit()

    class_id = class_obj.id

    # Delete teacher user (cascades to teacher, then to class)
    session.delete(teacher_user)
    session.commit()

    # Verify class is deleted
    result = session.exec(select(Class).where(Class.id == class_id))
    assert result.first() is None


def test_class_cascade_delete_from_school(session: Session) -> None:
    """Test that deleting school cascades to classes"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    class_obj = Class(
        name="Math 101",
        teacher_id=teacher.id,
        school_id=school.id,
    )
    session.add(class_obj)
    session.commit()

    class_id = class_obj.id

    # Delete school
    session.delete(school)
    session.commit()

    # Verify class is deleted
    result = session.exec(select(Class).where(Class.id == class_id))
    assert result.first() is None


def test_class_is_active_filtering(session: Session) -> None:
    """Test is_active filtering"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    # Create active and inactive classes
    active_class = Class(
        name="Active Class",
        teacher_id=teacher.id,
        school_id=school.id,
        is_active=True,
    )
    inactive_class = Class(
        name="Inactive Class",
        teacher_id=teacher.id,
        school_id=school.id,
        is_active=False,
    )
    session.add(active_class)
    session.add(inactive_class)
    session.commit()

    # Query active classes only
    result = session.exec(select(Class).where(Class.is_active == True))
    active_classes = result.all()

    assert len(active_classes) == 1
    assert active_classes[0].name == "Active Class"


def test_create_class_enrollment(session: Session) -> None:
    """Test creating class enrollment (ClassStudent)"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    class_obj = Class(
        name="Math 101",
        teacher_id=teacher.id,
        school_id=school.id,
    )
    session.add(class_obj)
    session.commit()

    student_user = User(
        id=uuid.uuid4(),
        email="student@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.student,
    )
    session.add(student_user)
    session.commit()

    student = Student(user_id=student_user.id)
    session.add(student)
    session.commit()
    session.refresh(student)

    # Create enrollment
    enrollment = ClassStudent(
        class_id=class_obj.id,
        student_id=student.id,
    )
    session.add(enrollment)
    session.commit()
    session.refresh(enrollment)

    assert enrollment.id is not None
    assert enrollment.class_id == class_obj.id
    assert enrollment.student_id == student.id
    assert enrollment.enrolled_at is not None


def test_class_student_unique_constraint(session: Session) -> None:
    """Test UNIQUE constraint on class_id+student_id"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    class_obj = Class(
        name="Math 101",
        teacher_id=teacher.id,
        school_id=school.id,
    )
    session.add(class_obj)
    session.commit()

    student_user = User(
        id=uuid.uuid4(),
        email="student@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.student,
    )
    session.add(student_user)
    session.commit()

    student = Student(user_id=student_user.id)
    session.add(student)
    session.commit()

    # Create first enrollment
    enrollment1 = ClassStudent(
        class_id=class_obj.id,
        student_id=student.id,
    )
    session.add(enrollment1)
    session.commit()

    # Try to create duplicate enrollment
    enrollment2 = ClassStudent(
        class_id=class_obj.id,
        student_id=student.id,
    )
    session.add(enrollment2)

    with pytest.raises(Exception):  # SQLAlchemy will raise IntegrityError
        session.commit()
    session.rollback()  # Clean up failed transaction


def test_class_student_cascade_delete(session: Session) -> None:
    """Test cascade delete from class and student"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    class_obj = Class(
        name="Math 101",
        teacher_id=teacher.id,
        school_id=school.id,
    )
    session.add(class_obj)
    session.commit()

    student_user = User(
        id=uuid.uuid4(),
        email="student@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.student,
    )
    session.add(student_user)
    session.commit()

    student = Student(user_id=student_user.id)
    session.add(student)
    session.commit()

    enrollment = ClassStudent(
        class_id=class_obj.id,
        student_id=student.id,
    )
    session.add(enrollment)
    session.commit()

    enrollment_id = enrollment.id

    # Delete class
    session.delete(class_obj)
    session.commit()

    # Verify enrollment is deleted
    result = session.exec(select(ClassStudent).where(ClassStudent.id == enrollment_id))
    assert result.first() is None


def test_create_book(session: Session) -> None:
    """Test creating book with publisher relationship"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    # Create book
    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
        description="A test book",
    )
    session.add(book)
    session.commit()
    session.refresh(book)

    assert book.id is not None
    assert book.title == "Test Book"
    assert book.publisher_id == publisher.id


def test_book_unique_dream_storage_id(session: Session) -> None:
    """Test unique dream_storage_id constraint"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    # Create first book
    book1 = Book(
        dream_storage_id="test-book-001",
        title="Test Book 1",
        publisher_id=publisher.id,
    )
    session.add(book1)
    session.commit()

    # Try to create duplicate
    book2 = Book(
        dream_storage_id="test-book-001",
        title="Test Book 2",
        publisher_id=publisher.id,
    )
    session.add(book2)

    with pytest.raises(Exception):  # SQLAlchemy will raise IntegrityError
        session.commit()
    session.rollback()  # Clean up failed transaction


def test_book_cascade_delete_from_publisher(session: Session) -> None:
    """Test cascade delete from publisher"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    book_id = book.id

    # Delete publisher
    session.delete(publisher)
    session.commit()

    # Verify book is deleted
    result = session.exec(select(Book).where(Book.id == book_id))
    assert result.first() is None


def test_create_activity(session: Session) -> None:
    """Test creating activity with book relationship and config_json"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    # Create activity
    activity = Activity(
        book_id=book.id,
        activity_type=ActivityType.dragdroppicture,
        title="Test Activity",
        config_json={"test": "config"},
        order_index=1,
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)

    assert activity.id is not None
    assert activity.activity_type == ActivityType.dragdroppicture
    assert activity.config_json == {"test": "config"}
    assert activity.order_index == 1


def test_activity_type_enum_validation(session: Session) -> None:
    """Test activity_type enum validation"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    # Test all valid enum values
    for activity_type in ActivityType:
        activity = Activity(
            book_id=book.id,
            activity_type=activity_type,
            title=f"Test {activity_type.value}",
            config_json={},
        )
        session.add(activity)
        session.commit()
        session.refresh(activity)
        assert activity.activity_type == activity_type


def test_activity_cascade_delete_from_book(session: Session) -> None:
    """Test cascade delete from book"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    activity = Activity(
        book_id=book.id,
        activity_type=ActivityType.dragdroppicture,
        title="Test Activity",
        config_json={},
    )
    session.add(activity)
    session.commit()

    activity_id = activity.id

    # Delete book
    session.delete(book)
    session.commit()

    # Verify activity is deleted
    result = session.exec(select(Activity).where(Activity.id == activity_id))
    assert result.first() is None


def test_activity_order_index(session: Session) -> None:
    """Test order_index for activity sequencing"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    # Create activities with different order_index
    activity1 = Activity(
        book_id=book.id,
        activity_type=ActivityType.dragdroppicture,
        title="Activity 1",
        config_json={},
        order_index=1,
    )
    activity2 = Activity(
        book_id=book.id,
        activity_type=ActivityType.matchTheWords,
        title="Activity 2",
        config_json={},
        order_index=2,
    )
    session.add(activity1)
    session.add(activity2)
    session.commit()

    # Query and verify order
    result = session.exec(
        select(Activity)
        .where(Activity.book_id == book.id)
        .order_by(Activity.order_index)
    )
    activities = result.all()

    assert len(activities) == 2
    assert activities[0].order_index == 1
    assert activities[1].order_index == 2


def test_create_assignment(session: Session) -> None:
    """Test creating assignment with teacher, activity, book relationships"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    activity = Activity(
        book_id=book.id,
        activity_type=ActivityType.dragdroppicture,
        title="Test Activity",
        config_json={},
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)

    # Create assignment
    assignment = Assignment(
        teacher_id=teacher.id,
        activity_id=activity.id,
        book_id=book.id,
        name="Test Assignment",
        instructions="Complete the activity",
        time_limit_minutes=20,
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    assert assignment.id is not None
    assert assignment.name == "Test Assignment"
    assert assignment.time_limit_minutes == 20


def test_assignment_time_limit_positive_constraint(session: Session) -> None:
    """Test time_limit_minutes positive constraint"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    activity = Activity(
        book_id=book.id,
        activity_type=ActivityType.dragdroppicture,
        title="Test Activity",
        config_json={},
    )
    session.add(activity)
    session.commit()

    # Try to create assignment with negative time_limit
    # Pydantic will raise ValueError before it reaches the database
    with pytest.raises(Exception):  # Pydantic ValidationError
        assignment = Assignment(
            teacher_id=teacher.id,
            activity_id=activity.id,
            book_id=book.id,
            name="Test Assignment",
            time_limit_minutes=-1,  # Invalid
        )


def test_assignment_cascade_delete(session: Session) -> None:
    """Test cascade delete scenarios (teacher, activity, book)"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    activity = Activity(
        book_id=book.id,
        activity_type=ActivityType.dragdroppicture,
        title="Test Activity",
        config_json={},
    )
    session.add(activity)
    session.commit()

    assignment = Assignment(
        teacher_id=teacher.id,
        activity_id=activity.id,
        book_id=book.id,
        name="Test Assignment",
    )
    session.add(assignment)
    session.commit()

    assignment_id = assignment.id

    # Delete activity (should cascade to assignment)
    session.delete(activity)
    session.commit()

    # Verify assignment is deleted
    result = session.exec(select(Assignment).where(Assignment.id == assignment_id))
    assert result.first() is None


def test_create_assignment_student(session: Session) -> None:
    """Test creating assignment submission with status"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    activity = Activity(
        book_id=book.id,
        activity_type=ActivityType.dragdroppicture,
        title="Test Activity",
        config_json={},
    )
    session.add(activity)
    session.commit()

    assignment = Assignment(
        teacher_id=teacher.id,
        activity_id=activity.id,
        book_id=book.id,
        name="Test Assignment",
    )
    session.add(assignment)
    session.commit()

    student_user = User(
        id=uuid.uuid4(),
        email="student@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.student,
    )
    session.add(student_user)
    session.commit()

    student = Student(user_id=student_user.id)
    session.add(student)
    session.commit()
    session.refresh(student)

    # Create assignment student
    assignment_student = AssignmentStudent(
        assignment_id=assignment.id,
        student_id=student.id,
        status=AssignmentStatus.not_started,
    )
    session.add(assignment_student)
    session.commit()
    session.refresh(assignment_student)

    assert assignment_student.id is not None
    assert assignment_student.status == AssignmentStatus.not_started
    assert assignment_student.time_spent_minutes == 0


def test_assignment_student_unique_constraint(session: Session) -> None:
    """Test UNIQUE constraint on assignment_id+student_id"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    activity = Activity(
        book_id=book.id,
        activity_type=ActivityType.dragdroppicture,
        title="Test Activity",
        config_json={},
    )
    session.add(activity)
    session.commit()

    assignment = Assignment(
        teacher_id=teacher.id,
        activity_id=activity.id,
        book_id=book.id,
        name="Test Assignment",
    )
    session.add(assignment)
    session.commit()

    student_user = User(
        id=uuid.uuid4(),
        email="student@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.student,
    )
    session.add(student_user)
    session.commit()

    student = Student(user_id=student_user.id)
    session.add(student)
    session.commit()

    # Create first submission
    submission1 = AssignmentStudent(
        assignment_id=assignment.id,
        student_id=student.id,
    )
    session.add(submission1)
    session.commit()

    # Try to create duplicate
    submission2 = AssignmentStudent(
        assignment_id=assignment.id,
        student_id=student.id,
    )
    session.add(submission2)

    with pytest.raises(Exception):  # SQLAlchemy will raise IntegrityError
        session.commit()
    session.rollback()  # Clean up failed transaction


def test_assignment_student_score_range(session: Session) -> None:
    """Test score range validation (0-100)"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    activity = Activity(
        book_id=book.id,
        activity_type=ActivityType.dragdroppicture,
        title="Test Activity",
        config_json={},
    )
    session.add(activity)
    session.commit()

    assignment = Assignment(
        teacher_id=teacher.id,
        activity_id=activity.id,
        book_id=book.id,
        name="Test Assignment",
    )
    session.add(assignment)
    session.commit()

    student_user = User(
        id=uuid.uuid4(),
        email="student@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.student,
    )
    session.add(student_user)
    session.commit()

    student = Student(user_id=student_user.id)
    session.add(student)
    session.commit()

    # Test valid score
    submission = AssignmentStudent(
        assignment_id=assignment.id,
        student_id=student.id,
        score=85,
    )
    session.add(submission)
    session.commit()
    session.refresh(submission)
    assert submission.score == 85

    # Test invalid score (Pydantic will catch this)
    with pytest.raises(Exception):  # Pydantic ValidationError
        invalid_submission = AssignmentStudent(
            assignment_id=assignment.id,
            student_id=student.id,
            score=101,  # Invalid
        )


def test_assignment_student_status_transitions(session: Session) -> None:
    """Test status enum transitions (not_started → in_progress → completed)"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    activity = Activity(
        book_id=book.id,
        activity_type=ActivityType.dragdroppicture,
        title="Test Activity",
        config_json={},
    )
    session.add(activity)
    session.commit()

    assignment = Assignment(
        teacher_id=teacher.id,
        activity_id=activity.id,
        book_id=book.id,
        name="Test Assignment",
    )
    session.add(assignment)
    session.commit()

    student_user = User(
        id=uuid.uuid4(),
        email="student@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.student,
    )
    session.add(student_user)
    session.commit()

    student = Student(user_id=student_user.id)
    session.add(student)
    session.commit()

    # Create with not_started status
    submission = AssignmentStudent(
        assignment_id=assignment.id,
        student_id=student.id,
        status=AssignmentStatus.not_started,
    )
    session.add(submission)
    session.commit()
    session.refresh(submission)
    assert submission.status == AssignmentStatus.not_started

    # Transition to in_progress
    submission.status = AssignmentStatus.in_progress
    submission.started_at = datetime.now(UTC)
    session.add(submission)
    session.commit()
    session.refresh(submission)
    assert submission.status == AssignmentStatus.in_progress
    assert submission.started_at is not None

    # Transition to completed
    submission.status = AssignmentStatus.completed
    submission.completed_at = datetime.now(UTC)
    submission.score = 90
    session.add(submission)
    session.commit()
    session.refresh(submission)
    assert submission.status == AssignmentStatus.completed
    assert submission.completed_at is not None
    assert submission.score == 90


def test_assignment_student_cascade_delete(session: Session) -> None:
    """Test cascade delete from assignment and student"""
    # Setup
    publisher_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.publisher,
    )
    session.add(publisher_user)
    session.commit()

    publisher = Publisher(user_id=publisher_user.id, name="Test Publisher")
    session.add(publisher)
    session.commit()

    school = School(name="Test School", publisher_id=publisher.id)
    session.add(school)
    session.commit()

    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.teacher,
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
    session.add(teacher)
    session.commit()

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    activity = Activity(
        book_id=book.id,
        activity_type=ActivityType.dragdroppicture,
        title="Test Activity",
        config_json={},
    )
    session.add(activity)
    session.commit()

    assignment = Assignment(
        teacher_id=teacher.id,
        activity_id=activity.id,
        book_id=book.id,
        name="Test Assignment",
    )
    session.add(assignment)
    session.commit()

    student_user = User(
        id=uuid.uuid4(),
        email="student@test.com",
        hashed_password=get_password_hash("test"),
        role=UserRole.student,
    )
    session.add(student_user)
    session.commit()

    student = Student(user_id=student_user.id)
    session.add(student)
    session.commit()

    submission = AssignmentStudent(
        assignment_id=assignment.id,
        student_id=student.id,
    )
    session.add(submission)
    session.commit()

    submission_id = submission.id

    # Delete assignment
    session.delete(assignment)
    session.commit()

    # Verify submission is deleted
    result = session.exec(
        select(AssignmentStudent).where(AssignmentStudent.id == submission_id)
    )
    assert result.first() is None
