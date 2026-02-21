"""Skill-Format Generation Dispatcher (Epic 30 - Story 30.3).

Maps (skill_slug, format_slug) combinations to existing generator services.
Validates combinations against the SkillFormatCombination table.
"""

import logging
from dataclasses import dataclass
from typing import Literal

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import ActivityFormat, SkillCategory, SkillFormatCombination

logger = logging.getLogger(__name__)


# Generator identifiers — the V2 endpoint uses these to route to the right service
GeneratorKey = Literal[
    "vocabulary_quiz",
    "word_builder",
    "ai_quiz",           # generic MCQ (CLIL)
    "grammar_quiz",      # grammar-focused MCQ fork
    "sentence_builder",
    "reading_comprehension",
    "listening_quiz",         # listening audio + MCQ (Story 30.4)
    "listening_fill_blank",   # listening audio + fill blank (Story 30.5)
    "grammar_fill_blank",          # grammar fill-in-the-blank (Story 30.6)
    "writing_sentence_corrector",   # writing sentence corrector (replaces sentence_builder)
    "writing_fill_blank",          # writing fill-in-the-blank (Story 30.7)
    "writing_free_response",       # writing free response (open-ended)
    "listening_sentence_builder",  # listening audio + sentence ordering
    "listening_word_builder",      # listening audio + letter ordering
    "vocabulary_matching",         # vocabulary word-definition matching
    "speaking_open_response",      # speaking open response (open-ended)
]


@dataclass
class DispatchResult:
    """Result of dispatching a (skill, format) combination."""

    generator_key: GeneratorKey | None  # None = not yet implemented
    skill_id: str  # UUID as string
    skill_name: str
    format_id: str  # UUID as string
    format_name: str
    activity_type: str  # The activity_type string stored in content library


# Mapping of (skill_slug, format_slug) → (generator_key, activity_type)
# None generator_key means the combination is valid but the generator
# is not yet implemented (returns 501).
GENERATOR_MAP: dict[tuple[str, str], tuple[GeneratorKey | None, str]] = {
    # Vocabulary skill
    ("vocabulary", "multiple_choice"): ("vocabulary_quiz", "vocabulary_quiz"),
    ("vocabulary", "word_builder"): ("word_builder", "word_builder"),
    ("vocabulary", "matching"): ("vocabulary_matching", "vocabulary_matching"),

    # Grammar skill
    ("grammar", "multiple_choice"): ("grammar_quiz", "ai_quiz"),
    ("grammar", "sentence_builder"): ("sentence_builder", "sentence_builder"),
    ("grammar", "fill_blank"): ("grammar_fill_blank", "grammar_fill_blank"),  # Story 30.6

    # Reading skill
    ("reading", "comprehension"): ("reading_comprehension", "reading_comprehension"),

    # Listening skill
    ("listening", "multiple_choice"): ("listening_quiz", "listening_quiz"),  # Story 30.4
    ("listening", "fill_blank"): ("listening_fill_blank", "listening_fill_blank"),  # Story 30.5
    ("listening", "sentence_builder"): ("listening_sentence_builder", "listening_sentence_builder"),
    ("listening", "word_builder"): ("listening_word_builder", "listening_word_builder"),

    # Writing skill
    ("writing", "sentence_corrector"): ("writing_sentence_corrector", "writing_sentence_corrector"),
    ("writing", "fill_blank"): ("writing_fill_blank", "writing_fill_blank"),  # Story 30.7
    ("writing", "free_response"): ("writing_free_response", "writing_free_response"),

    # Speaking skill
    ("speaking", "open_response"): ("speaking_open_response", "speaking_open_response"),
}


def dispatch(
    skill_slug: str,
    format_slug: str,
    session: Session,
) -> DispatchResult:
    """Validate and dispatch a (skill_slug, format_slug) combination.

    Args:
        skill_slug: The skill category slug.
        format_slug: The activity format slug.
        session: Sync DB session for lookups.

    Returns:
        DispatchResult with generator_key and metadata.

    Raises:
        HTTPException 422: Invalid or unsupported combination.
        HTTPException 501: Valid combination but generator not yet implemented.
    """
    # 1. Look up skill and format in database
    skill = session.exec(
        select(SkillCategory).where(
            SkillCategory.slug == skill_slug,
            SkillCategory.is_active == True,  # noqa: E712
        )
    ).first()

    if not skill:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown or inactive skill: '{skill_slug}'",
        )

    fmt = session.exec(
        select(ActivityFormat).where(ActivityFormat.slug == format_slug)
    ).first()

    if not fmt:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown activity format: '{format_slug}'",
        )

    # 2. Verify the combination is valid
    combo = session.exec(
        select(SkillFormatCombination).where(
            SkillFormatCombination.skill_id == skill.id,
            SkillFormatCombination.format_id == fmt.id,
            SkillFormatCombination.is_available == True,  # noqa: E712
        )
    ).first()

    if not combo:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid skill-format combination: ({skill_slug}, {format_slug})",
        )

    # 3. Look up in the static generator map
    key = (skill_slug, format_slug)
    map_entry = GENERATOR_MAP.get(key)

    if map_entry is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported skill-format combination: ({skill_slug}, {format_slug})",
        )

    generator_key, activity_type = map_entry

    result = DispatchResult(
        generator_key=generator_key,
        skill_id=str(skill.id),
        skill_name=skill.name,
        format_id=str(fmt.id),
        format_name=fmt.name,
        activity_type=activity_type,
    )

    if generator_key is None:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Generator for ({skill_slug}, {format_slug}) is not yet implemented. Coming soon!",
        )

    logger.info(
        f"Dispatched ({skill_slug}, {format_slug}) → {generator_key}"
    )

    return result
