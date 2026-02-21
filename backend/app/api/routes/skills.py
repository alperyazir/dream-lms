"""Skills API endpoints (Epic 30 - Story 30.1)."""

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
    skills = session.exec(
        select(SkillCategory)
        .where(SkillCategory.is_active == True)  # noqa: E712
        .order_by(SkillCategory.display_order)
    ).all()

    results: list[SkillWithFormatsResponse] = []
    for skill in skills:
        combos = session.exec(
            select(SkillFormatCombination)
            .where(
                SkillFormatCombination.skill_id == skill.id,
                SkillFormatCombination.is_available == True,  # noqa: E712
            )
            .order_by(SkillFormatCombination.display_order)
        ).all()

        format_ids = [c.format_id for c in combos]
        formats: list[ActivityFormatPublic] = []
        if format_ids:
            fmt_models = session.exec(
                select(ActivityFormat).where(ActivityFormat.id.in_(format_ids))  # type: ignore[attr-defined]
            ).all()
            # Preserve combo display_order
            fmt_map = {f.id: f for f in fmt_models}
            for fid in format_ids:
                if fid not in fmt_map:
                    continue
                fmt_model = fmt_map[fid]
                fmt_public = ActivityFormatPublic.model_validate(fmt_model)
                # Check if generator is implemented
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

    return results
