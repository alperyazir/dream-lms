"""Feedback constants for badges and emoji reactions - Story 6.5."""

from typing import TypedDict


class BadgeInfo(TypedDict):
    """Type definition for badge information."""

    slug: str
    label: str
    icon: str


class EmojiInfo(TypedDict):
    """Type definition for emoji reaction information."""

    slug: str
    emoji: str


# Predefined badges (AC: 2)
PREDEFINED_BADGES: list[BadgeInfo] = [
    {"slug": "perfect_score", "label": "Perfect Score", "icon": "💯"},
    {"slug": "great_improvement", "label": "Great Improvement", "icon": "📈"},
    {"slug": "creative_thinking", "label": "Creative Thinking", "icon": "💡"},
    {"slug": "hard_worker", "label": "Hard Worker", "icon": "💪"},
    {"slug": "fast_learner", "label": "Fast Learner", "icon": "⚡"},
    {"slug": "needs_review", "label": "Needs Review", "icon": "📚"},
]

# Valid badge slugs for validation
VALID_BADGE_SLUGS: set[str] = {badge["slug"] for badge in PREDEFINED_BADGES}

# Badge labels lookup for notification messages
BADGE_LABELS: dict[str, str] = {badge["slug"]: badge["label"] for badge in PREDEFINED_BADGES}

# Available emoji reactions (AC: 5)
AVAILABLE_EMOJI_REACTIONS: list[EmojiInfo] = [
    {"slug": "thumbs_up", "emoji": "👍"},
    {"slug": "heart", "emoji": "❤️"},
    {"slug": "star", "emoji": "⭐"},
    {"slug": "party", "emoji": "🎉"},
    {"slug": "fire", "emoji": "🔥"},
    {"slug": "hundred", "emoji": "💯"},
]

# Valid emoji slugs for validation
VALID_EMOJI_SLUGS: set[str] = {emoji["slug"] for emoji in AVAILABLE_EMOJI_REACTIONS}

# Emoji lookup for display
EMOJI_DISPLAY: dict[str, str] = {emoji["slug"]: emoji["emoji"] for emoji in AVAILABLE_EMOJI_REACTIONS}

# Maximum number of badges allowed per feedback
MAX_BADGES_PER_FEEDBACK = 6
