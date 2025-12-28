"""
Config.json Parser Module for Dream Central Storage Book Configurations.

This module parses nested book configuration structures and extracts activity data.
"""

import logging

from pydantic import BaseModel

from app.models import ActivityType

logger = logging.getLogger(__name__)


class ConfigParseError(Exception):
    """Exception raised when config.json parsing fails."""

    pass


class ActivityData(BaseModel):
    """Parsed activity data from config.json."""

    module_name: str
    page_number: int
    section_index: int
    activity_type: str
    title: str | None
    config_json: dict
    order_index: int


class VideoSectionData(BaseModel):
    """Parsed video section data from config.json.

    Story 10.3: Video Attachment to Assignments
    """

    module_name: str
    page_number: int
    section_index: int
    title: str | None
    video_path: str


def validate_activity_type(activity_type: str) -> bool:
    """
    Validate if activity type is known.

    Args:
        activity_type: Activity type string to validate

    Returns:
        True if valid, False if unknown
    """
    try:
        ActivityType(activity_type)
        return True
    except ValueError:
        return False


def parse_book_config(config_dict: dict) -> list[ActivityData]:
    """
    Parse book config.json and extract activities.

    Activity Detection Rule: A section is an activity if and only if it contains an "activity" field.
    Sections without "activity" field (e.g., audio decorations) are skipped.

    Args:
        config_dict: Parsed config.json dictionary

    Returns:
        List of ActivityData objects with parsed activity information

    Raises:
        ConfigParseError: If config structure is malformed
    """
    activities: list[ActivityData] = []

    try:
        # Get books array from config
        books = config_dict.get("books", [])
        if not books:
            logger.warning("No books found in config.json")
            return activities

        # Process first book (books array typically has one element)
        book = books[0]
        modules = book.get("modules", [])

        for module_idx, module in enumerate(modules):
            module_name = module.get("name", f"Module {module_idx + 1}")
            pages = module.get("pages", [])

            for page in pages:
                page_number = page.get("page_number", 0)
                sections = page.get("sections", [])

                for section_idx, section in enumerate(sections):
                    # CRITICAL: Check if section has "activity" field
                    if "activity" not in section:
                        # Skip sections without activity field (e.g., page decorations)
                        continue

                    activity = section["activity"]

                    # Extract activity type
                    activity_type = activity.get("type")
                    if not activity_type:
                        logger.warning(
                            f"Activity in {module_name}, page {page_number}, section {section_idx} has no type"
                        )
                        continue

                    # Validate activity type (log warning but don't fail)
                    if not validate_activity_type(activity_type):
                        logger.warning(f"Unknown activity type: {activity_type}")

                    # Extract title from headerText or generate default
                    title = activity.get("headerText")
                    if not title:
                        # Generate default title from type
                        title = activity_type.replace("_", " ").replace("The", "the").title()
                        logger.debug(f"Generated title '{title}' for activity type {activity_type}")

                    # Calculate order index: (module_idx * 1000) + (page_num * 10) + section_idx
                    order_index = (module_idx * 1000) + (page_number * 10) + section_idx

                    # Story 10.2: Build config_json with activity data and audio_extra if present
                    config_json = dict(activity)  # Copy activity fields
                    if "audio_extra" in section:
                        config_json["audio_extra"] = section["audio_extra"]

                    # Create ActivityData
                    activity_data = ActivityData(
                        module_name=module_name,
                        page_number=page_number,
                        section_index=section_idx,
                        activity_type=activity_type,
                        title=title,
                        config_json=config_json,  # Store activity with audio_extra
                        order_index=order_index,
                    )

                    activities.append(activity_data)

                    logger.debug(
                        f"Parsed activity: {activity_type} in {module_name}, "
                        f"page {page_number}, section {section_idx}, order_index {order_index}"
                    )

    except KeyError as e:
        raise ConfigParseError(f"Missing required field in config.json: {e}") from e
    except Exception as e:
        raise ConfigParseError(f"Failed to parse config.json: {e}") from e

    logger.info(f"Parsed {len(activities)} activities from config.json")
    return activities


def parse_video_sections(config_dict: dict) -> list[VideoSectionData]:
    """
    Parse book config.json and extract video sections.

    Story 10.3: Video Attachment to Assignments

    Video sections are identified by having type="video" and a video_path field.
    These are different from activity sections - they don't have an "activity" field.

    Args:
        config_dict: Parsed config.json dictionary

    Returns:
        List of VideoSectionData objects with parsed video information
    """
    videos: list[VideoSectionData] = []

    try:
        # Get books array from config
        books = config_dict.get("books", [])
        if not books:
            logger.warning("No books found in config.json")
            return videos

        # Process first book (books array typically has one element)
        book = books[0]
        modules = book.get("modules", [])

        for module_idx, module in enumerate(modules):
            module_name = module.get("name", f"Module {module_idx + 1}")
            pages = module.get("pages", [])

            for page in pages:
                page_number = page.get("page_number", 0)
                sections = page.get("sections", [])

                for section_idx, section in enumerate(sections):
                    # Check if this is a video section
                    section_type = section.get("type")
                    video_path = section.get("video_path")

                    if section_type == "video" and video_path:
                        # Extract title
                        title = section.get("title")

                        video_data = VideoSectionData(
                            module_name=module_name,
                            page_number=page_number,
                            section_index=section_idx,
                            title=title,
                            video_path=video_path,
                        )

                        videos.append(video_data)

                        logger.debug(
                            f"Parsed video section: {title or 'Untitled'} in {module_name}, "
                            f"page {page_number}, path={video_path}"
                        )

    except KeyError as e:
        logger.error(f"Missing required field in config.json while parsing videos: {e}")
    except Exception as e:
        logger.error(f"Failed to parse video sections from config.json: {e}")

    logger.info(f"Parsed {len(videos)} video sections from config.json")
    return videos
