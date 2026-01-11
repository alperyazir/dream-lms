"""
Short Answer Grading Service.

Provides fuzzy matching grading for short answer questions.
Uses text normalization and similarity scoring.

Story 27.10: Reading Comprehension Generation
"""

import logging
import re
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


# Default threshold for accepting a short answer as correct
DEFAULT_SIMILARITY_THRESHOLD = 0.8


def normalize_text(text: str) -> str:
    """
    Normalize text for comparison.

    Converts to lowercase, removes punctuation, and normalizes whitespace.

    Args:
        text: Text to normalize.

    Returns:
        Normalized text string.
    """
    # Convert to lowercase and strip
    text = text.lower().strip()

    # Remove punctuation
    text = re.sub(r"[^\w\s]", "", text)

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)

    return text


def calculate_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity ratio between two strings.

    Uses SequenceMatcher for fuzzy matching.

    Args:
        text1: First text.
        text2: Second text.

    Returns:
        Similarity ratio between 0 and 1.
    """
    return SequenceMatcher(None, text1, text2).ratio()


def grade_short_answer(
    student_answer: str,
    expected_answer: str,
    threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
) -> tuple[bool, float]:
    """
    Grade a short answer using fuzzy matching.

    Normalizes both answers and calculates similarity.
    Accepts answers above the similarity threshold.

    Args:
        student_answer: The student's submitted answer.
        expected_answer: The expected/correct answer.
        threshold: Minimum similarity for acceptance (0-1).

    Returns:
        Tuple of (is_correct, similarity_score).
    """
    if not student_answer:
        return (False, 0.0)

    # Normalize both answers
    student_norm = normalize_text(student_answer)
    expected_norm = normalize_text(expected_answer)

    # Check for exact match first
    if student_norm == expected_norm:
        return (True, 1.0)

    # Calculate similarity
    similarity = calculate_similarity(student_norm, expected_norm)

    # Check threshold
    is_correct = similarity >= threshold

    logger.debug(
        f"Short answer graded: "
        f"student='{student_answer}', expected='{expected_answer}', "
        f"similarity={similarity:.2f}, correct={is_correct}"
    )

    return (is_correct, similarity)


def grade_short_answer_with_alternatives(
    student_answer: str,
    expected_answers: list[str],
    threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
) -> tuple[bool, float, str]:
    """
    Grade a short answer against multiple acceptable answers.

    Checks against each expected answer and returns the best match.

    Args:
        student_answer: The student's submitted answer.
        expected_answers: List of acceptable answers.
        threshold: Minimum similarity for acceptance (0-1).

    Returns:
        Tuple of (is_correct, best_similarity, matched_answer).
    """
    if not student_answer or not expected_answers:
        return (False, 0.0, "")

    best_similarity = 0.0
    best_match = expected_answers[0]

    for expected in expected_answers:
        is_correct, similarity = grade_short_answer(
            student_answer, expected, threshold
        )

        if similarity > best_similarity:
            best_similarity = similarity
            best_match = expected

        # If we found an exact match, stop searching
        if is_correct and similarity >= 0.99:
            return (True, similarity, best_match)

    is_correct = best_similarity >= threshold
    return (is_correct, best_similarity, best_match)


class ShortAnswerGrader:
    """
    Service class for grading short answers.

    Provides methods for grading with configurable thresholds
    and support for alternative answers.

    Example:
        grader = ShortAnswerGrader(threshold=0.8)
        is_correct, score = grader.grade("user input", "expected")
    """

    def __init__(self, threshold: float = DEFAULT_SIMILARITY_THRESHOLD) -> None:
        """
        Initialize the grader.

        Args:
            threshold: Default similarity threshold for acceptance.
        """
        self._threshold = threshold
        logger.info(f"ShortAnswerGrader initialized with threshold={threshold}")

    @property
    def threshold(self) -> float:
        """Get the current threshold."""
        return self._threshold

    def grade(
        self,
        student_answer: str,
        expected_answer: str,
        threshold: float | None = None,
    ) -> tuple[bool, float]:
        """
        Grade a short answer.

        Args:
            student_answer: The student's answer.
            expected_answer: The expected answer.
            threshold: Override threshold (uses default if None).

        Returns:
            Tuple of (is_correct, similarity_score).
        """
        t = threshold if threshold is not None else self._threshold
        return grade_short_answer(student_answer, expected_answer, t)

    def grade_with_alternatives(
        self,
        student_answer: str,
        expected_answers: list[str],
        threshold: float | None = None,
    ) -> tuple[bool, float, str]:
        """
        Grade against multiple acceptable answers.

        Args:
            student_answer: The student's answer.
            expected_answers: List of acceptable answers.
            threshold: Override threshold (uses default if None).

        Returns:
            Tuple of (is_correct, best_similarity, matched_answer).
        """
        t = threshold if threshold is not None else self._threshold
        return grade_short_answer_with_alternatives(student_answer, expected_answers, t)
