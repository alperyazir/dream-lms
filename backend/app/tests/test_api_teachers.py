"""
Tests for teacher API endpoints
"""
import re
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
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


def test_teacher_create_student(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test teacher can create student successfully"""
    # Create publisher user and publisher
    from app.models import Publisher, UserRole
    pub_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher",
        contact_email="pub@test.com"
    )
    session.add(publisher)
    session.flush()

    # Create school
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        publisher_id=publisher.id,
        address="School Address"
    )
    session.add(school)
    session.flush()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Mathematics"
    )
    session.add(teacher)
    session.commit()

    student_data = {
        "user_email": "newstudent@example.com",
        "full_name": "New Student",
        "grade_level": "5th Grade",
        "parent_email": "parent@example.com"
    }

    response = client.post(
        f"{settings.API_V1_STR}/teachers/me/students",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=student_data
    )

    assert response.status_code == 201
    data = response.json()

    # Verify response structure (secure password flow)
    assert "user" in data
    assert "temporary_password" in data
    assert "role_record" in data
    assert "password_emailed" in data
    assert "message" in data

    # Verify user data
    assert data["user"]["email"] == student_data["user_email"]
    assert data["user"]["full_name"] == student_data["full_name"]
    assert data["user"]["role"] == "student"
    assert data["user"]["must_change_password"] is True

    # Verify temp password (returned since emails disabled in tests)
    assert data["temporary_password"] is not None
    assert len(data["temporary_password"]) == 12

    # Verify student record
    assert data["role_record"]["grade_level"] == student_data["grade_level"]
    assert data["role_record"]["parent_email"] == student_data["parent_email"]

    # Verify in database
    user = session.exec(select(User).where(User.email == student_data["user_email"])).first()
    assert user is not None
    assert user.role.value == "student"

    student = session.exec(select(Student).where(Student.user_id == user.id)).first()
    assert student is not None
    assert student.grade_level == student_data["grade_level"]


def test_teacher_list_students(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test teacher sees students enrolled in their classes"""
    # Create publisher user and publisher
    from app.models import Publisher
    pub_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher",
        contact_email="pub@test.com"
    )
    session.add(publisher)
    session.flush()

    # Create school and teacher
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        publisher_id=publisher.id,
        address="School Address"
    )
    session.add(school)
    session.flush()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Science"
    )
    session.add(teacher)
    session.flush()

    # Create a class for this teacher
    class_obj = Class(
        id=uuid.uuid4(),
        name="Science 101",
        teacher_id=teacher.id,
        school_id=school.id,
        grade_level="6th Grade"
    )
    session.add(class_obj)
    session.flush()

    # Create students enrolled in teacher's class
    student1_user = User(
        id=uuid.uuid4(),
        email="student1@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.student,
        full_name="Student One"
    )
    session.add(student1_user)
    session.flush()

    student1 = Student(
        id=uuid.uuid4(),
        user_id=student1_user.id,
        grade_level="6th Grade"
    )
    session.add(student1)
    session.flush()

    student2_user = User(
        id=uuid.uuid4(),
        email="student2@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.student,
        full_name="Student Two"
    )
    session.add(student2_user)
    session.flush()

    student2 = Student(
        id=uuid.uuid4(),
        user_id=student2_user.id,
        grade_level="6th Grade"
    )
    session.add(student2)
    session.flush()

    # Enroll students in class
    enrollment1 = ClassStudent(
        id=uuid.uuid4(),
        class_id=class_obj.id,
        student_id=student1.id
    )
    enrollment2 = ClassStudent(
        id=uuid.uuid4(),
        class_id=class_obj.id,
        student_id=student2.id
    )
    session.add_all([enrollment1, enrollment2])
    session.commit()

    # Request students as authenticated teacher
    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/students",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    # Should see both students
    assert len(data) == 2
    student_ids = [s["id"] for s in data]
    assert str(student1.id) in student_ids
    assert str(student2.id) in student_ids


def test_teacher_receives_temporary_password(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test response includes temp password when creating student (secure password flow)"""
    # Create publisher user and publisher
    from app.models import Publisher
    pub_user = User(
        id=uuid.uuid4(),
        email="pub2@test.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher",
        contact_email="pub2@test.com"
    )
    session.add(publisher)
    session.flush()

    # Create teacher record
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        publisher_id=publisher.id,
        address="Address"
    )
    session.add(school)
    session.flush()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="English"
    )
    session.add(teacher)
    session.commit()

    student_data = {
        "user_email": "student@example.com",
        "full_name": "Student",
        "grade_level": "7th Grade",
        "parent_email": "parent@example.com"
    }

    response = client.post(
        f"{settings.API_V1_STR}/teachers/me/students",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=student_data
    )

    assert response.status_code == 201
    data = response.json()

    # Verify secure password response structure
    assert "temporary_password" in data
    assert "password_emailed" in data
    assert "message" in data
    assert data["user"]["must_change_password"] is True

    # Verify temp password format (returned since emails disabled in tests)
    temp_password = data["temporary_password"]
    assert temp_password is not None
    assert len(temp_password) == 12
    assert re.match(r'^[A-Za-z0-9!@#$%^&*]+$', temp_password)


def test_students_appear_in_correct_teacher_list(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test student enrolled in Class A appears for Teacher A"""
    # Create publisher user and publisher
    from app.models import Publisher
    pub_user = User(
        id=uuid.uuid4(),
        email="pub3@test.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher",
        contact_email="pub3@test.com"
    )
    session.add(publisher)
    session.flush()

    # Create school
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        publisher_id=publisher.id,
        address="Address"
    )
    session.add(school)
    session.flush()

    # Create teacher A (authenticated user)
    teacher_a = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Math"
    )
    session.add(teacher_a)
    session.flush()

    # Create teacher B
    teacher_b_user = User(
        id=uuid.uuid4(),
        email="teacherb@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.teacher,
        full_name="Teacher B"
    )
    session.add(teacher_b_user)
    session.flush()

    teacher_b = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_b_user.id,
        school_id=school.id,
        subject_specialization="Science"
    )
    session.add(teacher_b)
    session.flush()

    # Create classes for both teachers
    class_a = Class(
        id=uuid.uuid4(),
        name="Math 101",
        teacher_id=teacher_a.id,
        school_id=school.id,
        grade_level="8th Grade"
    )
    class_b = Class(
        id=uuid.uuid4(),
        name="Science 101",
        teacher_id=teacher_b.id,
        school_id=school.id,
        grade_level="8th Grade"
    )
    session.add_all([class_a, class_b])
    session.flush()

    # Create student enrolled only in Teacher A's class
    student_user = User(
        id=uuid.uuid4(),
        email="student@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.student,
        full_name="Student"
    )
    session.add(student_user)
    session.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        grade_level="8th Grade"
    )
    session.add(student)
    session.flush()

    # Enroll student in Teacher A's class only
    enrollment = ClassStudent(
        id=uuid.uuid4(),
        class_id=class_a.id,
        student_id=student.id
    )
    session.add(enrollment)
    session.commit()

    # Request students as Teacher A
    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/students",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    # Teacher A should see the student
    assert len(data) == 1
    assert data[0]["id"] == str(student.id)
