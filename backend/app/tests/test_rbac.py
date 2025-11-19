"""
Integration tests for Role-Based Access Control (RBAC)
"""
from fastapi.testclient import TestClient

from app.core.config import settings
from app.models import User, UserRole


def test_admin_can_access_superuser_endpoints(
    client: TestClient, admin_token: str
):
    """Test that admin users can access superuser-only endpoints"""
    response = client.get(
        f"{settings.API_V1_STR}/users/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    # Admin should be able to list users (superuser endpoint)
    assert response.status_code == 200


def test_student_cannot_access_superuser_endpoints(
    client: TestClient, student_token: str
):
    """Test that student users cannot access superuser-only endpoints"""
    response = client.get(
        f"{settings.API_V1_STR}/users/",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    # Student should not be able to list users
    assert response.status_code == 403


def test_teacher_cannot_access_superuser_endpoints(
    client: TestClient, teacher_token: str
):
    """Test that teacher users cannot access superuser-only endpoints"""
    response = client.get(
        f"{settings.API_V1_STR}/users/",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    # Teacher should not be able to list users
    assert response.status_code == 403


def test_publisher_cannot_access_superuser_endpoints(
    client: TestClient, publisher_token: str
):
    """Test that publisher users cannot access superuser-only endpoints"""
    response = client.get(
        f"{settings.API_V1_STR}/users/",
        headers={"Authorization": f"Bearer {publisher_token}"}
    )
    # Publisher should not be able to list users
    assert response.status_code == 403


def test_all_roles_can_access_own_profile(
    client: TestClient,
    admin_token: str,
    publisher_token: str,
    teacher_token: str,
    student_token: str
):
    """Test that all user roles can access their own profile"""
    tokens = [admin_token, publisher_token, teacher_token, student_token]

    for token in tokens:
        response = client.get(
            f"{settings.API_V1_STR}/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert "email" in response.json()


def test_all_roles_can_update_own_profile(
    client: TestClient,
    admin_token: str,
    publisher_token: str,
    teacher_token: str,
    student_token: str
):
    """Test that all user roles can update their own profile"""
    tokens = [admin_token, publisher_token, teacher_token, student_token]

    for token in tokens:
        response = client.patch(
            f"{settings.API_V1_STR}/users/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"full_name": "Updated Name"}
        )
        assert response.status_code == 200
        assert response.json()["full_name"] == "Updated Name"


def test_token_contains_correct_role_for_each_user(
    client: TestClient,
    admin_user: User,
    publisher_user: User,
    teacher_user: User,
    student_user: User
):
    """Test that tokens contain the correct role for each user type"""
    import jwt

    from app.core.security import ALGORITHM

    test_cases = [
        (admin_user, "adminpassword", UserRole.admin),
        (publisher_user, "publisherpassword", UserRole.publisher),
        (teacher_user, "teacherpassword", UserRole.teacher),
        (student_user, "studentpassword", UserRole.student),
    ]

    for user, password, expected_role in test_cases:
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": user.email, "password": password}
        )
        assert response.status_code == 200

        token = response.json()["access_token"]
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])

        assert payload["role"] == expected_role


def test_unauthenticated_user_cannot_access_protected_endpoints(
    client: TestClient
):
    """Test that unauthenticated users cannot access protected endpoints"""
    response = client.get(f"{settings.API_V1_STR}/users/me")
    assert response.status_code == 401
