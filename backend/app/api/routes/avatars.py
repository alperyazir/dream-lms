"""
Avatar management endpoints for user profile customization.
Uses DiceBear API for illustrated avatar generation.
"""
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, SessionDep
from app.models import AvatarType, UserPublic

router = APIRouter(prefix="/avatars", tags=["avatars"])


# DiceBear avatar styles - using fun, cute styles
# Mix of fun-emoji (cute faces), thumbs (cute characters), and bottts (cute robots)

PREDEFINED_AVATARS = [
    # Fun emoji style - cute expressive faces
    {"id": "avatar-1", "name": "Happy", "url": "https://api.dicebear.com/7.x/fun-emoji/svg?seed=happy&backgroundColor=b6e3f4"},
    {"id": "avatar-2", "name": "Sunny", "url": "https://api.dicebear.com/7.x/fun-emoji/svg?seed=sunny&backgroundColor=fff4b8"},
    {"id": "avatar-3", "name": "Sparkle", "url": "https://api.dicebear.com/7.x/fun-emoji/svg?seed=sparkle&backgroundColor=ffd5dc"},
    {"id": "avatar-4", "name": "Star", "url": "https://api.dicebear.com/7.x/fun-emoji/svg?seed=star&backgroundColor=c0aede"},
    {"id": "avatar-5", "name": "Rainbow", "url": "https://api.dicebear.com/7.x/fun-emoji/svg?seed=rainbow&backgroundColor=d1f4d1"},
    {"id": "avatar-6", "name": "Cloud", "url": "https://api.dicebear.com/7.x/fun-emoji/svg?seed=cloud&backgroundColor=b8d4ff"},

    # Thumbs style - cute thumb characters
    {"id": "avatar-7", "name": "Thumby", "url": "https://api.dicebear.com/7.x/thumbs/svg?seed=thumby&backgroundColor=ffc9de"},
    {"id": "avatar-8", "name": "Buddy", "url": "https://api.dicebear.com/7.x/thumbs/svg?seed=buddy&backgroundColor=d4f0f0"},
    {"id": "avatar-9", "name": "Cheerful", "url": "https://api.dicebear.com/7.x/thumbs/svg?seed=cheerful&backgroundColor=ffe4c4"},
    {"id": "avatar-10", "name": "Jolly", "url": "https://api.dicebear.com/7.x/thumbs/svg?seed=jolly&backgroundColor=f0d4f0"},

    # Bottts style - cute colorful robots
    {"id": "avatar-11", "name": "Robo", "url": "https://api.dicebear.com/7.x/bottts/svg?seed=robo&backgroundColor=c4d4ff"},
    {"id": "avatar-12", "name": "Beep", "url": "https://api.dicebear.com/7.x/bottts/svg?seed=beep&backgroundColor=d4ffd4"},
    {"id": "avatar-13", "name": "Boop", "url": "https://api.dicebear.com/7.x/bottts/svg?seed=boop&backgroundColor=ffd4d4"},
    {"id": "avatar-14", "name": "Pixel", "url": "https://api.dicebear.com/7.x/bottts/svg?seed=pixel&backgroundColor=e8d5b7"},

    # More fun-emoji with different seeds
    {"id": "avatar-15", "name": "Blossom", "url": "https://api.dicebear.com/7.x/fun-emoji/svg?seed=blossom&backgroundColor=ffdfbf"},
    {"id": "avatar-16", "name": "Dreamy", "url": "https://api.dicebear.com/7.x/fun-emoji/svg?seed=dreamy&backgroundColor=d4e8d4"},
]


class PredefinedAvatar(BaseModel):
    """Predefined avatar response model."""
    id: str
    name: str
    url: str


class PredefinedAvatarsResponse(BaseModel):
    """Response containing all predefined avatars."""
    avatars: list[PredefinedAvatar]


class SelectAvatarRequest(BaseModel):
    """Request to select a predefined avatar or set a custom DiceBear URL."""
    avatar_id: str | None = None
    avatar_url: str | None = None


class AvatarUpdateResponse(BaseModel):
    """Response after updating avatar."""
    message: str
    avatar_url: str | None
    avatar_type: AvatarType | None


@router.get("/predefined", response_model=PredefinedAvatarsResponse)
def get_predefined_avatars() -> Any:
    """
    Get list of all predefined avatar options.
    """
    return PredefinedAvatarsResponse(
        avatars=[PredefinedAvatar(**avatar) for avatar in PREDEFINED_AVATARS]
    )


@router.patch("/me", response_model=UserPublic)
def update_avatar(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    request: SelectAvatarRequest
) -> Any:
    """
    Update the current user's avatar.

    Can either:
    - Select a predefined avatar by avatar_id
    - Set a custom DiceBear URL via avatar_url
    """
    # Validate request - must have either avatar_id or avatar_url
    if not request.avatar_id and not request.avatar_url:
        raise HTTPException(
            status_code=400,
            detail="Must provide either avatar_id or avatar_url"
        )

    # If avatar_url is provided, use it directly (for DiceBear)
    if request.avatar_url:
        # Validate it's a DiceBear URL for security
        if not request.avatar_url.startswith("https://api.dicebear.com/"):
            raise HTTPException(
                status_code=400,
                detail="Custom avatar URLs must be from DiceBear (https://api.dicebear.com/)"
            )
        current_user.avatar_url = request.avatar_url
        current_user.avatar_type = AvatarType.custom
    else:
        # Find the selected predefined avatar
        selected_avatar = next(
            (a for a in PREDEFINED_AVATARS if a["id"] == request.avatar_id),
            None
        )

        if not selected_avatar:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid avatar_id. Choose from: {[a['id'] for a in PREDEFINED_AVATARS]}"
            )

        current_user.avatar_url = selected_avatar["url"]
        current_user.avatar_type = AvatarType.predefined

    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return current_user


@router.delete("/me", response_model=AvatarUpdateResponse)
def remove_avatar(
    *,
    session: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    Remove the current user's avatar (reset to default).
    """
    current_user.avatar_url = None
    current_user.avatar_type = None

    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return AvatarUpdateResponse(
        message="Avatar removed successfully",
        avatar_url=None,
        avatar_type=None
    )
