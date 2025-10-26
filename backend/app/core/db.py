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

        session.commit()
