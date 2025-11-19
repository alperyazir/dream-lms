"""
Integration tests for LMS Core relationships
"""
import uuid
from datetime import UTC, datetime, timedelta

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


def test_complete_assignment_workflow(session: Session) -> None:
    """Test complete hierarchy: teacher → class → students → book → activities → assignment → assignment_students"""
    # 1. Create publisher hierarchy
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

    # 2. Create teacher
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
        subject_specialization="Mathematics",
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    # 3. Create class
    class_obj = Class(
        name="Math 101",
        teacher_id=teacher.id,
        school_id=school.id,
        grade_level="Grade 9",
    )
    session.add(class_obj)
    session.commit()
    session.refresh(class_obj)

    # 4. Create and enroll students
    students = []
    for i in range(1, 3):
        student_user = User(
            id=uuid.uuid4(),
            email=f"student{i}@test.com",
            hashed_password=get_password_hash("test"),
            role=UserRole.student,
        )
        session.add(student_user)
        session.commit()

        student = Student(user_id=student_user.id)
        session.add(student)
        session.commit()
        session.refresh(student)

        enrollment = ClassStudent(
            class_id=class_obj.id,
            student_id=student.id,
        )
        session.add(enrollment)
        students.append(student)

    session.commit()

    # 5. Create book and activities
    book = Book(
        dream_storage_id="test-book-001",
        title="Algebra Fundamentals",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()
    session.refresh(book)

    activity1 = Activity(
        book_id=book.id,
        activity_type=ActivityType.dragdroppicture,
        title="Match Expressions",
        config_json={"test": "config1"},
        order_index=1,
    )
    activity2 = Activity(
        book_id=book.id,
        activity_type=ActivityType.matchTheWords,
        title="Match Terms",
        config_json={"test": "config2"},
        order_index=2,
    )
    session.add(activity1)
    session.add(activity2)
    session.commit()
    session.refresh(activity1)

    # 6. Create assignment
    assignment = Assignment(
        teacher_id=teacher.id,
        activity_id=activity1.id,
        book_id=book.id,
        name="Homework 1",
        instructions="Complete the activity",
        due_date=datetime.now(UTC) + timedelta(days=7),
        time_limit_minutes=30,
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    # 7. Assign to students
    for student in students:
        assignment_student = AssignmentStudent(
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.not_started,
        )
        session.add(assignment_student)
    session.commit()

    # Verify the complete workflow
    # Query all students in the class
    result = session.exec(
        select(ClassStudent).where(ClassStudent.class_id == class_obj.id)
    )
    enrollments = result.all()
    assert len(enrollments) == 2

    # Query all assignments for the teacher
    result = session.exec(
        select(Assignment).where(Assignment.teacher_id == teacher.id)
    )
    teacher_assignments = result.all()
    assert len(teacher_assignments) == 1

    # Query all activity types in the book
    result = session.exec(
        select(Activity).where(Activity.book_id == book.id)
    )
    book_activities = result.all()
    assert len(book_activities) == 2
    assert book_activities[0].activity_type == ActivityType.dragdroppicture
    assert book_activities[1].activity_type == ActivityType.matchTheWords

    # Query assignment progress for specific students
    result = session.exec(
        select(AssignmentStudent).where(
            AssignmentStudent.assignment_id == assignment.id
        )
    )
    submissions = result.all()
    assert len(submissions) == 2
    assert all(s.status == AssignmentStatus.not_started for s in submissions)


def test_query_students_in_class(session: Session) -> None:
    """Test querying all students in a class"""
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

    # Create 3 students and enroll them
    students = []
    for i in range(1, 4):
        student_user = User(
            id=uuid.uuid4(),
            email=f"student{i}@test.com",
            hashed_password=get_password_hash("test"),
            role=UserRole.student,
        )
        session.add(student_user)
        session.commit()

        student = Student(user_id=student_user.id)
        session.add(student)
        session.commit()
        session.refresh(student)

        enrollment = ClassStudent(
            class_id=class_obj.id,
            student_id=student.id,
        )
        session.add(enrollment)
        students.append(student)

    session.commit()

    # Query all students in the class
    result = session.exec(
        select(Student)
        .join(ClassStudent)
        .where(ClassStudent.class_id == class_obj.id)
    )
    enrolled_students = result.all()

    assert len(enrolled_students) == 3


def test_query_assignments_for_teacher(session: Session) -> None:
    """Test querying all assignments for a teacher"""
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

    # Create multiple activities and assignments
    for i in range(1, 4):
        activity = Activity(
            book_id=book.id,
            activity_type=ActivityType.dragdroppicture,
            title=f"Activity {i}",
            config_json={},
        )
        session.add(activity)
        session.commit()
        session.refresh(activity)

        assignment = Assignment(
            teacher_id=teacher.id,
            activity_id=activity.id,
            book_id=book.id,
            name=f"Assignment {i}",
        )
        session.add(assignment)

    session.commit()

    # Query all assignments for the teacher
    result = session.exec(
        select(Assignment).where(Assignment.teacher_id == teacher.id)
    )
    teacher_assignments = result.all()

    assert len(teacher_assignments) == 3


def test_query_activity_types_in_book(session: Session) -> None:
    """Test querying all activity types in a book"""
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

    # Create activities with different types
    activity_types = [
        ActivityType.dragdroppicture,
        ActivityType.matchTheWords,
        ActivityType.circle,
    ]
    for i, activity_type in enumerate(activity_types, 1):
        activity = Activity(
            book_id=book.id,
            activity_type=activity_type,
            title=f"Activity {i}",
            config_json={},
            order_index=i,
        )
        session.add(activity)

    session.commit()

    # Query all activities in the book, ordered by order_index
    result = session.exec(
        select(Activity)
        .where(Activity.book_id == book.id)
        .order_by(Activity.order_index)
    )
    book_activities = result.all()

    assert len(book_activities) == 3
    assert book_activities[0].activity_type == ActivityType.dragdroppicture
    assert book_activities[1].activity_type == ActivityType.matchTheWords
    assert book_activities[2].activity_type == ActivityType.circle


def test_query_assignment_progress_for_student(session: Session) -> None:
    """Test querying assignment progress for specific students"""
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

    # Create submission with progress
    submission = AssignmentStudent(
        assignment_id=assignment.id,
        student_id=student.id,
        status=AssignmentStatus.in_progress,
        started_at=datetime.now(UTC),
        time_spent_minutes=15,
        answers_json={"question1": "answer1"},
        progress_json={"completed": ["step1", "step2"]},
    )
    session.add(submission)
    session.commit()

    # Query assignment progress for the student
    result = session.exec(
        select(AssignmentStudent).where(
            AssignmentStudent.student_id == student.id
        )
    )
    student_submissions = result.all()

    assert len(student_submissions) == 1
    assert student_submissions[0].status == AssignmentStatus.in_progress
    assert student_submissions[0].time_spent_minutes == 15
    assert student_submissions[0].answers_json == {"question1": "answer1"}


def test_cascade_delete_class_to_enrollments(session: Session) -> None:
    """Test deleting class cascades to class_students"""
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
    result = session.exec(
        select(ClassStudent).where(ClassStudent.id == enrollment_id)
    )
    assert result.first() is None


def test_cascade_delete_book_to_activities_and_assignments(session: Session) -> None:
    """Test deleting book cascades to activities and assignments"""
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

    activity_id = activity.id
    assignment_id = assignment.id

    # Delete book
    session.delete(book)
    session.commit()

    # Verify activity and assignment are deleted
    result = session.exec(select(Activity).where(Activity.id == activity_id))
    assert result.first() is None

    result = session.exec(select(Assignment).where(Assignment.id == assignment_id))
    assert result.first() is None


def test_cascade_delete_assignment_to_submissions(session: Session) -> None:
    """Test deleting assignment cascades to assignment_students"""
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


def test_orphan_prevention(session: Session) -> None:
    """Test that orphan records are prevented"""
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

    # Delete book (should cascade and delete activity, preventing orphans)
    session.delete(book)
    session.commit()

    # Verify no orphan activity remains
    result = session.exec(select(Activity).where(Activity.id == activity_id))
    assert result.first() is None


def test_query_teacher_classes_with_students(session: Session) -> None:
    """Test querying teacher's classes and their enrolled students"""
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
    session.refresh(teacher)

    # Create 2 classes
    class1 = Class(
        name="Math 101",
        teacher_id=teacher.id,
        school_id=school.id,
    )
    class2 = Class(
        name="Math 102",
        teacher_id=teacher.id,
        school_id=school.id,
    )
    session.add(class1)
    session.add(class2)
    session.commit()

    # Create and enroll students
    for i in range(1, 3):
        student_user = User(
            id=uuid.uuid4(),
            email=f"student{i}@test.com",
            hashed_password=get_password_hash("test"),
            role=UserRole.student,
        )
        session.add(student_user)
        session.commit()

        student = Student(user_id=student_user.id)
        session.add(student)
        session.commit()
        session.refresh(student)

        # Enroll in class1
        enrollment = ClassStudent(
            class_id=class1.id,
            student_id=student.id,
        )
        session.add(enrollment)

    session.commit()

    # Query teacher's classes
    result = session.exec(select(Class).where(Class.teacher_id == teacher.id))
    teacher_classes = result.all()

    assert len(teacher_classes) == 2

    # Query students in first class
    result = session.exec(
        select(Student)
        .join(ClassStudent)
        .where(ClassStudent.class_id == class1.id)
    )
    class1_students = result.all()

    assert len(class1_students) == 2


def test_query_publisher_books_and_activities(session: Session) -> None:
    """Test querying publisher's books and their activities"""
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

    # Create 2 books
    book1 = Book(
        dream_storage_id="test-book-001",
        title="Book 1",
        publisher_id=publisher.id,
    )
    book2 = Book(
        dream_storage_id="test-book-002",
        title="Book 2",
        publisher_id=publisher.id,
    )
    session.add(book1)
    session.add(book2)
    session.commit()

    # Create activities for book1
    for i in range(1, 4):
        activity = Activity(
            book_id=book1.id,
            activity_type=ActivityType.dragdroppicture,
            title=f"Activity {i}",
            config_json={},
        )
        session.add(activity)

    session.commit()

    # Query publisher's books
    result = session.exec(select(Book).where(Book.publisher_id == publisher.id))
    publisher_books = result.all()

    assert len(publisher_books) == 2

    # Query activities in book1
    result = session.exec(select(Activity).where(Activity.book_id == book1.id))
    book1_activities = result.all()

    assert len(book1_activities) == 3


def test_query_student_assignments_across_classes(session: Session) -> None:
    """Test querying student's assignments across all classes"""
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

    book = Book(
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=publisher.id,
    )
    session.add(book)
    session.commit()

    # Create 3 assignments
    for i in range(1, 4):
        activity = Activity(
            book_id=book.id,
            activity_type=ActivityType.dragdroppicture,
            title=f"Activity {i}",
            config_json={},
        )
        session.add(activity)
        session.commit()
        session.refresh(activity)

        assignment = Assignment(
            teacher_id=teacher.id,
            activity_id=activity.id,
            book_id=book.id,
            name=f"Assignment {i}",
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)

        # Assign to student
        submission = AssignmentStudent(
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.not_started,
        )
        session.add(submission)

    session.commit()

    # Query all assignments for the student
    result = session.exec(
        select(Assignment)
        .join(AssignmentStudent)
        .where(AssignmentStudent.student_id == student.id)
    )
    student_assignments = result.all()

    assert len(student_assignments) == 3
