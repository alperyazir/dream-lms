"""Schemas for student bulk import (Story 9.9)."""
from enum import Enum

from pydantic import BaseModel, Field


class ImportRowStatus(str, Enum):
    """Status of a single import row."""
    valid = "valid"
    warning = "warning"
    error = "error"


class ImportRowResult(BaseModel):
    """Validation result for a single row."""
    row_number: int = Field(..., description="Excel row number (1-indexed, row 1 is header)")
    full_name: str = Field(..., description="Full name from the row")
    username: str = Field(..., description="Generated or provided username")
    email: str | None = Field(None, description="Email if provided")
    grade: str | None = Field(None, description="Grade level if provided")
    class_name: str | None = Field(None, description="Class/section if provided")
    status: ImportRowStatus = Field(..., description="Validation status")
    errors: list[str] = Field(default_factory=list, description="List of errors")
    warnings: list[str] = Field(default_factory=list, description="List of warnings")


class ImportValidationResponse(BaseModel):
    """Response from import validation endpoint."""
    valid_count: int = Field(..., description="Number of valid rows")
    warning_count: int = Field(..., description="Number of rows with warnings")
    error_count: int = Field(..., description="Number of rows with errors")
    total_count: int = Field(..., description="Total number of data rows")
    rows: list[ImportRowResult] = Field(..., description="Validation result for each row")


class ImportCredential(BaseModel):
    """Credentials for a single imported student."""
    full_name: str = Field(..., description="Student's full name")
    username: str = Field(..., description="Generated username")
    password: str = Field(..., description="Generated password")
    email: str | None = Field(None, description="Student email if provided")


class ImportExecutionResponse(BaseModel):
    """Response from import execution endpoint."""
    created_count: int = Field(..., description="Number of students created")
    failed_count: int = Field(..., description="Number of failed creations")
    credentials: list[ImportCredential] = Field(..., description="Credentials for created students")
    errors: list[str] = Field(default_factory=list, description="Errors during creation")


class CredentialsDownloadRequest(BaseModel):
    """Request body for credentials download."""
    credentials: list[ImportCredential] = Field(..., description="Credentials to include in download")
