"""Tests for Assignment Skill Classification (Story 30.2)."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError
from sqlmodel import Session

from app.models import (
    ActivityFormat,
    Assignment,
    AssignmentStudent,
    School,
    SkillCategory,
    Student,
    Teacher,
    User,
    UserRole,
)
from app.core.security import get_password_hash
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentListItem,
    AssignmentResponse,
    SkillInfoCompact,
    FormatInfoCompact,
)
from app.schemas.skill import MixModeContent, MixModeQuestion


# ---------------------------------------------------------------------------
# Model Tests
# ---------------------------------------------------------------------------


class TestAssignmentSkillFields:
    """Test Assignment model with skill classification fields."""

    def _create_teacher(self, session: Session) -> Teacher:
        """Helper to create a teacher with all required dependencies."""
        school = School(
            id=uuid.uuid4(),
            name="Skill Test School",
            dcs_publisher_id=999,
        )
        session.add(school)
        session.commit()

        user = User(
            id=uuid.uuid4(),
            email="skillteacher@example.com",
            username="skillteacher",
            hashed_password=get_password_hash("password"),
            role=UserRole.teacher,
            is_active=True,
            is_superuser=False,
            full_name="Skill Teacher",
        )
        session.add(user)
        session.commit()

        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=user.id,
            school_id=school.id,
            subject_specialization="English",
        )
        session.add(teacher)
        session.commit()
        return teacher

    def test_create_assignment_with_skill_and_format(self, session: Session) -> None:
        """Test creating an assignment with skill_id and format_id set."""
        teacher = self._create_teacher(session)

        skill = SkillCategory(
            name="Listening", slug="listening", icon="ear", color="blue",
            display_order=1, is_active=True,
        )
        fmt = ActivityFormat(name="Quiz (MCQ)", slug="multiple_choice")
        session.add_all([skill, fmt])
        session.commit()

        assignment = Assignment(
            id=uuid.uuid4(),
            name="Listening Quiz",
            teacher_id=teacher.id,
            dcs_book_id=1,
            primary_skill_id=skill.id,
            activity_format_id=fmt.id,
            is_mix_mode=False,
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)

        assert assignment.primary_skill_id == skill.id
        assert assignment.activity_format_id == fmt.id
        assert assignment.is_mix_mode is False

    def test_create_assignment_without_skill_backward_compat(self, session: Session) -> None:
        """Test creating assignment WITHOUT skill fields (backward compatibility)."""
        teacher = self._create_teacher(session)

        assignment = Assignment(
            id=uuid.uuid4(),
            name="Old Style Assignment",
            teacher_id=teacher.id,
            dcs_book_id=1,
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)

        assert assignment.primary_skill_id is None
        assert assignment.activity_format_id is None
        assert assignment.is_mix_mode is False

    def test_create_mix_mode_assignment(self, session: Session) -> None:
        """Test creating a mix-mode assignment."""
        teacher = self._create_teacher(session)

        assignment = Assignment(
            id=uuid.uuid4(),
            name="Mix Mode Assignment",
            teacher_id=teacher.id,
            dcs_book_id=1,
            is_mix_mode=True,
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)

        assert assignment.is_mix_mode is True
        assert assignment.primary_skill_id is None  # Mix mode has no single primary skill

    def test_assignment_skill_relationship(self, session: Session) -> None:
        """Test that the primary_skill relationship loads correctly."""
        teacher = self._create_teacher(session)

        skill = SkillCategory(
            name="Reading", slug="reading", icon="book-open", color="green",
            display_order=2, is_active=True,
        )
        session.add(skill)
        session.commit()

        assignment = Assignment(
            id=uuid.uuid4(),
            name="Reading Comprehension",
            teacher_id=teacher.id,
            dcs_book_id=1,
            primary_skill_id=skill.id,
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)

        assert assignment.primary_skill is not None
        assert assignment.primary_skill.slug == "reading"

    def test_assignment_format_relationship(self, session: Session) -> None:
        """Test that the activity_format relationship loads correctly."""
        teacher = self._create_teacher(session)

        fmt = ActivityFormat(name="Fill-in-the-blank", slug="fill_blank")
        session.add(fmt)
        session.commit()

        assignment = Assignment(
            id=uuid.uuid4(),
            name="Fill Blanks Task",
            teacher_id=teacher.id,
            dcs_book_id=1,
            activity_format_id=fmt.id,
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)

        assert assignment.activity_format is not None
        assert assignment.activity_format.slug == "fill_blank"


# ---------------------------------------------------------------------------
# Schema Tests — AssignmentCreate
# ---------------------------------------------------------------------------


class TestAssignmentCreateSkillFields:
    """Test AssignmentCreate schema with skill classification fields."""

    def test_create_with_skill_and_format(self) -> None:
        """Test AssignmentCreate accepts skill_id and format_id."""
        skill_id = uuid.uuid4()
        format_id = uuid.uuid4()

        data = AssignmentCreate(
            source_type="ai_content",
            content_id=uuid.uuid4(),
            name="AI Listening Quiz",
            skill_id=skill_id,
            format_id=format_id,
            student_ids=[uuid.uuid4()],
        )

        assert data.skill_id == skill_id
        assert data.format_id == format_id
        assert data.is_mix_mode is False

    def test_create_without_skill_backward_compat(self) -> None:
        """Test AssignmentCreate works without skill fields (backward compat)."""
        data = AssignmentCreate(
            activity_id=uuid.uuid4(),
            book_id=1,
            name="Old Assignment",
            student_ids=[uuid.uuid4()],
        )

        assert data.skill_id is None
        assert data.format_id is None
        assert data.is_mix_mode is False

    def test_create_mix_mode_assignment(self) -> None:
        """Test AssignmentCreate with is_mix_mode=True."""
        data = AssignmentCreate(
            source_type="ai_content",
            content_id=uuid.uuid4(),
            name="Mix Mode Quiz",
            is_mix_mode=True,
            student_ids=[uuid.uuid4()],
        )

        assert data.is_mix_mode is True


# ---------------------------------------------------------------------------
# Schema Tests — AssignmentResponse with skill fields
# ---------------------------------------------------------------------------


class TestAssignmentResponseSkillFields:
    """Test AssignmentResponse schema with embedded skill info."""

    def test_response_with_skill_info(self) -> None:
        """Test AssignmentResponse includes skill and format info."""
        now = datetime.now(UTC)
        response = AssignmentResponse(
            id=uuid.uuid4(),
            teacher_id=uuid.uuid4(),
            book_id=1,
            name="Skill Assignment",
            instructions=None,
            due_date=None,
            time_limit_minutes=None,
            created_at=now,
            updated_at=now,
            primary_skill=SkillInfoCompact(
                id=uuid.uuid4(),
                name="Listening",
                slug="listening",
                icon="ear",
                color="blue",
            ),
            activity_format=FormatInfoCompact(
                id=uuid.uuid4(),
                name="Quiz (MCQ)",
                slug="multiple_choice",
            ),
            is_mix_mode=False,
        )

        assert response.primary_skill is not None
        assert response.primary_skill.slug == "listening"
        assert response.activity_format is not None
        assert response.activity_format.slug == "multiple_choice"
        assert response.is_mix_mode is False

    def test_response_without_skill_info_null(self) -> None:
        """Test AssignmentResponse with null skill info (old assignments)."""
        now = datetime.now(UTC)
        response = AssignmentResponse(
            id=uuid.uuid4(),
            teacher_id=uuid.uuid4(),
            book_id=1,
            name="Old Assignment",
            instructions=None,
            due_date=None,
            time_limit_minutes=None,
            created_at=now,
            updated_at=now,
        )

        assert response.primary_skill is None
        assert response.activity_format is None
        assert response.is_mix_mode is False


# ---------------------------------------------------------------------------
# Schema Tests — AssignmentListItem with skill fields
# ---------------------------------------------------------------------------


class TestAssignmentListItemSkillFields:
    """Test AssignmentListItem schema with skill classification."""

    def test_list_item_with_skill_data(self) -> None:
        """Test AssignmentListItem includes skill_name, slug, color, icon, format_name."""
        item = AssignmentListItem(
            id=uuid.uuid4(),
            name="Listening Quiz",
            instructions=None,
            due_date=None,
            time_limit_minutes=None,
            created_at=datetime.now(UTC),
            book_id=1,
            book_title="English Book",
            activity_id=uuid.uuid4(),
            activity_title="Listen and Answer",
            activity_type="vocabulary_quiz",
            total_students=10,
            not_started=5,
            in_progress=3,
            completed=2,
            skill_name="Listening",
            skill_slug="listening",
            skill_color="blue",
            skill_icon="ear",
            format_name="Quiz (MCQ)",
            is_mix_mode=False,
        )

        assert item.skill_name == "Listening"
        assert item.skill_slug == "listening"
        assert item.skill_color == "blue"
        assert item.skill_icon == "ear"
        assert item.format_name == "Quiz (MCQ)"
        assert item.is_mix_mode is False

    def test_list_item_null_skill_data(self) -> None:
        """Test AssignmentListItem works with null skill data (old assignments)."""
        item = AssignmentListItem(
            id=uuid.uuid4(),
            name="Legacy Assignment",
            instructions=None,
            due_date=None,
            time_limit_minutes=None,
            created_at=datetime.now(UTC),
            book_id=1,
            book_title="Old Book",
            activity_id=uuid.uuid4(),
            activity_title="Old Activity",
            activity_type="quiz",
            total_students=5,
            not_started=5,
            in_progress=0,
            completed=0,
        )

        assert item.skill_name is None
        assert item.skill_slug is None
        assert item.skill_color is None
        assert item.skill_icon is None
        assert item.format_name is None
        assert item.is_mix_mode is False


# ---------------------------------------------------------------------------
# Schema Tests — MixModeContent validation
# ---------------------------------------------------------------------------


class TestMixModeContentSchema:
    """Test MixModeContent Pydantic schema validation."""

    def test_valid_mix_mode_content(self) -> None:
        """Test valid MixModeContent parses correctly."""
        content = MixModeContent(
            questions=[
                MixModeQuestion(
                    question_id="q1",
                    skill_id=uuid.uuid4(),
                    skill_slug="listening",
                    format_slug="multiple_choice",
                    question_data={"prompt": "What did you hear?", "options": ["A", "B"]},
                ),
                MixModeQuestion(
                    question_id="q2",
                    skill_id=uuid.uuid4(),
                    skill_slug="grammar",
                    format_slug="fill_blank",
                    question_data={"sentence": "He ___ to school.", "answer": "goes"},
                ),
            ],
            skill_distribution={"listening": 1, "grammar": 1},
        )

        assert len(content.questions) == 2
        assert content.skill_distribution["listening"] == 1
        assert content.skill_distribution["grammar"] == 1

    def test_mix_mode_empty_questions(self) -> None:
        """Test MixModeContent with empty questions list is valid (schema level)."""
        content = MixModeContent(
            questions=[],
            skill_distribution={},
        )
        assert len(content.questions) == 0

    def test_mix_mode_question_requires_fields(self) -> None:
        """Test MixModeQuestion requires all mandatory fields."""
        with pytest.raises(ValidationError):
            MixModeQuestion(
                question_id="q1",
                # missing skill_id, skill_slug, format_slug, question_data
            )

    def test_mix_mode_content_serialization_round_trip(self) -> None:
        """Test MixModeContent can be serialized to dict and back."""
        skill_id = uuid.uuid4()
        original = MixModeContent(
            questions=[
                MixModeQuestion(
                    question_id="q1",
                    skill_id=skill_id,
                    skill_slug="vocabulary",
                    format_slug="word_builder",
                    question_data={"word": "hello", "translation": "merhaba"},
                ),
            ],
            skill_distribution={"vocabulary": 1},
        )

        # Serialize to dict (as it would be stored in activity_content JSON)
        data = original.model_dump(mode="json")
        # Deserialize back
        restored = MixModeContent(**data)

        assert len(restored.questions) == 1
        assert restored.questions[0].skill_slug == "vocabulary"
        assert str(restored.questions[0].skill_id) == str(skill_id)
