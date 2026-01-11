"""
Tests for Assignment Creation from AI Content Service
Story 27.20: Unified Activity Player Integration - Task 3
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from sqlmodel import Session

from app.services.assignment_from_ai_service import (
    create_assignment_from_ai_content,
    create_assignments_from_ai_batch,
    InvalidActivityTypeError,
    ClassNotFoundError,
    AssignmentFromAIError,
)
from app.models import Assignment, ActivityType, Class, User, School


@pytest.fixture
def test_school(session: Session) -> School:
    """Create a test school"""
    school = School(
        name="Test School",
        domain="test.edu",
        address="123 Test St",
    )
    session.add(school)
    session.commit()
    session.refresh(school)
    return school


@pytest.fixture
def test_teacher(session: Session, test_school: School) -> User:
    """Create a test teacher"""
    teacher = User(
        username="testteacher",
        email="teacher@test.edu",
        full_name="Test Teacher",
        role="teacher",
        school_id=test_school.id,
        hashed_password="hashed",
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)
    return teacher


@pytest.fixture
def test_class(session: Session, test_teacher: User, test_school: School) -> Class:
    """Create a test class"""
    class_obj = Class(
        name="Test Class",
        teacher_id=test_teacher.id,
        school_id=test_school.id,
        subject="English",
        grade_level="5",
    )
    session.add(class_obj)
    session.commit()
    session.refresh(class_obj)
    return class_obj


def test_create_vocabulary_quiz_assignment(
    session: Session,
    test_class: Class,
    test_teacher: User,
):
    """Test creating a vocabulary quiz assignment from AI content"""
    activity_content = {
        "type": "vocabulary_quiz",
        "questions": [
            {
                "question_id": str(uuid4()),
                "definition": "to succeed in doing something",
                "correct_answer": "accomplish",
                "options": ["accomplish", "determine", "achieve", "complete"],
                "vocabulary_id": "vocab_123",
            }
        ],
    }

    assignment = create_assignment_from_ai_content(
        session,
        name="Vocabulary Quiz - Unit 1",
        instructions="Complete the vocabulary quiz",
        class_id=test_class.id,
        teacher_id=test_teacher.id,
        due_date=datetime.now() + timedelta(days=7),
        time_limit_minutes=30,
        activity_type="vocabulary_quiz",
        activity_content=activity_content,
        generation_source="book",
        source_id="book_123",
    )

    assert assignment.id is not None
    assert assignment.name == "Vocabulary Quiz - Unit 1"
    assert assignment.activity_type == ActivityType.vocabulary_quiz
    assert assignment.activity_content == activity_content
    assert assignment.generation_source == "book"
    assert assignment.source_id == "book_123"
    assert assignment.class_id == test_class.id
    assert assignment.teacher_id == test_teacher.id


def test_create_ai_quiz_assignment(
    session: Session,
    test_class: Class,
    test_teacher: User,
):
    """Test creating an AI quiz assignment"""
    activity_content = {
        "type": "ai_quiz",
        "questions": [
            {
                "question_id": str(uuid4()),
                "question_text": "What is the main theme?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_index": 1,
                "explanation": "The passage discusses...",
            }
        ],
    }

    assignment = create_assignment_from_ai_content(
        session,
        name="Reading Comprehension Quiz",
        instructions=None,
        class_id=test_class.id,
        teacher_id=test_teacher.id,
        due_date=None,
        time_limit_minutes=None,
        activity_type="ai_quiz",
        activity_content=activity_content,
        generation_source="material",
        source_id="material_456",
    )

    assert assignment.activity_type == ActivityType.ai_quiz
    assert assignment.generation_source == "material"
    assert assignment.source_id == "material_456"


def test_invalid_activity_type(
    session: Session,
    test_class: Class,
    test_teacher: User,
):
    """Test that invalid activity type raises error"""
    with pytest.raises(InvalidActivityTypeError, match="Invalid activity type"):
        create_assignment_from_ai_content(
            session,
            name="Test Assignment",
            instructions=None,
            class_id=test_class.id,
            teacher_id=test_teacher.id,
            due_date=None,
            time_limit_minutes=None,
            activity_type="invalid_type",
            activity_content={},
            generation_source="manual",
        )


def test_dcs_activity_type_rejected(
    session: Session,
    test_class: Class,
    test_teacher: User,
):
    """Test that DCS activity types are rejected"""
    with pytest.raises(InvalidActivityTypeError, match="not an AI-generated type"):
        create_assignment_from_ai_content(
            session,
            name="Test Assignment",
            instructions=None,
            class_id=test_class.id,
            teacher_id=test_teacher.id,
            due_date=None,
            time_limit_minutes=None,
            activity_type="multiple_choice",  # DCS type, not AI type
            activity_content={},
            generation_source="manual",
        )


def test_class_not_found(
    session: Session,
    test_teacher: User,
):
    """Test that non-existent class raises error"""
    fake_class_id = uuid4()

    with pytest.raises(ClassNotFoundError, match="Class.*not found"):
        create_assignment_from_ai_content(
            session,
            name="Test Assignment",
            instructions=None,
            class_id=fake_class_id,
            teacher_id=test_teacher.id,
            due_date=None,
            time_limit_minutes=None,
            activity_type="vocabulary_quiz",
            activity_content={},
            generation_source="manual",
        )


def test_invalid_generation_source(
    session: Session,
    test_class: Class,
    test_teacher: User,
):
    """Test that invalid generation source raises error"""
    with pytest.raises(AssignmentFromAIError, match="Invalid generation_source"):
        create_assignment_from_ai_content(
            session,
            name="Test Assignment",
            instructions=None,
            class_id=test_class.id,
            teacher_id=test_teacher.id,
            due_date=None,
            time_limit_minutes=None,
            activity_type="vocabulary_quiz",
            activity_content={},
            generation_source="invalid_source",
        )


def test_batch_assignment_creation(
    session: Session,
    test_class: Class,
    test_teacher: User,
):
    """Test creating multiple assignments in a batch"""
    assignments_data = [
        {
            "name": "Vocabulary Quiz 1",
            "instructions": None,
            "class_id": test_class.id,
            "teacher_id": test_teacher.id,
            "due_date": None,
            "time_limit_minutes": 30,
            "activity_type": "vocabulary_quiz",
            "activity_content": {"questions": []},
            "generation_source": "book",
            "source_id": "book_1",
        },
        {
            "name": "AI Quiz 1",
            "instructions": None,
            "class_id": test_class.id,
            "teacher_id": test_teacher.id,
            "due_date": None,
            "time_limit_minutes": 45,
            "activity_type": "ai_quiz",
            "activity_content": {"questions": []},
            "generation_source": "book",
            "source_id": "book_1",
        },
    ]

    assignments = create_assignments_from_ai_batch(
        session,
        assignments_data=assignments_data,
    )

    assert len(assignments) == 2
    assert assignments[0].name == "Vocabulary Quiz 1"
    assert assignments[1].name == "AI Quiz 1"
