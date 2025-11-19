"""Unit tests for bulk import utility functions."""
import io
import uuid
from typing import Any

import pytest
from fastapi import UploadFile
from openpyxl import Workbook
from sqlmodel import Session

from app.models import User, UserRole
from app.services.bulk_import import (
    check_existing_users,
    validate_bulk_import,
    validate_email_format,
    validate_user_row,
)
from app.utils import parse_excel_file, validate_excel_headers, validate_file_size


def create_test_excel_file(data: list[dict[str, Any]]) -> bytes:
    """
    Create a test Excel file in memory.

    Args:
        data: List of row dictionaries

    Returns:
        Excel file content as bytes
    """
    workbook = Workbook()
    sheet = workbook.active

    if data:
        # Write headers
        headers = list(data[0].keys())
        sheet.append(headers)

        # Write data rows
        for row in data:
            sheet.append([row.get(h) for h in headers])

    # Save to bytes
    excel_bytes = io.BytesIO()
    workbook.save(excel_bytes)
    excel_bytes.seek(0)
    return excel_bytes.read()


def create_upload_file(content: bytes, filename: str = "test.xlsx") -> UploadFile:
    """Create an UploadFile instance for testing."""
    return UploadFile(
        filename=filename,
        file=io.BytesIO(content)
    )


@pytest.mark.asyncio
async def test_parse_valid_excel_file() -> None:
    """Test parsing a well-formed Excel file."""
    test_data = [
        {"First Name": "John", "Last Name": "Doe", "Email": "john@test.com"},
        {"First Name": "Jane", "Last Name": "Smith", "Email": "jane@test.com"}
    ]

    excel_content = create_test_excel_file(test_data)
    upload_file = create_upload_file(excel_content)

    result = await parse_excel_file(upload_file)

    assert len(result) == 2
    assert result[0]["First Name"] == "John"
    assert result[0]["Email"] == "john@test.com"
    assert result[0]["_row_number"] == 2  # First data row is row 2
    assert result[1]["_row_number"] == 3


@pytest.mark.asyncio
async def test_parse_excel_file_empty() -> None:
    """Test parsing an empty Excel file."""
    # Create workbook with only headers, no data
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["First Name", "Last Name", "Email"])

    excel_bytes = io.BytesIO()
    workbook.save(excel_bytes)
    excel_bytes.seek(0)

    upload_file = create_upload_file(excel_bytes.read())
    result = await parse_excel_file(upload_file)

    assert len(result) == 0


@pytest.mark.asyncio
async def test_parse_corrupted_excel_file() -> None:
    """Test handling of corrupted Excel file."""
    corrupted_content = b"This is not an Excel file"
    upload_file = create_upload_file(corrupted_content)

    with pytest.raises(ValueError, match="Failed to parse Excel file"):
        await parse_excel_file(upload_file)


@pytest.mark.asyncio
async def test_validate_file_size_within_limit() -> None:
    """Test file size validation for file within limit."""
    # Create small file (< 5MB)
    small_content = b"x" * 1000  # 1KB
    upload_file = create_upload_file(small_content)

    result = await validate_file_size(upload_file, max_size_mb=5)

    assert result is True


@pytest.mark.asyncio
async def test_validate_file_size_exceeds_limit() -> None:
    """Test file size validation for file exceeding limit."""
    # Create large file (> 5MB)
    large_content = b"x" * (6 * 1024 * 1024)  # 6MB
    upload_file = create_upload_file(large_content)

    result = await validate_file_size(upload_file, max_size_mb=5)

    assert result is False


def test_validate_excel_headers_all_present() -> None:
    """Test header validation when all required headers are present."""
    headers = ["First Name", "Last Name", "Email", "Grade Level", "Parent Email"]
    required = ["First Name", "Last Name", "Email"]

    result = validate_excel_headers(headers, required)

    assert result is True


def test_validate_excel_headers_missing() -> None:
    """Test header validation when required headers are missing."""
    headers = ["First Name", "Email"]  # Missing "Last Name"
    required = ["First Name", "Last Name", "Email"]

    result = validate_excel_headers(headers, required)

    assert result is False


def test_validate_excel_headers_case_insensitive() -> None:
    """Test header validation is case-insensitive."""
    headers = ["first name", "LAST NAME", "EmAiL"]
    required = ["First Name", "Last Name", "Email"]

    result = validate_excel_headers(headers, required)

    assert result is True


def test_validate_email_format_valid() -> None:
    """Test email format validation for valid emails."""
    assert validate_email_format("test@example.com") is True
    assert validate_email_format("user.name@company.co.uk") is True


def test_validate_email_format_invalid() -> None:
    """Test email format validation for invalid emails."""
    assert validate_email_format("not-an-email") is False
    assert validate_email_format("@example.com") is False
    assert validate_email_format("user@") is False
    assert validate_email_format("") is False


def test_check_existing_users(session: Session) -> None:
    """Test checking for existing users in database."""
    # Create a test user
    user = User(
        id=uuid.uuid4(),
        email="existing@test.com",
        hashed_password="hashed",
        role=UserRole.student
    )
    session.add(user)
    session.commit()

    # Check for existing users
    emails = ["existing@test.com", "new@test.com"]
    existing = check_existing_users(emails, session)

    assert "existing@test.com" in existing
    assert "new@test.com" not in existing


def test_validate_user_row_valid(session: Session) -> None:
    """Test validation of a valid user row."""
    row = {
        "First Name": "John",
        "Last Name": "Doe",
        "Email": "john@test.com",
        "Grade Level": "5",
        "Parent Email": "parent@test.com"
    }

    result = validate_user_row(
        row=row,
        row_number=2,
        role=UserRole.student,
        existing_emails=set(),
        seen_emails=set(),
        session=session
    )

    assert result.is_valid is True
    assert len(result.errors) == 0


def test_validate_user_row_missing_required_fields(session: Session) -> None:
    """Test validation fails for missing required fields."""
    row = {
        "First Name": "John",
        # Missing "Last Name"
        # Missing "Email"
    }

    result = validate_user_row(
        row=row,
        row_number=2,
        role=UserRole.student,
        existing_emails=set(),
        seen_emails=set(),
        session=session
    )

    assert result.is_valid is False
    assert len(result.errors) > 0
    assert any("Last Name" in err for err in result.errors)
    assert any("Email" in err for err in result.errors)


def test_validate_user_row_invalid_email(session: Session) -> None:
    """Test validation fails for invalid email format."""
    row = {
        "First Name": "John",
        "Last Name": "Doe",
        "Email": "not-an-email"
    }

    result = validate_user_row(
        row=row,
        row_number=2,
        role=UserRole.student,
        existing_emails=set(),
        seen_emails=set(),
        session=session
    )

    assert result.is_valid is False
    assert any("Invalid email format" in err for err in result.errors)


def test_validate_user_row_duplicate_email(session: Session) -> None:
    """Test validation detects duplicate email within file."""
    row = {
        "First Name": "John",
        "Last Name": "Doe",
        "Email": "duplicate@test.com"
    }

    seen_emails = {"duplicate@test.com"}  # Already seen in this import

    result = validate_user_row(
        row=row,
        row_number=2,
        role=UserRole.student,
        existing_emails=set(),
        seen_emails=seen_emails,
        session=session
    )

    assert result.is_valid is False
    assert any("Duplicate email" in err for err in result.errors)


def test_validate_user_row_existing_user_conflict(session: Session) -> None:
    """Test validation detects conflict with existing user in database."""
    # Create existing user
    user = User(
        id=uuid.uuid4(),
        email="existing@test.com",
        hashed_password="hashed",
        role=UserRole.student
    )
    session.add(user)
    session.commit()

    row = {
        "First Name": "John",
        "Last Name": "Doe",
        "Email": "existing@test.com"
    }

    existing_emails = {"existing@test.com"}

    result = validate_user_row(
        row=row,
        row_number=2,
        role=UserRole.student,
        existing_emails=existing_emails,
        seen_emails=set(),
        session=session
    )

    assert result.is_valid is False
    assert any("already exists in database" in err for err in result.errors)


def test_validate_bulk_import_all_valid(session: Session) -> None:
    """Test bulk validation with all valid rows."""
    rows = [
        {
            "First Name": "John",
            "Last Name": "Doe",
            "Email": "john@test.com",
            "_row_number": 2
        },
        {
            "First Name": "Jane",
            "Last Name": "Smith",
            "Email": "jane@test.com",
            "_row_number": 3
        }
    ]

    result = validate_bulk_import(rows, UserRole.student, session)

    assert result.valid_count == 2
    assert result.error_count == 0
    assert len(result.errors) == 0


def test_validate_bulk_import_some_invalid(session: Session) -> None:
    """Test bulk validation with some invalid rows."""
    rows = [
        {
            "First Name": "John",
            "Last Name": "Doe",
            "Email": "john@test.com",
            "_row_number": 2
        },
        {
            "First Name": "Jane",
            # Missing "Last Name"
            "Email": "not-an-email",
            "_row_number": 3
        }
    ]

    result = validate_bulk_import(rows, UserRole.student, session)

    assert result.valid_count == 1
    assert result.error_count == 1
    assert len(result.errors) == 1
    assert result.errors[0].row_number == 3


def test_validate_teacher_row_missing_school_id(session: Session) -> None:
    """Test teacher validation fails without School ID."""
    row = {
        "First Name": "John",
        "Last Name": "Doe",
        "Email": "john@test.com"
        # Missing "School ID"
    }

    result = validate_user_row(
        row=row,
        row_number=2,
        role=UserRole.teacher,
        existing_emails=set(),
        seen_emails=set(),
        session=session
    )

    assert result.is_valid is False
    assert any("School ID" in err for err in result.errors)


def test_validate_publisher_row_missing_company_name(session: Session) -> None:
    """Test publisher validation fails without Company Name."""
    row = {
        "First Name": "John",
        "Last Name": "Doe",
        "Email": "john@test.com"
        # Missing "Company Name"
    }

    result = validate_user_row(
        row=row,
        row_number=2,
        role=UserRole.publisher,
        existing_emails=set(),
        seen_emails=set(),
        session=session
    )

    assert result.is_valid is False
    assert any("Company Name" in err for err in result.errors)
