"""
Flexible Answer Matching Utility.

Provides case-insensitive, whitespace-tolerant, and optional
typo-tolerant answer matching for fill-in-the-blank activities.

Epic 30 - Story 30.5
"""


def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def check_answer(
    student_answer: str,
    correct_answer: str,
    acceptable_answers: list[str] | None = None,
    typo_tolerance: bool = True,
    max_distance: int = 1,
) -> tuple[bool, str]:
    """Check if a student's answer matches the correct answer.

    Args:
        student_answer: The student's typed answer.
        correct_answer: The primary correct answer.
        acceptable_answers: Additional accepted variants.
        typo_tolerance: Whether to allow minor typos (Levenshtein <= max_distance).
        max_distance: Maximum Levenshtein distance for typo tolerance.

    Returns:
        Tuple of (is_correct, match_type) where match_type is one of:
        "exact", "variant", "typo", or "wrong".
    """
    student = student_answer.strip().lower()
    correct = correct_answer.strip().lower()

    if not student:
        return False, "wrong"

    # Exact match
    if student == correct:
        return True, "exact"

    # Check acceptable variants
    all_answers = [correct]
    if acceptable_answers:
        all_answers.extend(a.strip().lower() for a in acceptable_answers)

    for variant in all_answers:
        if student == variant:
            return True, "variant"

    # Typo tolerance
    if typo_tolerance:
        for variant in all_answers:
            if len(variant) >= 3 and levenshtein_distance(student, variant) <= max_distance:
                return True, "typo"

    return False, "wrong"
