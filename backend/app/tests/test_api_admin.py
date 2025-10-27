"""
Tests for admin API endpoints
"""
import re
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Publisher, School, Student, Teacher, User


def test_create_publisher_as_admin(
    client: TestClient, session: Session, admin_token: str
) -> None:
    """Test admin can create publisher successfully"""
    publisher_data = {
        "name": "Test Publisher Inc",
        "contact_email": "contact@testpublisher.com",
        "user_email": "publisher1@example.com",
        "full_name": "Publisher One"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=publisher_data
    )

    assert response.status_code == 201
    data = response.json()

    # Verify response structure
    assert "user" in data
    assert "temp_password" in data
    assert "role_record" in data

    # Verify user data
    assert data["user"]["email"] == publisher_data["user_email"]
    assert data["user"]["full_name"] == publisher_data["full_name"]
    assert data["user"]["role"] == "publisher"

    # Verify temp password is present and has correct format
    temp_password = data["temp_password"]
    assert len(temp_password) == 12
    assert re.match(r'^[A-Za-z0-9!@#$%^&*]+$', temp_password)

    # Verify publisher record
    assert data["role_record"]["name"] == publisher_data["name"]
    assert data["role_record"]["contact_email"] == publisher_data["contact_email"]

    # Verify records exist in database
    user = session.exec(select(User).where(User.email == publisher_data["user_email"])).first()
    assert user is not None
    assert user.role.value == "publisher"

    publisher = session.exec(select(Publisher).where(Publisher.user_id == user.id)).first()
    assert publisher is not None
    assert publisher.name == publisher_data["name"]


def test_create_publisher_as_non_admin(
    client: TestClient, teacher_token: str
) -> None:
    """Test non-admin gets 403 when trying to create publisher"""
    publisher_data = {
        "name": "Test Publisher Inc",
        "contact_email": "contact@testpublisher.com",
        "user_email": "publisher2@example.com",
        "full_name": "Publisher Two"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=publisher_data
    )

    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"] or "Access forbidden" in response.json()["detail"]


def test_create_school_as_admin(
    client: TestClient, session: Session, admin_token: str
) -> None:
    """Test admin can create school successfully"""
    # First create a user for the publisher
    from app.core.security import get_password_hash
    from app.models import UserRole
    user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Test Publisher User"
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Create publisher linked to user
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Test Publisher",
        contact_email="pub@test.com"
    )
    session.add(publisher)
    session.commit()
    session.refresh(publisher)

    school_data = {
        "name": "Test School",
        "publisher_id": str(publisher.id),
        "address": "123 Test St",
        "contact_info": "school@test.com"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/schools",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=school_data
    )

    assert response.status_code == 201
    data = response.json()

    assert data["name"] == school_data["name"]
    assert data["publisher_id"] == school_data["publisher_id"]
    assert data["address"] == school_data["address"]
    assert data["contact_info"] == school_data["contact_info"]

    # Verify in database
    school = session.exec(select(School).where(School.name == school_data["name"])).first()
    assert school is not None
    assert school.publisher_id == publisher.id


def test_list_publishers_as_admin(
    client: TestClient, session: Session, admin_token: str
) -> None:
    """Test admin can list publishers with pagination"""
    from app.core.security import get_password_hash
    from app.models import UserRole

    # Create multiple publishers with users
    for i in range(3):
        user = User(
            id=uuid.uuid4(),
            email=f"pub{i}@test.com",
            hashed_password=get_password_hash("password"),
            role=UserRole.publisher,
            full_name=f"Publisher {i}"
        )
        session.add(user)
        session.flush()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=user.id,
            name=f"Publisher {i}",
            contact_email=f"pub{i}@test.com"
        )
        session.add(publisher)
    session.commit()

    response = client.get(
        f"{settings.API_V1_STR}/admin/publishers?skip=0&limit=10",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) >= 3


def test_list_schools_filtered_by_publisher(
    client: TestClient, session: Session, admin_token: str
) -> None:
    """Test admin can filter schools by publisher_id"""
    from app.core.security import get_password_hash
    from app.models import UserRole

    # Create two publishers with users
    user1 = User(
        id=uuid.uuid4(),
        email="pub1@test.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher 1"
    )
    session.add(user1)
    session.flush()

    publisher1 = Publisher(
        id=uuid.uuid4(),
        user_id=user1.id,
        name="Publisher 1",
        contact_email="pub1@test.com"
    )
    session.add(publisher1)
    session.flush()

    user2 = User(
        id=uuid.uuid4(),
        email="pub2@test.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher 2"
    )
    session.add(user2)
    session.flush()

    publisher2 = Publisher(
        id=uuid.uuid4(),
        user_id=user2.id,
        name="Publisher 2",
        contact_email="pub2@test.com"
    )
    session.add(publisher2)
    session.commit()

    # Create schools for publisher1
    school1 = School(
        id=uuid.uuid4(),
        name="School 1",
        publisher_id=publisher1.id,
        address="Address 1"
    )
    school2 = School(
        id=uuid.uuid4(),
        name="School 2",
        publisher_id=publisher1.id,
        address="Address 2"
    )
    # Create school for publisher2
    school3 = School(
        id=uuid.uuid4(),
        name="School 3",
        publisher_id=publisher2.id,
        address="Address 3"
    )
    session.add_all([school1, school2, school3])
    session.commit()

    # Query schools for publisher1
    response = client.get(
        f"{settings.API_V1_STR}/admin/schools?publisher_id={publisher1.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 2
    for school in data:
        assert school["publisher_id"] == str(publisher1.id)


def test_temp_password_format(
    client: TestClient, admin_token: str
) -> None:
    """Test generated temporary password meets requirements"""
    publisher_data = {
        "name": "Password Test Publisher",
        "contact_email": "pwtest@testpublisher.com",
        "user_email": "pwtest@example.com",
        "full_name": "Password Test User"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=publisher_data
    )

    assert response.status_code == 201
    data = response.json()

    temp_password = data["temp_password"]

    # Verify password meets requirements
    assert len(temp_password) == 12, "Password should be 12 characters"
    assert any(c.isupper() for c in temp_password), "Password should contain uppercase"
    assert any(c.islower() for c in temp_password), "Password should contain lowercase"
    # Note: digits and special characters check is probabilistic but should pass most times
    # Given the alphabet includes both, at least one should be present in 12 chars
