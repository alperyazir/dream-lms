"""Integration tests for hierarchical user creation permissions."""

import uuid

from sqlmodel import Session
from starlette.testclient import TestClient

from app.core.config import settings
from app.models import School, User, UserRole


# IV1: Admin creates all user types
def test_admin_creates_publisher_success(client: TestClient, admin_token: str) -> None:
    """Admin can create publishers"""
    publisher_data = {
        "name": "New Publisher Inc",
        "contact_email": "contact@newpublisher.com",
        "user_email": "newpub@example.com",
        "full_name": "New Publisher User"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=publisher_data
    )

    assert response.status_code == 201
    data = response.json()
    assert "user" in data
    assert data["user"]["email"] == "newpub@example.com"
    assert "username" in data["user"]  # Username should be auto-generated
    assert "temporary_password" in data  # Secure password flow
    assert data["user"]["must_change_password"] is True


def test_admin_creates_teacher_success(
    client: TestClient, admin_token: str, session: Session, publisher_user_with_record: User
) -> None:
    """Admin can create teachers"""
    # Get publisher record from fixture
    from sqlmodel import select
    publisher_statement = select(Publisher).where(Publisher.user_id == publisher_user_with_record.id)
    publisher = session.exec(publisher_statement).first()

    # Create school for this publisher
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        publisher_id=publisher.id,
        address="123 Test St"
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
        f"{settings.API_V1_STR}/admin/teachers",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=teacher_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "newteacher@example.com"
    assert "username" in data["user"]


def test_admin_creates_student_success(client: TestClient, admin_token: str) -> None:
    """Admin can create students"""
    student_data = {
        "user_email": "newstudent@example.com",
        "full_name": "New Student",
        "grade_level": "10",
        "parent_email": "parent@example.com"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/students",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=student_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "newstudent@example.com"
    assert "username" in data["user"]


# IV2: Publisher permissions
def test_publisher_creates_teacher_in_own_school(
    client: TestClient, session: Session, publisher_user_with_record: User
) -> None:
    """Publisher can create teacher in their school"""
    # Get publisher record from fixture
    from sqlmodel import select
    publisher_statement = select(Publisher).where(Publisher.user_id == publisher_user_with_record.id)
    publisher = session.exec(publisher_statement).first()

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

    # Login as this publisher
    login_response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": publisher_user_with_record.email, "password": "publisherpassword"}
    )
    assert login_response.status_code == 200
    publisher_token = login_response.json()["access_token"]

    teacher_data = {
        "user_email": "teacherviapub@example.com",
        "full_name": "Teacher Via Publisher",
        "school_id": str(school.id),
        "subject_specialization": "Science"
    }

    # Via admin endpoint (which now accepts Publisher role too)
    response = client.post(
        f"{settings.API_V1_STR}/admin/teachers",
        headers={"Authorization": f"Bearer {publisher_token}"},
        json=teacher_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "teacherviapub@example.com"
    assert "username" in data["user"]


def test_publisher_creates_teacher_via_admin_endpoint(
    client: TestClient, session: Session, publisher_user_with_record: User
) -> None:
    """Publisher can create teacher via /admin/teachers endpoint"""
    # Get publisher record from fixture
    from sqlmodel import select
    publisher_statement = select(Publisher).where(Publisher.user_id == publisher_user_with_record.id)
    publisher = session.exec(publisher_statement).first()

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

    # Login as this publisher
    login_response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": publisher_user_with_record.email, "password": "publisherpassword"}
    )
    assert login_response.status_code == 200
    publisher_token = login_response.json()["access_token"]

    teacher_data = {
        "user_email": "teacherviaadmin@example.com",
        "full_name": "Teacher Via Admin Endpoint",
        "school_id": str(school.id),
        "subject_specialization": "Math"
    }

    # Via admin endpoint (Publisher can also use this now)
    response = client.post(
        f"{settings.API_V1_STR}/admin/teachers",
        headers={"Authorization": f"Bearer {publisher_token}"},
        json=teacher_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "teacherviaadmin@example.com"
    assert "username" in data["user"]


def test_publisher_cannot_create_teacher_in_other_school(
    client: TestClient, session: Session, publisher_user_with_record: User
) -> None:
    """Publisher cannot create teacher in another publisher's school (403)"""
    # Get publisher record from fixture
    from sqlmodel import select

    from app.core.security import get_password_hash
    publisher_statement = select(Publisher).where(Publisher.user_id == publisher_user_with_record.id)
    publisher = session.exec(publisher_statement).first()

    # Login as this publisher
    login_response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": publisher_user_with_record.email, "password": "publisherpassword"}
    )
    assert login_response.status_code == 200
    publisher_token = login_response.json()["access_token"]

    # Create ANOTHER publisher's user and record
    other_publisher_user = User(
        id=uuid.uuid4(),
        email="otherpub@example.com",
        username="otherpublisher",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        is_active=True,
        full_name="Other Publisher User"
    )
    session.add(other_publisher_user)
    session.flush()

    other_publisher = Publisher(
        id=uuid.uuid4(),
        user_id=other_publisher_user.id,
        name="Other Publisher",
        contact_email="contact@otherpublisher.com"
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

    teacher_data = {
        "user_email": "hackteacher@example.com",
        "full_name": "Hack Teacher",
        "school_id": str(other_school.id),
        "subject_specialization": "Hacking"
    }

    # Try to create teacher in other publisher's school via admin endpoint
    response = client.post(
        f"{settings.API_V1_STR}/admin/teachers",
        headers={"Authorization": f"Bearer {publisher_token}"},
        json=teacher_data
    )

    assert response.status_code == 403
    assert "another publisher's school" in response.json()["detail"]


def test_publisher_creates_student_success(client: TestClient, publisher_user_with_record: User) -> None:
    """Publisher can create students via admin endpoint"""
    # Login as publisher
    login_response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": publisher_user_with_record.email, "password": "publisherpassword"}
    )
    assert login_response.status_code == 200
    publisher_token = login_response.json()["access_token"]

    student_data = {
        "user_email": "studentviapub@example.com",
        "full_name": "Student Via Publisher",
        "grade_level": "9",
        "parent_email": "parent@example.com"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/students",
        headers={"Authorization": f"Bearer {publisher_token}"},
        json=student_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "studentviapub@example.com"
    assert "username" in data["user"]


# IV3: Teacher permissions
def test_teacher_creates_student_success(
    client: TestClient, session: Session, teacher_user_with_record: User
) -> None:
    """Teacher can create students"""
    # Login as teacher with record
    login_response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": teacher_user_with_record.email, "password": "teacherpassword"}
    )
    assert login_response.status_code == 200
    teacher_token = login_response.json()["access_token"]

    student_data = {
        "user_email": "studentviateacher@example.com",
        "full_name": "Student Via Teacher",
        "grade_level": "8",
        "parent_email": "parent@example.com"
    }

    response = client.post(
        f"{settings.API_V1_STR}/teachers/me/students",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=student_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "studentviateacher@example.com"
    assert "username" in data["user"]


def test_teacher_creates_student_via_admin_endpoint(client: TestClient, teacher_token: str) -> None:
    """Teacher can create students via /admin/students endpoint"""
    student_data = {
        "user_email": "studentviaadmin@example.com",
        "full_name": "Student Via Admin",
        "grade_level": "11"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/students",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=student_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "studentviaadmin@example.com"
    assert "username" in data["user"]


def test_teacher_cannot_create_teacher(
    client: TestClient, teacher_token: str, session: Session, publisher_user_with_record: User
) -> None:
    """Teacher attempting to create teacher fails with 403"""
    # Get publisher from fixture and create school
    from sqlmodel import select
    publisher_statement = select(Publisher).where(Publisher.user_id == publisher_user_with_record.id)
    publisher = session.exec(publisher_statement).first()

    school = School(
        id=uuid.uuid4(),
        name="School",
        publisher_id=publisher.id,
        address="Address"
    )
    session.add(school)
    session.commit()

    teacher_data = {
        "user_email": "hackteacher2@example.com",
        "full_name": "Hack Teacher 2",
        "school_id": str(school.id),
        "subject_specialization": "Hacking"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/teachers",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=teacher_data
    )

    assert response.status_code == 403
    assert "Access forbidden" in response.json()["detail"]


def test_teacher_cannot_create_publisher(client: TestClient, teacher_token: str) -> None:
    """Teacher attempting to create publisher fails with 403"""
    publisher_data = {
        "name": "Hack Publisher",
        "contact_email": "hack@pub.com",
        "user_email": "hackpub@example.com",
        "full_name": "Hack Publisher User"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=publisher_data
    )

    assert response.status_code == 403
    assert "Access forbidden" in response.json()["detail"]


# IV4: Student permissions
def test_student_cannot_create_users(
    client: TestClient, session: Session, student_token: str, publisher_user_with_record: User
) -> None:
    """Student has no access to any creation endpoints (403)"""
    # Get publisher from fixture and create school
    from sqlmodel import select
    publisher_statement = select(Publisher).where(Publisher.user_id == publisher_user_with_record.id)
    publisher = session.exec(publisher_statement).first()

    school = School(
        id=uuid.uuid4(),
        name="School",
        publisher_id=publisher.id,
        address="Address"
    )
    session.add(school)
    session.commit()

    # Try to create publisher
    publisher_data = {
        "name": "Student Hack Publisher",
        "contact_email": "studhack@pub.com",
        "user_email": "studhackpub@example.com",
        "full_name": "Student Hack Publisher"
    }
    response = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {student_token}"},
        json=publisher_data
    )
    assert response.status_code == 403

    # Try to create teacher
    teacher_data = {
        "user_email": "studhackteacher@example.com",
        "full_name": "Student Hack Teacher",
        "school_id": str(school.id)
    }
    response = client.post(
        f"{settings.API_V1_STR}/admin/teachers",
        headers={"Authorization": f"Bearer {student_token}"},
        json=teacher_data
    )
    assert response.status_code == 403

    # Try to create student via admin endpoint
    student_data = {
        "user_email": "studhackstudent@example.com",
        "full_name": "Student Hack Student"
    }
    response = client.post(
        f"{settings.API_V1_STR}/admin/students",
        headers={"Authorization": f"Bearer {student_token}"},
        json=student_data
    )
    assert response.status_code == 403

    # Try to create student via teacher endpoint
    response = client.post(
        f"{settings.API_V1_STR}/teachers/me/students",
        headers={"Authorization": f"Bearer {student_token}"},
        json=student_data
    )
    assert response.status_code == 403


# IV5: Username generation
def test_username_auto_generated_from_full_name(client: TestClient, admin_token: str) -> None:
    """Created user has username generated from full_name"""
    publisher_data = {
        "name": "Username Test Publisher",
        "contact_email": "test@username.com",
        "user_email": "usernametest@example.com",
        "full_name": "John Doe"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=publisher_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user"]["username"] == "jdoe"  # First initial + last name


def test_duplicate_username_gets_incremented(client: TestClient, admin_token: str) -> None:
    """Creating users with same name generates jdoe, jdoe1, jdoe2"""
    # Create first Jane Doe
    publisher_data_1 = {
        "name": "Publisher 1",
        "contact_email": "contact1@pub.com",
        "user_email": "jane1@example.com",
        "full_name": "Jane Doe"
    }
    response1 = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=publisher_data_1
    )
    assert response1.status_code == 201
    assert response1.json()["user"]["username"] == "jdoe"

    # Create second Jane Doe
    publisher_data_2 = {
        "name": "Publisher 2",
        "contact_email": "contact2@pub.com",
        "user_email": "jane2@example.com",
        "full_name": "Jane Doe"
    }
    response2 = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=publisher_data_2
    )
    assert response2.status_code == 201
    assert response2.json()["user"]["username"] == "jdoe1"

    # Create third Jane Doe
    publisher_data_3 = {
        "name": "Publisher 3",
        "contact_email": "contact3@pub.com",
        "user_email": "jane3@example.com",
        "full_name": "Jane Doe"
    }
    response3 = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=publisher_data_3
    )
    assert response3.status_code == 201
    assert response3.json()["user"]["username"] == "jdoe2"
