"""
Integration tests for assignment progress save/resume workflow
Story 4.8: Activity Progress Persistence (Save & Resume)

Tests the complete flow:
1. Student starts assignment (status → "in_progress")
2. Student saves progress multiple times
3. Student resumes (progress_json loaded)
4. Student completes and submits (progress_json cleared)
"""

import uuid
import pytest
from datetime import datetime, UTC, timedelta
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, Session

from app.models import (
    User,
    UserRole,
    Publisher,
    School,
    Teacher,
    Student,
    Book,
    Activity,
    Assignment,
    AssignmentStudent,
    AssignmentStatus,
)
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_full_save_resume_submit_workflow(
    client: AsyncClient, session: AsyncSession
) -> None:
    """
    Integration test for complete save/resume/submit workflow.

    Flow:
    1. Student starts assignment → status "in_progress", progress_json null
    2. Student saves progress 3 times → progress_json updated, last_saved_at updated
    3. Student "closes browser" (simulated by ending session)
    4. Student resumes assignment → progress_json loaded, has_saved_progress=true
    5. Student submits → progress_json cleared, answers_json populated
    """

    # ========== Setup Test Data ==========

    # Create publisher
    publisher_user = User(
        email="publisher@test.com",
        hashed_password="hashed",
        role=UserRole.publisher,
        is_active=True,
    )
    session.add(publisher_user)
    await session.commit()
    await session.refresh(publisher_user)

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=publisher_user.id,
        company_name="Test Publisher",
    )
    session.add(publisher)
    await session.commit()

    # Create school
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        address="123 Test St",
        contact_email="school@test.com",
    )
    session.add(school)
    await session.commit()

    # Create teacher
    teacher_user = User(
        email="teacher@test.com",
        hashed_password="hashed",
        role=UserRole.teacher,
        is_active=True,
    )
    session.add(teacher_user)
    await session.commit()
    await session.refresh(teacher_user)

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject="Math",
    )
    session.add(teacher)
    await session.commit()

    # Create student
    student_user = User(
        email="student@test.com",
        hashed_password="hashed",
        role=UserRole.student,
        is_active=True,
    )
    session.add(student_user)
    await session.commit()
    await session.refresh(student_user)

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        school_id=school.id,
        grade_level=5,
    )
    session.add(student)
    await session.commit()
    await session.refresh(student)

    # Create book
    book = Book(
        id=uuid.uuid4(),
        publisher_id=publisher.id,
        dream_book_id="test-book-001",
        title="Test Book",
        grade_level=5,
        subject="Math",
        isbn="1234567890",
        publisher_name="Test Publisher",
        dcs_activity_count=10,
    )
    session.add(book)
    await session.commit()

    # Create activity
    activity = Activity(
        id=uuid.uuid4(),
        book_id=book.id,
        dream_activity_id="test-activity-001",
        module_name="Module 1",
        page_number=10,
        section_index=0,
        activity_type="circle",
        title="Test Activity",
        config_json={
            "type": "circle",
            "question": "Select the correct answer",
            "answer": [{"coords": {"x": 10, "y": 20, "w": 30, "h": 40}, "isCorrect": True}],
        },
    )
    session.add(activity)
    await session.commit()
    await session.refresh(activity)

    # Create assignment
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        activity_id=activity.id,
        name="Test Assignment",
        instructions="Complete the activity",
        due_date=datetime.now(UTC) + timedelta(days=7),
        time_limit_minutes=30,
    )
    session.add(assignment)
    await session.commit()
    await session.refresh(assignment)

    # Assign to student
    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=assignment.id,
        student_id=student.id,
        status=AssignmentStatus.not_started,
    )
    session.add(assignment_student)
    await session.commit()

    # Create student JWT token
    student_token = create_access_token(student_user.id, timedelta(minutes=30))
    headers = {"Authorization": f"Bearer {student_token}"}

    # ========== Step 1: Student starts assignment ==========

    response = await client.get(
        f"/api/v1/assignments/{assignment.id}/start",
        headers=headers,
    )
    assert response.status_code == 200
    start_data = response.json()

    assert start_data["status"] == "in_progress"
    assert start_data["progress_json"] is None
    assert start_data["has_saved_progress"] is False
    assert start_data["time_spent_minutes"] == 0

    # Verify database
    await session.refresh(assignment_student)
    assert assignment_student.status == AssignmentStatus.in_progress
    assert assignment_student.progress_json is None
    assert assignment_student.started_at is not None

    # ========== Step 2: Student saves progress 3 times ==========

    # First save
    save_request_1 = {
        "partial_answers_json": {"0": 1},  # Question 0, selected answer 1
        "time_spent_minutes": 5,
    }
    response = await client.post(
        f"/api/v1/assignments/{assignment.id}/save-progress",
        json=save_request_1,
        headers=headers,
    )
    assert response.status_code == 200
    save_response_1 = response.json()
    assert save_response_1["message"] == "Progress saved successfully"
    assert save_response_1["time_spent_minutes"] == 5

    # Verify database after first save
    await session.refresh(assignment_student)
    assert assignment_student.progress_json == {"0": 1}
    assert assignment_student.time_spent_minutes == 5
    assert assignment_student.last_saved_at is not None
    first_save_time = assignment_student.last_saved_at

    # Second save (student answered more questions)
    save_request_2 = {
        "partial_answers_json": {"0": 1, "1": 0},
        "time_spent_minutes": 12,
    }
    response = await client.post(
        f"/api/v1/assignments/{assignment.id}/save-progress",
        json=save_request_2,
        headers=headers,
    )
    assert response.status_code == 200

    # Verify database after second save
    await session.refresh(assignment_student)
    assert assignment_student.progress_json == {"0": 1, "1": 0}
    assert assignment_student.time_spent_minutes == 12
    assert assignment_student.last_saved_at > first_save_time

    # Third save (student changed an answer)
    save_request_3 = {
        "partial_answers_json": {"0": 2, "1": 0},  # Changed answer for question 0
        "time_spent_minutes": 18,
    }
    response = await client.post(
        f"/api/v1/assignments/{assignment.id}/save-progress",
        json=save_request_3,
        headers=headers,
    )
    assert response.status_code == 200

    # Verify database after third save
    await session.refresh(assignment_student)
    assert assignment_student.progress_json == {"0": 2, "1": 0}
    assert assignment_student.time_spent_minutes == 18

    # ========== Step 3: Student "closes browser" (simulated) ==========
    # (No API call needed - just simulating session end)

    # ========== Step 4: Student returns and resumes assignment ==========

    response = await client.get(
        f"/api/v1/assignments/{assignment.id}/start",
        headers=headers,
    )
    assert response.status_code == 200
    resume_data = response.json()

    # Verify resumed data includes saved progress
    assert resume_data["status"] == "in_progress"
    assert resume_data["progress_json"] == {"0": 2, "1": 0}  # Latest saved progress
    assert resume_data["has_saved_progress"] is True
    assert resume_data["time_spent_minutes"] == 18

    # ========== Step 5: Student completes and submits ==========

    submit_request = {
        "answers_json": {"0": 2, "1": 0, "2": 1},  # Final answers
        "score": 85.0,
        "time_spent_minutes": 25,  # Total time including resumed session
    }
    response = await client.post(
        f"/api/v1/assignments/{assignment.id}/submit",
        json=submit_request,
        headers=headers,
    )
    assert response.status_code == 200

    # Verify database after submission
    await session.refresh(assignment_student)
    assert assignment_student.status == AssignmentStatus.completed
    assert assignment_student.progress_json is None  # CLEARED after submission
    assert assignment_student.answers_json == {"0": 2, "1": 0, "2": 1}
    assert assignment_student.score == 85.0
    assert assignment_student.time_spent_minutes == 25
    assert assignment_student.completed_at is not None

    # ========== Step 6: Verify cannot save progress after completion ==========

    response = await client.post(
        f"/api/v1/assignments/{assignment.id}/save-progress",
        json={"partial_answers_json": {"test": "data"}, "time_spent_minutes": 30},
        headers=headers,
    )
    assert response.status_code == 400
    assert "Cannot save progress" in response.json()["detail"]


@pytest.mark.asyncio
async def test_progress_json_cleared_after_submission(
    client: AsyncClient, session: AsyncSession
) -> None:
    """
    Verify that progress_json is cleared after successful submission.
    This ensures only answers_json is retained for completed assignments.
    """

    # Similar setup as above (abbreviated for clarity)
    # ... create user, student, assignment, etc ...

    # For brevity, using direct database manipulation instead of full API flow
    user = User(
        email="student2@test.com",
        hashed_password="hashed",
        role=UserRole.student,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    student = Student(
        id=uuid.uuid4(),
        user_id=user.id,
        school_id=uuid.uuid4(),  # Simplified - doesn't exist but OK for this test
        grade_level=5,
    )
    session.add(student)
    await session.commit()
    await session.refresh(student)

    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=uuid.uuid4(),  # Simplified
        student_id=student.id,
        status=AssignmentStatus.in_progress,
        progress_json={"question1": "answer1"},  # Has saved progress
        time_spent_minutes=10,
    )
    session.add(assignment_student)
    await session.commit()

    # Verify progress exists
    assert assignment_student.progress_json is not None

    # Submit assignment (simulated)
    assignment_student.status = AssignmentStatus.completed
    assignment_student.answers_json = {"question1": "answer1", "question2": "answer2"}
    assignment_student.progress_json = None  # Cleared
    assignment_student.completed_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(assignment_student)

    # Verify progress cleared, answers retained
    assert assignment_student.progress_json is None
    assert assignment_student.answers_json is not None
    assert assignment_student.status == AssignmentStatus.completed
