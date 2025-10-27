import io
import logging
import secrets
import string
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import emails  # type: ignore
import jwt
from fastapi import UploadFile
from jinja2 import Template
from jwt.exceptions import InvalidTokenError
from openpyxl import load_workbook

from app.core import security
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class EmailData:
    html_content: str
    subject: str


def render_email_template(*, template_name: str, context: dict[str, Any]) -> str:
    template_str = (
        Path(__file__).parent / "email-templates" / "build" / template_name
    ).read_text()
    html_content = Template(template_str).render(context)
    return html_content


def send_email(
    *,
    email_to: str,
    subject: str = "",
    html_content: str = "",
) -> None:
    assert settings.emails_enabled, "no provided configuration for email variables"
    message = emails.Message(
        subject=subject,
        html=html_content,
        mail_from=(settings.EMAILS_FROM_NAME, settings.EMAILS_FROM_EMAIL),
    )
    smtp_options = {"host": settings.SMTP_HOST, "port": settings.SMTP_PORT}
    if settings.SMTP_TLS:
        smtp_options["tls"] = True
    elif settings.SMTP_SSL:
        smtp_options["ssl"] = True
    if settings.SMTP_USER:
        smtp_options["user"] = settings.SMTP_USER
    if settings.SMTP_PASSWORD:
        smtp_options["password"] = settings.SMTP_PASSWORD
    response = message.send(to=email_to, smtp=smtp_options)
    logger.info(f"send email result: {response}")


def generate_test_email(email_to: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Test email"
    html_content = render_email_template(
        template_name="test_email.html",
        context={"project_name": settings.PROJECT_NAME, "email": email_to},
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_reset_password_email(email_to: str, email: str, token: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Password recovery for user {email}"
    link = f"{settings.FRONTEND_HOST}/reset-password?token={token}"
    html_content = render_email_template(
        template_name="reset_password.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": email,
            "email": email_to,
            "valid_hours": settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS,
            "link": link,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_new_account_email(
    email_to: str, username: str, password: str
) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - New account for user {username}"
    html_content = render_email_template(
        template_name="new_account.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": username,
            "password": password,
            "email": email_to,
            "link": settings.FRONTEND_HOST,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_password_reset_token(email: str) -> str:
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.now(timezone.utc)
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email},
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> str | None:
    try:
        decoded_token = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        return str(decoded_token["sub"])
    except InvalidTokenError:
        return None


def generate_temp_password(length: int = 12) -> str:
    """
    Generate a cryptographically secure random temporary password.

    Args:
        length: Length of password to generate (default: 12)

    Returns:
        Random password string containing uppercase, lowercase, digits, and special characters

    Example:
        >>> password = generate_temp_password()
        >>> len(password)
        12
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


async def validate_file_size(file: UploadFile, max_size_mb: int = 5) -> bool:
    """
    Validate file size does not exceed limit.

    Args:
        file: File to validate
        max_size_mb: Maximum file size in MB (default: 5)

    Returns:
        True if file size is within limit, False otherwise
    """
    contents = await file.read()
    await file.seek(0)  # Reset file pointer for later reads
    size_mb = len(contents) / (1024 * 1024)
    return size_mb <= max_size_mb


def validate_excel_headers(headers: list[str], required_headers: list[str]) -> bool:
    """
    Verify column names match expected headers.

    Args:
        headers: List of header names from Excel file
        required_headers: List of required header names

    Returns:
        True if all required headers are present, False otherwise
    """
    # Normalize headers by stripping whitespace and converting to lowercase
    normalized_headers = [h.strip().lower() if h else "" for h in headers]
    normalized_required = [h.strip().lower() for h in required_headers]

    return all(req in normalized_headers for req in normalized_required)


async def parse_excel_file(file: UploadFile) -> list[dict[str, Any]]:
    """
    Parse Excel file and return list of row dictionaries.

    Args:
        file: Excel file to parse

    Returns:
        List of dictionaries where keys are column headers and values are cell values.
        Each row dict includes '_row_number' for error reporting.

    Raises:
        ValueError: If file is corrupted, missing sheets, or cannot be read
    """
    try:
        contents = await file.read()
        await file.seek(0)  # Reset file pointer

        workbook = load_workbook(io.BytesIO(contents), read_only=True)

        if not workbook.worksheets:
            raise ValueError("Excel file contains no worksheets")

        sheet = workbook.active

        # First row contains headers
        rows_iter = sheet.iter_rows(values_only=True)
        headers = next(rows_iter, None)

        if not headers:
            raise ValueError("Excel file is empty or has no header row")

        # Parse data rows
        rows = []
        for idx, row in enumerate(rows_iter, start=2):  # Start at 2 (row 1 is headers)
            row_dict: dict[str, Any] = {}

            # Map headers to values
            for header, value in zip(headers, row):
                if header:  # Skip empty header columns
                    row_dict[str(header)] = value

            # Add row number for error reporting
            row_dict['_row_number'] = idx
            rows.append(row_dict)

        workbook.close()
        return rows

    except Exception as e:
        logger.error(f"Error parsing Excel file: {str(e)}")
        raise ValueError(f"Failed to parse Excel file: {str(e)}")
