#!/usr/bin/env python3
"""
Clean all student data from the database.
This script removes all Student records and their associated User accounts.

Usage: python scripts/clean_students.py
Note: This should ONLY be used in development environments
"""

from sqlmodel import Session, select

from app.core.db import engine
from app.models import ClassStudent, Student, User, UserRole


def clean_students() -> None:
    """Delete all students and their associated user accounts from the database."""
    with Session(engine) as session:
        # Get all students
        students = session.exec(select(Student)).all()

        if not students:
            print("✅ No students found in the database.")
            return

        print(f"🗑️  Found {len(students)} student(s) to delete:")

        # Delete each student
        for student in students:
            # Get the associated user
            user = session.get(User, student.user_id)

            if user:
                print(f"   - Deleting: {user.username} ({user.email})")

                # Delete class enrollments
                class_enrollments = session.exec(
                    select(ClassStudent).where(ClassStudent.student_id == student.id)
                ).all()
                for enrollment in class_enrollments:
                    session.delete(enrollment)

                # Delete the student record
                session.delete(student)

                # Delete the user account
                session.delete(user)

        # Commit all deletions
        session.commit()
        print(f"✅ Successfully deleted {len(students)} student(s) and their user accounts.")


if __name__ == "__main__":
    print("🧹 Cleaning student data from database...")
    clean_students()
    print("✨ Done!")
