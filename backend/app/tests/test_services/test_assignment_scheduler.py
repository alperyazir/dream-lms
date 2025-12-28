"""
Unit tests for Assignment Scheduler Service (Story 9.6).

Tests cover:
- publish_scheduled_assignments - publishes assignments when scheduled_publish_date <= now
- Status transitions from 'scheduled' to 'published'
- Notifications sent to assigned students on publish
- Scheduled assignments in future are NOT published
- Already published assignments are not re-processed
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import (
    Activity,
    ActivityType,
    Assignment,
    AssignmentActivity,
    AssignmentPublishStatus,
    AssignmentStatus,
    AssignmentStudent,
    AssignmentStudentActivity,
    AssignmentStudentActivityStatus,
    Book,
    Notification,
    NotificationType,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)
from app.services.assignment_scheduler import publish_scheduled_assignments


@pytest_asyncio.fixture(name="publisher")
async def publisher_fixture(async_session: AsyncSession) -> Publisher:
    """Create a publisher for testing."""
    user = User(
        id=uuid.uuid4(),
        email="scheduler_publisher@example.com",
        username="scheduler_testpublisher",
        hashed_password="dummy_hash",
        role=UserRole.publisher,
        is_active=True,
    )
    async_session.add(user)
    await async_session.commit()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Scheduler Test Publisher",
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
        name="Scheduler Test School",
        publisher_id=publisher.id,
    )
    async_session.add(school)
    await async_session.commit()
    await async_session.refresh(school)
    return school


@pytest_asyncio.fixture(name="teacher_user")
async def teacher_user_fixture(
    async_session: AsyncSession, school: School
) -> tuple[User, Teacher]:
    """Create a teacher user and record for testing."""
    user = User(
        id=uuid.uuid4(),
        email="scheduler_teacher@example.com",
        username="scheduler_testteacher",
        hashed_password="dummy_hash",
        role=UserRole.teacher,
        is_active=True,
        full_name="Scheduler Test Teacher",
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
        email="scheduler_student@example.com",
        username="scheduler_teststudent",
        hashed_password="dummy_hash",
        role=UserRole.student,
        is_active=True,
        full_name="Scheduler Test Student",
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
async def second_student_user_fixture(
    async_session: AsyncSession,
) -> tuple[User, Student]:
    """Create a second student user and record for testing."""
    user = User(
        id=uuid.uuid4(),
        email="scheduler_student2@example.com",
        username="scheduler_teststudent2",
        hashed_password="dummy_hash",
        role=UserRole.student,
        is_active=True,
        full_name="Scheduler Second Student",
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
        dream_storage_id="scheduler-test-book-1",
        title="Scheduler Test Book",
        book_name="Scheduler Test Book Name",
        publisher_name="Scheduler Test Publisher",
        description="A test book for scheduler",
    )
    async_session.add(book)
    await async_session.commit()

    activity = Activity(
        id=uuid.uuid4(),
        book_id=book.id,
        title="Scheduler Test Activity",
        module_name="Scheduler Test Module",
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


async def create_scheduled_assignment(
    async_session: AsyncSession,
    teacher: Teacher,
    book: Book,
    activity: Activity,
    student: Student,
    scheduled_publish_date: datetime,
    due_date: datetime | None = None,
    name: str = "Scheduled Test Assignment",
    status: AssignmentPublishStatus = AssignmentPublishStatus.scheduled,
) -> tuple[Assignment, AssignmentStudent]:
    """Helper to create a scheduled assignment with a student assigned."""
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        activity_id=activity.id,
        book_id=book.id,
        name=name,
        scheduled_publish_date=scheduled_publish_date,
        due_date=due_date,
        status=status,
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
        status=AssignmentStatus.not_started,
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


# Tests for publish_scheduled_assignments


@pytest.mark.asyncio
async def test_publish_scheduled_assignment_past_date(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that scheduled assignments with past publish date are published."""
    _, teacher = teacher_user
    student_user_obj, student = student_user
    book, activity = book_and_activity

    # Scheduled to publish 1 hour ago
    scheduled_date = datetime.now(UTC) - timedelta(hours=1)
    assignment, _ = await create_scheduled_assignment(
        async_session, teacher, book, activity, student, scheduled_date
    )

    result = await publish_scheduled_assignments(async_session)

    assert result.assignments_published == 1

    # Verify assignment status changed
    await async_session.refresh(assignment)
    assert assignment.status == AssignmentPublishStatus.published


@pytest.mark.asyncio
async def test_publish_scheduled_assignment_exactly_now(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that scheduled assignments with publish date <= now are published."""
    _, teacher = teacher_user
    _, student = student_user
    book, activity = book_and_activity

    # Scheduled to publish exactly now (or just a moment ago)
    scheduled_date = datetime.now(UTC)
    assignment, _ = await create_scheduled_assignment(
        async_session, teacher, book, activity, student, scheduled_date
    )

    result = await publish_scheduled_assignments(async_session)

    assert result.assignments_published == 1

    await async_session.refresh(assignment)
    assert assignment.status == AssignmentPublishStatus.published


@pytest.mark.asyncio
async def test_no_publish_scheduled_assignment_future_date(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that scheduled assignments with future publish date are NOT published."""
    _, teacher = teacher_user
    _, student = student_user
    book, activity = book_and_activity

    # Scheduled to publish in 2 hours (future)
    scheduled_date = datetime.now(UTC) + timedelta(hours=2)
    assignment, _ = await create_scheduled_assignment(
        async_session, teacher, book, activity, student, scheduled_date
    )

    result = await publish_scheduled_assignments(async_session)

    assert result.assignments_published == 0

    # Verify assignment status remains scheduled
    await async_session.refresh(assignment)
    assert assignment.status == AssignmentPublishStatus.scheduled


@pytest.mark.asyncio
async def test_already_published_not_reprocessed(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that already published assignments are NOT reprocessed."""
    _, teacher = teacher_user
    _, student = student_user
    book, activity = book_and_activity

    # Assignment already published (even if scheduled_publish_date is past)
    scheduled_date = datetime.now(UTC) - timedelta(hours=1)
    assignment, _ = await create_scheduled_assignment(
        async_session,
        teacher,
        book,
        activity,
        student,
        scheduled_date,
        status=AssignmentPublishStatus.published,
    )

    result = await publish_scheduled_assignments(async_session)

    assert result.assignments_published == 0


@pytest.mark.asyncio
async def test_publish_sends_notification_to_student(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that publishing sends notification to assigned student."""
    _, teacher = teacher_user
    student_user_obj, student = student_user
    book, activity = book_and_activity

    scheduled_date = datetime.now(UTC) - timedelta(hours=1)
    due_date = datetime.now(UTC) + timedelta(days=7)
    assignment, _ = await create_scheduled_assignment(
        async_session,
        teacher,
        book,
        activity,
        student,
        scheduled_date,
        due_date=due_date,
        name="Notification Test Assignment",
    )

    result = await publish_scheduled_assignments(async_session)

    assert result.assignments_published == 1
    assert result.notifications_sent == 1
    assert result.students_notified == 1

    # Verify notification was created
    notifications_result = await async_session.execute(
        select(Notification).where(
            Notification.user_id == student_user_obj.id,
            Notification.type == NotificationType.assignment_created,
        )
    )
    notifications = notifications_result.scalars().all()

    assert len(notifications) == 1
    notification = notifications[0]
    assert "Notification Test Assignment" in notification.title
    assert f"/student/assignments/{assignment.id}" == notification.link


@pytest.mark.asyncio
async def test_publish_sends_notifications_to_multiple_students(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    second_student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that publishing sends notifications to all assigned students."""
    _, teacher = teacher_user
    student_user_obj1, student1 = student_user
    student_user_obj2, student2 = second_student_user
    book, activity = book_and_activity

    scheduled_date = datetime.now(UTC) - timedelta(hours=1)

    # Create assignment
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        activity_id=activity.id,
        book_id=book.id,
        name="Multi-Student Assignment",
        scheduled_publish_date=scheduled_date,
        status=AssignmentPublishStatus.scheduled,
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

    result = await publish_scheduled_assignments(async_session)

    assert result.assignments_published == 1
    assert result.notifications_sent == 2
    assert result.students_notified == 2


@pytest.mark.asyncio
async def test_publish_multiple_scheduled_assignments(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that multiple scheduled assignments are all published."""
    _, teacher = teacher_user
    _, student = student_user
    book, activity = book_and_activity

    scheduled_date = datetime.now(UTC) - timedelta(hours=1)

    # Create 3 scheduled assignments
    for i in range(3):
        await create_scheduled_assignment(
            async_session,
            teacher,
            book,
            activity,
            student,
            scheduled_date,
            name=f"Scheduled Assignment {i+1}",
        )

    result = await publish_scheduled_assignments(async_session)

    assert result.assignments_published == 3


@pytest.mark.asyncio
async def test_publish_no_scheduled_assignments(
    async_session: AsyncSession,
):
    """Test that running with no scheduled assignments returns zero counts."""
    result = await publish_scheduled_assignments(async_session)

    assert result.assignments_published == 0
    assert result.notifications_sent == 0
    assert result.students_notified == 0


@pytest.mark.asyncio
async def test_publish_notification_includes_due_date(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that notification message includes due date when present."""
    _, teacher = teacher_user
    student_user_obj, student = student_user
    book, activity = book_and_activity

    scheduled_date = datetime.now(UTC) - timedelta(hours=1)
    due_date = datetime.now(UTC) + timedelta(days=7)
    await create_scheduled_assignment(
        async_session,
        teacher,
        book,
        activity,
        student,
        scheduled_date,
        due_date=due_date,
        name="Due Date Test",
    )

    await publish_scheduled_assignments(async_session)

    notifications_result = await async_session.execute(
        select(Notification).where(Notification.user_id == student_user_obj.id)
    )
    notification = notifications_result.scalar_one()

    assert "Due:" in notification.message


@pytest.mark.asyncio
async def test_publish_notification_no_due_date(
    async_session: AsyncSession,
    teacher_user: tuple[User, Teacher],
    student_user: tuple[User, Student],
    book_and_activity: tuple[Book, Activity],
):
    """Test that notification message handles no due date gracefully."""
    _, teacher = teacher_user
    student_user_obj, student = student_user
    book, activity = book_and_activity

    scheduled_date = datetime.now(UTC) - timedelta(hours=1)
    await create_scheduled_assignment(
        async_session,
        teacher,
        book,
        activity,
        student,
        scheduled_date,
        due_date=None,
        name="No Due Date Test",
    )

    await publish_scheduled_assignments(async_session)

    notifications_result = await async_session.execute(
        select(Notification).where(Notification.user_id == student_user_obj.id)
    )
    notification = notifications_result.scalar_one()

    assert "No due date" in notification.message
