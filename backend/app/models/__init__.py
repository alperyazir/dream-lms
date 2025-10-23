"""
Models package initialization.
Imports all models in correct dependency order for Alembic auto-generation.

IMPORTANT: Import order matters!
- User must be imported first (base for all role-specific models)
- Publisher before School (School depends on Publisher)
- School before Teacher (Teacher depends on School)
"""

from app.models.user import User, UserRole  # noqa: F401
from app.models.publisher import Publisher  # noqa: F401
from app.models.school import School  # noqa: F401
from app.models.teacher import Teacher  # noqa: F401
from app.models.student import Student  # noqa: F401

__all__ = ["User", "UserRole", "Publisher", "School", "Teacher", "Student"]
