"""
Integration tests for Assignment Submission Flow (Story 4.7).

Tests verify the complete end-to-end flow:
1. Student starts assignment (status: pending → in_progress)
2. Student submits assignment (status: in_progress → completed)
3. Database records updated correctly
4. Assignment list reflects completion
5. Cannot restart completed assignment

Run with: pytest -v backend/app/tests/integration/test_assignment_submission_flow.py
"""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.main import app
from app.models import (
    Activity,
    ActivityType,
    Assignment,
    AssignmentStatus,
    AssignmentStudent,
    Book,
    BookAccess,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)

# Mark all tests in this module as integration tests
pytestmark = pytest.mark.integration


@pytest_asyncio.fixture(name="test_student_user")
async def test_student_user_fixture(async_session: AsyncSession) -> User:
    """Create a test student user."""
    user = User(
        id=uuid.uuid4(),
        email="teststudent@example.com",
        username="teststudent",
        hashed_password="dummy_hash",
        role=UserRole.student,
        is_active=True,
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest_asyncio.fixture(name="test_teacher_user")
async def test_teacher_user_fixture(async_session: AsyncSession) -> User:
    """Create a test teacher user."""
    user = User(
        id=uuid.uuid4(),
        email="testteacher@example.com",
        username="testteacher",
        hashed_password="dummy_hash",
        role=UserRole.teacher,
        is_active=True,
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest_asyncio.fixture(name="test_publisher_user")
async def test_publisher_user_fixture(async_session: AsyncSession) -> User:
    """Create a test publisher user."""
    user = User(
        id=uuid.uuid4(),
        email="testpublisher@example.com",
        username="testpublisher",
        hashed_password="dummy_hash",
        role=UserRole.publisher,
        is_active=True,
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest_asyncio.fixture(name="test_publisher")
async def test_publisher_fixture(
    async_session: AsyncSession, test_publisher_user: User
) -> Publisher:
    """Create a test publisher."""
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=test_publisher_user.id,
        name="Test Publisher",
        contact_email="contact@testpublisher.com",
    )
    async_session.add(publisher)
    await async_session.commit()
    await async_session.refresh(publisher)
    return publisher


@pytest_asyncio.fixture(name="test_school")
async def test_school_fixture(
    async_session: AsyncSession, test_publisher: Publisher
) -> School:
    """Create a test school."""
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        publisher_id=test_publisher.id,
        contact_email="school@test.com",
    )
    async_session.add(school)
    await async_session.commit()
    await async_session.refresh(school)
    return school


@pytest_asyncio.fixture(name="test_teacher")
async def test_teacher_fixture(
    async_session: AsyncSession, test_teacher_user: User, test_school: School
) -> Teacher:
    """Create a test teacher."""
    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=test_teacher_user.id,
        school_id=test_school.id,
    )
    async_session.add(teacher)
    await async_session.commit()
    await async_session.refresh(teacher)
    return teacher


@pytest_asyncio.fixture(name="test_student")
async def test_student_fixture(
    async_session: AsyncSession, test_student_user: User, test_school: School
) -> Student:
    """Create a test student."""
    student = Student(
        id=uuid.uuid4(),
        user_id=test_student_user.id,
        school_id=test_school.id,
    )
    async_session.add(student)
    await async_session.commit()
    await async_session.refresh(student)
    return student


@pytest_asyncio.fixture(name="test_book")
async def test_book_fixture(
    async_session: AsyncSession, test_publisher: Publisher
) -> Book:
    """Create a test book."""
    book = Book(
        id=uuid.uuid4(),
        dream_storage_id="TEST_BOOK_FLOW_001",
        title="Test Book for Submission Flow",
        book_name="TEST_BOOK_FLOW",
        publisher_name="Test Publisher",
        publisher_id=test_publisher.id,
        cover_image_url=None,
        dcs_activity_count=1,
        dcs_activity_details=None,
    )
    async_session.add(book)
    await async_session.commit()
    await async_session.refresh(book)

    # Create BookAccess
    book_access = BookAccess(
        id=uuid.uuid4(),
        book_id=book.id,
        publisher_id=test_publisher.id,
    )
    async_session.add(book_access)
    await async_session.commit()

    return book


@pytest_asyncio.fixture(name="test_activity")
async def test_activity_fixture(async_session: AsyncSession, test_book: Book) -> Activity:
    """Create a test activity."""
    activity = Activity(
        id=uuid.uuid4(),
        book_id=test_book.id,
        dream_activity_id="test-activity-flow-001",
        module_name="Test Module",
        page_number=1,
        section_index=1,
        title="Test Activity for Submission",
        activity_type=ActivityType.circle,
        order_index=0,
        config_json={
            "type": "circle",
            "circleCount": 2,
            "answer": [
                {"coords": {"x": 100, "y": 100, "w": 50, "h": 50}, "isCorrect": True},
                {"coords": {"x": 200, "y": 100, "w": 50, "h": 50}, "isCorrect": True},
            ],
        },
    )
    async_session.add(activity)
    await async_session.commit()
    await async_session.refresh(activity)
    return activity


@pytest_asyncio.fixture(name="test_assignment")
async def test_assignment_fixture(
    async_session: AsyncSession,
    test_teacher: Teacher,
    test_student: Student,
    test_activity: Activity,
) -> Assignment:
    """Create a test assignment in pending status."""
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=test_teacher.id,
        activity_id=test_activity.id,
        name="Test Assignment for Submission Flow",
        description="Integration test assignment",
        due_date=datetime.now(UTC),
        created_at=datetime.now(UTC),
    )
    async_session.add(assignment)
    await async_session.commit()
    await async_session.refresh(assignment)

    # Create AssignmentStudent record in pending status
    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=assignment.id,
        student_id=test_student.id,
        status=AssignmentStatus.pending,
        score=None,
        completed_at=None,
        time_spent_minutes=None,
        answers_json=None,
    )
    async_session.add(assignment_student)
    await async_session.commit()

    return assignment


@pytest.mark.asyncio
async def test_full_assignment_submission_flow(
    async_session: AsyncSession,
    test_assignment: Assignment,
    test_student: Student,
    test_student_user: User,
):
    """
    Integration test for complete assignment submission flow.

    Steps:
    1. Start assignment (GET /assignments/{id}/start) → status becomes in_progress
    2. Submit assignment (POST /assignments/{id}/submit) → status becomes completed
    3. Verify AssignmentStudent record updated in database
    4. Verify GET /students/me/assignments shows completed status
    5. Verify cannot start assignment again (already completed)
    """
    # Mock the Dream Storage client to return activity config
    with patch(
        "app.api.routes.assignments.DreamStorageClient"
    ) as mock_storage_client:
        mock_client_instance = AsyncMock()
        mock_client_instance.get_activity_config.return_value = {
            "type": "circle",
            "circleCount": 2,
            "answer": [
                {"coords": {"x": 100, "y": 100, "w": 50, "h": 50}, "isCorrect": True},
                {"coords": {"x": 200, "y": 100, "w": 50, "h": 50}, "isCorrect": True},
            ],
        }
        mock_storage_client.return_value = mock_client_instance

        # Create test client with authentication
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Generate auth token (simplified - in real app would use proper JWT)
            from app.core.security import create_access_token

            access_token = create_access_token(str(test_student_user.id))

            headers = {"Authorization": f"Bearer {access_token}"}

            # Step 1: Start assignment
            start_response = await client.get(
                f"/api/v1/assignments/{test_assignment.id}/start",
                headers=headers,
            )
            assert start_response.status_code == 200, f"Start failed: {start_response.text}"
            start_data = start_response.json()
            assert "activity_config" in start_data

            # Verify status changed to in_progress in database
            result = await async_session.execute(
                select(AssignmentStudent).where(
                    AssignmentStudent.assignment_id == test_assignment.id,
                    AssignmentStudent.student_id == test_student.id,
                )
            )
            assignment_student = result.scalar_one()
            assert assignment_student.status == AssignmentStatus.in_progress

            # Step 2: Submit assignment
            submit_payload = {
                "answers_json": {
                    "type": "circle",
                    "selections": {"100-100": True, "200-100": True},
                },
                "score": 100.0,
                "time_spent_minutes": 5,
                "completed_at": datetime.now(UTC).isoformat(),
            }

            submit_response = await client.post(
                f"/api/v1/assignments/{test_assignment.id}/submit",
                json=submit_payload,
                headers=headers,
            )
            assert (
                submit_response.status_code == 200
            ), f"Submit failed: {submit_response.text}"
            submit_data = submit_response.json()
            assert submit_data["success"] is True
            assert submit_data["score"] == 100.0
            assert submit_data["assignment_id"] == str(test_assignment.id)

            # Step 3: Verify database updated correctly
            await async_session.refresh(assignment_student)
            assert assignment_student.status == AssignmentStatus.completed
            assert assignment_student.score == 100.0
            assert assignment_student.time_spent_minutes == 5
            assert assignment_student.answers_json == submit_payload["answers_json"]
            assert assignment_student.completed_at is not None

            # Step 4: Verify GET /students/me/assignments shows completed status
            assignments_response = await client.get(
                "/api/v1/students/me/assignments",
                headers=headers,
            )
            assert assignments_response.status_code == 200
            assignments_data = assignments_response.json()
            completed_assignment = next(
                (
                    a
                    for a in assignments_data
                    if a["assignment_id"] == str(test_assignment.id)
                ),
                None,
            )
            assert completed_assignment is not None
            assert completed_assignment["status"] == "completed"
            assert completed_assignment["score"] == 100.0

            # Step 5: Verify cannot start assignment again
            # (Assignment already completed, start should return current state)
            restart_response = await client.get(
                f"/api/v1/assignments/{test_assignment.id}/start",
                headers=headers,
            )
            # Should still work (idempotent) but status remains completed
            assert restart_response.status_code == 200
            await async_session.refresh(assignment_student)
            assert assignment_student.status == AssignmentStatus.completed

            # Step 6: Verify duplicate submission is idempotent
            duplicate_submit_response = await client.post(
                f"/api/v1/assignments/{test_assignment.id}/submit",
                json=submit_payload,
                headers=headers,
            )
            assert duplicate_submit_response.status_code == 200
            duplicate_data = duplicate_submit_response.json()
            assert duplicate_data["success"] is True
            assert "already submitted" in duplicate_data["message"].lower()
            assert duplicate_data["score"] == 100.0


@pytest.mark.asyncio
async def test_submission_updates_timestamps(
    async_session: AsyncSession,
    test_assignment: Assignment,
    test_student: Student,
    test_student_user: User,
):
    """
    Test that submission correctly updates completed_at timestamp.
    """
    # First, manually set assignment to in_progress
    result = await async_session.execute(
        select(AssignmentStudent).where(
            AssignmentStudent.assignment_id == test_assignment.id,
            AssignmentStudent.student_id == test_student.id,
        )
    )
    assignment_student = result.scalar_one()
    assignment_student.status = AssignmentStatus.in_progress
    await async_session.commit()

    # Create test client with authentication
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        from app.core.security import create_access_token

        access_token = create_access_token(str(test_student_user.id))
        headers = {"Authorization": f"Bearer {access_token}"}

        # Submit assignment
        custom_completed_at = "2025-11-25T10:30:00Z"
        submit_payload = {
            "answers_json": {"type": "circle", "selections": {}},
            "score": 75.0,
            "time_spent_minutes": 8,
            "completed_at": custom_completed_at,
        }

        submit_response = await client.post(
            f"/api/v1/assignments/{test_assignment.id}/submit",
            json=submit_payload,
            headers=headers,
        )
        assert submit_response.status_code == 200

        # Verify timestamp in database
        await async_session.refresh(assignment_student)
        assert assignment_student.completed_at is not None
        # Convert to ISO string for comparison
        assert assignment_student.completed_at.isoformat().replace("+00:00", "Z") == custom_completed_at
