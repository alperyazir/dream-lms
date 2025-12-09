"""
Tests for publisher API endpoints
"""
import re
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import Publisher, School, Teacher, User, UserRole


def test_publisher_list_own_schools(
    client: TestClient, session: Session, publisher_token: str, publisher_user: User
) -> None:
    """Test publisher sees only their own schools"""
    # Get the publisher record for publisher_user
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=publisher_user.id,
        name="My Publisher",
        contact_email="contact@mypublisher.com"
    )
    session.add(publisher)
    session.flush()

    # Create schools for this publisher
    school1 = School(
        id=uuid.uuid4(),
        name="My School 1",
        publisher_id=publisher.id,
        address="Address 1"
    )
    school2 = School(
        id=uuid.uuid4(),
        name="My School 2",
        publisher_id=publisher.id,
        address="Address 2"
    )
    session.add_all([school1, school2])

    # Create another publisher with a school (should not be visible)
    other_user = User(
        id=uuid.uuid4(),
        email="other@publisher.com",
        username="otherpublisher",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Other Publisher"
    )
    session.add(other_user)
    session.flush()

    other_publisher = Publisher(
        id=uuid.uuid4(),
        user_id=other_user.id,
        name="Other Publisher",
        contact_email="other@publisher.com"
    )
    session.add(other_publisher)
    session.flush()

    other_school = School(
        id=uuid.uuid4(),
        name="Other School",
        publisher_id=other_publisher.id,
        address="Other Address"
    )
    session.add(other_school)
    session.commit()

    # Request schools as authenticated publisher
    response = client.get(
        f"{settings.API_V1_STR}/publishers/me/schools",
        headers={"Authorization": f"Bearer {publisher_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    # Should only see own schools
    assert len(data) == 2
    school_names = [s["name"] for s in data]
    assert "My School 1" in school_names
    assert "My School 2" in school_names
    assert "Other School" not in school_names


def test_publisher_create_teacher_in_own_school(
    client: TestClient, session: Session, publisher_token: str, publisher_user: User
) -> None:
    """Test publisher can create teacher in their own school"""
    # Create publisher record
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=publisher_user.id,
        name="My Publisher",
        contact_email="contact@mypublisher.com"
    )
    session.add(publisher)
    session.flush()

    # Create school for this publisher
    school = School(
        id=uuid.uuid4(),
        name="My School",
        publisher_id=publisher.id,
        address="School Address"
    )
    session.add(school)
    session.commit()
    session.refresh(school)

    teacher_data = {
        "user_email": "newteacher@example.com",
        "full_name": "New Teacher",
        "school_id": str(school.id),
        "subject_specialization": "Mathematics"
    }

    response = client.post(
        f"{settings.API_V1_STR}/publishers/me/teachers",
        headers={"Authorization": f"Bearer {publisher_token}"},
        json=teacher_data
    )

    assert response.status_code == 201
    data = response.json()

    # Verify response structure (secure password flow)
    assert "user" in data
    assert "temporary_password" in data
    assert "role_record" in data
    assert "password_emailed" in data
    assert "message" in data

    # Verify user data
    assert data["user"]["email"] == teacher_data["user_email"]
    assert data["user"]["full_name"] == teacher_data["full_name"]
    assert data["user"]["role"] == "teacher"
    assert data["user"]["must_change_password"] is True

    # Verify temp password (returned since emails disabled in tests)
    assert data["temporary_password"] is not None
    assert len(data["temporary_password"]) == 12

    # Verify teacher record
    assert data["role_record"]["school_id"] == teacher_data["school_id"]
    assert data["role_record"]["subject_specialization"] == teacher_data["subject_specialization"]

    # Verify in database
    user = session.exec(select(User).where(User.email == teacher_data["user_email"])).first()
    assert user is not None
    assert user.role.value == "teacher"

    teacher = session.exec(select(Teacher).where(Teacher.user_id == user.id)).first()
    assert teacher is not None
    assert teacher.school_id == school.id


def test_publisher_cannot_create_teacher_in_other_school(
    client: TestClient, session: Session, publisher_token: str, publisher_user: User
) -> None:
    """Test publisher cannot create teacher in another publisher's school"""
    # Create publisher record for authenticated user
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=publisher_user.id,
        name="My Publisher",
        contact_email="contact@mypublisher.com"
    )
    session.add(publisher)
    session.flush()

    # Create another publisher with a school
    other_user = User(
        id=uuid.uuid4(),
        email="other@publisher.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Other Publisher"
    )
    session.add(other_user)
    session.flush()

    other_publisher = Publisher(
        id=uuid.uuid4(),
        user_id=other_user.id,
        name="Other Publisher",
        contact_email="other@publisher.com"
    )
    session.add(other_publisher)
    session.flush()

    other_school = School(
        id=uuid.uuid4(),
        name="Other School",
        publisher_id=other_publisher.id,
        address="Other Address"
    )
    session.add(other_school)
    session.commit()
    session.refresh(other_school)

    # Try to create teacher in other publisher's school
    teacher_data = {
        "user_email": "teacher@example.com",
        "full_name": "Teacher",
        "school_id": str(other_school.id),
        "subject_specialization": "Science"
    }

    response = client.post(
        f"{settings.API_V1_STR}/publishers/me/teachers",
        headers={"Authorization": f"Bearer {publisher_token}"},
        json=teacher_data
    )

    assert response.status_code == 403
    assert "Cannot create teacher in another publisher's school" in response.json()["detail"]


def test_publisher_receives_temporary_password(
    client: TestClient, session: Session, publisher_token: str, publisher_user: User
) -> None:
    """Test response includes temporary password (secure password flow)"""
    # Create publisher and school
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=publisher_user.id,
        name="My Publisher",
        contact_email="contact@mypublisher.com"
    )
    session.add(publisher)
    session.flush()

    school = School(
        id=uuid.uuid4(),
        name="My School",
        publisher_id=publisher.id,
        address="Address"
    )
    session.add(school)
    session.commit()
    session.refresh(school)

    teacher_data = {
        "user_email": "teacher@example.com",
        "full_name": "Teacher",
        "school_id": str(school.id),
        "subject_specialization": "History"
    }

    response = client.post(
        f"{settings.API_V1_STR}/publishers/me/teachers",
        headers={"Authorization": f"Bearer {publisher_token}"},
        json=teacher_data
    )

    assert response.status_code == 201
    data = response.json()

    # Verify secure password response structure
    assert "temporary_password" in data
    assert "password_emailed" in data
    assert "message" in data
    assert data["user"]["must_change_password"] is True

    # Verify temp password format (returned since emails disabled in tests)
    temp_password = data["temporary_password"]
    assert temp_password is not None
    assert len(temp_password) == 12
    assert re.match(r'^[A-Za-z0-9!@#$%^&*]+$', temp_password)
