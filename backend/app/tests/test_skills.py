"""Tests for Skill Category & Activity Format (Story 30.1)."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import (
    ActivityFormat,
    SkillCategory,
    SkillFormatCombination,
    User,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(name="seed_skills")
def seed_skills_fixture(session: Session) -> dict:
    """Seed skill categories, formats, and combinations for testing."""
    # Skills
    listening = SkillCategory(
        name="Listening", slug="listening", icon="ear", color="blue",
        display_order=1, is_active=True,
    )
    reading = SkillCategory(
        name="Reading", slug="reading", icon="book-open", color="green",
        display_order=2, is_active=True,
    )
    speaking = SkillCategory(
        name="Speaking", slug="speaking", icon="mic", color="purple",
        display_order=4, is_active=False,
    )
    session.add_all([listening, reading, speaking])
    session.flush()

    # Formats
    mcq = ActivityFormat(name="Quiz (MCQ)", slug="multiple_choice")
    fill = ActivityFormat(name="Fill-in-the-blank", slug="fill_blank")
    session.add_all([mcq, fill])
    session.flush()

    # Combinations
    c1 = SkillFormatCombination(
        skill_id=listening.id, format_id=mcq.id,
        display_order=1, generation_prompt_key="listening_quiz",
    )
    c2 = SkillFormatCombination(
        skill_id=listening.id, format_id=fill.id,
        display_order=2, generation_prompt_key="listening_fill_blank",
    )
    c3 = SkillFormatCombination(
        skill_id=reading.id, format_id=mcq.id,
        display_order=1, generation_prompt_key="reading_quiz",
    )
    # Inactive combo for Speaking (should not appear)
    c4 = SkillFormatCombination(
        skill_id=speaking.id, format_id=mcq.id,
        display_order=1, is_available=True, generation_prompt_key="speaking_quiz",
    )
    session.add_all([c1, c2, c3, c4])
    session.commit()

    return {
        "listening": listening,
        "reading": reading,
        "speaking": speaking,
        "mcq": mcq,
        "fill": fill,
    }


# ---------------------------------------------------------------------------
# Model Tests
# ---------------------------------------------------------------------------


class TestSkillCategoryModel:
    """Test SkillCategory model creation and constraints."""

    def test_create_skill_category(self, session: Session) -> None:
        """Test basic SkillCategory creation."""
        skill = SkillCategory(
            name="Vocabulary", slug="vocabulary", icon="text",
            color="teal", display_order=5,
        )
        session.add(skill)
        session.commit()
        session.refresh(skill)

        assert skill.id is not None
        assert skill.name == "Vocabulary"
        assert skill.slug == "vocabulary"
        assert skill.is_active is True
        assert skill.parent_id is None

    def test_unique_slug_constraint(self, session: Session) -> None:
        """Test that duplicate slugs raise an error."""
        s1 = SkillCategory(name="Skill A", slug="same_slug", icon="x", color="red", display_order=0)
        session.add(s1)
        session.commit()

        s2 = SkillCategory(name="Skill B", slug="same_slug", icon="y", color="blue", display_order=1)
        session.add(s2)
        with pytest.raises(Exception):  # IntegrityError
            session.commit()
        session.rollback()

    def test_unique_name_constraint(self, session: Session) -> None:
        """Test that duplicate names raise an error."""
        s1 = SkillCategory(name="Same Name", slug="slug_a", icon="x", color="red", display_order=0)
        session.add(s1)
        session.commit()

        s2 = SkillCategory(name="Same Name", slug="slug_b", icon="y", color="blue", display_order=1)
        session.add(s2)
        with pytest.raises(Exception):
            session.commit()
        session.rollback()


class TestActivityFormatModel:
    """Test ActivityFormat model creation and constraints."""

    def test_create_activity_format(self, session: Session) -> None:
        """Test basic ActivityFormat creation."""
        fmt = ActivityFormat(
            name="Matching", slug="matching", description="Match items",
        )
        session.add(fmt)
        session.commit()
        session.refresh(fmt)

        assert fmt.id is not None
        assert fmt.slug == "matching"

    def test_unique_slug_constraint(self, session: Session) -> None:
        """Test that duplicate format slugs raise an error."""
        f1 = ActivityFormat(name="Format A", slug="dup_fmt")
        session.add(f1)
        session.commit()

        f2 = ActivityFormat(name="Format B", slug="dup_fmt")
        session.add(f2)
        with pytest.raises(Exception):
            session.commit()
        session.rollback()


class TestSkillFormatCombinationModel:
    """Test SkillFormatCombination model constraints."""

    def test_unique_skill_format_pair(self, session: Session, seed_skills: dict) -> None:
        """Test that duplicate (skill_id, format_id) pairs raise an error."""
        dup = SkillFormatCombination(
            skill_id=seed_skills["listening"].id,
            format_id=seed_skills["mcq"].id,
            display_order=99,
        )
        session.add(dup)
        with pytest.raises(Exception):
            session.commit()
        session.rollback()


# ---------------------------------------------------------------------------
# API Tests
# ---------------------------------------------------------------------------


class TestSkillsAPI:
    """Test GET /api/v1/skills/ endpoint."""

    def test_get_skills_returns_active_only(
        self, client: TestClient, teacher_token: str, seed_skills: dict
    ) -> None:
        """Test that only active skills are returned."""
        response = client.get(
            f"{settings.API_V1_STR}/skills/",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert response.status_code == 200

        data = response.json()
        slugs = [item["skill"]["slug"] for item in data]

        assert "listening" in slugs
        assert "reading" in slugs
        assert "speaking" not in slugs  # is_active=False

    def test_get_skills_includes_formats(
        self, client: TestClient, teacher_token: str, seed_skills: dict
    ) -> None:
        """Test that each skill includes its available formats."""
        response = client.get(
            f"{settings.API_V1_STR}/skills/",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert response.status_code == 200

        data = response.json()
        listening_item = next(i for i in data if i["skill"]["slug"] == "listening")
        format_slugs = [f["slug"] for f in listening_item["formats"]]

        assert "multiple_choice" in format_slugs
        assert "fill_blank" in format_slugs
        assert len(format_slugs) == 2

    def test_get_skills_ordered_by_display_order(
        self, client: TestClient, teacher_token: str, seed_skills: dict
    ) -> None:
        """Test that skills are returned in display_order."""
        response = client.get(
            f"{settings.API_V1_STR}/skills/",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        data = response.json()
        orders = [item["skill"]["slug"] for item in data]
        assert orders == ["listening", "reading"]

    def test_get_skills_unauthorized_no_token(
        self, client: TestClient, seed_skills: dict
    ) -> None:
        """Test that unauthenticated requests are rejected."""
        response = client.get(f"{settings.API_V1_STR}/skills/")
        assert response.status_code in (401, 403)

    def test_get_skills_forbidden_student_role(
        self, client: TestClient, student_token: str, seed_skills: dict
    ) -> None:
        """Test that students cannot access the skills endpoint."""
        response = client.get(
            f"{settings.API_V1_STR}/skills/",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert response.status_code == 403

    def test_get_skills_admin_access(
        self, client: TestClient, admin_token: str, seed_skills: dict
    ) -> None:
        """Test that admins can access the skills endpoint."""
        response = client.get(
            f"{settings.API_V1_STR}/skills/",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
