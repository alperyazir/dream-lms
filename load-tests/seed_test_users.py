"""
Seed test users for load testing.

Run from backend directory:
    python -m load-tests.seed_test_users

Or directly:
    cd backend && python ../load-tests/seed_test_users.py
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from datetime import datetime, timezone

from sqlmodel import Session, select

from app.core.db import engine
from app.core.security import get_password_hash
from app.models import (
    Class,
    ClassStudent,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)

import uuid

PASSWORD = "changethis"
HASHED = get_password_hash(PASSWORD)

NUM_TEACHERS = 5
NUM_STUDENTS = 50  # per teacher
NUM_CLASSES = 2    # per teacher


def seed():
    with Session(engine) as db:
        # Check if already seeded
        existing = db.exec(
            select(User).where(User.username == "loadtest_teacher_0")
        ).first()
        if existing:
            print("Already seeded! Skipping.")
            print_counts(db)
            return

        now = datetime.now(timezone.utc)

        # 0. Create admin user
        admin_user = User(
            id=uuid.uuid4(),
            email="loadtest_admin@test.com",
            username="loadtest_admin",
            hashed_password=HASHED,
            full_name="Load Test Admin",
            role=UserRole.admin,
            is_active=True,
            is_superuser=True,
            must_change_password=False,
        )
        db.add(admin_user)
        db.flush()
        print(f"Created admin: {admin_user.username}")

        # 1. Create a test school
        school = School(
            id=uuid.uuid4(),
            name="Load Test School",
            dcs_publisher_id=1,
            created_at=now,
            updated_at=now,
        )
        db.add(school)
        db.flush()
        print(f"Created school: {school.name} ({school.id})")

        all_students = []

        for t_idx in range(NUM_TEACHERS):
            # 2. Create teacher user
            teacher_user = User(
                id=uuid.uuid4(),
                email=f"loadtest_teacher_{t_idx}@test.com",
                username=f"loadtest_teacher_{t_idx}",
                hashed_password=HASHED,
                full_name=f"Load Teacher {t_idx}",
                role=UserRole.teacher,
                is_active=True,
                must_change_password=False,
            )
            db.add(teacher_user)
            db.flush()

            teacher = Teacher(
                id=uuid.uuid4(),
                user_id=teacher_user.id,
                school_id=school.id,
                created_at=now,
                updated_at=now,
            )
            db.add(teacher)
            db.flush()
            print(f"  Teacher: {teacher_user.username}")

            # 3. Create classes for this teacher
            classes = []
            for c_idx in range(NUM_CLASSES):
                cls = Class(
                    id=uuid.uuid4(),
                    name=f"Class {t_idx}-{c_idx}",
                    teacher_id=teacher.id,
                    school_id=school.id,
                    created_at=now,
                    updated_at=now,
                )
                db.add(cls)
                db.flush()
                classes.append(cls)

            # 4. Create students for this teacher
            for s_idx in range(NUM_STUDENTS):
                student_user = User(
                    id=uuid.uuid4(),
                    username=f"loadtest_s{t_idx}_{s_idx}",
                    hashed_password=HASHED,
                    full_name=f"Student {t_idx}-{s_idx}",
                    role=UserRole.student,
                    is_active=True,
                    must_change_password=False,
                )
                db.add(student_user)
                db.flush()

                student = Student(
                    id=uuid.uuid4(),
                    user_id=student_user.id,
                    created_by_teacher_id=teacher.id,
                    created_at=now,
                    updated_at=now,
                )
                db.add(student)
                db.flush()

                # Enroll in a class (round-robin)
                cls = classes[s_idx % len(classes)]
                enrollment = ClassStudent(
                    id=uuid.uuid4(),
                    class_id=cls.id,
                    student_id=student.id,
                    enrolled_at=now,
                )
                db.add(enrollment)

                all_students.append(student_user.username)

        db.commit()
        print(f"\nSeeded {NUM_TEACHERS} teachers, {NUM_TEACHERS * NUM_STUDENTS} students, {NUM_TEACHERS * NUM_CLASSES} classes")
        print_counts(db)


def print_counts(db: Session):
    for role in UserRole:
        count = len(db.exec(select(User).where(User.role == role)).all())
        print(f"  {role.value}: {count} users")


if __name__ == "__main__":
    seed()
