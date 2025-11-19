import logging
import uuid
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlmodel import select

from app import crud
from app.api.deps import SessionDep, require_role
from app.models import (
    BulkImportErrorDetail,
    BulkImportResponse,
    Class,
    ClassCreateByTeacher,
    ClassPublic,
    ClassStudent,
    ClassUpdate,
    Student,
    StudentCreate,
    StudentCreateAPI,
    StudentPublic,
    StudentUpdate,
    Teacher,
    User,
    UserCreationResponse,
    UserPublic,
    UserRole,
)
from app.services.bulk_import import validate_bulk_import
from app.utils import (
    generate_temp_password,
    generate_username,
    parse_excel_file,
    validate_excel_headers,
    validate_file_size,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teachers", tags=["teachers"])


@router.post(
    "/me/students",
    response_model=UserCreationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new student",
    description="Creates a new student user. Teacher only.",
)
def create_student(
    *,
    session: SessionDep,
    student_in: StudentCreateAPI,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Create a new student.

    - **username**: Username for user account (3-50 characters, alphanumeric, underscore, or hyphen)
    - **user_email**: Email for user account
    - **full_name**: Full name for user account
    - **grade_level**: Optional grade level
    - **parent_email**: Optional parent email

    Returns user, temp_password, and student record.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Check if user email already exists
    existing_user = crud.get_user_by_email(session=session, email=student_in.user_email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Check if username already exists
    existing_username = crud.get_user_by_username(session=session, username=student_in.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username already exists"
        )

    # Generate secure temporary password
    initial_password = generate_temp_password()

    # Create Student record data
    student_create = StudentCreate(
        user_id=uuid.uuid4(),  # Placeholder, will be replaced in crud
        grade_level=student_in.grade_level,
        parent_email=student_in.parent_email
    )

    # Create user and student atomically
    user, student = crud.create_student(
        session=session,
        email=student_in.user_email,
        username=student_in.username,
        password=initial_password,
        full_name=student_in.full_name,
        student_create=student_create
    )

    # Build student response with user information
    student_data = StudentPublic(
        grade_level=student.grade_level,
        parent_email=student.parent_email,
        id=student.id,
        user_id=student.user_id,
        user_email=user.email,
        user_username=user.username,
        user_full_name=user.full_name or "",
        created_at=student.created_at,
        updated_at=student.updated_at
    )

    return UserCreationResponse(
        user=UserPublic.model_validate(user),
        initial_password=initial_password,
        role_record=student_data
    )


@router.post(
    "/me/students/bulk-import",
    response_model=BulkImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk import students from Excel",
    description="Upload Excel file to create multiple student accounts. Teacher only.",
)
async def bulk_import_students(
    *,
    session: SessionDep,
    file: UploadFile = File(...),
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Bulk import students from Excel file.

    Expected Excel columns: First Name, Last Name, Email, Grade Level, Parent Email

    Returns BulkImportResponse with created count and credentials list.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Validate file extension
    if not file.filename or not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx, .xls) are supported"
        )

    # Validate file size (max 5MB)
    if not await validate_file_size(file, max_size_mb=5):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 5MB limit"
        )

    # Parse Excel file
    try:
        rows = await parse_excel_file(file)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Excel file contains no data rows"
        )

    # Extract headers from first row
    if rows:
        headers = list(rows[0].keys())
        headers = [h for h in headers if not h.startswith('_')]  # Remove internal fields

        # Validate headers
        required_headers = ["First Name", "Last Name", "Email", "Grade Level", "Parent Email"]
        if not validate_excel_headers(headers, required_headers):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns. Expected: {', '.join(required_headers)}"
            )

    # Validate all rows
    validation_result = validate_bulk_import(rows, UserRole.student, session)

    # If validation errors, return error response
    if validation_result.error_count > 0:
        error_details = [
            BulkImportErrorDetail(
                row_number=err.row_number,
                field=None,
                message="; ".join(err.errors)
            )
            for err in validation_result.errors
        ]

        return BulkImportResponse(
            success=False,
            total_rows=len(rows),
            created_count=0,
            error_count=validation_result.error_count,
            errors=error_details,
            credentials=None
        )

    # All validations passed - create students in transaction
    created_credentials: list[dict[str, str]] = []

    try:
        for row in rows:
            email = row.get('Email', '').strip()
            first_name = row.get('First Name', '').strip()
            last_name = row.get('Last Name', '').strip()
            full_name = f"{first_name} {last_name}"
            grade_level = row.get('Grade Level', '').strip() if row.get('Grade Level') else None
            parent_email = row.get('Parent Email', '').strip() if row.get('Parent Email') else None

            # Generate temporary password
            temp_password = generate_temp_password()

            # Generate unique username
            username = generate_username(full_name, session)

            # Create Student record data
            student_create = StudentCreate(
                user_id=uuid.uuid4(),  # Placeholder, will be replaced in crud
                grade_level=grade_level,
                parent_email=parent_email
            )

            # Create user and student atomically
            user, student = crud.create_student(
                session=session,
                email=email,
                username=username,
                password=temp_password,
                full_name=full_name,
                student_create=student_create
            )

            created_credentials.append({
                "email": email,
                "temp_password": temp_password,
                "full_name": full_name
            })

        session.commit()
        logger.info(f"Bulk import: Successfully created {len(created_credentials)} students")

    except Exception as e:
        session.rollback()
        logger.error(f"Bulk import failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk import failed: {str(e)}"
        )

    return BulkImportResponse(
        success=True,
        total_rows=len(rows),
        created_count=len(created_credentials),
        error_count=0,
        errors=[],
        credentials=created_credentials
    )


@router.get(
    "/me/students",
    response_model=list[StudentPublic],
    summary="List my students",
    description="Retrieve all students (teachers can see all students to enroll them in classes). Teacher only.",
)
def list_my_students(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    List all students.

    Note: Shows all students so teachers can see students they created and enroll them in classes.
    In a future update, this will be filtered by school or teacher relationship.

    Returns list of students.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get all students (for now - will be filtered by school in future)
    students_statement = select(Student)
    students = session.exec(students_statement).all()

    # Build response list with user information for each student
    result = []
    for s in students:
        user = session.get(User, s.user_id)
        student_data = StudentPublic(
            grade_level=s.grade_level,
            parent_email=s.parent_email,
            id=s.id,
            user_id=s.user_id,
            user_email=user.email if user else "",
            user_username=user.username if user else "",
            user_full_name=user.full_name if user and user.full_name else "",
            created_at=s.created_at,
            updated_at=s.updated_at
        )
        result.append(student_data)

    return result


@router.put(
    "/me/students/{student_id}",
    response_model=StudentPublic,
    summary="Update student",
    description="Update a student's information. Teacher only.",
)
def update_student(
    *,
    session: SessionDep,
    student_id: uuid.UUID,
    student_in: StudentUpdate,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Update a student.

    Teachers can update:
    - grade_level
    - parent_email

    Note: User information (name, email, username) cannot be changed through this endpoint.
    """
    # Get Teacher record
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get student
    student = session.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    # Update student fields (grade_level, parent_email)
    update_data = student_in.model_dump(exclude_unset=True)

    # Separate user fields from student fields
    user_fields = {}
    student_fields = {}

    for key, value in update_data.items():
        if key in ['user_email', 'user_username', 'user_full_name']:
            # Map to User model fields
            if key == 'user_email':
                user_fields['email'] = value
            elif key == 'user_username':
                user_fields['username'] = value
            elif key == 'user_full_name':
                user_fields['full_name'] = value
        else:
            student_fields[key] = value

    # Update student fields
    for key, value in student_fields.items():
        setattr(student, key, value)

    # Update user fields if any
    if user_fields:
        user = session.get(User, student.user_id)
        if user:
            # Check if username is being changed
            if 'username' in user_fields and user_fields['username'] != user.username:
                # Check if new username already exists
                existing_user = crud.get_user_by_username(session=session, username=user_fields['username'])
                if existing_user and existing_user.id != user.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Username already exists"
                    )

            # Check if email is being changed
            if 'email' in user_fields and user_fields['email'] != user.email:
                # Check if new email already exists
                existing_user = crud.get_user_by_email(session=session, email=user_fields['email'])
                if existing_user and existing_user.id != user.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already exists"
                    )

            for key, value in user_fields.items():
                setattr(user, key, value)
            session.add(user)

    session.add(student)
    session.commit()
    session.refresh(student)

    # Get updated user info for response
    user = session.get(User, student.user_id)

    return StudentPublic(
        grade_level=student.grade_level,
        parent_email=student.parent_email,
        id=student.id,
        user_id=student.user_id,
        user_email=user.email if user else "",
        user_username=user.username if user else "",
        user_full_name=user.full_name if user and user.full_name else "",
        created_at=student.created_at,
        updated_at=student.updated_at
    )


@router.delete(
    "/me/students/{student_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete student",
    description="Delete a student and remove from all classes. Teacher only.",
)
def delete_student(
    *,
    session: SessionDep,
    student_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Delete a student.

    This will:
    - Remove student from all classes
    - Delete the student record
    - Delete the associated user account
    """
    # Get Teacher record
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get student
    student = session.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    # Remove from all classes first
    class_students = session.exec(
        select(ClassStudent).where(ClassStudent.student_id == student_id)
    ).all()

    for cs in class_students:
        session.delete(cs)

    # Get user_id before deleting student
    user_id = student.user_id

    # Delete student
    session.delete(student)

    # Delete associated user
    user = session.get(User, user_id)
    if user:
        session.delete(user)

    session.commit()

    return {"message": "Student deleted successfully"}


@router.get(
    "/me/classes",
    response_model=list[ClassPublic],
    summary="List my classes",
    description="Retrieve all classes taught by the authenticated teacher. Teacher only.",
)
def list_my_classes(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    List all classes taught by this teacher.

    Returns list of classes.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get all classes for this teacher
    classes_statement = select(Class).where(Class.teacher_id == teacher.id)
    classes = session.exec(classes_statement).all()

    return [ClassPublic.model_validate(c) for c in classes]


@router.post(
    "/me/classes",
    response_model=ClassPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create new class",
    description="Creates a new class for the authenticated teacher. Teacher only.",
)
def create_class(
    *,
    session: SessionDep,
    class_in: ClassCreateByTeacher,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Create a new class.

    - **name**: Class name (e.g., "Math 101", "English Grade 5")
    - **grade_level**: Optional grade level (e.g., "5", "10")
    - **subject**: Optional subject (e.g., "Mathematics", "English")
    - **academic_year**: Optional academic year (e.g., "2024-2025")

    Note: teacher_id and school_id will be set automatically from the current teacher's record.

    Returns the created class record.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Add teacher_id and school_id to class data
    class_data = class_in.model_dump()
    class_data['teacher_id'] = teacher.id
    class_data['school_id'] = teacher.school_id

    # Create class
    db_class = Class.model_validate(class_data)
    session.add(db_class)
    session.commit()
    session.refresh(db_class)

    return ClassPublic.model_validate(db_class)


@router.get(
    "/me/classes/{class_id}",
    response_model=ClassPublic,
    summary="Get class details",
    description="Retrieve details of a specific class. Teacher only.",
)
def get_class_details(
    *,
    session: SessionDep,
    class_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Get details of a specific class including enrolled students.

    Returns class details.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get class
    db_class = session.get(Class, class_id)
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    # Verify class belongs to this teacher
    if db_class.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another teacher's class"
        )

    return ClassPublic.model_validate(db_class)


@router.put(
    "/me/classes/{class_id}",
    response_model=ClassPublic,
    summary="Update class",
    description="Update a class's details. Teacher only.",
)
def update_class(
    *,
    session: SessionDep,
    class_id: uuid.UUID,
    class_in: ClassUpdate,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Update a class.

    Only the teacher who owns the class can update it.

    Returns updated class.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get class
    db_class = session.get(Class, class_id)
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    # Verify class belongs to this teacher
    if db_class.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update another teacher's class"
        )

    # Update class
    update_data = class_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_class, key, value)

    session.add(db_class)
    session.commit()
    session.refresh(db_class)

    return ClassPublic.model_validate(db_class)


@router.post(
    "/me/classes/{class_id}/students",
    status_code=status.HTTP_201_CREATED,
    summary="Add students to class",
    description="Enroll one or more students in a class. Teacher only.",
)
def add_students_to_class(
    *,
    session: SessionDep,
    class_id: uuid.UUID,
    student_ids: list[uuid.UUID],
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Add students to a class.

    - **student_ids**: List of student IDs to enroll

    Returns success message with count of students added.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get class
    db_class = session.get(Class, class_id)
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    # Verify class belongs to this teacher
    if db_class.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot add students to another teacher's class"
        )

    added_count = 0
    for student_id in student_ids:
        # Check if student exists
        student = session.get(Student, student_id)
        if not student:
            continue  # Skip non-existent students

        # Check if already enrolled
        existing = session.exec(
            select(ClassStudent)
            .where(ClassStudent.class_id == class_id)
            .where(ClassStudent.student_id == student_id)
        ).first()

        if not existing:
            # Add student to class
            class_student = ClassStudent(
                class_id=class_id,
                student_id=student_id
            )
            session.add(class_student)
            added_count += 1

    session.commit()

    return {
        "message": f"Successfully added {added_count} student(s) to class",
        "added_count": added_count
    }


@router.delete(
    "/me/classes/{class_id}/students/{student_id}",
    summary="Remove student from class",
    description="Unenroll a student from a class. Teacher only.",
)
def remove_student_from_class(
    *,
    session: SessionDep,
    class_id: uuid.UUID,
    student_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Remove a student from a class.

    Returns success message.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get class
    db_class = session.get(Class, class_id)
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    # Verify class belongs to this teacher
    if db_class.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove students from another teacher's class"
        )

    # Find enrollment
    class_student = session.exec(
        select(ClassStudent)
        .where(ClassStudent.class_id == class_id)
        .where(ClassStudent.student_id == student_id)
    ).first()

    if not class_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not enrolled in this class"
        )

    # Remove enrollment
    session.delete(class_student)
    session.commit()

    return {"message": "Student removed from class successfully"}


@router.get(
    "/me/classes/{class_id}/students",
    response_model=list[StudentPublic],
    summary="Get students in class",
    description="Retrieve all students enrolled in a specific class. Teacher only.",
)
def get_class_students(
    *,
    session: SessionDep,
    class_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Get all students enrolled in a class.

    Returns list of students.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get class
    db_class = session.get(Class, class_id)
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    # Verify class belongs to this teacher
    if db_class.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another teacher's class"
        )

    # Get enrolled students
    students_statement = (
        select(Student)
        .join(ClassStudent, ClassStudent.student_id == Student.id)
        .where(ClassStudent.class_id == class_id)
    )
    students = session.exec(students_statement).all()

    # Build response
    result = []
    for s in students:
        user = session.get(User, s.user_id)
        student_data = StudentPublic(
            grade_level=s.grade_level,
            parent_email=s.parent_email,
            id=s.id,
            user_id=s.user_id,
            user_email=user.email if user else "",
            user_username=user.username if user else "",
            user_full_name=user.full_name if user and user.full_name else "",
            created_at=s.created_at,
            updated_at=s.updated_at
        )
        result.append(student_data)

    return result
