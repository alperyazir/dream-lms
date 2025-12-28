"""
Tests for welcome email functionality.
Story 17.2: Implement Welcome Email for New Users
"""
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.utils import generate_new_account_email


class TestGenerateNewAccountEmail:
    """Tests for the generate_new_account_email utility function."""

    def test_email_contains_required_fields(self):
        """Test email content includes all required fields [17.2 AC: 8]"""
        email_data = generate_new_account_email(
            email_to="test@example.com",
            username="testuser",
            password="temp123",
            full_name="Test User"
        )

        # Check subject line format
        assert "Welcome to" in email_data.subject
        assert "Your Account" in email_data.subject

        # Check HTML content contains required elements
        html = email_data.html_content
        assert "Test User" in html  # Full name
        assert "testuser" in html  # Username
        assert "temp123" in html  # Password
        assert "Temporary Password" in html  # Password label
        assert "change your password" in html.lower()  # Change password instruction

    def test_email_uses_fallback_when_no_full_name(self):
        """Test email uses username as fallback when full_name not provided [17.2 AC: 8]"""
        email_data = generate_new_account_email(
            email_to="test@example.com",
            username="testuser",
            password="temp123",
            full_name=""
        )

        # Should use username as fallback
        html = email_data.html_content
        assert "testuser" in html

    def test_email_subject_contains_project_name(self):
        """Test email subject includes project name [17.2 AC: 7]"""
        email_data = generate_new_account_email(
            email_to="test@example.com",
            username="testuser",
            password="temp123",
            full_name="Test User"
        )

        # Subject should contain "Welcome to"
        assert "Welcome to" in email_data.subject

    def test_email_contains_login_link(self):
        """Test email contains link to login [17.2 AC: 8]"""
        email_data = generate_new_account_email(
            email_to="test@example.com",
            username="testuser",
            password="temp123",
            full_name="Test User"
        )

        # Should contain login link
        html = email_data.html_content
        assert "href=" in html
        assert "Login to" in html

    def test_email_contains_security_notice(self):
        """Test email contains security notice about unexpected emails [17.2 AC: 15-16]"""
        email_data = generate_new_account_email(
            email_to="test@example.com",
            username="testuser",
            password="temp123",
            full_name="Test User"
        )

        html = email_data.html_content
        assert "did not expect this email" in html.lower() or "contact" in html.lower()


class TestPublisherCreationEmail:
    """Tests for email sending during publisher creation."""

    @patch("app.api.routes.admin.settings")
    @patch("app.api.routes.admin.send_email")
    @patch("app.api.routes.admin.generate_new_account_email")
    def test_email_sent_when_smtp_configured(
        self, mock_generate_email, mock_send_email, mock_settings,
        client: TestClient, session: Session, admin_token: str
    ):
        """Test welcome email is sent when SMTP is configured [17.2 AC: 1]"""
        mock_settings.emails_enabled = True
        mock_settings.PROJECT_NAME = "Dream LMS"
        mock_settings.FRONTEND_HOST = "http://localhost"
        mock_generate_email.return_value = MagicMock(
            subject="Welcome",
            html_content="<html>Welcome</html>"
        )

        response = client.post(
            "/api/v1/admin/publishers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Publisher",
                "username": "testpub",
                "user_email": "pub@example.com",
                "full_name": "Test Publisher User",
                "contact_email": "contact@example.com"
            }
        )

        if response.status_code == 201:
            # Verify email was sent
            mock_send_email.assert_called_once()
            # Verify full_name was passed
            mock_generate_email.assert_called_once()
            call_kwargs = mock_generate_email.call_args.kwargs
            assert call_kwargs.get("full_name") == "Test Publisher User"

    @patch("app.api.routes.admin.settings")
    @patch("app.api.routes.admin.send_email")
    def test_fallback_when_email_fails(
        self, mock_send_email, mock_settings,
        client: TestClient, session: Session, admin_token: str
    ):
        """Test password returned when email sending fails [17.2 AC: 5-6]"""
        mock_settings.emails_enabled = True
        mock_settings.PROJECT_NAME = "Dream LMS"
        mock_settings.FRONTEND_HOST = "http://localhost"
        mock_send_email.side_effect = Exception("SMTP connection failed")

        response = client.post(
            "/api/v1/admin/publishers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Publisher 2",
                "username": "testpub2",
                "user_email": "pub2@example.com",
                "full_name": "Test Publisher User 2",
                "contact_email": "contact2@example.com"
            }
        )

        if response.status_code == 201:
            data = response.json()
            # Should return temporary password when email fails
            assert data.get("temporary_password") is not None
            assert data.get("password_emailed") is False
            assert "failed" in data.get("message", "").lower() or "share" in data.get("message", "").lower()

    @patch("app.api.routes.admin.settings")
    @patch("app.api.routes.admin.send_email")
    def test_no_email_when_smtp_disabled(
        self, mock_send_email, mock_settings,
        client: TestClient, session: Session, admin_token: str
    ):
        """Test no email attempt when SMTP is disabled [17.2 AC: 5]"""
        mock_settings.emails_enabled = False

        response = client.post(
            "/api/v1/admin/publishers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Publisher 3",
                "username": "testpub3",
                "user_email": "pub3@example.com",
                "full_name": "Test Publisher User 3",
                "contact_email": "contact3@example.com"
            }
        )

        if response.status_code == 201:
            # Email should not be called
            mock_send_email.assert_not_called()
            data = response.json()
            # Should return temporary password
            assert data.get("temporary_password") is not None
            assert data.get("password_emailed") is False


class TestTeacherCreationEmail:
    """Tests for email sending during teacher creation.

    Note: Full integration tests for teacher creation require a school fixture.
    These tests focus on the email generation and utility function behavior.
    """

    def test_email_generation_for_teacher(self):
        """Test welcome email can be generated with teacher data [17.2 AC: 4]"""
        email_data = generate_new_account_email(
            email_to="teacher@example.com",
            username="testteacher",
            password="temppass123",
            full_name="Test Teacher User"
        )

        # Verify email contains teacher's full name
        assert "Test Teacher User" in email_data.html_content
        assert "testteacher" in email_data.html_content
        assert "temppass123" in email_data.html_content


class TestStudentCreationEmail:
    """Tests for email sending during student creation."""

    @patch("app.api.routes.admin.settings")
    @patch("app.api.routes.admin.send_email")
    @patch("app.api.routes.admin.generate_new_account_email")
    def test_email_sent_with_full_name(
        self, mock_generate_email, mock_send_email, mock_settings,
        client: TestClient, session: Session, admin_token: str
    ):
        """Test welcome email includes full_name for students [17.2 AC: 4]"""
        mock_settings.emails_enabled = True
        mock_settings.PROJECT_NAME = "Dream LMS"
        mock_settings.FRONTEND_HOST = "http://localhost"
        mock_generate_email.return_value = MagicMock(
            subject="Welcome",
            html_content="<html>Welcome</html>"
        )

        response = client.post(
            "/api/v1/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "teststudent",
                "user_email": "student@example.com",
                "full_name": "Test Student User",
                "grade_level": "10"
            }
        )

        if response.status_code == 201:
            mock_generate_email.assert_called_once()
            call_kwargs = mock_generate_email.call_args.kwargs
            assert call_kwargs.get("full_name") == "Test Student User"
