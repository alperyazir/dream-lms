"""
Skill Score Attribution Service.

Epic 30 - Story 30.12: Skill Score Attribution Engine.

Automatically attributes assignment scores to individual language skills
when students complete AI-generated assignments.
"""

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Assignment,
    AssignmentStudent,
    AssignmentStatus,
    SkillCategory,
    StudentSkillScore,
)

logger = logging.getLogger(__name__)


async def attribute_skill_scores(
    assignment_student_id: uuid.UUID,
    session: AsyncSession,
) -> list[StudentSkillScore]:
    """
    Attribute skill scores for a completed assignment submission.

    Args:
        assignment_student_id: The AssignmentStudent record ID
        session: Database session

    Returns:
        List of created StudentSkillScore records

    Raises:
        Nothing - errors are logged but do not propagate.
    """
    try:
        # Load AssignmentStudent with Assignment relationship
        result = await session.execute(
            select(AssignmentStudent)
            .options(selectinload(AssignmentStudent.assignment))
            .where(AssignmentStudent.id == assignment_student_id)
        )
        assignment_student = result.scalar_one_or_none()

        if not assignment_student:
            logger.warning(
                f"Skill attribution: AssignmentStudent {assignment_student_id} not found"
            )
            return []

        assignment = assignment_student.assignment
        if not assignment:
            logger.warning(
                f"Skill attribution: Assignment not found for AssignmentStudent {assignment_student_id}"
            )
            return []

        # AC7: No attribution for book-based (DCS) assignments
        if assignment.primary_skill_id is None:
            logger.debug(
                f"Skill attribution: Skipping assignment {assignment.id} - no primary_skill_id (book-based)"
            )
            return []

        # Only attribute completed submissions
        if assignment_student.status != AssignmentStatus.completed:
            logger.debug(
                f"Skill attribution: Skipping - status is {assignment_student.status.value}"
            )
            return []

        # Delete existing records to allow re-attribution (idempotent)
        await session.execute(
            delete(StudentSkillScore).where(
                StudentSkillScore.assignment_student_id == assignment_student_id
            )
        )

        # Determine CEFR level from assignment difficulty or activity content
        cefr_level = _extract_cefr_level(assignment)

        if assignment.is_mix_mode:
            # Mix mode: per-question skill attribution
            records = await _attribute_mix_mode(
                assignment_student=assignment_student,
                assignment=assignment,
                cefr_level=cefr_level,
                session=session,
            )
        else:
            # Single-skill: attribute 100% of score to primary skill
            records = await _attribute_single_skill(
                assignment_student=assignment_student,
                assignment=assignment,
                cefr_level=cefr_level,
                session=session,
            )

        if records:
            for record in records:
                session.add(record)
            await session.flush()
            logger.info(
                f"Skill attribution: Created {len(records)} records for "
                f"AssignmentStudent {assignment_student_id}"
            )

        return records

    except Exception as e:
        logger.error(
            f"Skill attribution error for AssignmentStudent {assignment_student_id}: {e}",
            exc_info=True,
        )
        return []


async def recalculate_for_assignment(
    assignment_id: uuid.UUID,
    session: AsyncSession,
) -> int:
    """
    Recalculate skill scores for all completed submissions of an assignment.

    Args:
        assignment_id: The Assignment ID
        session: Database session

    Returns:
        Number of StudentSkillScore records created
    """
    # Delete existing records for this assignment
    await session.execute(
        delete(StudentSkillScore).where(
            StudentSkillScore.assignment_id == assignment_id
        )
    )

    # Get all completed submissions
    result = await session.execute(
        select(AssignmentStudent)
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.status == AssignmentStatus.completed,
        )
    )
    assignment_students = result.scalars().all()

    total_records = 0
    for asn_student in assignment_students:
        records = await attribute_skill_scores(asn_student.id, session)
        total_records += len(records)

    return total_records


async def _attribute_single_skill(
    assignment_student: AssignmentStudent,
    assignment: Assignment,
    cefr_level: str | None,
    session: AsyncSession,
) -> list[StudentSkillScore]:
    """
    Single-skill attribution: 100% of score to primary skill.
    """
    score = assignment_student.score or 0.0

    record = StudentSkillScore(
        student_id=assignment_student.student_id,
        skill_id=assignment.primary_skill_id,
        assignment_id=assignment.id,
        assignment_student_id=assignment_student.id,
        attributed_score=score,
        attributed_max_score=100.0,
        weight=1.0,
        cefr_level=cefr_level,
        recorded_at=datetime.now(UTC),
    )
    return [record]


async def _attribute_mix_mode(
    assignment_student: AssignmentStudent,
    assignment: Assignment,
    cefr_level: str | None,
    session: AsyncSession,
) -> list[StudentSkillScore]:
    """
    Mix mode attribution: per-question scores attributed to each question's skill.

    Parses response_data to find per-question answers with skill tags,
    then calculates score per skill.
    """
    # Get response data from answers_json or progress_json
    response_data = assignment_student.answers_json or {}
    activity_content = assignment.activity_content or {}

    # Try to extract per-question skill mappings from the activity content
    skill_question_map = _build_skill_question_map(activity_content)

    if not skill_question_map:
        # Fallback: if no per-question skill tags, attribute all to primary skill
        logger.warning(
            f"Mix mode attribution: No per-question skill tags found for "
            f"assignment {assignment.id}, falling back to single-skill"
        )
        return await _attribute_single_skill(
            assignment_student, assignment, cefr_level, session
        )

    # Parse per-question results from response_data
    question_results = _extract_question_results(response_data)

    # Aggregate scores by skill
    skill_scores: dict[uuid.UUID, dict] = {}
    for question_id, result in question_results.items():
        skill_id = skill_question_map.get(question_id)
        if not skill_id:
            continue

        if skill_id not in skill_scores:
            skill_scores[skill_id] = {
                "correct": 0,
                "total": 0,
            }

        skill_scores[skill_id]["total"] += 1
        if result.get("correct", False):
            skill_scores[skill_id]["correct"] += 1

    # Resolve skill slugs to skill IDs if needed
    resolved_scores = await _resolve_skill_ids(skill_scores, session)

    # Create records
    records = []
    for skill_id, scores in resolved_scores.items():
        total = scores["total"]
        correct = scores["correct"]
        attributed_score = (correct / total * 100) if total > 0 else 0

        record = StudentSkillScore(
            student_id=assignment_student.student_id,
            skill_id=skill_id,
            assignment_id=assignment.id,
            assignment_student_id=assignment_student.id,
            attributed_score=attributed_score,
            attributed_max_score=100.0,
            weight=1.0,
            cefr_level=cefr_level,
            recorded_at=datetime.now(UTC),
        )
        records.append(record)

    return records


def _extract_cefr_level(assignment: Assignment) -> str | None:
    """Extract CEFR level from assignment's activity content or difficulty setting."""
    content = assignment.activity_content or {}

    # Check nested content for difficulty/cefr_level
    if isinstance(content, dict):
        # Direct difficulty field
        difficulty = content.get("difficulty")
        if difficulty and difficulty != "auto":
            return difficulty

        # Check inside content.content (V2 response nesting)
        inner = content.get("content", {})
        if isinstance(inner, dict):
            difficulty = inner.get("difficulty")
            if difficulty and difficulty != "auto":
                return difficulty

    return None


def _build_skill_question_map(
    activity_content: dict,
) -> dict[str, str | uuid.UUID]:
    """
    Build a mapping of question_id -> skill_id/skill_slug from activity content.

    Mix mode activities tag each question with its originating skill.
    """
    question_map = {}

    # Check for questions array with skill tags
    content = activity_content
    if isinstance(content, dict) and "content" in content:
        content = content["content"]

    if not isinstance(content, dict):
        return question_map

    # Look for questions/items arrays
    for key in ("questions", "items"):
        items = content.get(key, [])
        if not isinstance(items, list):
            continue

        for item in items:
            if not isinstance(item, dict):
                continue

            item_id = item.get("question_id") or item.get("item_id")
            skill = item.get("skill_slug") or item.get("skill_id")

            if item_id and skill:
                question_map[str(item_id)] = skill

    return question_map


def _extract_question_results(response_data: dict) -> dict[str, dict]:
    """
    Extract per-question results from the student's response_data.

    Handles multiple response_data formats:
    1. Direct answers: {"answers": {"q1": "B", "q2": "goes"}}
    2. Rich answers: {"answers": {"q1": {"answer": "B", "correct": true}}}
    3. Multi-activity: {"0": {"answers": {...}, "score": 85}}
    """
    results = {}

    if not isinstance(response_data, dict):
        return results

    # Case 3: Multi-activity format
    answers = response_data
    if "answers" in response_data:
        answers = response_data["answers"]
    elif any(key.isdigit() for key in response_data):
        # Multi-activity: extract from first activity
        for key in sorted(response_data.keys()):
            if key.isdigit() and isinstance(response_data[key], dict):
                inner = response_data[key]
                answers = inner.get("answers", {})
                break

    if not isinstance(answers, dict):
        return results

    for question_id, answer_data in answers.items():
        if isinstance(answer_data, dict):
            # Rich format with "correct" field
            results[question_id] = answer_data
        else:
            # Simple format - we don't know correctness, skip
            results[question_id] = {"answer": answer_data}

    return results


async def _resolve_skill_ids(
    skill_scores: dict[str | uuid.UUID, dict],
    session: AsyncSession,
) -> dict[uuid.UUID, dict]:
    """
    Resolve skill slugs to UUID skill IDs if needed.
    """
    resolved = {}

    for skill_key, scores in skill_scores.items():
        # Check if already a UUID
        if isinstance(skill_key, uuid.UUID):
            resolved[skill_key] = scores
            continue

        try:
            skill_uuid = uuid.UUID(str(skill_key))
            resolved[skill_uuid] = scores
            continue
        except ValueError:
            pass

        # It's a slug - resolve from database
        result = await session.execute(
            select(SkillCategory).where(SkillCategory.slug == str(skill_key))
        )
        skill = result.scalar_one_or_none()
        if skill:
            if skill.id in resolved:
                # Merge scores
                resolved[skill.id]["correct"] += scores["correct"]
                resolved[skill.id]["total"] += scores["total"]
            else:
                resolved[skill.id] = scores
        else:
            logger.warning(f"Skill attribution: Unknown skill slug '{skill_key}'")

    return resolved
