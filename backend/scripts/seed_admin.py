"""
Admin user seed script for Dream LMS.

Creates the initial admin user if it doesn't already exist.
This script is idempotent and safe to run multiple times.

Usage:
    python scripts/seed_admin.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from passlib.context import CryptContext
from sqlalchemy import select

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models.user import User, UserRole

# Password hashing context (matching security architecture)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Admin user credentials
ADMIN_EMAIL = "admin@dreamlms.com"
ADMIN_PASSWORD = "Admin123!"

settings = get_settings()


async def create_tables():
    """Create database tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_admin_user():
    """
    Create admin user if it doesn't exist.

    Credentials:
        Email: admin@dreamlms.com
        Password: Admin123!
    """
    async with AsyncSessionLocal() as session:
        # Check if admin user already exists
        result = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
        existing_admin = result.scalar_one_or_none()

        if existing_admin:
            print(f"✓ Admin user already exists: {ADMIN_EMAIL}")
            return

        # Hash the password
        password_hash = pwd_context.hash(ADMIN_PASSWORD)

        # Create admin user
        admin_user = User(
            email=ADMIN_EMAIL,
            password_hash=password_hash,
            role=UserRole.admin,
            is_active=True,
        )

        session.add(admin_user)
        await session.commit()
        await session.refresh(admin_user)

        print(f"✓ Admin user created successfully!")
        print(f"  Email: {ADMIN_EMAIL}")
        print(f"  Password: {ADMIN_PASSWORD}")
        print(f"  User ID: {admin_user.id}")
        print("\n⚠️  Remember to change the admin password in production!")


async def main():
    """Main function to run the seed script."""
    print("Dream LMS - Admin User Seed Script")
    print("=" * 50)
    print(f"Database: {settings.database_url.split('@')[1]}")  # Hide credentials
    print()

    try:
        await seed_admin_user()
        print("\n✓ Seed script completed successfully!")
    except Exception as e:
        print(f"\n✗ Error seeding admin user: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
