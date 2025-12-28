"""
Tests for Assignment Preview/Test Mode API endpoints (Story 9.7).

Tests cover:
- Assignment preview endpoint for teachers (test mode)
- Activity preview endpoint for teachers/publishers
- Authorization: Teacher/Publisher/Admin roles
- Preview returns activity data without creating student records
"""

import uuid
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import (
    Activity,
    ActivityType,
    Assignment,
    AssignmentActivity,
    AssignmentPublishStatus,
    Book,
    BookAccess,
    Publisher,
    School,
    Teacher,
    User,
    UserRole,
)


class TestAssignmentPreview:
    """Test GET /api/v1/assignments/{id}/preview endpoint."""

    def test_preview_requires_authentication(self, client: TestClient):
        """Test that unauthenticated requests are rejected."""
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{uuid.uuid4()}/preview"
        )
        assert response.status_code == 401

    def test_preview_requires_teacher_or_admin_role(
        self, client: TestClient, student_token: str
    ):
        """Test that students cannot access assignment preview."""
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{uuid.uuid4()}/preview",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert response.status_code == 403

    def test_preview_returns_404_for_nonexistent_assignment(
        self, client: TestClient, teacher_token: str
    ):
        """Test that preview returns 404 for non-existent assignment."""
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{uuid.uuid4()}/preview",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert response.status_code == 404

    def test_teacher_can_preview_own_assignment(
        self,
        client: TestClient,
        session: Session,
        teacher_user: User,
        teacher_token: str,
    ):
        """Test that teachers can preview their own assignments."""
        # Create publisher and school
        publisher = Publisher(
            id=uuid.uuid4(),
            name="Test Publisher",
            created_at=datetime.now(UTC),
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            name="Test School",
            created_at=datetime.now(UTC),
        )
        session.add(school)
        session.commit()

        # Create teacher
        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id,
            created_at=datetime.now(UTC),
        )
        session.add(teacher)
        session.commit()

        # Create book with book access
        book = Book(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            title="Test Book",
            book_name="test-book",
            publisher_name="test-publisher",
            created_at=datetime.now(UTC),
        )
        session.add(book)
        session.commit()

        book_access = BookAccess(
            id=uuid.uuid4(),
            book_id=book.id,
            school_id=school.id,
            created_at=datetime.now(UTC),
        )
        session.add(book_access)
        session.commit()

        # Create activity
        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            title="Test Activity",
            activity_type=ActivityType.circle,
            page_number=1,
            config_json={"question": "What is 2+2?", "answers": ["3", "4", "5"]},
            created_at=datetime.now(UTC),
        )
        session.add(activity)
        session.commit()

        # Create assignment
        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            book_id=book.id,
            name="Test Assignment",
            status=AssignmentPublishStatus.published,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(assignment)
        session.commit()

        # Link activity to assignment
        assignment_activity = AssignmentActivity(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            activity_id=activity.id,
            order_index=0,
        )
        session.add(assignment_activity)
        session.commit()

        # Request preview
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/preview",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["assignment_id"] == str(assignment.id)
        assert data["assignment_name"] == "Test Assignment"
        assert data["is_preview"] is True
        assert data["total_activities"] == 1
        assert len(data["activities"]) == 1
        assert data["activities"][0]["id"] == str(activity.id)
        assert data["activities"][0]["activity_type"] == "circle"
        assert "config_json" in data["activities"][0]


class TestActivityPreview:
    """Test GET /api/v1/assignments/activities/{id}/preview endpoint."""

    def test_activity_preview_requires_authentication(self, client: TestClient):
        """Test that unauthenticated requests are rejected."""
        response = client.get(
            f"{settings.API_V1_STR}/assignments/activities/{uuid.uuid4()}/preview"
        )
        assert response.status_code == 401

    def test_activity_preview_requires_teacher_or_publisher_role(
        self, client: TestClient, student_token: str
    ):
        """Test that students cannot access activity preview."""
        response = client.get(
            f"{settings.API_V1_STR}/assignments/activities/{uuid.uuid4()}/preview",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert response.status_code == 403

    def test_activity_preview_returns_404_for_nonexistent_activity(
        self, client: TestClient, teacher_token: str
    ):
        """Test that preview returns 404 for non-existent activity."""
        response = client.get(
            f"{settings.API_V1_STR}/assignments/activities/{uuid.uuid4()}/preview",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert response.status_code == 404

    def test_teacher_can_preview_activity_with_book_access(
        self,
        client: TestClient,
        session: Session,
        teacher_user: User,
        teacher_token: str,
    ):
        """Test that teachers can preview activities from books they have access to."""
        # Create publisher and school
        publisher = Publisher(
            id=uuid.uuid4(),
            name="Test Publisher",
            created_at=datetime.now(UTC),
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            name="Test School",
            created_at=datetime.now(UTC),
        )
        session.add(school)
        session.commit()

        # Create teacher
        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id,
            created_at=datetime.now(UTC),
        )
        session.add(teacher)
        session.commit()

        # Create book with book access
        book = Book(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            title="Test Book",
            book_name="test-book",
            publisher_name="test-publisher",
            created_at=datetime.now(UTC),
        )
        session.add(book)
        session.commit()

        book_access = BookAccess(
            id=uuid.uuid4(),
            book_id=book.id,
            school_id=school.id,
            created_at=datetime.now(UTC),
        )
        session.add(book_access)
        session.commit()

        # Create activity
        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            title="Test Activity",
            activity_type=ActivityType.match_the_words,
            page_number=1,
            config_json={"pairs": [{"word": "cat", "match": "gato"}]},
            created_at=datetime.now(UTC),
        )
        session.add(activity)
        session.commit()

        # Request preview
        response = client.get(
            f"{settings.API_V1_STR}/assignments/activities/{activity.id}/preview",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["activity_id"] == str(activity.id)
        assert data["activity_title"] == "Test Activity"
        assert data["activity_type"] == "match_the_words"
        assert data["is_preview"] is True
        assert data["book_name"] == "test-book"
        assert data["publisher_name"] == "test-publisher"
        assert "config_json" in data

    def test_teacher_cannot_preview_activity_without_book_access(
        self,
        client: TestClient,
        session: Session,
        teacher_user: User,
        teacher_token: str,
    ):
        """Test that teachers cannot preview activities from books they don't have access to."""
        # Create publisher, school, and teacher
        publisher = Publisher(
            id=uuid.uuid4(),
            name="Test Publisher",
            created_at=datetime.now(UTC),
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            name="Test School",
            created_at=datetime.now(UTC),
        )
        session.add(school)
        session.commit()

        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id,
            created_at=datetime.now(UTC),
        )
        session.add(teacher)
        session.commit()

        # Create book WITHOUT book access
        book = Book(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            title="Test Book",
            book_name="test-book",
            publisher_name="test-publisher",
            created_at=datetime.now(UTC),
        )
        session.add(book)
        session.commit()

        # Create activity
        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            title="Test Activity",
            activity_type=ActivityType.circle,
            page_number=1,
            config_json={},
            created_at=datetime.now(UTC),
        )
        session.add(activity)
        session.commit()

        # Request preview - should fail
        response = client.get(
            f"{settings.API_V1_STR}/assignments/activities/{activity.id}/preview",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 403
        assert "don't have access" in response.json()["detail"]


class TestPreviewAuthorization:
    """Test preview authorization for different roles."""

    def test_admin_can_preview_any_assignment(
        self,
        client: TestClient,
        session: Session,
        admin_token: str,
    ):
        """Test that admins can preview any assignment."""
        # Create minimal test data
        publisher = Publisher(
            id=uuid.uuid4(),
            name="Test Publisher",
            created_at=datetime.now(UTC),
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            name="Test School",
            created_at=datetime.now(UTC),
        )
        session.add(school)
        session.commit()

        # Create a different teacher (not the admin)
        other_teacher_user = User(
            id=uuid.uuid4(),
            email="other_teacher@example.com",
            username="otherteacher",
            hashed_password="hashedpassword",
            role=UserRole.teacher,
            is_active=True,
            full_name="Other Teacher",
        )
        session.add(other_teacher_user)
        session.commit()

        other_teacher = Teacher(
            id=uuid.uuid4(),
            user_id=other_teacher_user.id,
            school_id=school.id,
            created_at=datetime.now(UTC),
        )
        session.add(other_teacher)
        session.commit()

        book = Book(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            title="Test Book",
            book_name="test-book",
            publisher_name="test-publisher",
            created_at=datetime.now(UTC),
        )
        session.add(book)
        session.commit()

        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            title="Test Activity",
            activity_type=ActivityType.circle,
            page_number=1,
            config_json={},
            created_at=datetime.now(UTC),
        )
        session.add(activity)
        session.commit()

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=other_teacher.id,
            book_id=book.id,
            name="Test Assignment",
            status=AssignmentPublishStatus.published,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(assignment)
        session.commit()

        assignment_activity = AssignmentActivity(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            activity_id=activity.id,
            order_index=0,
        )
        session.add(assignment_activity)
        session.commit()

        # Admin should be able to preview
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_preview"] is True

    def test_teacher_cannot_preview_other_teacher_assignment(
        self,
        client: TestClient,
        session: Session,
        teacher_user: User,
        teacher_token: str,
    ):
        """Test that teachers cannot preview assignments owned by other teachers."""
        # Create publisher and school
        publisher = Publisher(
            id=uuid.uuid4(),
            name="Test Publisher",
            created_at=datetime.now(UTC),
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            name="Test School",
            created_at=datetime.now(UTC),
        )
        session.add(school)
        session.commit()

        # Create the requesting teacher
        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id,
            created_at=datetime.now(UTC),
        )
        session.add(teacher)
        session.commit()

        # Create another teacher who owns the assignment
        other_teacher_user = User(
            id=uuid.uuid4(),
            email="other_teacher2@example.com",
            username="otherteacher2",
            hashed_password="hashedpassword",
            role=UserRole.teacher,
            is_active=True,
            full_name="Other Teacher 2",
        )
        session.add(other_teacher_user)
        session.commit()

        other_teacher = Teacher(
            id=uuid.uuid4(),
            user_id=other_teacher_user.id,
            school_id=school.id,
            created_at=datetime.now(UTC),
        )
        session.add(other_teacher)
        session.commit()

        book = Book(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            title="Test Book",
            book_name="test-book",
            publisher_name="test-publisher",
            created_at=datetime.now(UTC),
        )
        session.add(book)
        session.commit()

        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            title="Test Activity",
            activity_type=ActivityType.circle,
            page_number=1,
            config_json={},
            created_at=datetime.now(UTC),
        )
        session.add(activity)
        session.commit()

        # Assignment owned by other teacher
        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=other_teacher.id,
            book_id=book.id,
            name="Other Teacher's Assignment",
            status=AssignmentPublishStatus.published,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(assignment)
        session.commit()

        assignment_activity = AssignmentActivity(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            activity_id=activity.id,
            order_index=0,
        )
        session.add(assignment_activity)
        session.commit()

        # Teacher should NOT be able to preview other teacher's assignment
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/preview",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 403
        assert "only preview your own" in response.json()["detail"]
