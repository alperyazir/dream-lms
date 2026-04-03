#!/usr/bin/env python3
"""
Clean Database - Remove all data except admin user
This script deletes all records from all tables except the admin user.
"""
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models import (
    Assignment,
    AssignmentStudent,
    Book,
    Class,
    ClassStudent,
    Publisher,
    School,
    Student,
    Teacher,
    User,
)


def clean_database():
    """Remove all data except admin user."""
    with Session(engine) as session:
        print("🗑️  Starting database cleanup...")

        # Get admin username to preserve
        admin_username = settings.FIRST_SUPERUSER_USERNAME

        # Delete in order respecting foreign key constraints
        print("  → Deleting assignment submissions...")
        session.query(AssignmentStudent).delete()

        print("  → Deleting assignments...")
        session.query(Assignment).delete()

        print("  → Deleting class enrollments...")
        session.query(ClassStudent).delete()

        print("  → Deleting classes...")
        session.query(Class).delete()

        print("  → Deleting books...")
        session.query(Book).delete()

        print("  → Deleting students...")
        session.query(Student).delete()

        print("  → Deleting teachers...")
        session.query(Teacher).delete()

        print("  → Deleting schools...")
        session.query(School).delete()

        print("  → Deleting publishers...")
        session.query(Publisher).delete()

        # Delete all users except admin
        print(f"  → Deleting users (except {admin_username})...")
        non_admin_users = session.exec(
            select(User).where(User.username != admin_username)
        ).all()

        for user in non_admin_users:
            session.delete(user)

        # Commit all deletions
        session.commit()

        # Verify admin still exists
        admin = session.exec(select(User).where(User.username == admin_username)).first()

        if admin:
            print("\n✅  Database cleaned successfully!")
            print(f"👤  Admin user preserved: {admin.username}")
            print("🔑  Password: Check FIRST_SUPERUSER_PASSWORD in .env")
        else:
            print("\n⚠️  Warning: Admin user not found!")

        # Count remaining records
        user_count = len(session.exec(select(User)).all())
        print(f"\n📊  Total users remaining: {user_count}")


if __name__ == "__main__":
    clean_database()
