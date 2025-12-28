"""
Script to remove all non-admin users from the database.
This will cascade delete all related records (publishers, teachers, students, etc.)

Usage:
    cd backend
    python scripts/cleanup_non_admin_users.py --confirm
"""

import argparse
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select

from app.core.db import engine
from app.models import User, UserRole


def cleanup_non_admin_users(skip_confirmation: bool = False):
    """Remove all users except admins."""
    with Session(engine) as session:
        # Get all non-admin users
        statement = select(User).where(User.role != UserRole.admin)
        users_to_delete = session.exec(statement).all()

        if not users_to_delete:
            print("✅ No non-admin users found. Database is clean.")
            return

        print(f"🔍 Found {len(users_to_delete)} non-admin users:")
        for user in users_to_delete:
            print(f"  - {user.username} ({user.role.value}) - {user.email or 'no email'}")

        # Confirm deletion
        if not skip_confirmation:
            print("\n⚠️  This will DELETE all non-admin users and their related data!")
            print("   (Publishers, Teachers, Students, Classes, Assignments, etc.)")
            confirmation = input("\nType 'DELETE' to confirm: ")

            if confirmation != "DELETE":
                print("❌ Deletion cancelled.")
                return
        else:
            print("\n⚠️  Deleting all non-admin users and their related data...")
            print("   (Publishers, Teachers, Students, Classes, Assignments, etc.)")

        # Delete all non-admin users
        print("\n🗑️  Deleting users...")
        deleted_count = 0
        for user in users_to_delete:
            try:
                session.delete(user)
                deleted_count += 1
                print(f"  ✓ Deleted {user.username} ({user.role.value})")
            except Exception as e:
                print(f"  ✗ Failed to delete {user.username}: {e}")

        # Commit the transaction
        session.commit()

        print(f"\n✅ Successfully deleted {deleted_count} users!")
        print("   All related records (publishers, teachers, students, etc.) have been removed.")

        # Show remaining admin users
        admin_statement = select(User).where(User.role == UserRole.admin)
        admin_users = session.exec(admin_statement).all()
        print(f"\n👑 Remaining admin users ({len(admin_users)}):")
        for admin in admin_users:
            print(f"  - {admin.username} - {admin.email}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remove all non-admin users from database")
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Skip confirmation prompt and delete immediately"
    )
    args = parser.parse_args()

    try:
        cleanup_non_admin_users(skip_confirmation=args.confirm)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
