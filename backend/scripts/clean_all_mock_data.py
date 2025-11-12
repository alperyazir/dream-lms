#!/usr/bin/env python3
"""
Clean all mock data from the database, keeping only the admin user.
This script removes all LMS data including teachers, publishers, students,
classes, assignments, books, activities, and schools.

Usage: python scripts/clean_all_mock_data.py
Note: This should ONLY be used in development environments
"""

from sqlmodel import Session, select

from app.core.db import engine
from app.models import (
    Activity,
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
    UserRole,
)


def clean_all_mock_data() -> None:
    """Delete all LMS data, keeping only the admin user."""
    with Session(engine) as session:
        print("🧹 Cleaning all mock data from database...")

        # Track deleted counts
        counts = {
            "assignments": 0,
            "assignment_students": 0,
            "activities": 0,
            "books": 0,
            "class_students": 0,
            "classes": 0,
            "students": 0,
            "teachers": 0,
            "publishers": 0,
            "schools": 0,
            "users": 0,
        }

        # 1. Delete assignment-student relationships
        assignment_students = session.exec(select(AssignmentStudent)).all()
        for item in assignment_students:
            session.delete(item)
        counts["assignment_students"] = len(assignment_students)

        # 2. Delete assignments
        assignments = session.exec(select(Assignment)).all()
        for assignment in assignments:
            session.delete(assignment)
        counts["assignments"] = len(assignments)

        # 3. Delete activities
        activities = session.exec(select(Activity)).all()
        for activity in activities:
            session.delete(activity)
        counts["activities"] = len(activities)

        # 4. Delete books
        books = session.exec(select(Book)).all()
        for book in books:
            session.delete(book)
        counts["books"] = len(books)

        # 5. Delete class-student relationships
        class_students = session.exec(select(ClassStudent)).all()
        for item in class_students:
            session.delete(item)
        counts["class_students"] = len(class_students)

        # 6. Delete classes
        classes = session.exec(select(Class)).all()
        for cls in classes:
            session.delete(cls)
        counts["classes"] = len(classes)

        # 7. Delete students and their users
        students = session.exec(select(Student)).all()
        for student in students:
            user = session.get(User, student.user_id)
            if user:
                session.delete(student)
                session.delete(user)
                counts["students"] += 1
                counts["users"] += 1

        # 8. Delete teachers and their users
        teachers = session.exec(select(Teacher)).all()
        for teacher in teachers:
            user = session.get(User, teacher.user_id)
            if user:
                session.delete(teacher)
                session.delete(user)
                counts["teachers"] += 1
                counts["users"] += 1

        # 9. Delete publishers and their users
        publishers = session.exec(select(Publisher)).all()
        for publisher in publishers:
            user = session.get(User, publisher.user_id)
            if user:
                session.delete(publisher)
                session.delete(user)
                counts["publishers"] += 1
                counts["users"] += 1

        # 10. Delete schools
        schools = session.exec(select(School)).all()
        for school in schools:
            session.delete(school)
        counts["schools"] = len(schools)

        # Commit all deletions
        session.commit()

        print("\n✅ Cleanup complete! Deleted:")
        print(f"   📚 Books: {counts['books']}")
        print(f"   📝 Activities: {counts['activities']}")
        print(f"   📋 Assignments: {counts['assignments']}")
        print(f"   🔗 Assignment-Student links: {counts['assignment_students']}")
        print(f"   🏫 Classes: {counts['classes']}")
        print(f"   🔗 Class-Student links: {counts['class_students']}")
        print(f"   👨‍🎓 Students: {counts['students']}")
        print(f"   👨‍🏫 Teachers: {counts['teachers']}")
        print(f"   📰 Publishers: {counts['publishers']}")
        print(f"   🏛️  Schools: {counts['schools']}")
        print(f"   👤 User accounts: {counts['users']}")
        print(f"\n   Total items deleted: {sum(counts.values())}")


if __name__ == "__main__":
    clean_all_mock_data()
    print("\n✨ Database is now clean! Only the admin user remains.")
