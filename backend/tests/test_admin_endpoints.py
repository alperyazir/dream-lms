"""
Integration tests for admin endpoints.
Tests dashboard stats, publisher CRUD, school CRUD, and list endpoints.
"""

import pytest

from app.core.security import create_access_token, hash_password
from app.db import get_db
from app.models.publisher import Publisher
from app.models.school import School
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.user import User, UserRole


@pytest.mark.asyncio
class TestDashboardEndpoint:
    """Test GET /api/v1/admin/dashboard/stats endpoint."""

    async def test_dashboard_stats_success(self, client, db_session):
        """Test dashboard stats returns correct counts."""
        # Create admin user first
        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(admin_user)
        await db_session.flush()

        # Create test users and entities
        # 1 Publisher
        publisher_user = User(
            email="publisher@test.com",
            password_hash=hash_password("Test123"),
            role=UserRole.publisher,
            is_active=True,
        )
        db_session.add(publisher_user)
        await db_session.flush()

        publisher = Publisher(
            user_id=publisher_user.id, name="Test Publisher", contact_email="pub@test.com"
        )
        db_session.add(publisher)
        await db_session.flush()

        # 1 School
        school = School(name="Test School", publisher_id=publisher.id, address="123 Main St")
        db_session.add(school)
        await db_session.flush()

        # 1 Teacher
        teacher_user = User(
            email="teacher@test.com",
            password_hash=hash_password("Test123"),
            role=UserRole.teacher,
            is_active=True,
        )
        db_session.add(teacher_user)
        await db_session.flush()

        teacher = Teacher(user_id=teacher_user.id, school_id=school.id)
        db_session.add(teacher)
        await db_session.flush()

        # 1 Student
        student_user = User(
            email="student@test.com",
            password_hash=hash_password("Test123"),
            role=UserRole.student,
            is_active=True,
        )
        db_session.add(student_user)
        await db_session.flush()

        student = Student(user_id=student_user.id, grade_level="5")
        db_session.add(student)
        await db_session.commit()

        # Create admin token with real UUID
        admin_payload = {"user_id": str(admin_user.id), "email": "admin@test.com", "role": "admin"}
        admin_token = create_access_token(admin_payload)

        # Override DB dependency
        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        # Request dashboard stats
        response = await client.get(
            "/api/v1/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["total_publishers"] == 1
        assert data["total_schools"] == 1
        assert data["total_teachers"] == 1
        assert data["total_students"] == 1

    async def test_dashboard_stats_requires_admin_role(self, client, db_session):
        """Test dashboard stats returns 403 for non-admin users."""
        # Create a teacher user
        teacher_user = User(
            email="teacher@test.com",
            password_hash=hash_password("TeacherPass123"),
            role=UserRole.teacher,
            is_active=True,
        )
        db_session.add(teacher_user)
        await db_session.flush()
        await db_session.commit()

        # Create non-admin token with real UUID
        teacher_payload = {
            "user_id": str(teacher_user.id),
            "email": "teacher@test.com",
            "role": "teacher",
        }
        teacher_token = create_access_token(teacher_payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.get(
            "/api/v1/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]


@pytest.mark.asyncio
class TestPublishersCRUD:
    """Test publisher CRUD endpoints."""

    async def test_list_publishers_empty(self, client, db_session):
        """Test listing publishers when none exist."""
        # Create admin user
        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(admin_user)
        await db_session.flush()
        await db_session.commit()

        admin_payload = {"user_id": str(admin_user.id), "email": "admin@test.com", "role": "admin"}
        admin_token = create_access_token(admin_payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.get(
            "/api/v1/admin/publishers",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 0
        assert data["pagination"]["total"] == 0

    async def test_create_publisher_success(self, client, db_session):
        """Test creating a publisher."""
        # Create admin user
        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(admin_user)
        await db_session.flush()
        await db_session.commit()

        admin_payload = {"user_id": str(admin_user.id), "email": "admin@test.com", "role": "admin"}
        admin_token = create_access_token(admin_payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.post(
            "/api/v1/admin/publishers",
            json={"name": "New Publisher", "contact_email": "newpub@test.com"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "New Publisher"
        assert data["data"]["contact_email"] == "newpub@test.com"
        assert "temp_password" in data["data"]
        # Verify password meets strength requirements (12 chars, mixed)
        temp_password = data["data"]["temp_password"]
        assert len(temp_password) == 12

    async def test_create_publisher_duplicate_email(self, client, db_session):
        """Test creating publisher with duplicate email fails."""
        # Create admin user
        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(admin_user)
        await db_session.flush()

        # Create existing publisher
        user = User(
            email="existing@test.com",
            password_hash=hash_password("Test123"),
            role=UserRole.publisher,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        admin_payload = {"user_id": str(admin_user.id), "email": "admin@test.com", "role": "admin"}
        admin_token = create_access_token(admin_payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.post(
            "/api/v1/admin/publishers",
            json={"name": "Duplicate Publisher", "contact_email": "existing@test.com"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    async def test_update_publisher_success(self, client, db_session):
        """Test updating a publisher."""
        # Create admin user
        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(admin_user)
        await db_session.flush()

        # Create publisher
        user = User(
            email="update@test.com",
            password_hash=hash_password("Test123"),
            role=UserRole.publisher,
            is_active=True,
        )
        db_session.add(user)
        await db_session.flush()

        publisher = Publisher(user_id=user.id, name="Old Name", contact_email="old@test.com")
        db_session.add(publisher)
        await db_session.commit()

        admin_payload = {"user_id": str(admin_user.id), "email": "admin@test.com", "role": "admin"}
        admin_token = create_access_token(admin_payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.put(
            f"/api/v1/admin/publishers/{publisher.id}",
            json={"name": "Updated Name", "contact_email": "updated@test.com"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["contact_email"] == "updated@test.com"

    async def test_delete_publisher_success(self, client, db_session):
        """Test soft deleting a publisher."""
        # Create admin user
        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(admin_user)
        await db_session.flush()

        # Create publisher
        user = User(
            email="delete@test.com",
            password_hash=hash_password("Test123"),
            role=UserRole.publisher,
            is_active=True,
        )
        db_session.add(user)
        await db_session.flush()

        publisher = Publisher(user_id=user.id, name="To Delete", contact_email="delete@test.com")
        db_session.add(publisher)
        await db_session.commit()

        admin_payload = {"user_id": str(admin_user.id), "email": "admin@test.com", "role": "admin"}
        admin_token = create_access_token(admin_payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.delete(
            f"/api/v1/admin/publishers/{publisher.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 204

        # Verify user.is_active is False
        await db_session.refresh(user)
        assert user.is_active is False


@pytest.mark.asyncio
class TestSchoolsCRUD:
    """Test school CRUD endpoints."""

    async def test_create_school_success(self, client, db_session):
        """Test creating a school."""
        # Create admin user
        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(admin_user)
        await db_session.flush()

        # Create publisher first
        user = User(
            email="pub@test.com",
            password_hash=hash_password("Test123"),
            role=UserRole.publisher,
            is_active=True,
        )
        db_session.add(user)
        await db_session.flush()

        publisher = Publisher(user_id=user.id, name="Test Pub", contact_email="pub@test.com")
        db_session.add(publisher)
        await db_session.commit()

        admin_payload = {"user_id": str(admin_user.id), "email": "admin@test.com", "role": "admin"}
        admin_token = create_access_token(admin_payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.post(
            "/api/v1/admin/schools",
            json={
                "name": "New School",
                "publisher_id": str(publisher.id),
                "address": "123 School St",
                "contact_info": "555-1234",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New School"
        assert data["address"] == "123 School St"
        assert data["publisher_name"] == "Test Pub"

    async def test_create_school_invalid_publisher(self, client, db_session):
        """Test creating school with non-existent publisher fails."""
        # Create admin user
        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(admin_user)
        await db_session.flush()
        await db_session.commit()

        admin_payload = {"user_id": str(admin_user.id), "email": "admin@test.com", "role": "admin"}
        admin_token = create_access_token(admin_payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.post(
            "/api/v1/admin/schools",
            json={
                "name": "New School",
                "publisher_id": "00000000-0000-0000-0000-000000000000",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 404
        assert "Publisher not found" in response.json()["detail"]


@pytest.mark.asyncio
class TestListEndpoints:
    """Test teacher and student list endpoints."""

    async def test_list_teachers(self, client, db_session):
        """Test listing teachers with school and publisher info."""
        # Create admin user
        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(admin_user)
        await db_session.flush()

        # Create publisher, school, and teacher
        pub_user = User(
            email="pub@test.com",
            password_hash=hash_password("Test123"),
            role=UserRole.publisher,
            is_active=True,
        )
        db_session.add(pub_user)
        await db_session.flush()

        publisher = Publisher(user_id=pub_user.id, name="Test Publisher")
        db_session.add(publisher)
        await db_session.flush()

        school = School(name="Test School", publisher_id=publisher.id)
        db_session.add(school)
        await db_session.flush()

        teacher_user = User(
            email="teacher@test.com",
            password_hash=hash_password("Test123"),
            role=UserRole.teacher,
            is_active=True,
        )
        db_session.add(teacher_user)
        await db_session.flush()

        teacher = Teacher(
            user_id=teacher_user.id, school_id=school.id, subject_specialization="Math"
        )
        db_session.add(teacher)
        await db_session.commit()

        admin_payload = {"user_id": str(admin_user.id), "email": "admin@test.com", "role": "admin"}
        admin_token = create_access_token(admin_payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.get(
            "/api/v1/admin/teachers",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 1
        assert data["data"][0]["school_name"] == "Test School"
        assert data["data"][0]["publisher_name"] == "Test Publisher"
        assert data["data"][0]["subject_specialization"] == "Math"

    async def test_list_students(self, client, db_session):
        """Test listing students."""
        # Create admin user
        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(admin_user)
        await db_session.flush()

        # Create student
        student_user = User(
            email="student@test.com",
            password_hash=hash_password("Test123"),
            role=UserRole.student,
            is_active=True,
        )
        db_session.add(student_user)
        await db_session.flush()

        student = Student(user_id=student_user.id, grade_level="6", parent_email="parent@test.com")
        db_session.add(student)
        await db_session.commit()

        admin_payload = {"user_id": str(admin_user.id), "email": "admin@test.com", "role": "admin"}
        admin_token = create_access_token(admin_payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.get(
            "/api/v1/admin/students",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 1
        assert data["data"][0]["grade_level"] == "6"
        assert data["data"][0]["parent_email"] == "parent@test.com"


@pytest.mark.asyncio
class TestPaginationAndSearch:
    """Test pagination and search functionality."""

    async def test_publishers_pagination(self, client, db_session):
        """Test publisher list pagination."""
        # Create admin user
        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(admin_user)
        await db_session.flush()

        # Create 3 publishers
        for i in range(3):
            user = User(
                email=f"pub{i}@test.com",
                password_hash=hash_password("Test123"),
                role=UserRole.publisher,
                is_active=True,
            )
            db_session.add(user)
            await db_session.flush()

            publisher = Publisher(user_id=user.id, name=f"Publisher {i}")
            db_session.add(publisher)

        await db_session.commit()

        admin_payload = {"user_id": str(admin_user.id), "email": "admin@test.com", "role": "admin"}
        admin_token = create_access_token(admin_payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        # Request page 1 with 2 items per page
        response = await client.get(
            "/api/v1/admin/publishers?page=1&per_page=2",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 2
        assert data["pagination"]["total"] == 3
        assert data["pagination"]["total_pages"] == 2
        assert data["pagination"]["next_page"] == 2
        assert data["pagination"]["prev_page"] is None

    async def test_publishers_search(self, client, db_session):
        """Test publisher list search."""
        # Create admin user
        admin_user = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(admin_user)
        await db_session.flush()

        # Create publishers with searchable names
        for name in ["Alpha Corp", "Beta Inc", "Alpha Solutions"]:
            user = User(
                email=f"{name.lower().replace(' ', '')}@test.com",
                password_hash=hash_password("Test123"),
                role=UserRole.publisher,
                is_active=True,
            )
            db_session.add(user)
            await db_session.flush()

            publisher = Publisher(user_id=user.id, name=name)
            db_session.add(publisher)

        await db_session.commit()

        admin_payload = {"user_id": str(admin_user.id), "email": "admin@test.com", "role": "admin"}
        admin_token = create_access_token(admin_payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        # Search for "Alpha"
        response = await client.get(
            "/api/v1/admin/publishers?search=Alpha",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 2  # Alpha Corp and Alpha Solutions
        assert data["pagination"]["total"] == 2
