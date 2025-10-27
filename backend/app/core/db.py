from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.models import (
    User,
    UserCreate,
    UserRole,
    Publisher,
    School,
    Teacher,
    Student,
    Class,
    ClassStudent,
    Book,
    Activity,
    ActivityType,
    Assignment,
    AssignmentStudent,
    AssignmentStatus,
)

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next lines
    # from sqlmodel import SQLModel

    # This works because the models are already imported and registered from app.models
    # SQLModel.metadata.create_all(engine)

    # 1. Create admin user
    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
            role=UserRole.admin,
        )
        user = crud.create_user(session=session, user_create=user_in)

    # 2. Create publisher user and publisher record
    publisher_user = session.exec(
        select(User).where(User.email == "publisher@example.com")
    ).first()
    if not publisher_user:
        publisher_user_in = UserCreate(
            email="publisher@example.com",
            password="changethis",
            role=UserRole.publisher,
            full_name="Example Publisher User",
        )
        publisher_user = crud.create_user(session=session, user_create=publisher_user_in)

        # Create publisher record
        publisher = Publisher(
            user_id=publisher_user.id,
            name="Dream Publishing House",
            contact_email="contact@dreampublishing.com",
        )
        session.add(publisher)
        session.commit()
        session.refresh(publisher)

        # 3. Create school linked to publisher
        school = School(
            name="Dream Academy",
            publisher_id=publisher.id,
            address="123 Education Street, Knowledge City, 12345",
            contact_info="info@dreamacademy.com | +1-555-EDU-CATE",
        )
        session.add(school)
        session.commit()
        session.refresh(school)

        # 4. Create teacher user and teacher record
        teacher_user_in = UserCreate(
            email="teacher@example.com",
            password="changethis",
            role=UserRole.teacher,
            full_name="Jane Smith",
        )
        teacher_user = crud.create_user(session=session, user_create=teacher_user_in)

        teacher = Teacher(
            user_id=teacher_user.id,
            school_id=school.id,
            subject_specialization="Mathematics & Science",
        )
        session.add(teacher)
        session.commit()

        # 5. Create 2 student users and student records
        students = []
        for i in range(1, 3):
            student_user_in = UserCreate(
                email=f"student{i}@example.com",
                password="changethis",
                role=UserRole.student,
                full_name=f"Student {i} Doe",
            )
            student_user = crud.create_user(session=session, user_create=student_user_in)

            student = Student(
                user_id=student_user.id,
                grade_level=f"Grade {8 + i}",
                parent_email=f"parent{i}@example.com",
            )
            session.add(student)
            students.append(student)

        session.commit()
        session.refresh(teacher)

        # 6. Create a class linked to teacher and school
        class_obj = Class(
            name="Introduction to Mathematics",
            teacher_id=teacher.id,
            school_id=school.id,
            grade_level="Grade 9",
            subject="Mathematics",
            academic_year="2024-2025",
            is_active=True,
        )
        session.add(class_obj)
        session.commit()
        session.refresh(class_obj)

        # 7. Enroll both students in the class
        for student in students:
            session.refresh(student)
            class_student = ClassStudent(
                class_id=class_obj.id,
                student_id=student.id,
            )
            session.add(class_student)
        session.commit()

        # 8. Create a book linked to publisher
        book = Book(
            dream_storage_id="minio://dream-central/books/intro-math-101",
            title="Introduction to Algebra - Grade 9",
            publisher_id=publisher.id,
            description="A comprehensive introduction to algebraic concepts for grade 9 students",
            cover_image_url="https://example.com/covers/intro-math-101.jpg",
        )
        session.add(book)
        session.commit()
        session.refresh(book)

        # 9. Create 2 activities for the book
        activity1 = Activity(
            book_id=book.id,
            dream_activity_id="activity-001",
            activity_type=ActivityType.dragdroppicture,
            title="Match Numbers to Their Algebraic Expressions",
            config_json={
                "instructions": "Drag the numbers to match their corresponding algebraic expressions",
                "items": [
                    {"id": "1", "content": "2x + 3", "match": "A"},
                    {"id": "2", "content": "3x - 1", "match": "B"},
                ],
                "targets": [
                    {"id": "A", "label": "When x=2, result is 7"},
                    {"id": "B", "label": "When x=2, result is 5"},
                ],
            },
            order_index=1,
        )
        session.add(activity1)

        activity2 = Activity(
            book_id=book.id,
            dream_activity_id="activity-002",
            activity_type=ActivityType.matchTheWords,
            title="Match Mathematical Terms",
            config_json={
                "instructions": "Match each term with its definition",
                "pairs": [
                    {"term": "Variable", "definition": "A symbol representing a number"},
                    {"term": "Coefficient", "definition": "A number multiplied by a variable"},
                    {"term": "Constant", "definition": "A fixed value that doesn't change"},
                ],
            },
            order_index=2,
        )
        session.add(activity2)
        session.commit()
        session.refresh(activity1)

        # 10. Create an assignment from the teacher using activity1
        from datetime import datetime, timedelta, UTC

        assignment = Assignment(
            teacher_id=teacher.id,
            activity_id=activity1.id,
            book_id=book.id,
            name="Week 1 Homework - Algebraic Expressions",
            instructions="Complete the drag-and-drop activity matching numbers to algebraic expressions. You have 20 minutes.",
            due_date=datetime.now(UTC) + timedelta(days=7),
            time_limit_minutes=20,
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)

        # 11. Create assignment_students records for both enrolled students
        for student in students:
            assignment_student = AssignmentStudent(
                assignment_id=assignment.id,
                student_id=student.id,
                status=AssignmentStatus.not_started,
            )
            session.add(assignment_student)

        session.commit()
