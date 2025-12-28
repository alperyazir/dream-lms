"""
Tests for attaching teacher materials to assignments
Story 21.3: Upload Materials in Resources Context
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.models import (
    Activity,
    ActivityType,
    Assignment,
    AssignmentActivity,
    MaterialType,
    School,
    Teacher,
    TeacherMaterial,
    User,
    UserRole,
)


@pytest.fixture(name="school")
def school_fixture(session: Session) -> School:
    """Create a school for testing."""
    # NOTE: Using mock DCS publisher ID (publishers now managed in Dream Central Storage)
    mock_dcs_publisher_id = 999

    school = School(
        id=uuid.uuid4(),
        name="Test School",
        address="123 Test St",
        contact_email="school@test.com",
        dcs_publisher_id=mock_dcs_publisher_id,
    )
    session.add(school)
    session.commit()
    session.refresh(school)
    return school


@pytest.fixture(name="teacher_with_record")
def teacher_with_record_fixture(session: Session, school: School) -> tuple[User, Teacher]:
    """Create a teacher user with Teacher record."""
    # NOTE: Using mock DCS publisher ID (publishers now managed in Dream Central Storage)
    mock_dcs_publisher_id = 999

    user = User(
        id=uuid.uuid4(),
        email="teacher_attach@example.com",
        username="teacher_attach",
        hashed_password="hashedpassword",
        role=UserRole.teacher,
        is_active=True,
        full_name="Attach Teacher",
        dcs_publisher_id=mock_dcs_publisher_id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=user.id,
        school_id=school.id,
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    return user, teacher


@pytest.fixture(name="other_teacher")
def other_teacher_fixture(session: Session, school: School) -> tuple[User, Teacher]:
    """Create another teacher user with Teacher record."""
    mock_dcs_publisher_id = 999

    user = User(
        id=uuid.uuid4(),
        email="other_teacher_attach@example.com",
        username="other_teacher_attach",
        hashed_password="hashedpassword",
        role=UserRole.teacher,
        is_active=True,
        full_name="Other Teacher",
        dcs_publisher_id=mock_dcs_publisher_id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=user.id,
        school_id=school.id,
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    return user, teacher


@pytest.fixture(name="activity")
def activity_fixture(session: Session) -> Activity:
    """Create an activity for testing."""
    # NOTE: Using mock DCS book ID (books now managed in Dream Central Storage)
    mock_dcs_book_id = 123

    activity = Activity(
        id=uuid.uuid4(),
        dcs_book_id=mock_dcs_book_id,
        module_name="test-module",
        page_number=1,
        section_index=0,
        activity_type=ActivityType.circle,
        config_json={"questions": []},
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity


def test_attach_material_success(
    client: TestClient,
    session: Session,
    teacher_with_record: tuple[User, Teacher],
    activity: Activity,
):
    """Test successfully attaching a material to an assignment."""
    teacher_user, teacher = teacher_with_record
    token = create_access_token(subject=str(teacher_user.id), expires_delta=timedelta(minutes=30))

    # Create an assignment
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        dcs_book_id=activity.dcs_book_id,
        activity_id=activity.id,
        name="Test Assignment",
        due_date=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(assignment)

    # Create assignment-activity relationship
    assignment_activity = AssignmentActivity(
        assignment_id=assignment.id,
        activity_id=activity.id,
        order_index=0,
    )
    session.add(assignment_activity)
    session.commit()

    # Create a teacher material
    material = TeacherMaterial(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        name="Test Material",
        type=MaterialType.document,
        storage_path="document/test.pdf",
        file_size=1024,
        mime_type="application/pdf",
        original_filename="test.pdf",
    )
    session.add(material)
    session.commit()

    # Attach the material
    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/materials/{material.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "attached"

    # Verify the assignment's resources were updated
    session.refresh(assignment)
    assert assignment.resources is not None
    assert "teacher_materials" in assignment.resources
    materials_list = assignment.resources["teacher_materials"]
    assert len(materials_list) == 1
    assert materials_list[0]["material_id"] == str(material.id)
    assert materials_list[0]["name"] == "Test Material"
    assert materials_list[0]["material_type"] == "document"


def test_attach_material_not_owned_by_teacher(
    client: TestClient,
    session: Session,
    teacher_with_record: tuple[User, Teacher],
    other_teacher: tuple[User, Teacher],
    activity: Activity,
):
    """Test that a teacher cannot attach another teacher's material."""
    teacher_user, teacher = teacher_with_record
    other_teacher_user, other_teacher_record = other_teacher
    token = create_access_token(subject=str(teacher_user.id), expires_delta=timedelta(minutes=30))

    # Create an assignment owned by the teacher
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        dcs_book_id=activity.dcs_book_id,
        activity_id=activity.id,
        name="Test Assignment",
        due_date=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(assignment)

    # Create assignment-activity relationship
    assignment_activity = AssignmentActivity(
        assignment_id=assignment.id,
        activity_id=activity.id,
        order_index=0,
    )
    session.add(assignment_activity)
    session.commit()

    # Create a material owned by another teacher
    material = TeacherMaterial(
        id=uuid.uuid4(),
        teacher_id=other_teacher_record.id,
        name="Other Teacher's Material",
        type=MaterialType.document,
        storage_path="document/other.pdf",
        file_size=1024,
        mime_type="application/pdf",
    )
    session.add(material)
    session.commit()

    # Try to attach the material
    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/materials/{material.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    assert "Material not found" in response.json()["detail"]


def test_attach_material_to_not_owned_assignment(
    client: TestClient,
    session: Session,
    teacher_with_record: tuple[User, Teacher],
    other_teacher: tuple[User, Teacher],
    activity: Activity,
):
    """Test that a teacher cannot attach a material to another teacher's assignment."""
    teacher_user, teacher = teacher_with_record
    other_teacher_user, other_teacher_record = other_teacher
    token = create_access_token(subject=str(teacher_user.id), expires_delta=timedelta(minutes=30))

    # Create an assignment owned by another teacher
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=other_teacher_record.id,
        dcs_book_id=activity.dcs_book_id,
        activity_id=activity.id,
        name="Test Assignment",
        due_date=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(assignment)

    # Create assignment-activity relationship
    assignment_activity = AssignmentActivity(
        assignment_id=assignment.id,
        activity_id=activity.id,
        order_index=0,
    )
    session.add(assignment_activity)
    session.commit()

    # Create a material owned by the teacher
    material = TeacherMaterial(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        name="Test Material",
        type=MaterialType.document,
        storage_path="document/test.pdf",
        file_size=1024,
        mime_type="application/pdf",
        original_filename="test.pdf",
    )
    session.add(material)
    session.commit()

    # Try to attach the material
    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/materials/{material.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    assert "Assignment not found" in response.json()["detail"]


def test_attach_material_duplicate(
    client: TestClient,
    session: Session,
    teacher_with_record: tuple[User, Teacher],
    activity: Activity,
):
    """Test that attaching the same material twice is rejected."""
    teacher_user, teacher = teacher_with_record
    token = create_access_token(subject=str(teacher_user.id), expires_delta=timedelta(minutes=30))

    # Create an assignment
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        dcs_book_id=activity.dcs_book_id,
        activity_id=activity.id,
        name="Test Assignment",
        due_date=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(assignment)

    # Create assignment-activity relationship
    assignment_activity = AssignmentActivity(
        assignment_id=assignment.id,
        activity_id=activity.id,
        order_index=0,
    )
    session.add(assignment_activity)
    session.commit()

    # Create a teacher material
    material = TeacherMaterial(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        name="Test Material",
        type=MaterialType.document,
        storage_path="document/test.pdf",
        file_size=1024,
        mime_type="application/pdf",
        original_filename="test.pdf",
    )
    session.add(material)
    session.commit()

    # Attach the material the first time
    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/materials/{material.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

    # Try to attach the same material again
    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/materials/{material.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert "already attached" in response.json()["detail"]


def test_attach_material_requires_authentication(
    client: TestClient,
    session: Session,
    teacher_with_record: tuple[User, Teacher],
    activity: Activity,
):
    """Test that attaching a material requires authentication."""
    teacher_user, teacher = teacher_with_record

    # Create an assignment
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        dcs_book_id=activity.dcs_book_id,
        activity_id=activity.id,
        name="Test Assignment",
        due_date=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(assignment)

    # Create assignment-activity relationship
    assignment_activity = AssignmentActivity(
        assignment_id=assignment.id,
        activity_id=activity.id,
        order_index=0,
    )
    session.add(assignment_activity)
    session.commit()

    # Create a teacher material
    material = TeacherMaterial(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        name="Test Material",
        type=MaterialType.document,
        storage_path="document/test.pdf",
        file_size=1024,
        mime_type="application/pdf",
        original_filename="test.pdf",
    )
    session.add(material)
    session.commit()

    # Try to attach without authentication
    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/materials/{material.id}",
    )

    assert response.status_code == 401


def test_attach_material_requires_teacher_role(
    client: TestClient,
    session: Session,
    teacher_with_record: tuple[User, Teacher],
    activity: Activity,
    student_user: User,
):
    """Test that attaching a material requires teacher role."""
    teacher_user, teacher = teacher_with_record
    student_token = create_access_token(subject=str(student_user.id), expires_delta=timedelta(minutes=30))

    # Create an assignment
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        dcs_book_id=activity.dcs_book_id,
        activity_id=activity.id,
        name="Test Assignment",
        due_date=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(assignment)

    # Create assignment-activity relationship
    assignment_activity = AssignmentActivity(
        assignment_id=assignment.id,
        activity_id=activity.id,
        order_index=0,
    )
    session.add(assignment_activity)
    session.commit()

    # Create a teacher material
    material = TeacherMaterial(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        name="Test Material",
        type=MaterialType.document,
        storage_path="document/test.pdf",
        file_size=1024,
        mime_type="application/pdf",
        original_filename="test.pdf",
    )
    session.add(material)
    session.commit()

    # Try to attach as a student
    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/materials/{material.id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 403
