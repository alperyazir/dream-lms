"""Tests for BookAssignment model (Story 9.4)"""
import uuid

import pytest
from pydantic import ValidationError

from app.models import (
    BookAssignment,
    BookAssignmentCreate,
    BulkBookAssignmentCreate,
)


class TestBookAssignmentCreate:
    """Tests for BookAssignmentCreate schema validation"""

    def test_create_with_school_id_only(self):
        """Test creating assignment with only school_id"""
        assignment = BookAssignmentCreate(
            book_id=uuid.uuid4(),
            school_id=uuid.uuid4(),
            teacher_id=None
        )
        assert assignment.school_id is not None
        assert assignment.teacher_id is None

    def test_create_with_teacher_id_only(self):
        """Test creating assignment with only teacher_id"""
        assignment = BookAssignmentCreate(
            book_id=uuid.uuid4(),
            school_id=None,
            teacher_id=uuid.uuid4()
        )
        assert assignment.school_id is None
        assert assignment.teacher_id is not None

    def test_create_with_both_ids(self):
        """Test creating assignment with both school_id and teacher_id"""
        assignment = BookAssignmentCreate(
            book_id=uuid.uuid4(),
            school_id=uuid.uuid4(),
            teacher_id=uuid.uuid4()
        )
        assert assignment.school_id is not None
        assert assignment.teacher_id is not None

    def test_create_without_target_fails(self):
        """Test that creating assignment without school_id or teacher_id fails"""
        with pytest.raises(ValidationError) as exc_info:
            BookAssignmentCreate(
                book_id=uuid.uuid4(),
                school_id=None,
                teacher_id=None
            )
        assert "At least one of school_id or teacher_id must be provided" in str(exc_info.value)


class TestBulkBookAssignmentCreate:
    """Tests for BulkBookAssignmentCreate schema"""

    def test_bulk_create_for_entire_school(self):
        """Test bulk assignment for entire school"""
        bulk = BulkBookAssignmentCreate(
            book_id=uuid.uuid4(),
            school_id=uuid.uuid4(),
            assign_to_all_teachers=True
        )
        assert bulk.assign_to_all_teachers is True
        assert bulk.teacher_ids is None

    def test_bulk_create_for_specific_teachers(self):
        """Test bulk assignment for specific teachers"""
        teacher_ids = [uuid.uuid4(), uuid.uuid4(), uuid.uuid4()]
        bulk = BulkBookAssignmentCreate(
            book_id=uuid.uuid4(),
            school_id=uuid.uuid4(),
            teacher_ids=teacher_ids,
            assign_to_all_teachers=False
        )
        assert bulk.teacher_ids == teacher_ids
        assert bulk.assign_to_all_teachers is False


class TestBookAssignmentModel:
    """Tests for BookAssignment database model"""

    def test_model_has_required_fields(self):
        """Test that BookAssignment model has all required fields"""
        # Check model has expected columns
        assert hasattr(BookAssignment, 'id')
        assert hasattr(BookAssignment, 'book_id')
        assert hasattr(BookAssignment, 'school_id')
        assert hasattr(BookAssignment, 'teacher_id')
        assert hasattr(BookAssignment, 'assigned_by')
        assert hasattr(BookAssignment, 'assigned_at')

    def test_model_table_name(self):
        """Test that model uses correct table name"""
        assert BookAssignment.__tablename__ == "book_assignments"
