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
            formats = [
                ActivityFormatPublic.model_validate(fmt_map[fid])
                for fid in format_ids
                if fid in fmt_map
            ]

        results.append(
            SkillWithFormatsResponse(
                skill=SkillCategoryPublic.model_validate(skill),
                formats=formats,
            )
        )

    return results
