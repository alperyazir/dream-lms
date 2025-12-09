"""
Tests for admin endpoints - password reset, user management, validation
[Source: Story 9.2, Story 11.2]
"""
import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models import (
    Class,
    ClassStudent,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


class TestPasswordReset:
    """Tests for admin password reset functionality [Story 9.2 AC: 1-5, Story 11.2]"""

    def test_reset_password_success_no_email(
        self, client: TestClient, session: Session, admin_token: str
    ):
        """Test password reset for user without email returns temp password [11.2 AC: 5]"""
        # Create user without email
        user_no_email = User(
            id=uuid.uuid4(),
            email=None,
            username="user_no_email",
            hashed_password=get_password_hash("oldpassword"),
            role=UserRole.teacher,
            is_active=True,
            full_name="No Email User"
        )
        session.add(user_no_email)
        session.commit()
        session.refresh(user_no_email)

        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{user_no_email.id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Check new response structure [Story 11.2]
        assert data["success"] is True
        assert data["password_emailed"] is False
        assert data["temporary_password"] is not None
        assert len(data["temporary_password"]) >= 12
        assert "share" in data["message"].lower()

        # Verify password was actually changed in database
        session.refresh(user_no_email)
        assert verify_password(data["temporary_password"], user_no_email.hashed_password)
        # User must change password on next login [11.2 AC: 3]
        assert user_no_email.must_change_password is True

    def test_reset_password_with_email_disabled(
        self, client: TestClient, session: Session, admin_token: str, teacher_user: User
    ):
        """Test password reset when email is disabled returns temp password"""
        # Emails are disabled in test environment (no SMTP configured)
        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{teacher_user.id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Since emails are disabled, password should be returned
        assert data["success"] is True
        assert data["password_emailed"] is False
        assert data["temporary_password"] is not None

        # Verify password was changed
        session.refresh(teacher_user)
        assert verify_password(data["temporary_password"], teacher_user.hashed_password)
        assert teacher_user.must_change_password is True

    @patch("app.api.routes.admin.settings")
    @patch("app.api.routes.admin.send_email")
    def test_reset_password_sends_email_when_enabled(
        self, mock_send_email, mock_settings, client: TestClient, session: Session,
        admin_token: str, teacher_user: User
    ):
        """Test password reset sends email and hides password [11.2 AC: 1, 2]"""
        # Configure mocks to simulate email being enabled
        mock_settings.emails_enabled = True
        mock_settings.PROJECT_NAME = "Dream LMS"
        mock_settings.FRONTEND_HOST = "http://localhost"

        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{teacher_user.id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Password should NOT be returned when email is sent [11.2 AC: 1]
        assert data["success"] is True
        assert data["password_emailed"] is True
        assert data["temporary_password"] is None
        assert teacher_user.email in data["message"]

        # Verify email was called
        mock_send_email.assert_called_once()

    def test_reset_password_for_student(
        self, client: TestClient, session: Session, admin_token: str, student_user: User
    ):
        """Test password reset works for student users"""
        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{student_user.id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Verify new password works
        session.refresh(student_user)
        if data["temporary_password"]:
            assert verify_password(data["temporary_password"], student_user.hashed_password)

    def test_reset_password_for_publisher(
        self, client: TestClient, session: Session, admin_token: str, publisher_user: User
    ):
        """Test password reset works for publisher users"""
        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{publisher_user.id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Verify new password works
        session.refresh(publisher_user)
        if data["temporary_password"]:
            assert verify_password(data["temporary_password"], publisher_user.hashed_password)

    def test_reset_password_user_not_found(
        self, client: TestClient, admin_token: str
    ):
        """Test password reset returns 404 for non-existent user"""
        fake_uuid = uuid.uuid4()
        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{fake_uuid}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]

    def test_reset_password_cannot_reset_admin(
        self, client: TestClient, admin_token: str, admin_user: User
    ):
        """Test that admin passwords cannot be reset via this endpoint [Security]"""
        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{admin_user.id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 403
        assert "Cannot reset admin password" in response.json()["detail"]

    def test_reset_password_requires_admin_or_publisher_role(
        self, client: TestClient, teacher_token: str, student_user: User
    ):
        """Test that teachers cannot reset passwords [11.2 AC: 6]"""
        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{student_user.id}/reset-password",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 403

    def test_reset_password_unauthorized(
        self, client: TestClient, student_user: User
    ):
        """Test that unauthenticated requests are rejected"""
        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{student_user.id}/reset-password",
        )

        assert response.status_code == 401

    def test_reset_password_sets_must_change_password(
        self, client: TestClient, session: Session, admin_token: str, teacher_user: User
    ):
        """Test that must_change_password is set to True [11.2 AC: 3]"""
        # Ensure it starts as False
        teacher_user.must_change_password = False
        session.add(teacher_user)
        session.commit()

        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{teacher_user.id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200

        session.refresh(teacher_user)
        assert teacher_user.must_change_password is True

    def test_reset_password_generates_secure_password(
        self, client: TestClient, admin_token: str, teacher_user: User
    ):
        """Test that generated password meets security requirements [AC: 3]"""
        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{teacher_user.id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        password = response.json()["temporary_password"]

        # Password should be returned (emails disabled in test)
        assert password is not None
        # Password should be at least 12 characters
        assert len(password) >= 12

        # Password should contain mixed characters
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)

        # At least 2 of these should be true for a reasonably secure password
        assert sum([has_upper, has_lower, has_digit]) >= 2

    def test_reset_password_creates_notification(
        self, client: TestClient, admin_token: str, teacher_user: User
    ):
        """Test that password reset creates a notification for the user"""
        from datetime import timedelta

        from app.core.security import create_access_token
        teacher_token = create_access_token(
            teacher_user.id,
            timedelta(minutes=30),
            {"role": teacher_user.role.value}
        )

        # Reset password
        reset_response = client.post(
            f"{settings.API_V1_STR}/admin/users/{teacher_user.id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert reset_response.status_code == 200

        # Check notifications
        notifications_response = client.get(
            f"{settings.API_V1_STR}/notifications",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert notifications_response.status_code == 200

        response_data = notifications_response.json()
        notifications = response_data.get("notifications", [])

        # Find the password reset notification
        password_reset_notification = next(
            (n for n in notifications if n.get("type") == "password_reset"),
            None
        )
        assert password_reset_notification is not None
        assert "Password Reset" in password_reset_notification.get("title", "")
        assert "administrator" in password_reset_notification.get("message", "").lower()


class TestPublisherPasswordReset:
    """Tests for publisher password reset permissions [Story 11.2 AC: 6]"""

    def test_publisher_can_reset_own_teacher_password(
        self, client: TestClient, session: Session, publisher_token: str, publisher_user: User
    ):
        """Test publisher can reset password for their teacher [11.2 AC: 6]"""
        # Create publisher record
        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher"
        )
        session.add(publisher)
        session.commit()

        # Create school under publisher
        school = School(
            id=uuid.uuid4(),
            name="Test School",
            publisher_id=publisher.id
        )
        session.add(school)
        session.commit()

        # Create teacher user
        teacher_user = User(
            id=uuid.uuid4(),
            email="myteacher@example.com",
            username="myteacher",
            hashed_password=get_password_hash("password"),
            role=UserRole.teacher,
            is_active=True,
            full_name="My Teacher"
        )
        session.add(teacher_user)
        session.commit()

        # Create teacher record linked to school
        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id
        )
        session.add(teacher)
        session.commit()

        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{teacher_user.id}/reset-password",
            headers={"Authorization": f"Bearer {publisher_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_publisher_can_reset_own_student_password(
        self, client: TestClient, session: Session, publisher_token: str, publisher_user: User
    ):
        """Test publisher can reset password for their student [11.2 AC: 6]"""
        # Create publisher record
        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher Student"
        )
        session.add(publisher)
        session.commit()

        # Create school under publisher
        school = School(
            id=uuid.uuid4(),
            name="Test School Student",
            publisher_id=publisher.id
        )
        session.add(school)
        session.commit()

        # Create teacher user for class
        teacher_user_for_class = User(
            id=uuid.uuid4(),
            email="teacher_for_class@example.com",
            username="teacher_for_class",
            hashed_password=get_password_hash("password"),
            role=UserRole.teacher,
            is_active=True
        )
        session.add(teacher_user_for_class)
        session.commit()

        teacher_for_class = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user_for_class.id,
            school_id=school.id
        )
        session.add(teacher_for_class)
        session.commit()

        # Create a class in the school
        class_obj = Class(
            id=uuid.uuid4(),
            name="Test Class",
            school_id=school.id,
            teacher_id=teacher_for_class.id
        )
        session.add(class_obj)
        session.commit()

        # Create student user
        student_user = User(
            id=uuid.uuid4(),
            email="mystudent@example.com",
            username="mystudent",
            hashed_password=get_password_hash("password"),
            role=UserRole.student,
            is_active=True,
            full_name="My Student"
        )
        session.add(student_user)
        session.commit()

        # Create student record
        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id
        )
        session.add(student)
        session.commit()

        # Enroll student in class (links student to school)
        enrollment = ClassStudent(
            id=uuid.uuid4(),
            class_id=class_obj.id,
            student_id=student.id
        )
        session.add(enrollment)
        session.commit()

        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{student_user.id}/reset-password",
            headers={"Authorization": f"Bearer {publisher_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_publisher_cannot_reset_other_publisher_teacher(
        self, client: TestClient, session: Session, publisher_token: str, publisher_user: User
    ):
        """Test publisher cannot reset another publisher's teacher password [11.2 AC: 6]"""
        # Create another publisher
        other_pub_user = User(
            id=uuid.uuid4(),
            email="other_pub@example.com",
            username="otherpub",
            hashed_password=get_password_hash("password"),
            role=UserRole.publisher
        )
        session.add(other_pub_user)
        session.commit()

        other_publisher = Publisher(
            id=uuid.uuid4(),
            user_id=other_pub_user.id,
            name="Other Publisher"
        )
        session.add(other_publisher)
        session.commit()

        # Create school under OTHER publisher
        other_school = School(
            id=uuid.uuid4(),
            name="Other School",
            publisher_id=other_publisher.id
        )
        session.add(other_school)
        session.commit()

        # Create teacher under OTHER publisher's school
        other_teacher_user = User(
            id=uuid.uuid4(),
            email="other_teacher@example.com",
            username="otherteacher",
            hashed_password=get_password_hash("password"),
            role=UserRole.teacher,
            is_active=True
        )
        session.add(other_teacher_user)
        session.commit()

        other_teacher = Teacher(
            id=uuid.uuid4(),
            user_id=other_teacher_user.id,
            school_id=other_school.id
        )
        session.add(other_teacher)
        session.commit()

        # Current publisher needs a Publisher record too
        my_publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="My Publisher"
        )
        session.add(my_publisher)
        session.commit()

        # Try to reset other publisher's teacher - should fail
        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{other_teacher_user.id}/reset-password",
            headers={"Authorization": f"Bearer {publisher_token}"},
        )

        assert response.status_code == 403
        assert "Not authorized" in response.json()["detail"]

    def test_publisher_cannot_reset_other_publisher_password(
        self, client: TestClient, session: Session, publisher_token: str, publisher_user: User
    ):
        """Test publisher cannot reset another publisher's password"""
        # Create publisher record for current user
        my_publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="My Publisher Unique"
        )
        session.add(my_publisher)
        session.commit()

        # Create another publisher user
        other_pub_user = User(
            id=uuid.uuid4(),
            email="another_pub@example.com",
            username="anotherpub",
            hashed_password=get_password_hash("password"),
            role=UserRole.publisher
        )
        session.add(other_pub_user)
        session.commit()

        # Try to reset another publisher's password - should fail
        response = client.post(
            f"{settings.API_V1_STR}/admin/users/{other_pub_user.id}/reset-password",
            headers={"Authorization": f"Bearer {publisher_token}"},
        )

        assert response.status_code == 403


class TestSchoolValidation:
    """Tests for school creation validation [AC: 18, 19]"""

    def test_create_school_requires_publisher_id(
        self, client: TestClient, admin_token: str
    ):
        """Test that school creation fails without publisher_id [AC: 18]"""
        # Try to create school without publisher_id
        response = client.post(
            f"{settings.API_V1_STR}/admin/schools",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Test School"},
        )

        # Should fail with 422 Unprocessable Entity (missing required field)
        assert response.status_code == 422
        assert "publisher_id" in str(response.json()).lower()

    def test_create_school_validates_publisher_exists(
        self, client: TestClient, admin_token: str
    ):
        """Test that school creation fails for non-existent publisher [AC: 19]"""
        fake_publisher_id = str(uuid.uuid4())

        response = client.post(
            f"{settings.API_V1_STR}/admin/schools",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Test School", "publisher_id": fake_publisher_id},
        )

        # Should fail with 404 Not Found
        assert response.status_code == 404
        assert "publisher" in response.json()["detail"].lower()

    def test_create_school_success_with_valid_publisher(
        self, client: TestClient, session: Session, admin_token: str, publisher_user: User
    ):
        """Test school creation succeeds with valid publisher_id"""
        # Create publisher record
        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher"
        )
        session.add(publisher)
        session.commit()

        response = client.post(
            f"{settings.API_V1_STR}/admin/schools",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Test School", "publisher_id": str(publisher.id)},
        )

        assert response.status_code == 201
        assert response.json()["name"] == "Test School"


class TestTeacherValidation:
    """Tests for teacher creation validation [AC: 20, 21]"""

    def test_create_teacher_requires_school_id(
        self, client: TestClient, admin_token: str
    ):
        """Test that teacher creation fails without school_id [AC: 20]"""
        response = client.post(
            f"{settings.API_V1_STR}/admin/teachers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "newteacher",
                "user_email": "newteacher@example.com",
                "full_name": "New Teacher",
            },
        )

        # Should fail with 422 Unprocessable Entity (missing required field)
        assert response.status_code == 422
        assert "school_id" in str(response.json()).lower()

    def test_create_teacher_validates_school_exists(
        self, client: TestClient, admin_token: str
    ):
        """Test that teacher creation fails for non-existent school [AC: 21]"""
        fake_school_id = str(uuid.uuid4())

        response = client.post(
            f"{settings.API_V1_STR}/admin/teachers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "newteacher",
                "user_email": "newteacher@example.com",
                "full_name": "New Teacher",
                "school_id": fake_school_id,
            },
        )

        # Should fail with 404 Not Found
        assert response.status_code == 404
        assert "school" in response.json()["detail"].lower()

    def test_create_teacher_success_with_valid_school(
        self, client: TestClient, session: Session, admin_token: str, publisher_user: User
    ):
        """Test teacher creation succeeds with valid school_id"""
        # Create publisher and school
        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher"
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            name="Test School",
            publisher_id=publisher.id
        )
        session.add(school)
        session.commit()

        response = client.post(
            f"{settings.API_V1_STR}/admin/teachers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "newteacher",
                "user_email": "newteacher@example.com",
                "full_name": "New Teacher",
                "school_id": str(school.id),
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["user"]["email"] == "newteacher@example.com"
        assert "temporary_password" in data
        assert data["user"]["must_change_password"] is True


class TestUserEdit:
    """Tests for admin user edit functionality [AC: 10, 11, 13]"""

    def test_edit_user_full_name(
        self, client: TestClient, admin_token: str, teacher_user: User
    ):
        """Test updating user's full_name [AC: 10]"""
        response = client.patch(
            f"{settings.API_V1_STR}/admin/users/{teacher_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"full_name": "Updated Teacher Name"},
        )

        assert response.status_code == 200
        assert response.json()["full_name"] == "Updated Teacher Name"

    def test_edit_user_email(
        self, client: TestClient, admin_token: str, teacher_user: User
    ):
        """Test updating user's email [AC: 10]"""
        response = client.patch(
            f"{settings.API_V1_STR}/admin/users/{teacher_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"email": "newemail@example.com"},
        )

        assert response.status_code == 200
        assert response.json()["email"] == "newemail@example.com"

    def test_edit_user_username(
        self, client: TestClient, admin_token: str, teacher_user: User
    ):
        """Test updating user's username [AC: 10]"""
        response = client.patch(
            f"{settings.API_V1_STR}/admin/users/{teacher_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"username": "newusername"},
        )

        assert response.status_code == 200
        assert response.json()["username"] == "newusername"

    def test_edit_user_email_duplicate(
        self, client: TestClient, admin_token: str, teacher_user: User, student_user: User
    ):
        """Test that duplicate email is rejected [AC: 11]"""
        response = client.patch(
            f"{settings.API_V1_STR}/admin/users/{teacher_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"email": student_user.email},
        )

        assert response.status_code == 409
        assert "email" in response.json()["detail"].lower()

    def test_edit_user_username_duplicate(
        self, client: TestClient, admin_token: str, teacher_user: User, student_user: User
    ):
        """Test that duplicate username is rejected [AC: 11]"""
        response = client.patch(
            f"{settings.API_V1_STR}/admin/users/{teacher_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"username": student_user.username},
        )

        assert response.status_code == 409
        assert "username" in response.json()["detail"].lower()

    def test_edit_user_not_found(
        self, client: TestClient, admin_token: str
    ):
        """Test edit returns 404 for non-existent user"""
        fake_id = uuid.uuid4()
        response = client.patch(
            f"{settings.API_V1_STR}/admin/users/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"full_name": "New Name"},
        )

        assert response.status_code == 404

    def test_edit_user_requires_admin(
        self, client: TestClient, teacher_token: str, student_user: User
    ):
        """Test that non-admin users cannot edit users"""
        response = client.patch(
            f"{settings.API_V1_STR}/admin/users/{student_user.id}",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"full_name": "New Name"},
        )

        assert response.status_code == 403

    def test_edit_user_returns_updated_data(
        self, client: TestClient, admin_token: str, teacher_user: User
    ):
        """Test that response contains the updated user data [AC: 13]"""
        response = client.patch(
            f"{settings.API_V1_STR}/admin/users/{teacher_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "full_name": "Updated Name",
                "username": "updateduser",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["username"] == "updateduser"
        assert data["id"] == str(teacher_user.id)


class TestPublisherLogo:
    """Tests for publisher logo upload functionality [AC: 15, 16, 17]"""

    def test_upload_logo_success(
        self, client: TestClient, session: Session, admin_token: str, publisher_user: User
    ):
        """Test successful logo upload for a publisher [AC: 15]"""
        import io
        from PIL import Image

        # Create publisher record
        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher Logo"
        )
        session.add(publisher)
        session.commit()

        # Create a valid PNG image in memory
        img = Image.new("RGB", (100, 100), color="blue")
        img_bytes = io.BytesIO()
        img.save(img_bytes, format="PNG")
        img_bytes.seek(0)

        response = client.post(
            f"{settings.API_V1_STR}/admin/publishers/{publisher.id}/logo",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("logo.png", img_bytes, "image/png")},
        )

        assert response.status_code == 200
        data = response.json()
        assert "logo_url" in data
        assert "/static/logos/" in data["logo_url"]
        assert data["message"] == "Logo uploaded successfully"

        # Verify publisher was updated
        session.refresh(publisher)
        assert publisher.logo_url is not None

    def test_upload_logo_invalid_type(
        self, client: TestClient, session: Session, admin_token: str, publisher_user: User
    ):
        """Test logo upload rejects invalid file types [AC: 17]"""
        import io

        # Create publisher record
        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher Logo Type"
        )
        session.add(publisher)
        session.commit()

        # Try to upload a text file
        text_content = io.BytesIO(b"This is not an image")

        response = client.post(
            f"{settings.API_V1_STR}/admin/publishers/{publisher.id}/logo",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("logo.txt", text_content, "text/plain")},
        )

        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    def test_upload_logo_file_too_large(
        self, client: TestClient, session: Session, admin_token: str, publisher_user: User
    ):
        """Test logo upload rejects files over 2MB [AC: 17]"""
        import io

        # Create publisher record
        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher Logo Size"
        )
        session.add(publisher)
        session.commit()

        # Create a file larger than 2MB (2.1MB)
        large_content = io.BytesIO(b"x" * (2 * 1024 * 1024 + 100000))

        response = client.post(
            f"{settings.API_V1_STR}/admin/publishers/{publisher.id}/logo",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("logo.png", large_content, "image/png")},
        )

        assert response.status_code == 400
        assert "File too large" in response.json()["detail"]

    def test_upload_logo_publisher_not_found(
        self, client: TestClient, admin_token: str
    ):
        """Test logo upload returns 404 for non-existent publisher"""
        import io

        fake_id = uuid.uuid4()
        content = io.BytesIO(b"x" * 100)

        response = client.post(
            f"{settings.API_V1_STR}/admin/publishers/{fake_id}/logo",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("logo.png", content, "image/png")},
        )

        assert response.status_code == 404
        assert "Publisher not found" in response.json()["detail"]

    def test_delete_logo_success(
        self, client: TestClient, session: Session, admin_token: str, publisher_user: User
    ):
        """Test successful logo deletion"""
        # Create publisher with logo_url
        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher Delete Logo",
            logo_url="/static/logos/test.png"
        )
        session.add(publisher)
        session.commit()

        response = client.delete(
            f"{settings.API_V1_STR}/admin/publishers/{publisher.id}/logo",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 204

        # Verify publisher logo was cleared
        session.refresh(publisher)
        assert publisher.logo_url is None

    def test_delete_logo_publisher_not_found(
        self, client: TestClient, admin_token: str
    ):
        """Test logo deletion returns 404 for non-existent publisher"""
        fake_id = uuid.uuid4()

        response = client.delete(
            f"{settings.API_V1_STR}/admin/publishers/{fake_id}/logo",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 404

    def test_list_publishers_includes_logo_url(
        self, client: TestClient, session: Session, admin_token: str, publisher_user: User
    ):
        """Test that list_publishers response includes logo_url [AC: 16]"""
        # Create publisher with logo_url
        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher With Logo",
            logo_url="/static/logos/publisher_logo.png"
        )
        session.add(publisher)
        session.commit()

        response = client.get(
            f"{settings.API_V1_STR}/admin/publishers",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        publishers = response.json()

        # Find our publisher in the list
        found_publisher = next(
            (p for p in publishers if p["id"] == str(publisher.id)),
            None
        )
        assert found_publisher is not None
        assert "logo_url" in found_publisher
        assert found_publisher["logo_url"] == "/static/logos/publisher_logo.png"

    def test_upload_logo_requires_admin(
        self, client: TestClient, session: Session, teacher_token: str, publisher_user: User
    ):
        """Test that logo upload requires admin role"""
        import io

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=publisher_user.id,
            name="Test Publisher Auth"
        )
        session.add(publisher)
        session.commit()

        content = io.BytesIO(b"x" * 100)

        response = client.post(
            f"{settings.API_V1_STR}/admin/publishers/{publisher.id}/logo",
            headers={"Authorization": f"Bearer {teacher_token}"},
            files={"file": ("logo.png", content, "image/png")},
        )

        assert response.status_code == 403
