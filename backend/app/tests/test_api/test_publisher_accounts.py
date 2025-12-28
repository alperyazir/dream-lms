"""
API tests for publisher account CRUD endpoints.
Story 25.2: Admin Publisher Account CRUD
"""
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import User, UserRole
from app.schemas.publisher import PublisherPublic


@pytest.fixture
def mock_publisher():
    """Mock DCS publisher data."""
    return PublisherPublic(
        id=12345,
        name="Test Publisher",
        contact_email="publisher@test.com",
        logo_url=None,
    )


@pytest.fixture
def mock_publisher_service(mock_publisher):
    """Mock publisher service with a valid publisher."""
    with patch("app.api.routes.admin.get_publisher_service") as mock:
        service = AsyncMock()
        service.get_publisher = AsyncMock(return_value=mock_publisher)
        mock.return_value = service
        yield service


@pytest.fixture
def mock_publisher_service_not_found():
    """Mock publisher service that returns None (publisher not found)."""
    with patch("app.api.routes.admin.get_publisher_service") as mock:
        service = AsyncMock()
        service.get_publisher = AsyncMock(return_value=None)
        mock.return_value = service
        yield service


class TestCreatePublisherAccount:
    """Tests for POST /api/v1/admin/publisher-accounts"""

    def test_create_publisher_account_success(
        self, client: TestClient, admin_token: str, mock_publisher_service
    ):
        """Test creating a publisher account with valid DCS publisher ID."""
        data = {
            "dcs_publisher_id": 12345,
            "username": "newpublisher",
            "email": "newpublisher@test.com",
            "full_name": "New Publisher User",
        }
        response = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
        )
        assert response.status_code == 201
        result = response.json()
        assert result["user"]["username"] == "newpublisher"
        assert result["user"]["email"] == "newpublisher@test.com"
        assert result["user"]["role"] == "publisher"
        assert result["user"]["dcs_publisher_id"] == 12345
        # Password should be returned since emails are disabled in test
        assert result["temporary_password"] is not None or result["password_emailed"] is True

    def test_create_publisher_account_invalid_dcs_publisher(
        self, client: TestClient, admin_token: str, mock_publisher_service_not_found
    ):
        """Test creating a publisher account with invalid DCS publisher ID."""
        data = {
            "dcs_publisher_id": 99999,
            "username": "invalidpub",
            "email": "invalidpub@test.com",
            "full_name": "Invalid Publisher",
        }
        response = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
        )
        assert response.status_code == 400
        assert "DCS Publisher ID 99999 not found" in response.json()["detail"]

    def test_create_publisher_account_duplicate_email(
        self, client: TestClient, admin_token: str, mock_publisher_service, session: Session
    ):
        """Test creating a publisher account with duplicate email fails."""
        # First create an account
        data = {
            "dcs_publisher_id": 12345,
            "username": "publisher1",
            "email": "duplicate@test.com",
            "full_name": "Publisher One",
        }
        response = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
        )
        assert response.status_code == 201

        # Try to create another with same email
        data2 = {
            "dcs_publisher_id": 12345,
            "username": "publisher2",
            "email": "duplicate@test.com",
            "full_name": "Publisher Two",
        }
        response2 = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data2,
        )
        assert response2.status_code == 400
        assert "email already exists" in response2.json()["detail"].lower()

    def test_create_publisher_account_duplicate_username(
        self, client: TestClient, admin_token: str, mock_publisher_service, session: Session
    ):
        """Test creating a publisher account with duplicate username fails."""
        # First create an account
        data = {
            "dcs_publisher_id": 12345,
            "username": "duplicateuser",
            "email": "pub1@test.com",
            "full_name": "Publisher One",
        }
        response = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
        )
        assert response.status_code == 201

        # Try to create another with same username
        data2 = {
            "dcs_publisher_id": 12345,
            "username": "duplicateuser",
            "email": "pub2@test.com",
            "full_name": "Publisher Two",
        }
        response2 = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data2,
        )
        assert response2.status_code == 400
        assert "username already exists" in response2.json()["detail"].lower()

    def test_create_publisher_account_multiple_for_same_dcs_publisher(
        self, client: TestClient, admin_token: str, mock_publisher_service
    ):
        """Test that multiple accounts can be created for the same DCS publisher (team support)."""
        # Create first account
        data1 = {
            "dcs_publisher_id": 12345,
            "username": "team_member1",
            "email": "team1@test.com",
            "full_name": "Team Member 1",
        }
        response1 = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data1,
        )
        assert response1.status_code == 201

        # Create second account for same DCS publisher
        data2 = {
            "dcs_publisher_id": 12345,
            "username": "team_member2",
            "email": "team2@test.com",
            "full_name": "Team Member 2",
        }
        response2 = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data2,
        )
        assert response2.status_code == 201
        assert response2.json()["user"]["dcs_publisher_id"] == 12345

    def test_create_publisher_account_auto_generate_username(
        self, client: TestClient, admin_token: str, mock_publisher_service
    ):
        """Test that username is auto-generated from full_name when not provided."""
        data = {
            "dcs_publisher_id": 12345,
            # No username provided
            "email": "autogen@test.com",
            "full_name": "John Doe",
        }
        response = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
        )
        assert response.status_code == 201
        result = response.json()
        # Should auto-generate username from name
        assert result["user"]["username"] == "john.doe"
        assert result["user"]["email"] == "autogen@test.com"
        assert result["user"]["full_name"] == "John Doe"

    def test_create_publisher_account_auto_generate_username_with_accents(
        self, client: TestClient, admin_token: str, mock_publisher_service
    ):
        """Test that username generation handles accents properly."""
        data = {
            "dcs_publisher_id": 12345,
            "email": "jose@test.com",
            "full_name": "José García",
        }
        response = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
        )
        assert response.status_code == 201
        result = response.json()
        assert result["user"]["username"] == "jose.garcia"

    def test_create_publisher_account_auto_generate_username_uniqueness(
        self, client: TestClient, admin_token: str, mock_publisher_service
    ):
        """Test that auto-generated usernames are made unique by appending numbers."""
        # Create first John Doe
        data1 = {
            "dcs_publisher_id": 12345,
            "email": "john1@test.com",
            "full_name": "John Doe",
        }
        response1 = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data1,
        )
        assert response1.status_code == 201
        assert response1.json()["user"]["username"] == "john.doe"

        # Create second John Doe - should get john.doe.2
        data2 = {
            "dcs_publisher_id": 12345,
            "email": "john2@test.com",
            "full_name": "John Doe",
        }
        response2 = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data2,
        )
        assert response2.status_code == 201
        assert response2.json()["user"]["username"] == "john.doe.2"

    def test_create_publisher_account_explicit_username_still_works(
        self, client: TestClient, admin_token: str, mock_publisher_service
    ):
        """Test that providing an explicit username still works as before."""
        data = {
            "dcs_publisher_id": 12345,
            "username": "custom_username",
            "email": "custom@test.com",
            "full_name": "Custom User",
        }
        response = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
        )
        assert response.status_code == 201
        result = response.json()
        # Should use the provided username
        assert result["user"]["username"] == "custom_username"


class TestListPublisherAccounts:
    """Tests for GET /api/v1/admin/publisher-accounts"""

    def test_list_publisher_accounts(
        self, client: TestClient, admin_token: str, mock_publisher_service
    ):
        """Test listing publisher accounts."""
        # Create a publisher account first
        data = {
            "dcs_publisher_id": 12345,
            "username": "listpublisher",
            "email": "listpub@test.com",
            "full_name": "List Publisher",
        }
        client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
        )

        # List accounts
        response = client.get(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        result = response.json()
        assert "data" in result
        assert "count" in result
        assert result["count"] >= 1
        # Find our created account
        accounts = [a for a in result["data"] if a["username"] == "listpublisher"]
        assert len(accounts) == 1
        assert accounts[0]["dcs_publisher_name"] == "Test Publisher"


class TestGetPublisherAccount:
    """Tests for GET /api/v1/admin/publisher-accounts/{id}"""

    def test_get_publisher_account(
        self, client: TestClient, admin_token: str, mock_publisher_service
    ):
        """Test getting a single publisher account."""
        # Create account
        data = {
            "dcs_publisher_id": 12345,
            "username": "getpublisher",
            "email": "getpub@test.com",
            "full_name": "Get Publisher",
        }
        create_response = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
        )
        user_id = create_response.json()["user"]["id"]

        # Get account
        response = client.get(
            f"/api/v1/admin/publisher-accounts/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        result = response.json()
        assert result["username"] == "getpublisher"
        assert result["dcs_publisher_id"] == 12345
        assert result["dcs_publisher_name"] == "Test Publisher"

    def test_get_publisher_account_not_found(
        self, client: TestClient, admin_token: str
    ):
        """Test getting a non-existent publisher account."""
        fake_id = str(uuid.uuid4())
        response = client.get(
            f"/api/v1/admin/publisher-accounts/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404


class TestUpdatePublisherAccount:
    """Tests for PUT /api/v1/admin/publisher-accounts/{id}"""

    def test_update_publisher_account(
        self, client: TestClient, admin_token: str, mock_publisher_service
    ):
        """Test updating a publisher account."""
        # Create account
        data = {
            "dcs_publisher_id": 12345,
            "username": "updatepublisher",
            "email": "updatepub@test.com",
            "full_name": "Update Publisher",
        }
        create_response = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
        )
        user_id = create_response.json()["user"]["id"]

        # Update account
        update_data = {
            "full_name": "Updated Name",
            "is_active": False,
        }
        response = client.put(
            f"/api/v1/admin/publisher-accounts/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=update_data,
        )
        assert response.status_code == 200
        result = response.json()
        assert result["full_name"] == "Updated Name"
        assert result["is_active"] is False

    def test_update_publisher_account_dcs_publisher_id(
        self, client: TestClient, admin_token: str, mock_publisher_service
    ):
        """Test updating DCS publisher ID on account."""
        # Create account
        data = {
            "dcs_publisher_id": 12345,
            "username": "dcsupdatepub",
            "email": "dcsupdate@test.com",
            "full_name": "DCS Update Publisher",
        }
        create_response = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
        )
        user_id = create_response.json()["user"]["id"]

        # Update dcs_publisher_id
        update_data = {"dcs_publisher_id": 12345}  # Same ID, but validates
        response = client.put(
            f"/api/v1/admin/publisher-accounts/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=update_data,
        )
        assert response.status_code == 200

    def test_update_publisher_account_invalid_dcs_publisher(
        self, client: TestClient, admin_token: str, session: Session
    ):
        """Test updating with invalid DCS publisher ID fails."""
        # Create account with mocked valid publisher
        with patch("app.api.routes.admin.get_publisher_service") as mock:
            service = AsyncMock()
            service.get_publisher = AsyncMock(
                return_value=PublisherPublic(id=12345, name="Test", contact_email=None, logo_url=None)
            )
            mock.return_value = service

            data = {
                "dcs_publisher_id": 12345,
                "username": "invalidupdate",
                "email": "invalidupdate@test.com",
                "full_name": "Invalid Update",
            }
            create_response = client.post(
                "/api/v1/admin/publisher-accounts",
                headers={"Authorization": f"Bearer {admin_token}"},
                json=data,
            )
            user_id = create_response.json()["user"]["id"]

        # Try to update with invalid DCS publisher
        with patch("app.api.routes.admin.get_publisher_service") as mock:
            service = AsyncMock()
            service.get_publisher = AsyncMock(return_value=None)
            mock.return_value = service

            update_data = {"dcs_publisher_id": 99999}
            response = client.put(
                f"/api/v1/admin/publisher-accounts/{user_id}",
                headers={"Authorization": f"Bearer {admin_token}"},
                json=update_data,
            )
            assert response.status_code == 400
            assert "DCS Publisher ID 99999 not found" in response.json()["detail"]


class TestDeletePublisherAccount:
    """Tests for DELETE /api/v1/admin/publisher-accounts/{id}"""

    def test_delete_publisher_account(
        self, client: TestClient, admin_token: str, mock_publisher_service
    ):
        """Test deleting a publisher account."""
        # Create account
        data = {
            "dcs_publisher_id": 12345,
            "username": "deletepublisher",
            "email": "deletepub@test.com",
            "full_name": "Delete Publisher",
        }
        create_response = client.post(
            "/api/v1/admin/publisher-accounts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
        )
        user_id = create_response.json()["user"]["id"]

        # Delete account
        response = client.delete(
            f"/api/v1/admin/publisher-accounts/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 204

        # Verify deleted
        get_response = client.get(
            f"/api/v1/admin/publisher-accounts/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert get_response.status_code == 404

    def test_delete_publisher_account_not_found(
        self, client: TestClient, admin_token: str
    ):
        """Test deleting non-existent account."""
        fake_id = str(uuid.uuid4())
        response = client.delete(
            f"/api/v1/admin/publisher-accounts/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404
