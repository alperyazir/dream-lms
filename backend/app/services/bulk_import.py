"""Bulk import validation service for Excel file imports."""
import uuid
from dataclasses import dataclass
from typing import Any

from pydantic import EmailStr
from pydantic_core import PydanticCustomError
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


def validate_email_format(email: str) -> bool:
    """
    Validate email format using Pydantic EmailStr.

    Args:
        email: Email address to validate

    Returns:
        True if email is valid, False otherwise
    """
    try:
        EmailStr._validate(email)
        return True
    except (PydanticCustomError, AttributeError, Exception):
        return False


def check_existing_users(emails: list[str], session: Session) -> set[str]:
    """
    Check which emails already exist in the database.

    Args:
        emails: List of email addresses to check
        session: Database session

    Returns:
        Set of emails that already exist in database
    """
    result = session.exec(
        select(User.email).where(User.email.in_([e.lower() for e in emails]))
    )
    return {email.lower() for email in result.all()}


def validate_user_row(
    row: dict[str, Any],
    row_number: int,
    role: UserRole,
    existing_emails: set[str],
    seen_emails: set[str],
    session: Session
) -> ValidationResult:
    """
    Validate a single row from bulk import file.

    Args:
        row: Row data dictionary
        row_number: Row number for error reporting
        role: User role (student, teacher, publisher)
        existing_emails: Set of emails already in database
        seen_emails: Set of emails already seen in this import (for duplicate detection)
        session: Database session for additional validation

    Returns:
        ValidationResult with validation status and errors
    """
    errors: list[str] = []

    # Check required fields
    first_name = row.get('First Name', '').strip() if row.get('First Name') else ''
    last_name = row.get('Last Name', '').strip() if row.get('Last Name') else ''
    email = row.get('Email', '').strip() if row.get('Email') else ''

    if not first_name:
        errors.append("Missing required field: First Name")
    if not last_name:
        errors.append("Missing required field: Last Name")
    if not email:
        errors.append("Missing required field: Email")
    else:
        # Validate email format
        if not validate_email_format(email):
            errors.append(f"Invalid email format: {email}")
        else:
            email_lower = email.lower()

            # Check for duplicates within file
            if email_lower in seen_emails:
                errors.append(f"Duplicate email in file: {email}")
            else:
                seen_emails.add(email_lower)

            # Check for existing users in database
            if email_lower in existing_emails:
                errors.append(f"Email already exists in database: {email}")

    # Role-specific validation
    if role == UserRole.student:
        # Grade level is optional for students
        parent_email = row.get('Parent Email', '').strip() if row.get('Parent Email') else None
        if parent_email and not validate_email_format(parent_email):
            errors.append(f"Invalid parent email format: {parent_email}")

    elif role == UserRole.teacher:
        # School ID is required for teachers
        school_id_str = row.get('School ID', '').strip() if row.get('School ID') else ''
        if not school_id_str:
            errors.append("Missing required field: School ID")
        else:
            # Validate UUID format
            try:
                uuid.UUID(school_id_str)
            except (ValueError, AttributeError):
                errors.append(f"Invalid School ID format (must be UUID): {school_id_str}")

    elif role == UserRole.publisher:
        # Company name is required for publishers
        company_name = row.get('Company Name', '').strip() if row.get('Company Name') else ''
        if not company_name:
            errors.append("Missing required field: Company Name")

        contact_email = row.get('Contact Email', '').strip() if row.get('Contact Email') else ''
        if not contact_email:
            errors.append("Missing required field: Contact Email")
        elif not validate_email_format(contact_email):
            errors.append(f"Invalid contact email format: {contact_email}")

    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        row_number=row_number
    )


def validate_bulk_import(
    rows: list[dict[str, Any]],
    role: UserRole,
    session: Session
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
    # Get all emails from file for batch database check
    emails = [row.get('Email', '').strip().lower() for row in rows if row.get('Email')]
    existing_emails = check_existing_users(emails, session)

    # Track emails seen in this file for duplicate detection
    seen_emails: set[str] = set()

    # Validate each row
    validation_errors: list[ValidationResult] = []
    valid_count = 0

    for row in rows:
        row_number = row.get('_row_number', 0)
        result = validate_user_row(
            row=row,
            row_number=row_number,
            role=role,
            existing_emails=existing_emails,
            seen_emails=seen_emails,
            session=session
        )

        if result.is_valid:
            valid_count += 1
        else:
            validation_errors.append(result)

    return BulkValidationResult(
        valid_count=valid_count,
        error_count=len(validation_errors),
        errors=validation_errors
    )
