"""
Tests for the Short Answer Grader.

Story 27.10: Reading Comprehension Generation
"""

import pytest

from app.services.ai_generation.short_answer_grader import (
    DEFAULT_SIMILARITY_THRESHOLD,
    ShortAnswerGrader,
    calculate_similarity,
    grade_short_answer,
    grade_short_answer_with_alternatives,
    normalize_text,
)


class TestNormalizeText:
    """Tests for text normalization."""

    def test_lowercase(self):
        """Should convert to lowercase."""
        assert normalize_text("Hello World") == "hello world"

    def test_remove_punctuation(self):
        """Should remove punctuation."""
        assert normalize_text("Hello, World!") == "hello world"

    def test_normalize_whitespace(self):
        """Should normalize multiple spaces."""
        assert normalize_text("hello   world") == "hello world"

    def test_strip_whitespace(self):
        """Should strip leading/trailing whitespace."""
        assert normalize_text("  hello  ") == "hello"

    def test_combined_normalization(self):
        """Should handle combined normalization cases."""
        assert normalize_text("  Hello,  WORLD!  ") == "hello world"


class TestCalculateSimilarity:
    """Tests for similarity calculation."""

    def test_identical_strings(self):
        """Identical strings should have similarity 1.0."""
        assert calculate_similarity("hello", "hello") == 1.0

    def test_completely_different(self):
        """Completely different strings should have low similarity."""
        similarity = calculate_similarity("abc", "xyz")
        assert similarity < 0.5

    def test_similar_strings(self):
        """Similar strings should have high similarity."""
        similarity = calculate_similarity("hello", "hallo")
        assert 0.7 < similarity < 1.0

    def test_substring(self):
        """Substring should have partial similarity."""
        similarity = calculate_similarity("hello", "hello world")
        assert 0.4 < similarity < 0.9


class TestGradeShortAnswer:
    """Tests for grade_short_answer function."""

    def test_exact_match(self):
        """Exact match should return True with score 1.0."""
        is_correct, score = grade_short_answer("Paris", "Paris")
        assert is_correct is True
        assert score == 1.0

    def test_case_insensitive(self):
        """Should be case insensitive."""
        is_correct, score = grade_short_answer("PARIS", "paris")
        assert is_correct is True
        assert score == 1.0

    def test_punctuation_ignored(self):
        """Should ignore punctuation."""
        is_correct, score = grade_short_answer("Paris!", "Paris")
        assert is_correct is True
        assert score == 1.0

    def test_whitespace_normalized(self):
        """Should normalize whitespace."""
        is_correct, score = grade_short_answer("  Paris  ", "Paris")
        assert is_correct is True
        assert score == 1.0

    def test_similar_answer_accepted(self):
        """Similar answer above threshold should be accepted."""
        is_correct, score = grade_short_answer("Parris", "Paris", threshold=0.7)
        assert is_correct is True
        assert score >= 0.7

    def test_different_answer_rejected(self):
        """Different answer should be rejected."""
        is_correct, score = grade_short_answer("London", "Paris")
        assert is_correct is False
        assert score < DEFAULT_SIMILARITY_THRESHOLD

    def test_empty_answer(self):
        """Empty answer should be rejected."""
        is_correct, score = grade_short_answer("", "Paris")
        assert is_correct is False
        assert score == 0.0

    def test_custom_threshold_low(self):
        """Lower threshold should accept more answers."""
        is_correct, _ = grade_short_answer("Pars", "Paris", threshold=0.5)
        assert is_correct is True

    def test_custom_threshold_high(self):
        """Higher threshold should reject more answers."""
        is_correct, _ = grade_short_answer("Parris", "Paris", threshold=0.95)
        assert is_correct is False


class TestGradeShortAnswerWithAlternatives:
    """Tests for grading with multiple acceptable answers."""

    def test_first_alternative_match(self):
        """Should match first alternative."""
        is_correct, score, matched = grade_short_answer_with_alternatives(
            "one", ["one", "1", "single"]
        )
        assert is_correct is True
        assert score == 1.0
        assert matched == "one"

    def test_second_alternative_match(self):
        """Should match second alternative."""
        is_correct, score, matched = grade_short_answer_with_alternatives(
            "1", ["one", "1", "single"]
        )
        assert is_correct is True
        assert score == 1.0
        assert matched == "1"

    def test_no_match(self):
        """Should return best match even if no match."""
        is_correct, score, matched = grade_short_answer_with_alternatives(
            "two", ["one", "1", "single"]
        )
        assert is_correct is False
        assert score < DEFAULT_SIMILARITY_THRESHOLD
        # matched will be the one with highest similarity

    def test_empty_alternatives(self):
        """Should handle empty alternatives list."""
        is_correct, score, matched = grade_short_answer_with_alternatives(
            "answer", []
        )
        assert is_correct is False
        assert score == 0.0
        assert matched == ""


class TestShortAnswerGrader:
    """Tests for the ShortAnswerGrader class."""

    def test_default_threshold(self):
        """Should use default threshold."""
        grader = ShortAnswerGrader()
        assert grader.threshold == DEFAULT_SIMILARITY_THRESHOLD

    def test_custom_threshold(self):
        """Should use custom threshold."""
        grader = ShortAnswerGrader(threshold=0.9)
        assert grader.threshold == 0.9

    def test_grade_exact_match(self):
        """Should grade exact match correctly."""
        grader = ShortAnswerGrader()
        is_correct, score = grader.grade("Paris", "Paris")
        assert is_correct is True
        assert score == 1.0

    def test_grade_with_threshold_override(self):
        """Should respect threshold override."""
        grader = ShortAnswerGrader(threshold=0.9)
        # This might fail with 0.9 threshold
        is_correct_default, _ = grader.grade("Parris", "Paris")
        # But should pass with lower override
        is_correct_override, _ = grader.grade("Parris", "Paris", threshold=0.7)
        assert is_correct_override is True

    def test_grade_with_alternatives(self):
        """Should grade with alternatives correctly."""
        grader = ShortAnswerGrader()
        is_correct, score, matched = grader.grade_with_alternatives(
            "The capital", ["Paris", "The capital of France", "The capital"]
        )
        assert is_correct is True
        assert matched == "The capital"
