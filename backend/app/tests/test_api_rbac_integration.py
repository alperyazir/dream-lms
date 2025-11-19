"""
Integration tests for RBAC across all role-specific endpoints
"""
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import Publisher, School, Teacher, User, UserRole


def test_student_cannot_access_admin_endpoints(
    client: TestClient, student_token: str
) -> None:
    """Test student gets 403 when accessing admin endpoints"""
    response = client.get(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"] or "Access forbidden" in response.json()["detail"]


def test_student_cannot_access_publisher_endpoints(
    client: TestClient, student_token: str
) -> None:
    """Test student gets 403 when accessing publisher endpoints"""
    response = client.get(
        f"{settings.API_V1_STR}/publishers/me/schools",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"] or "Access forbidden" in response.json()["detail"]


def test_student_cannot_access_teacher_endpoints(
    client: TestClient, student_token: str
) -> None:
    """Test student gets 403 when accessing teacher endpoints"""
    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/students",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"] or "Access forbidden" in response.json()["detail"]


def test_teacher_cannot_access_admin_endpoints(
    client: TestClient, teacher_token: str
) -> None:
    """Test teacher gets 403 when accessing admin endpoints"""
    response = client.get(
        f"{settings.API_V1_STR}/admin/schools",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"] or "Access forbidden" in response.json()["detail"]


def test_teacher_cannot_access_publisher_endpoints(
    client: TestClient, teacher_token: str
) -> None:
    """Test teacher gets 403 when accessing publisher endpoints"""
    response = client.get(
        f"{settings.API_V1_STR}/publishers/me/schools",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"] or "Access forbidden" in response.json()["detail"]


def test_publisher_cannot_access_admin_endpoints(
    client: TestClient, publisher_token: str
) -> None:
    """Test publisher gets 403 when accessing admin endpoints"""
    publisher_data = {
        "name": "Unauthorized Publisher",
        "contact_email": "unauth@pub.com",
        "user_email": "unauth@user.com",
        "full_name": "Unauthorized User"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {publisher_token}"},
        json=publisher_data
    )
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"] or "Access forbidden" in response.json()["detail"]


def test_publisher_cannot_access_teacher_endpoints(
    client: TestClient, publisher_token: str
) -> None:
    """Test publisher gets 403 when accessing teacher endpoints"""
    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/students",
        headers={"Authorization": f"Bearer {publisher_token}"}
    )
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"] or "Access forbidden" in response.json()["detail"]


def test_unauthenticated_cannot_access_admin_endpoints(
    client: TestClient
) -> None:
    """Test unauthenticated request gets 401"""
    response = client.get(f"{settings.API_V1_STR}/admin/publishers")
    assert response.status_code == 401


def test_unauthenticated_cannot_access_publisher_endpoints(
    client: TestClient
) -> None:
    """Test unauthenticated request gets 401"""
    response = client.get(f"{settings.API_V1_STR}/publishers/me/schools")
    assert response.status_code == 401


def test_unauthenticated_cannot_access_teacher_endpoints(
    client: TestClient
) -> None:
    """Test unauthenticated request gets 401"""
    response = client.get(f"{settings.API_V1_STR}/teachers/me/students")
    assert response.status_code == 401


def test_cross_publisher_data_isolation(
    client: TestClient, session: Session, publisher_token: str, publisher_user: User
) -> None:
    """Test publisher cannot see or modify another publisher's data"""
    # Create publisher A (authenticated user)
    publisher_a = Publisher(
        id=uuid.uuid4(),
        user_id=publisher_user.id,
        name="Publisher A",
        contact_email="a@publisher.com"
    )
    session.add(publisher_a)
    session.flush()

    school_a = School(
        id=uuid.uuid4(),
        name="School A",
        publisher_id=publisher_a.id,
        address="Address A"
    )
    session.add(school_a)
    session.flush()

    # Create publisher B with user
    user_b = User(
        id=uuid.uuid4(),
        email="b@publisher.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher B"
    )
    session.add(user_b)
    session.flush()

    publisher_b = Publisher(
        id=uuid.uuid4(),
        user_id=user_b.id,
        name="Publisher B",
        contact_email="b@publisher.com"
    )
    session.add(publisher_b)
    session.flush()

    school_b = School(
        id=uuid.uuid4(),
        name="School B",
        publisher_id=publisher_b.id,
        address="Address B"
    )
    session.add(school_b)
    session.commit()

    # Publisher A lists schools - should only see School A
    response = client.get(
        f"{settings.API_V1_STR}/publishers/me/schools",
        headers={"Authorization": f"Bearer {publisher_token}"}
    )

    assert response.status_code == 200
    schools = response.json()
    assert len(schools) == 1
    assert schools[0]["name"] == "School A"

    # Publisher A tries to create teacher in School B - should fail
    teacher_data = {
        "user_email": "teacher@example.com",
        "full_name": "Teacher",
        "school_id": str(school_b.id),
        "subject_specialization": "Math"
    }

    response = client.post(
        f"{settings.API_V1_STR}/publishers/me/teachers",
        headers={"Authorization": f"Bearer {publisher_token}"},
        json=teacher_data
    )

    assert response.status_code == 403
    assert "Cannot create teacher in another publisher's school" in response.json()["detail"]


def test_cross_teacher_data_isolation(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test teacher only sees students enrolled in their own classes"""
    # Create publisher with user
    pub_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher",
        contact_email="pub@test.com"
    )
    session.add(publisher)
    session.flush()

    # Create school
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        publisher_id=publisher.id,
        address="Address"
    )
    session.add(school)
    session.flush()

    # Teacher A (authenticated)
    teacher_a = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Math"
    )
    session.add(teacher_a)
    session.flush()

    # Teacher B
    user_b = User(
        id=uuid.uuid4(),
        email="teacherb@test.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.teacher,
        full_name="Teacher B"
    )
    session.add(user_b)
    session.flush()

    teacher_b = Teacher(
        id=uuid.uuid4(),
        user_id=user_b.id,
        school_id=school.id,
        subject_specialization="Science"
    )
    session.add(teacher_b)
    session.commit()

    # Teacher A lists students - should see empty list (no classes/enrollments)
    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/students",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    assert response.status_code == 200
    students = response.json()
    assert len(students) == 0
