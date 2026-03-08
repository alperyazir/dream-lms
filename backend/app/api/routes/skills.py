"""Skills API endpoints (Epic 30 - Story 30.1)."""

from collections import defaultdict

from fastapi import APIRouter
from sqlmodel import select

from app.api.deps import SessionDep, require_role
from app.models import (
    ActivityFormat,
    SkillCategory,
    SkillFormatCombination,
    User,
    UserRole,
)
from app.schemas.skill import (
    ActivityFormatPublic,
    SkillCategoryPublic,
    SkillWithFormatsResponse,
)
from app.services.redis_cache import cache_get_sync, cache_set_sync
from app.services.skill_generation_dispatcher import GENERATOR_MAP

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get(
    "/",
    response_model=list[SkillWithFormatsResponse],
)
def get_skills(
    session: SessionDep,
    current_user: User = require_role(
        UserRole.teacher, UserRole.admin, UserRole.supervisor
    ),
) -> list[SkillWithFormatsResponse]:
    """Return active skills with their available formats, ordered by display_order."""
    # Skills are static reference data — cache aggressively (1 hour)
    cache_key = "skills:all:with_formats"
    cached = cache_get_sync(cache_key)
    if cached is not None:
        return [SkillWithFormatsResponse(**item) for item in cached]

    # Single query: load all skills, combos, and formats via JOINs (no N+1)
    skills = session.exec(
        select(SkillCategory)
        .where(SkillCategory.is_active == True)  # noqa: E712
        .order_by(SkillCategory.display_order)
    ).all()

    skill_ids = [s.id for s in skills]
    if not skill_ids:
        return []

    # Batch-load all combos for active skills
    all_combos = session.exec(
        select(SkillFormatCombination)
        .where(
            SkillFormatCombination.skill_id.in_(skill_ids),  # type: ignore[attr-defined]
            SkillFormatCombination.is_available == True,  # noqa: E712
        )
        .order_by(SkillFormatCombination.display_order)
    ).all()

    # Batch-load all referenced formats in one query
    all_format_ids = {c.format_id for c in all_combos}
    fmt_map = {}
    if all_format_ids:
        fmt_models = session.exec(
            select(ActivityFormat).where(ActivityFormat.id.in_(all_format_ids))  # type: ignore[attr-defined]
        ).all()
        fmt_map = {f.id: f for f in fmt_models}

    # Group combos by skill_id
    combos_by_skill: dict[str, list] = defaultdict(list)
    for combo in all_combos:
        combos_by_skill[combo.skill_id].append(combo)

    # Build response
    results: list[SkillWithFormatsResponse] = []
    for skill in skills:
        formats: list[ActivityFormatPublic] = []
        for combo in combos_by_skill.get(skill.id, []):
            fmt_model = fmt_map.get(combo.format_id)
            if fmt_model is None:
                continue
            fmt_public = ActivityFormatPublic.model_validate(fmt_model)
            map_entry = GENERATOR_MAP.get((skill.slug, fmt_model.slug))
            if map_entry is not None and map_entry[0] is None:
                fmt_public.coming_soon = True
            formats.append(fmt_public)

        results.append(
            SkillWithFormatsResponse(
                skill=SkillCategoryPublic.model_validate(skill),
                formats=formats,
            )
        )

    cache_set_sync(cache_key, [r.model_dump() for r in results], ttl=3600)
    return results
