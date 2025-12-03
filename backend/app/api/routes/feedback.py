"""Feedback routes for badges and emoji reactions - Story 6.5."""

from fastapi import APIRouter

from app.core.feedback_constants import (
    AVAILABLE_EMOJI_REACTIONS,
    PREDEFINED_BADGES,
)
from app.schemas.feedback import FeedbackOptionsResponse

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("/options", response_model=FeedbackOptionsResponse)
async def get_feedback_options() -> FeedbackOptionsResponse:
    """
    Get available badges and emoji reactions for feedback.

    Returns predefined badges and emoji reactions that teachers can use
    when providing feedback on student assignments.

    This endpoint is public (no authentication required).
    """
    return FeedbackOptionsResponse(
        badges=PREDEFINED_BADGES,
        emoji_reactions=AVAILABLE_EMOJI_REACTIONS,
    )
