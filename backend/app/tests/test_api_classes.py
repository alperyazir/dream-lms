"""
Tests for class management API endpoints
"""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    Class,
    ClassStudent,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


def test_create_class_success(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test successful class creation by authenticated teacher"""
    # Setup: Create publisher, school, and teacher
    pub_user = User(
        id=uuid.uuid4(),
        email="pub@test.com",
        username="pubtest",
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

    # Test: Create class
    class_data = {
        "name": "Math 101",
        "grade_level": "10th Grade",
        "subject": "Mathematics",
        "academic_year": "2024-2025"
    }

    response = client.post(
        f"{settings.API_V1_STR}/classes",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=class_data
    )

    if response.status_code != 201:
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.json()}")
    assert response.status_code == 201
    data = response.json()

    # Verify response structure
    assert data["name"] == "Math 101"
    assert data["grade_level"] == "10th Grade"
    assert data["subject"] == "Mathematics"
    assert data["academic_year"] == "2024-2025"
    assert data["is_active"] is True
    assert data["student_count"] == 0
    assert data["teacher_id"] == str(teacher.id)
    assert data["school_id"] == str(school.id)
    assert "id" in data
    assert "created_at" in data

    # Verify in database
    class_obj = session.exec(select(Class).where(Class.name == "Math 101")).first()
    assert class_obj is not None
    assert class_obj.teacher_id == teacher.id


def test_create_class_requires_teacher_role(
    client: TestClient, session: Session, student_token: str
) -> None:
    """Test that non-teachers cannot create classes"""
    class_data = {
        "name": "Unauthorized Class",
        "grade_level": "5th Grade",
        "subject": "Science",
        "academic_year": "2024-2025"
    }

    response = client.post(
        f"{settings.API_V1_STR}/classes",
        headers={"Authorization": f"Bearer {student_token}"},
        json=class_data
    )

    assert response.status_code == 403
    assert "Access forbidden" in response.json()["detail"]


def test_create_class_missing_required_fields(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test class creation fails with missing required name field"""
    # Setup teacher with school
    pub_user = User(
        id=uuid.uuid4(),
        email="pub2@test.com",
        username="pub2test",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher 2",
        contact_email="pub2@test.com"
    )
    session.add(publisher)
    session.flush()

    school = School(
        id=uuid.uuid4(),
        name="Test School 2",
        publisher_id=publisher.id,
        address="Address 2"
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
    session.commit()

    # Test: Missing name field
    class_data = {
        "grade_level": "5th Grade",
        "subject": "Science"
    }

    response = client.post(
        f"{settings.API_V1_STR}/classes",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=class_data
    )

    assert response.status_code == 422  # Validation error


def test_list_classes_filters_by_teacher(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test that teachers only see their own classes"""
    # Setup: Create two teachers with classes
    pub_user = User(
        id=uuid.uuid4(),
        email="pub3@test.com",
        username="pub3test",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher 3",
        contact_email="pub3@test.com"
    )
    session.add(publisher)
    session.flush()

    school = School(
        id=uuid.uuid4(),
        name="Test School 3",
        publisher_id=publisher.id,
        address="Address 3"
    )
    session.add(school)
    session.flush()

    teacher1 = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Math"
    )
    session.add(teacher1)
    session.flush()

    # Create another teacher
    teacher2_user = User(
        id=uuid.uuid4(),
        email="teacher2@test.com",
        username="teacher2",
        hashed_password=get_password_hash("password"),
        role=UserRole.teacher,
        full_name="Teacher 2"
    )
    session.add(teacher2_user)
    session.flush()

    teacher2 = Teacher(
        id=uuid.uuid4(),
        user_id=teacher2_user.id,
        school_id=school.id,
        subject_specialization="Science"
    )
    session.add(teacher2)
    session.flush()

    # Create classes for both teachers
    class1 = Class(
        id=uuid.uuid4(),
        name="Teacher 1 Class",
        teacher_id=teacher1.id,
        school_id=school.id
    )
    session.add(class1)

    class2 = Class(
        id=uuid.uuid4(),
        name="Teacher 2 Class",
        teacher_id=teacher2.id,
        school_id=school.id
    )
    session.add(class2)
    session.commit()

    # Test: Teacher 1 should only see their own class
    response = client.get(
        f"{settings.API_V1_STR}/classes",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Teacher 1 Class"
    assert data[0]["teacher_id"] == str(teacher1.id)


def test_list_classes_excludes_inactive(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test that inactive classes are not listed"""
    # Setup
    pub_user = User(
        id=uuid.uuid4(),
        email="pub4@test.com",
        username="pub4test",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher 4",
        contact_email="pub4@test.com"
    )
    session.add(publisher)
    session.flush()

    school = School(
        id=uuid.uuid4(),
        name="Test School 4",
        publisher_id=publisher.id,
        address="Address 4"
    )
    session.add(school)
    session.flush()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="History"
    )
    session.add(teacher)
    session.flush()

    # Create active and inactive classes
    active_class = Class(
        id=uuid.uuid4(),
        name="Active Class",
        teacher_id=teacher.id,
        school_id=school.id,
        is_active=True
    )
    session.add(active_class)

    inactive_class = Class(
        id=uuid.uuid4(),
        name="Inactive Class",
        teacher_id=teacher.id,
        school_id=school.id,
        is_active=False
    )
    session.add(inactive_class)
    session.commit()

    # Test: Should only see active class
    response = client.get(
        f"{settings.API_V1_STR}/classes",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Active Class"
    assert data[0]["is_active"] is True


def test_get_class_detail_success(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test getting class details with enrolled students"""
    # Setup
    pub_user = User(
        id=uuid.uuid4(),
        email="pub5@test.com",
        username="pub5test",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher 5",
        contact_email="pub5@test.com"
    )
    session.add(publisher)
    session.flush()

    school = School(
        id=uuid.uuid4(),
        name="Test School 5",
        publisher_id=publisher.id,
        address="Address 5"
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
    session.flush()

    # Create class
    class_obj = Class(
        id=uuid.uuid4(),
        name="English 101",
        teacher_id=teacher.id,
        school_id=school.id,
        grade_level="9th Grade",
        subject="English"
    )
    session.add(class_obj)
    session.flush()

    # Create student
    student_user = User(
        id=uuid.uuid4(),
        email="student1@test.com",
        username="student1",
        hashed_password=get_password_hash("password"),
        role=UserRole.student,
        full_name="Student One"
    )
    session.add(student_user)
    session.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        grade_level="9th Grade"
    )
    session.add(student)
    session.flush()

    # Enroll student in class
    enrollment = ClassStudent(
        id=uuid.uuid4(),
        class_id=class_obj.id,
        student_id=student.id
    )
    session.add(enrollment)
    session.commit()

    # Test: Get class details
    response = client.get(
        f"{settings.API_V1_STR}/classes/{class_obj.id}",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "English 101"
    assert data["student_count"] == 1
    assert len(data["enrolled_students"]) == 1
    assert data["enrolled_students"][0]["full_name"] == "Student One"
    assert data["enrolled_students"][0]["grade"] == "9th Grade"


def test_get_class_detail_not_owner(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test that teachers cannot access other teachers' classes"""
    # Setup: Create another teacher's class
    pub_user = User(
        id=uuid.uuid4(),
        email="pub6@test.com",
        username="pub6test",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher 6",
        contact_email="pub6@test.com"
    )
    session.add(publisher)
    session.flush()

    school = School(
        id=uuid.uuid4(),
        name="Test School 6",
        publisher_id=publisher.id,
        address="Address 6"
    )
    session.add(school)
    session.flush()

    other_teacher_user = User(
        id=uuid.uuid4(),
        email="otherteacher@test.com",
        username="otherteacher",
        hashed_password=get_password_hash("password"),
        role=UserRole.teacher,
        full_name="Other Teacher"
    )
    session.add(other_teacher_user)
    session.flush()

    other_teacher = Teacher(
        id=uuid.uuid4(),
        user_id=other_teacher_user.id,
        school_id=school.id,
        subject_specialization="Art"
    )
    session.add(other_teacher)
    session.flush()

    other_class = Class(
        id=uuid.uuid4(),
        name="Other Teacher Class",
        teacher_id=other_teacher.id,
        school_id=school.id
    )
    session.add(other_class)
    session.commit()

    # Test: Teacher 1 tries to access Teacher 2's class
    response = client.get(
        f"{settings.API_V1_STR}/classes/{other_class.id}",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    # Should return 404 to not expose existence
    assert response.status_code == 404


def test_update_class_success(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test successful class update"""
    # Setup
    pub_user = User(
        id=uuid.uuid4(),
        email="pub7@test.com",
        username="pub7test",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher 7",
        contact_email="pub7@test.com"
    )
    session.add(publisher)
    session.flush()

    school = School(
        id=uuid.uuid4(),
        name="Test School 7",
        publisher_id=publisher.id,
        address="Address 7"
    )
    session.add(school)
    session.flush()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Physics"
    )
    session.add(teacher)
    session.flush()

    class_obj = Class(
        id=uuid.uuid4(),
        name="Physics 101",
        teacher_id=teacher.id,
        school_id=school.id,
        grade_level="11th Grade"
    )
    session.add(class_obj)
    session.commit()

    # Test: Update class
    update_data = {
        "name": "Physics 102 - Updated",
        "grade_level": "12th Grade",
        "subject": "Advanced Physics"
    }

    response = client.put(
        f"{settings.API_V1_STR}/classes/{class_obj.id}",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=update_data
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Physics 102 - Updated"
    assert data["grade_level"] == "12th Grade"
    assert data["subject"] == "Advanced Physics"

    # Verify in database
    session.refresh(class_obj)
    assert class_obj.name == "Physics 102 - Updated"


def test_archive_class_success(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test soft delete (archive) of class"""
    # Setup
    pub_user = User(
        id=uuid.uuid4(),
        email="pub8@test.com",
        username="pub8test",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher 8",
        contact_email="pub8@test.com"
    )
    session.add(publisher)
    session.flush()

    school = School(
        id=uuid.uuid4(),
        name="Test School 8",
        publisher_id=publisher.id,
        address="Address 8"
    )
    session.add(school)
    session.flush()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Chemistry"
    )
    session.add(teacher)
    session.flush()

    class_obj = Class(
        id=uuid.uuid4(),
        name="Chemistry 101",
        teacher_id=teacher.id,
        school_id=school.id,
        is_active=True
    )
    session.add(class_obj)
    session.commit()

    # Test: Archive class
    response = client.delete(
        f"{settings.API_V1_STR}/classes/{class_obj.id}",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    assert response.status_code == 204

    # Verify in database - should be soft deleted
    session.refresh(class_obj)
    assert class_obj.is_active is False


def test_add_students_to_class_success(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test adding multiple students to a class"""
    # Setup
    pub_user = User(
        id=uuid.uuid4(),
        email="pub9@test.com",
        username="pub9test",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher 9",
        contact_email="pub9@test.com"
    )
    session.add(publisher)
    session.flush()

    school = School(
        id=uuid.uuid4(),
        name="Test School 9",
        publisher_id=publisher.id,
        address="Address 9"
    )
    session.add(school)
    session.flush()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Biology"
    )
    session.add(teacher)
    session.flush()

    class_obj = Class(
        id=uuid.uuid4(),
        name="Biology 101",
        teacher_id=teacher.id,
        school_id=school.id
    )
    session.add(class_obj)
    session.flush()

    # Create students
    student1_user = User(
        id=uuid.uuid4(),
        email="student2@test.com",
        username="student2",
        hashed_password=get_password_hash("password"),
        role=UserRole.student,
        full_name="Student Two"
    )
    session.add(student1_user)
    session.flush()

    student1 = Student(
        id=uuid.uuid4(),
        user_id=student1_user.id
    )
    session.add(student1)
    session.flush()

    student2_user = User(
        id=uuid.uuid4(),
        email="student3@test.com",
        username="student3",
        hashed_password=get_password_hash("password"),
        role=UserRole.student,
        full_name="Student Three"
    )
    session.add(student2_user)
    session.flush()

    student2 = Student(
        id=uuid.uuid4(),
        user_id=student2_user.id
    )
    session.add(student2)
    session.commit()

    # Test: Add students to class
    add_data = {
        "student_ids": [str(student1.id), str(student2.id)]
    }

    response = client.post(
        f"{settings.API_V1_STR}/classes/{class_obj.id}/students",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=add_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["enrolled_count"] == 2
    assert data["skipped_count"] == 0

    # Verify in database
    enrollments = session.exec(
        select(ClassStudent).where(ClassStudent.class_id == class_obj.id)
    ).all()
    assert len(enrollments) == 2


def test_add_students_idempotent(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test that adding already enrolled student is idempotent"""
    # Setup
    pub_user = User(
        id=uuid.uuid4(),
        email="pub10@test.com",
        username="pub10test",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher 10",
        contact_email="pub10@test.com"
    )
    session.add(publisher)
    session.flush()

    school = School(
        id=uuid.uuid4(),
        name="Test School 10",
        publisher_id=publisher.id,
        address="Address 10"
    )
    session.add(school)
    session.flush()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Music"
    )
    session.add(teacher)
    session.flush()

    class_obj = Class(
        id=uuid.uuid4(),
        name="Music 101",
        teacher_id=teacher.id,
        school_id=school.id
    )
    session.add(class_obj)
    session.flush()

    student_user = User(
        id=uuid.uuid4(),
        email="student4@test.com",
        username="student4",
        hashed_password=get_password_hash("password"),
        role=UserRole.student,
        full_name="Student Four"
    )
    session.add(student_user)
    session.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id
    )
    session.add(student)
    session.flush()

    # Already enrolled
    enrollment = ClassStudent(
        id=uuid.uuid4(),
        class_id=class_obj.id,
        student_id=student.id
    )
    session.add(enrollment)
    session.commit()

    # Test: Add same student again
    add_data = {
        "student_ids": [str(student.id)]
    }

    response = client.post(
        f"{settings.API_V1_STR}/classes/{class_obj.id}/students",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=add_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["enrolled_count"] == 0
    assert data["skipped_count"] == 1


def test_remove_student_from_class_success(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test removing student from class"""
    # Setup
    pub_user = User(
        id=uuid.uuid4(),
        email="pub11@test.com",
        username="pub11test",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher 11",
        contact_email="pub11@test.com"
    )
    session.add(publisher)
    session.flush()

    school = School(
        id=uuid.uuid4(),
        name="Test School 11",
        publisher_id=publisher.id,
        address="Address 11"
    )
    session.add(school)
    session.flush()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Geography"
    )
    session.add(teacher)
    session.flush()

    class_obj = Class(
        id=uuid.uuid4(),
        name="Geography 101",
        teacher_id=teacher.id,
        school_id=school.id
    )
    session.add(class_obj)
    session.flush()

    student_user = User(
        id=uuid.uuid4(),
        email="student5@test.com",
        username="student5",
        hashed_password=get_password_hash("password"),
        role=UserRole.student,
        full_name="Student Five"
    )
    session.add(student_user)
    session.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id
    )
    session.add(student)
    session.flush()

    enrollment = ClassStudent(
        id=uuid.uuid4(),
        class_id=class_obj.id,
        student_id=student.id
    )
    session.add(enrollment)
    session.commit()

    # Test: Remove student
    response = client.delete(
        f"{settings.API_V1_STR}/classes/{class_obj.id}/students/{student.id}",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    assert response.status_code == 204

    # Verify removed from database
    remaining = session.exec(
        select(ClassStudent).where(
            ClassStudent.class_id == class_obj.id,
            ClassStudent.student_id == student.id
        )
    ).first()
    assert remaining is None


def test_remove_student_not_enrolled(
    client: TestClient, session: Session, teacher_token: str, teacher_user: User
) -> None:
    """Test removing student that is not enrolled returns 404"""
    # Setup
    pub_user = User(
        id=uuid.uuid4(),
        email="pub12@test.com",
        username="pub12test",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Publisher"
    )
    session.add(pub_user)
    session.flush()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher 12",
        contact_email="pub12@test.com"
    )
    session.add(publisher)
    session.flush()

    school = School(
        id=uuid.uuid4(),
        name="Test School 12",
        publisher_id=publisher.id,
        address="Address 12"
    )
    session.add(school)
    session.flush()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Drama"
    )
    session.add(teacher)
    session.flush()

    class_obj = Class(
        id=uuid.uuid4(),
        name="Drama 101",
        teacher_id=teacher.id,
        school_id=school.id
    )
    session.add(class_obj)
    session.flush()

    student_user = User(
        id=uuid.uuid4(),
        email="student6@test.com",
        username="student6",
        hashed_password=get_password_hash("password"),
        role=UserRole.student,
        full_name="Student Six"
    )
    session.add(student_user)
    session.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id
    )
    session.add(student)
    session.commit()

    # Test: Remove student not enrolled
    response = client.delete(
        f"{settings.API_V1_STR}/classes/{class_obj.id}/students/{student.id}",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    assert response.status_code == 404
    assert "not enrolled" in response.json()["detail"]
