#!/usr/bin/env python3
"""
Clean Database - Remove all data except admin user
This script deletes all records from all tables except the admin user.
"""
from sqlmodel import Session, select
from app.core.db import engine
from app.models import (
    User, Publisher, School, Teacher, Student,
    Class, ClassStudent, Book, Assignment, AssignmentStudent
)
from app.core.config import settings

def clean_database():
    """Remove all data except admin user."""
    with Session(engine) as session:
        print("🗑️  Starting database cleanup...")

        # Get admin user email to preserve
        admin_email = settings.FIRST_SUPERUSER

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
        print(f"  → Deleting users (except {admin_email})...")
        non_admin_users = session.exec(
            select(User).where(User.email != admin_email)
        ).all()

        for user in non_admin_users:
            session.delete(user)

        # Commit all deletions
        session.commit()

        # Verify admin still exists
        admin = session.exec(
            select(User).where(User.email == admin_email)
        ).first()

        if admin:
            print(f"\n✅  Database cleaned successfully!")
            print(f"📧  Admin user preserved: {admin.email}")
            print(f"👤  Username: {admin.username}")
            print(f"🔑  Password: Check FIRST_SUPERUSER_PASSWORD in .env")
        else:
            print("\n⚠️  Warning: Admin user not found!")

        # Count remaining records
        user_count = len(session.exec(select(User)).all())
        print(f"\n📊  Total users remaining: {user_count}")

if __name__ == "__main__":
    clean_database()
