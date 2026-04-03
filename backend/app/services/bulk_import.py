"""Bulk import validation service for Excel file imports."""

import uuid
from dataclasses import dataclass
from typing import Any

from sqlmodel import Session, select

from app.models import User, UserRole


@dataclass
class ValidationResult:
    """Result of validating a single row from bulk import."""

    is_valid: bool
    errors: list[str]
    row_number: int


@dataclass
class BulkValidationResult:
    """Result of validating all rows from bulk import."""

    valid_count: int
    error_count: int
    errors: list[ValidationResult]


def check_existing_usernames(usernames: list[str], session: Session) -> set[str]:
    """
    Check which usernames already exist in the database.

    Args:
        usernames: List of usernames to check
        session: Database session

    Returns:
        Set of usernames that already exist in database
    """
    result = session.exec(
        select(User.username).where(
            User.username.in_([u.lower() for u in usernames if u])
        )
    )
    return {username.lower() for username in result.all() if username}


def validate_user_row(
    row: dict[str, Any],
    row_number: int,
    role: UserRole,
    existing_usernames: set[str],
    seen_usernames: set[str],
    session: Session,
) -> ValidationResult:
    """
    Validate a single row from bulk import file.

    Args:
        row: Row data dictionary
        row_number: Row number for error reporting
        role: User role (student, teacher, publisher)
        existing_usernames: Set of usernames already in database
        seen_usernames: Set of usernames already seen in this import
        session: Database session for additional validation

    Returns:
        ValidationResult with validation status and errors
    """
    errors: list[str] = []

    # Check required fields
    first_name = row.get("First Name", "").strip() if row.get("First Name") else ""
    last_name = row.get("Last Name", "").strip() if row.get("Last Name") else ""

    if not first_name:
        errors.append("Missing required field: First Name")
    if not last_name:
        errors.append("Missing required field: Last Name")

    # Role-specific validation
    if role == UserRole.student:
        # Grade level is optional for students
        pass

    elif role == UserRole.teacher:
        # School ID is required for teachers
        school_id_str = row.get("School ID", "").strip() if row.get("School ID") else ""
        if not school_id_str:
            errors.append("Missing required field: School ID")
        else:
            # Validate UUID format
            try:
                uuid.UUID(school_id_str)
            except (ValueError, AttributeError):
                errors.append(
                    f"Invalid School ID format (must be UUID): {school_id_str}"
                )

    elif role == UserRole.publisher:
        # Company name is required for publishers
        company_name = (
            row.get("Company Name", "").strip() if row.get("Company Name") else ""
        )
        if not company_name:
            errors.append("Missing required field: Company Name")

        contact_email = (
            row.get("Contact Email", "").strip() if row.get("Contact Email") else ""
        )
        if not contact_email:
            errors.append("Missing required field: Contact Email")

    return ValidationResult(
        is_valid=len(errors) == 0, errors=errors, row_number=row_number
    )


def validate_bulk_import(
    rows: list[dict[str, Any]], role: UserRole, session: Session
) -> BulkValidationResult:
    """
    Validate all rows from bulk import file.

    Args:
        rows: List of row dictionaries from Excel file
        role: User role (student, teacher, publisher)
        session: Database session

    Returns:
        BulkValidationResult with validation summary and detailed errors
    """
    # Track usernames seen in this file for duplicate detection
    seen_usernames: set[str] = set()
    existing_usernames: set[str] = set()

    # Validate each row
    validation_errors: list[ValidationResult] = []
    valid_count = 0

    for row in rows:
        row_number = row.get("_row_number", 0)
        result = validate_user_row(
            row=row,
            row_number=row_number,
            role=role,
            existing_usernames=existing_usernames,
            seen_usernames=seen_usernames,
            session=session,
        )

        if result.is_valid:
            valid_count += 1
        else:
            validation_errors.append(result)

    return BulkValidationResult(
        valid_count=valid_count,
        error_count=len(validation_errors),
        errors=validation_errors,
    )
