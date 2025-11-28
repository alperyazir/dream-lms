"""Unit tests for config.json parser."""

import pytest

from app.services.config_parser import (
    ActivityData,
    ConfigParseError,
    parse_book_config,
    validate_activity_type,
)


def test_validate_activity_type_valid():
    """Test validation of known activity types."""
    assert validate_activity_type("matchTheWords") is True
    assert validate_activity_type("dragdroppicture") is True
    assert validate_activity_type("circle") is True


def test_validate_activity_type_invalid():
    """Test validation rejects unknown types."""
    assert validate_activity_type("unknownType") is False


def test_parse_matchTheWords_activity():
    """Test parsing matchTheWords activity type."""
    config = {
        "books": [
            {
                "modules": [
                    {
                        "name": "Module 1",
                        "pages": [
                            {
                                "page_number": 7,
                                "sections": [
                                    {
                                        "type": "fill",
                                        "activity": {
                                            "type": "matchTheWords",
                                            "headerText": "Look, read, and match.",
                                            "match_words": ["cat", "dog"],
                                            "sentences": ["I see a cat"],
                                        },
                                    }
                                ],
                            }
                        ],
                    }
                ]
            }
        ]
    }

    activities = parse_book_config(config)

    assert len(activities) == 1
    assert activities[0].activity_type == "matchTheWords"
    assert activities[0].title == "Look, read, and match."
    assert activities[0].module_name == "Module 1"
    assert activities[0].page_number == 7
    assert activities[0].section_index == 0


def test_parse_circle_activity():
    """Test parsing circle activity type."""
    config = {
        "books": [
            {
                "modules": [
                    {
                        "name": "Intro",
                        "pages": [
                            {
                                "page_number": 1,
                                "sections": [
                                    {
                                        "activity": {
                                            "type": "circle",
                                            "headerText": "Circle the answer",
                                        }
                                    }
                                ],
                            }
                        ],
                    }
                ]
            }
        ]
    }

    activities = parse_book_config(config)

    assert len(activities) == 1
    assert activities[0].activity_type == "circle"
    assert activities[0].title == "Circle the answer"


def test_skip_section_without_activity_field():
    """Test that sections without 'activity' field are skipped."""
    config = {
        "books": [
            {
                "modules": [
                    {
                        "name": "Module 1",
                        "pages": [
                            {
                                "page_number": 1,
                                "sections": [
                                    {"type": "text", "content": "Some text"},  # No activity field
                                    {
                                        "activity": {
                                            "type": "matchTheWords",
                                            "headerText": "Match",
                                        }
                                    },
                                ],
                            }
                        ],
                    }
                ]
            }
        ]
    }

    activities = parse_book_config(config)

    # Only the section with activity field should be parsed
    assert len(activities) == 1
    assert activities[0].activity_type == "matchTheWords"


def test_skip_audio_without_activity():
    """Test that audio sections without activity field are skipped (page decorations)."""
    config = {
        "books": [
            {
                "modules": [
                    {
                        "name": "Module 1",
                        "pages": [
                            {
                                "page_number": 1,
                                "sections": [
                                    {"type": "audio", "src": "audio.mp3"},  # Page decoration
                                ],
                            }
                        ],
                    }
                ]
            }
        ]
    }

    activities = parse_book_config(config)

    # Audio decoration should be skipped
    assert len(activities) == 0


def test_order_index_calculation():
    """Test order_index calculation formula."""
    config = {
        "books": [
            {
                "modules": [
                    {
                        "name": "Module 1",  # module_idx = 0
                        "pages": [
                            {
                                "page_number": 7,
                                "sections": [
                                    {
                                        "activity": {"type": "circle"}  # section_idx = 0
                                    },
                                    {
                                        "activity": {"type": "matchTheWords"}  # section_idx = 1
                                    },
                                ],
                            }
                        ],
                    }
                ]
            }
        ]
    }

    activities = parse_book_config(config)

    # order_index = (module_idx * 1000) + (page_num * 10) + section_idx
    # Module 1 (idx=0), Page 7, Section 0: (0 * 1000) + (7 * 10) + 0 = 70
    # Module 1 (idx=0), Page 7, Section 1: (0 * 1000) + (7 * 10) + 1 = 71
    assert activities[0].order_index == 70
    assert activities[1].order_index == 71


def test_missing_headerText_generates_title():
    """Test that missing headerText generates default title from type."""
    config = {
        "books": [
            {
                "modules": [
                    {
                        "name": "Module 1",
                        "pages": [
                            {
                                "page_number": 1,
                                "sections": [
                                    {"activity": {"type": "matchTheWords"}},  # No headerText
                                ],
                            }
                        ],
                    }
                ]
            }
        ]
    }

    activities = parse_book_config(config)

    assert len(activities) == 1
    # Should generate title from type
    assert activities[0].title is not None
    assert "match" in activities[0].title.lower() or "the" in activities[0].title.lower()


def test_empty_config_returns_empty_list():
    """Test that empty config returns empty activities list."""
    config = {"books": []}

    activities = parse_book_config(config)

    assert len(activities) == 0


def test_malformed_config_raises_error():
    """Test that malformed config raises ConfigParseError."""
    # Missing 'books' key
    config = {}

    # Should not raise error, just return empty list
    activities = parse_book_config(config)
    assert len(activities) == 0
