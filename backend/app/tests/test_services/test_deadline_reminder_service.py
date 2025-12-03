"""
Unit tests for Deadline Reminder Service (Story 6.2).

Tests cover:
- check_approaching_deadlines - sends reminders for assignments due within 24 hours
- check_past_due_assignments - sends notifications for past-due assignments
- Spam prevention - max 1 reminder per student per day
- Duplicate prevention - no repeat past-due notifications
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

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
    BookAccess,
    Notification,
    NotificationType,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)
from app.services.deadline_reminder_service import (
    check_approaching_deadlines,
    check_past_due_assignments,
)


@pytest_asyncio.fixture(name="publisher")
async def publisher_fixture(async_session: AsyncSession) -> Publisher:
    """Create a publisher for testing."""
    user = User(
        id=uuid.uuid4(),
        email="publisher@example.com",
        username="testpublisher",
        hashed_password="dummy_hash",
        role=UserRole.publisher,
        is_active=True,
    )
    async_session.add(user)
    await async_session.commit()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Test Publisher",
    )
    async_session.add(publisher)
    await async_session.commit()
    await async_session.refresh(publisher)
    return publisher


@pytest_asyncio.fixture(name="school")
async def school_fixture(async_session: AsyncSession, publisher: Publisher) -> School:
    """Create a school for testing."""
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        publisher_id=publisher.id,
    )
    async_session.add(school)
    await async_session.commit()
    await async_session.refresh(school)
    return school


@pytest_asyncio.fixture(name="teacher_user")
async def teacher_user_fixture(async_session: AsyncSession, school: School) -> tuple[User, Teacher]:
    """Create a teacher user and record for testing."""
    user = User(
        id=uuid.uuid4(),
        email="teacher@example.com",
        username="testteacher",
        hashed_password="dummy_hash",
        role=UserRole.teacher,
        is_active=True,
        full_name="Test Teacher",
    )
    async_session.add(user)
    await async_session.commit()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=user.id,
        school_id=school.id,
    )
    async_session.add(teacher)
    await async_session.commit()
    await async_session.refresh(teacher)
    await async_session.refresh(user)
    return user, teacher


@pytest_asyncio.fixture(name="student_user")
async def student_user_fixture(async_session: AsyncSession) -> tuple[User, Student]:
    """Create a student user and record for testing."""
    user = User(
        id=uuid.uuid4(),
        email="student@example.com",
        username="teststudent",
        hashed_password="dummy_hash",
        role=UserRole.student,
        is_active=True,
        full_name="Test Student",
    )
    async_session.add(user)
    await async_session.commit()

    student = Student(
        id=uuid.uuid4(),
        user_id=user.id,
    )
    async_session.add(student)
    await async_session.commit()
    await async_session.refresh(student)
    await async_session.refresh(user)
    return user, student


@pytest_asyncio.fixture(name="second_student_user")
async def second_student_user_fixture(async_session: AsyncSession) -> tuple[User, Student]:
    """Create a second student user and record for testing."""
    user = User(
        id=uuid.uuid4(),
        email="student2@example.com",
        username="teststudent2",
        hashed_password="dummy_hash",
        role=UserRole.student,
        is_active=True,
        full_name="Second Student",
    )
    async_session.add(user)
    await async_session.commit()

    student = Student(
        id=uuid.uuid4(),
        user_id=user.id,
    )
    async_session.add(student)
    await async_session.commit()
    await async_session.refresh(student)
    await async_session.refresh(user)
    return user, student


@pytest_asyncio.fixture(name="book_and_activity")
async def book_and_activity_fixture(
    async_session: AsyncSession, publisher: Publisher
) -> tuple[Book, Activity]:
    """Create a book and activity for testing."""
    book = Book(
        id=uuid.uuid4(),
        publisher_id=publisher.id,
        dream_storage_id="test-book-storage-1",
        title="Test Book",
        book_name="Test Book Name",
        publisher_name="Test Publisher",
        description="A test book",
    )
    async_session.add(book)
    await async_session.commit()

    activity = Activity(
        id=uuid.uuid4(),
        book_id=book.id,
        title="Test Activity",
        module_name="Test Module",
        page_number=1,
        section_index=0,
        activity_type=ActivityType.matchTheWords,
        config_json={"questions": []},
        order_index=0,
    )
    async_session.add(activity)
    await async_session.commit()
    await async_session.refresh(book)
    await async_session.refresh(activity)
    return book, activity


async def create_assignment_with_student(
    async_session: AsyncSession,
    teacher: Teacher,
    book: Book,
    activity: Activity,
    student: Student,
    due_date: datetime | None,
    status: AssignmentStatus = AssignmentStatus.not_started,
    name: str = "Test Assignment",
) -> tuple[Assignment, AssignmentStudent]:
    """Helper to create an assignment with a student assigned."""
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        activity_id=activity.id,
        book_id=book.id,
        name=name,
        due_date=due_date,
    )
    async_session.add(assignment)
    await async_session.commit()

    # Create assignment activity junction
    assignment_activity = AssignmentActivity(
        assignment_id=assignment.id,
        activity_id=activity.id,
        order_index=0,
    )
    async_session.add(assignment_activity)
    await async_session.commit()

    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=assignment.id,
        student_id=student.id,
        status=status,
    )
    async_session.add(assignment_student)
    await async_session.commit()

    # Create assignment student activity
    assignment_student_activity = AssignmentStudentActivity(
        assignment_student_id=assignment_student.id,
        activity_id=activity.id,
        status=AssignmentStudentActivityStatus.not_started,
    )
    async_session.add(assignment_student_activity)
    await async_session.commit()

    await async_session.refresh(assignment)
    await async_session.refresh(assignment_student)
    return assignment, assignment_student


# Tests for check_approaching_deadlines


@pytest.mark.asyncio
async def test_approaching_deadline_12_hours_notifies(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that assignments due in 12 hours trigger notifications."""
    _, teacher = teacher_user
    student_user_obj, student = student_user
    book, activity = book_and_activity

    # Assignment due in 12 hours
    due_date = datetime.now(UTC) + timedelta(hours=12)
    await create_assignment_with_student(
        async_session, teacher, book, activity, student, due_date
    )

    result = await check_approaching_deadlines(async_session)

    assert result.notifications_sent == 1
    assert result.students_notified == 1
    assert result.assignments_processed == 1


@pytest.mark.asyncio
async def test_approaching_deadline_25_hours_no_notification(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that assignments due in 25 hours do NOT trigger notifications."""
    _, teacher = teacher_user
    _, student = student_user
    book, activity = book_and_activity

    # Assignment due in 25 hours (outside 24-hour window)
    due_date = datetime.now(UTC) + timedelta(hours=25)
    await create_assignment_with_student(
        async_session, teacher, book, activity, student, due_date
    )

    result = await check_approaching_deadlines(async_session)

    assert result.notifications_sent == 0
    assert result.students_notified == 0
    assert result.assignments_processed == 0


@pytest.mark.asyncio
async def test_approaching_deadline_completed_no_notification(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that completed assignments do NOT trigger notifications."""
    _, teacher = teacher_user
    _, student = student_user
    book, activity = book_and_activity

    # Assignment due in 12 hours but already completed
    due_date = datetime.now(UTC) + timedelta(hours=12)
    await create_assignment_with_student(
        async_session,
        teacher,
        book,
        activity,
        student,
        due_date,
        status=AssignmentStatus.completed,
    )

    result = await check_approaching_deadlines(async_session)

    assert result.notifications_sent == 0
    assert result.students_notified == 0


@pytest.mark.asyncio
async def test_approaching_deadline_already_notified_today_no_duplicate(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that students already notified today don't get duplicate notifications."""
    _, teacher = teacher_user
    student_user_obj, student = student_user
    book, activity = book_and_activity

    # Create assignment due in 12 hours
    due_date = datetime.now(UTC) + timedelta(hours=12)
    assignment, _ = await create_assignment_with_student(
        async_session, teacher, book, activity, student, due_date
    )

    # Create existing notification for today
    existing_notification = Notification(
        id=uuid.uuid4(),
        user_id=student_user_obj.id,
        type=NotificationType.deadline_approaching,
        title="Earlier reminder",
        message="Already notified",
        is_read=False,
        created_at=datetime.now(UTC),  # Today
    )
    async_session.add(existing_notification)
    await async_session.commit()

    result = await check_approaching_deadlines(async_session)

    # Should not send because already notified today
    assert result.notifications_sent == 0
    assert result.students_notified == 0


@pytest.mark.asyncio
async def test_approaching_deadline_multiple_assignments_aggregated(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that multiple assignments due soon are aggregated into one notification."""
    _, teacher = teacher_user
    student_user_obj, student = student_user
    book, activity = book_and_activity

    # Create multiple assignments due soon
    for i in range(3):
        due_date = datetime.now(UTC) + timedelta(hours=10 + i)
        await create_assignment_with_student(
            async_session,
            teacher,
            book,
            activity,
            student,
            due_date,
            name=f"Assignment {i+1}",
        )

    result = await check_approaching_deadlines(async_session)

    # Should send 1 aggregated notification, not 3
    assert result.notifications_sent == 1
    assert result.students_notified == 1
    assert result.assignments_processed == 3


@pytest.mark.asyncio
async def test_approaching_deadline_no_due_date_no_notification(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that assignments without due date don't trigger notifications."""
    _, teacher = teacher_user
    _, student = student_user
    book, activity = book_and_activity

    # Assignment with no due date
    await create_assignment_with_student(
        async_session, teacher, book, activity, student, None
    )

    result = await check_approaching_deadlines(async_session)

    assert result.notifications_sent == 0
    assert result.assignments_processed == 0


# Tests for check_past_due_assignments


@pytest.mark.asyncio
async def test_past_due_1_day_notifies(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that assignments 1 day past due trigger notifications."""
    _, teacher = teacher_user
    student_user_obj, student = student_user
    book, activity = book_and_activity

    # Assignment that was due 30 hours ago (in the 24-48 hour window)
    due_date = datetime.now(UTC) - timedelta(hours=30)
    await create_assignment_with_student(
        async_session, teacher, book, activity, student, due_date
    )

    result = await check_past_due_assignments(async_session)

    assert result.notifications_sent == 1
    assert result.students_notified == 1
    assert result.assignments_processed == 1


@pytest.mark.asyncio
async def test_past_due_completed_no_notification(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that completed past-due assignments do NOT trigger notifications."""
    _, teacher = teacher_user
    _, student = student_user
    book, activity = book_and_activity

    # Assignment 1 day past due but completed
    due_date = datetime.now(UTC) - timedelta(hours=30)
    await create_assignment_with_student(
        async_session,
        teacher,
        book,
        activity,
        student,
        due_date,
        status=AssignmentStatus.completed,
    )

    result = await check_past_due_assignments(async_session)

    assert result.notifications_sent == 0
    assert result.students_notified == 0


@pytest.mark.asyncio
async def test_past_due_2_plus_days_no_renotify(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that assignments 2+ days past due do NOT re-notify."""
    _, teacher = teacher_user
    _, student = student_user
    book, activity = book_and_activity

    # Assignment that was due 3 days ago (outside the 24-48 hour window)
    due_date = datetime.now(UTC) - timedelta(days=3)
    await create_assignment_with_student(
        async_session, teacher, book, activity, student, due_date
    )

    result = await check_past_due_assignments(async_session)

    assert result.notifications_sent == 0
    assert result.assignments_processed == 0


@pytest.mark.asyncio
async def test_past_due_already_notified_no_duplicate(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that past-due notification isn't sent if already notified for that assignment."""
    _, teacher = teacher_user
    student_user_obj, student = student_user
    book, activity = book_and_activity

    # Assignment 1 day past due
    due_date = datetime.now(UTC) - timedelta(hours=30)
    assignment, _ = await create_assignment_with_student(
        async_session, teacher, book, activity, student, due_date
    )

    # Create existing past_due notification for this specific assignment
    existing_notification = Notification(
        id=uuid.uuid4(),
        user_id=student_user_obj.id,
        type=NotificationType.past_due,
        title="Assignment past due",
        message="Already notified",
        link=f"/student/assignments/{assignment.id}",
        is_read=False,
        created_at=datetime.now(UTC) - timedelta(hours=1),
    )
    async_session.add(existing_notification)
    await async_session.commit()

    result = await check_past_due_assignments(async_session)

    # Should not send because already notified for this assignment
    assert result.notifications_sent == 0


@pytest.mark.asyncio
async def test_past_due_just_due_no_notification(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that assignments just past due (< 24 hours) don't trigger notifications yet."""
    _, teacher = teacher_user
    _, student = student_user
    book, activity = book_and_activity

    # Assignment that was due 12 hours ago (not yet in the 24-48 hour window)
    due_date = datetime.now(UTC) - timedelta(hours=12)
    await create_assignment_with_student(
        async_session, teacher, book, activity, student, due_date
    )

    result = await check_past_due_assignments(async_session)

    assert result.notifications_sent == 0
    assert result.assignments_processed == 0


@pytest.mark.asyncio
async def test_multiple_students_multiple_notifications(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    second_student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that notifications are sent to multiple students for approaching deadline."""
    _, teacher = teacher_user
    _, student1 = student_user
    _, student2 = second_student_user
    book, activity = book_and_activity

    # Create assignment due in 12 hours
    due_date = datetime.now(UTC) + timedelta(hours=12)
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        activity_id=activity.id,
        book_id=book.id,
        name="Multi-Student Assignment",
        due_date=due_date,
    )
    async_session.add(assignment)
    await async_session.commit()

    # Assign to both students
    for student in [student1, student2]:
        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.not_started,
        )
        async_session.add(assignment_student)
    await async_session.commit()

    result = await check_approaching_deadlines(async_session)

    assert result.notifications_sent == 2
    assert result.students_notified == 2
