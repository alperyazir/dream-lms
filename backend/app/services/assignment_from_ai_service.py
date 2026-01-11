"""
Assignment Creation from AI Content Service
Story 27.20: Unified Activity Player Integration - Task 3

This service handles creating assignments from AI-generated activity content.
"""

from uuid import UUID
from sqlmodel import Session, select
from app.models import Assignment, AssignmentBase, ActivityType, Class, User
from app.schemas.assignment import AssignmentCreate
from typing import Dict, Any, List
from datetime import datetime


class AssignmentFromAIError(Exception):
    """Base exception for assignment creation from AI content"""
    pass


class InvalidActivityTypeError(AssignmentFromAIError):
    """Raised when an invalid activity type is provided"""
    pass


class ClassNotFoundError(AssignmentFromAIError):
    """Raised when the specified class doesn't exist"""
    pass


def create_assignment_from_ai_content(
    session: Session,
    *,
    name: str,
    instructions: str | None,
    class_id: UUID,
    teacher_id: UUID,
    due_date: datetime | None,
    time_limit_minutes: int | None,
    activity_type: str,
    activity_content: Dict[str, Any],
    generation_source: str,  # "book" | "material" | "manual"
    source_id: str | None = None,  # book_id or material_id
) -> Assignment:
    """
    Create an assignment from AI-generated activity content.

    Args:
        session: Database session
        name: Assignment name
        instructions: Optional assignment instructions
        class_id: Class to assign to
        teacher_id: Teacher creating the assignment
        due_date: Optional due date
        time_limit_minutes: Optional time limit in minutes
        activity_type: Type of AI activity (vocabulary_quiz, ai_quiz, etc.)
        activity_content: AI-generated activity data (quiz questions, etc.)
        generation_source: Source of generation ("book", "material", "manual")
        source_id: Optional ID of the source book or material

    Returns:
        The created Assignment object

    Raises:
        InvalidActivityTypeError: If activity_type is not a valid AI activity type
        ClassNotFoundError: If the specified class doesn't exist
    """

    # Validate activity type is an AI-generated type
    valid_ai_types = [
        ActivityType.vocabulary_quiz,
        ActivityType.ai_quiz,
        ActivityType.reading_comprehension,
        ActivityType.sentence_builder,
        ActivityType.word_builder,
    ]

    try:
        activity_type_enum = ActivityType(activity_type)
    except ValueError:
        raise InvalidActivityTypeError(
            f"Invalid activity type: {activity_type}. Must be one of: "
            f"{', '.join([t.value for t in valid_ai_types])}"
        )

    if activity_type_enum not in valid_ai_types:
        raise InvalidActivityTypeError(
            f"Activity type {activity_type} is not an AI-generated type. "
            f"Valid AI types: {', '.join([t.value for t in valid_ai_types])}"
        )

    # Verify class exists
    class_obj = session.get(Class, class_id)
    if not class_obj:
        raise ClassNotFoundError(f"Class with ID {class_id} not found")

    # Verify teacher exists and owns the class
    teacher = session.get(User, teacher_id)
    if not teacher:
        raise AssignmentFromAIError(f"Teacher with ID {teacher_id} not found")

    # Validate generation source
    if generation_source not in ["book", "material", "manual"]:
        raise AssignmentFromAIError(
            f"Invalid generation_source: {generation_source}. "
            "Must be 'book', 'material', or 'manual'"
        )

    # Create the assignment
    assignment = Assignment(
        name=name,
        instructions=instructions,
        class_id=class_id,
        teacher_id=teacher_id,
        due_date=due_date,
        time_limit_minutes=time_limit_minutes,
        activity_type=activity_type_enum,
        activity_content=activity_content,
        generation_source=generation_source,
        source_id=source_id,
    )

    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    return assignment


def create_assignments_from_ai_batch(
    session: Session,
    *,
    assignments_data: List[Dict[str, Any]],
) -> List[Assignment]:
    """
    Create multiple assignments from AI-generated content in a batch.

    This is useful when a teacher generates multiple activities at once
    and wants to assign them all to different classes or with different settings.

    Args:
        session: Database session
        assignments_data: List of assignment creation dictionaries,
                         each with the same keys as create_assignment_from_ai_content

    Returns:
        List of created Assignment objects

    Raises:
        AssignmentFromAIError: If any assignment creation fails
    """
    created_assignments = []

    try:
        for assignment_data in assignments_data:
            assignment = create_assignment_from_ai_content(
                session,
                **assignment_data
            )
            created_assignments.append(assignment)

        return created_assignments

    except Exception as e:
        # Rollback on any error
        session.rollback()
        raise AssignmentFromAIError(
            f"Failed to create batch assignments: {str(e)}"
        ) from e
