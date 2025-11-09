import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional, Any

from pydantic import EmailStr, field_validator, model_validator
from sqlalchemy import Column, JSON, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models import (
        Assignment,
        AssignmentStudent,
        Activity,
        Book,
        Class,
        ClassStudent,
        Publisher,
        School,
        Student,
        Teacher,
    )


class UserRole(str, Enum):
    """User role enumeration for RBAC"""
    admin = "admin"
    publisher = "publisher"
    teacher = "teacher"
    student = "student"


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole = Field(default=UserRole.student)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str

    # Relationships to role-specific tables (one-to-one, optional)
    publisher: Optional["Publisher"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    teacher: Optional["Teacher"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    student: Optional["Student"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None
    role: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)


# ============================================================================
# LMS Domain Models - Publishers, Schools, Teachers, Students
# ============================================================================

# --- Publisher Models ---

class PublisherBase(SQLModel):
    """Shared Publisher properties"""
    name: str = Field(max_length=255)
    contact_email: str | None = Field(default=None, max_length=255)


class PublisherCreate(PublisherBase):
    """Properties to receive via API on Publisher creation"""
    user_id: uuid.UUID


class PublisherUpdate(SQLModel):
    """Properties to receive via API on Publisher update"""
    name: str | None = Field(default=None, max_length=255)
    contact_email: str | None = Field(default=None, max_length=255)
    user_email: str | None = Field(default=None, max_length=255)
    user_full_name: str | None = Field(default=None, max_length=255)


class Publisher(PublisherBase, table=True):
    """Publisher database model"""
    __tablename__ = "publishers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    user: User = Relationship(back_populates="publisher", sa_relationship_kwargs={"passive_deletes": True})
    schools: list["School"] = Relationship(back_populates="publisher", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    books: list["Book"] = Relationship(back_populates="publisher", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class PublisherPublic(PublisherBase):
    """Properties to return via API"""
    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_full_name: str
    created_at: datetime
    updated_at: datetime


class PublisherCreateAPI(SQLModel):
    """Properties for API endpoint publisher creation (includes user creation)"""
    name: str = Field(max_length=255)
    contact_email: EmailStr = Field(max_length=255)
    user_email: EmailStr = Field(max_length=255)
    full_name: str = Field(max_length=255)


# --- School Models ---

class SchoolBase(SQLModel):
    """Shared School properties"""
    name: str = Field(max_length=255)
    address: str | None = Field(default=None)
    contact_info: str | None = Field(default=None)


class SchoolCreate(SchoolBase):
    """Properties to receive via API on School creation"""
    publisher_id: uuid.UUID


class SchoolUpdate(SQLModel):
    """Properties to receive via API on School update"""
    name: str | None = Field(default=None, max_length=255)
    address: str | None = Field(default=None)
    contact_info: str | None = Field(default=None)
    publisher_id: uuid.UUID | None = Field(default=None)


class School(SchoolBase, table=True):
    """School database model"""
    __tablename__ = "schools"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    publisher_id: uuid.UUID = Field(foreign_key="publishers.id", index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    publisher: Publisher = Relationship(back_populates="schools", sa_relationship_kwargs={"passive_deletes": True})
    teachers: list["Teacher"] = Relationship(back_populates="school", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    classes: list["Class"] = Relationship(back_populates="school", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class SchoolPublic(SchoolBase):
    """Properties to return via API"""
    id: uuid.UUID
    publisher_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Teacher Models ---

class TeacherBase(SQLModel):
    """Shared Teacher properties"""
    subject_specialization: str | None = Field(default=None, max_length=255)


class TeacherCreate(TeacherBase):
    """Properties to receive via API on Teacher creation"""
    user_id: uuid.UUID
    school_id: uuid.UUID


class TeacherUpdate(SQLModel):
    """Properties to receive via API on Teacher update"""
    school_id: uuid.UUID | None = Field(default=None)
    subject_specialization: str | None = Field(default=None, max_length=255)
    user_email: str | None = Field(default=None, max_length=255)
    user_full_name: str | None = Field(default=None, max_length=255)


class Teacher(TeacherBase, table=True):
    """Teacher database model"""
    __tablename__ = "teachers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, index=True, ondelete="CASCADE")
    school_id: uuid.UUID = Field(foreign_key="schools.id", index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    user: User = Relationship(back_populates="teacher", sa_relationship_kwargs={"passive_deletes": True})
    school: School = Relationship(back_populates="teachers", sa_relationship_kwargs={"passive_deletes": True})
    classes: list["Class"] = Relationship(back_populates="teacher", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    assignments: list["Assignment"] = Relationship(back_populates="teacher", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class TeacherPublic(TeacherBase):
    """Properties to return via API"""
    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_full_name: str
    school_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class TeacherCreateAPI(SQLModel):
    """Properties for API endpoint teacher creation (includes user creation)"""
    user_email: EmailStr = Field(max_length=255)
    full_name: str = Field(max_length=255)
    school_id: uuid.UUID
    subject_specialization: str | None = Field(default=None, max_length=255)


# --- Student Models ---

class StudentBase(SQLModel):
    """Shared Student properties"""
    grade_level: str | None = Field(default=None, max_length=50)
    parent_email: str | None = Field(default=None, max_length=255)


class StudentCreate(StudentBase):
    """Properties to receive via API on Student creation"""
    user_id: uuid.UUID


class StudentUpdate(SQLModel):
    """Properties to receive via API on Student update"""
    user_email: str | None = Field(default=None, max_length=255)
    user_full_name: str | None = Field(default=None, max_length=255)
    grade_level: str | None = Field(default=None, max_length=50)
    parent_email: str | None = Field(default=None, max_length=255)


class Student(StudentBase, table=True):
    """Student database model"""
    __tablename__ = "students"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    user: User = Relationship(back_populates="student", sa_relationship_kwargs={"passive_deletes": True})
    class_enrollments: list["ClassStudent"] = Relationship(back_populates="student", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    assignment_submissions: list["AssignmentStudent"] = Relationship(back_populates="student", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class StudentPublic(StudentBase):
    """Properties to return via API"""
    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_full_name: str
    created_at: datetime
    updated_at: datetime


class StudentCreateAPI(SQLModel):
    """Properties for API endpoint student creation (includes user creation)"""
    user_email: EmailStr = Field(max_length=255)
    full_name: str = Field(max_length=255)
    grade_level: str | None = Field(default=None, max_length=50)
    parent_email: EmailStr | None = Field(default=None, max_length=255)


# Response for user creation endpoints with temporary password
class UserCreationResponse(SQLModel):
    """Response schema for role-specific user creation endpoints"""
    user: UserPublic
    temp_password: str
    role_record: PublisherPublic | TeacherPublic | StudentPublic


# Dashboard statistics
class DashboardStats(SQLModel):
    """Dashboard statistics for admin view"""
    total_users: int
    total_publishers: int
    total_teachers: int
    total_students: int
    active_schools: int
    total_books: int
    total_assignments: int


# ============================================================================
# LMS Core Models - Classes, Books, Activities, Assignments
# ============================================================================

# --- Class Models ---

class ClassBase(SQLModel):
    """Shared Class properties"""
    name: str = Field(max_length=255)
    grade_level: str | None = Field(default=None, max_length=50)
    subject: str | None = Field(default=None, max_length=100)
    academic_year: str | None = Field(default=None, max_length=20)
    is_active: bool = Field(default=True)


class ClassCreate(ClassBase):
    """Properties to receive via API on Class creation"""
    teacher_id: uuid.UUID
    school_id: uuid.UUID


class ClassUpdate(SQLModel):
    """Properties to receive via API on Class update"""
    name: str | None = Field(default=None, max_length=255)
    grade_level: str | None = Field(default=None, max_length=50)
    subject: str | None = Field(default=None, max_length=100)
    academic_year: str | None = Field(default=None, max_length=20)
    is_active: bool | None = Field(default=None)


class Class(ClassBase, table=True):
    """Class database model"""
    __tablename__ = "classes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    teacher_id: uuid.UUID = Field(foreign_key="teachers.id", index=True, ondelete="CASCADE")
    school_id: uuid.UUID = Field(foreign_key="schools.id", index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    teacher: Teacher = Relationship(back_populates="classes", sa_relationship_kwargs={"passive_deletes": True})
    school: School = Relationship(back_populates="classes", sa_relationship_kwargs={"passive_deletes": True})
    class_students: list["ClassStudent"] = Relationship(back_populates="class_obj", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class ClassPublic(ClassBase):
    """Properties to return via API"""
    id: uuid.UUID
    teacher_id: uuid.UUID
    school_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- ClassStudent Junction Table ---

class ClassStudentBase(SQLModel):
    """Shared ClassStudent properties"""
    pass


class ClassStudentCreate(ClassStudentBase):
    """Properties to receive via API on ClassStudent creation"""
    class_id: uuid.UUID
    student_id: uuid.UUID


class ClassStudent(ClassStudentBase, table=True):
    """Junction table for class enrollments"""
    __tablename__ = "class_students"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    class_id: uuid.UUID = Field(foreign_key="classes.id", index=True, ondelete="CASCADE")
    student_id: uuid.UUID = Field(foreign_key="students.id", index=True, ondelete="CASCADE")
    enrolled_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # SQLAlchemy-level unique constraint
    __table_args__ = (
        UniqueConstraint('class_id', 'student_id', name='uq_class_student'),
    )

    # Relationships
    class_obj: Class = Relationship(back_populates="class_students", sa_relationship_kwargs={"passive_deletes": True})
    student: Student = Relationship(back_populates="class_enrollments", sa_relationship_kwargs={"passive_deletes": True})


class ClassStudentPublic(ClassStudentBase):
    """Properties to return via API"""
    id: uuid.UUID
    class_id: uuid.UUID
    student_id: uuid.UUID
    enrolled_at: datetime


# --- Book Models ---

class BookBase(SQLModel):
    """Shared Book properties"""
    dream_storage_id: str = Field(unique=True, max_length=255)
    title: str = Field(max_length=500)
    description: str | None = Field(default=None)
    cover_image_url: str | None = Field(default=None)


class BookCreate(BookBase):
    """Properties to receive via API on Book creation"""
    publisher_id: uuid.UUID


class BookUpdate(SQLModel):
    """Properties to receive via API on Book update"""
    title: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None)
    cover_image_url: str | None = Field(default=None)


class Book(BookBase, table=True):
    """Book database model"""
    __tablename__ = "books"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    publisher_id: uuid.UUID = Field(foreign_key="publishers.id", index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    publisher: Publisher = Relationship(back_populates="books", sa_relationship_kwargs={"passive_deletes": True})
    activities: list["Activity"] = Relationship(back_populates="book", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    assignments: list["Assignment"] = Relationship(back_populates="book", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class BookPublic(BookBase):
    """Properties to return via API"""
    id: uuid.UUID
    publisher_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Activity Models ---

class ActivityType(str, Enum):
    """Activity type enumeration"""
    dragdroppicture = "dragdroppicture"
    dragdroppicturegroup = "dragdroppicturegroup"
    matchTheWords = "matchTheWords"
    circle = "circle"
    markwithx = "markwithx"
    puzzleFindWords = "puzzleFindWords"


class ActivityBase(SQLModel):
    """Shared Activity properties"""
    dream_activity_id: str | None = Field(default=None, max_length=255)
    activity_type: ActivityType
    title: str | None = Field(default=None, max_length=500)
    config_json: dict = Field(sa_column=Column(JSON))
    order_index: int = Field(default=0)


class ActivityCreate(ActivityBase):
    """Properties to receive via API on Activity creation"""
    book_id: uuid.UUID


class ActivityUpdate(SQLModel):
    """Properties to receive via API on Activity update"""
    dream_activity_id: str | None = Field(default=None, max_length=255)
    activity_type: ActivityType | None = Field(default=None)
    title: str | None = Field(default=None, max_length=500)
    config_json: dict | None = Field(default=None, sa_column=Column(JSON))
    order_index: int | None = Field(default=None)


class Activity(ActivityBase, table=True):
    """Activity database model"""
    __tablename__ = "activities"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    book_id: uuid.UUID = Field(foreign_key="books.id", index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    book: Book = Relationship(back_populates="activities", sa_relationship_kwargs={"passive_deletes": True})
    assignments: list["Assignment"] = Relationship(back_populates="activity", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class ActivityPublic(ActivityBase):
    """Properties to return via API"""
    id: uuid.UUID
    book_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Assignment Models ---

class AssignmentBase(SQLModel):
    """Shared Assignment properties"""
    name: str = Field(max_length=500)
    instructions: str | None = Field(default=None)
    due_date: datetime | None = Field(default=None)
    time_limit_minutes: int | None = Field(default=None, gt=0)


class AssignmentCreate(AssignmentBase):
    """Properties to receive via API on Assignment creation"""
    teacher_id: uuid.UUID
    activity_id: uuid.UUID
    book_id: uuid.UUID


class AssignmentUpdate(SQLModel):
    """Properties to receive via API on Assignment update"""
    name: str | None = Field(default=None, max_length=500)
    instructions: str | None = Field(default=None)
    due_date: datetime | None = Field(default=None)
    time_limit_minutes: int | None = Field(default=None, gt=0)


class Assignment(AssignmentBase, table=True):
    """Assignment database model"""
    __tablename__ = "assignments"

    model_config = {"validate_assignment": True}

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    teacher_id: uuid.UUID = Field(foreign_key="teachers.id", index=True, ondelete="CASCADE")
    activity_id: uuid.UUID = Field(foreign_key="activities.id", index=True, ondelete="CASCADE")
    book_id: uuid.UUID = Field(foreign_key="books.id", index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    teacher: Teacher = Relationship(back_populates="assignments", sa_relationship_kwargs={"passive_deletes": True})
    activity: Activity = Relationship(back_populates="assignments", sa_relationship_kwargs={"passive_deletes": True})
    book: Book = Relationship(back_populates="assignments", sa_relationship_kwargs={"passive_deletes": True})
    assignment_students: list["AssignmentStudent"] = Relationship(back_populates="assignment", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

    @model_validator(mode='after')
    def validate_time_limit(self) -> 'Assignment':
        """Validate time_limit_minutes is positive"""
        if self.time_limit_minutes is not None and self.time_limit_minutes <= 0:
            raise ValueError("time_limit_minutes must be greater than 0")
        return self


class AssignmentPublic(AssignmentBase):
    """Properties to return via API"""
    id: uuid.UUID
    teacher_id: uuid.UUID
    activity_id: uuid.UUID
    book_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- AssignmentStudent Junction Table ---

class AssignmentStatus(str, Enum):
    """Assignment completion status"""
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"


class AssignmentStudentBase(SQLModel):
    """Shared AssignmentStudent properties"""
    status: AssignmentStatus = Field(default=AssignmentStatus.not_started)
    score: int | None = Field(default=None, ge=0, le=100)
    answers_json: dict | None = Field(default=None, sa_column=Column(JSON))
    progress_json: dict | None = Field(default=None, sa_column=Column(JSON))
    started_at: datetime | None = Field(default=None)
    completed_at: datetime | None = Field(default=None)
    time_spent_minutes: int = Field(default=0)
    last_saved_at: datetime | None = Field(default=None)


class AssignmentStudentCreate(AssignmentStudentBase):
    """Properties to receive via API on AssignmentStudent creation"""
    assignment_id: uuid.UUID
    student_id: uuid.UUID


class AssignmentStudentUpdate(SQLModel):
    """Properties to receive via API on AssignmentStudent update"""
    status: AssignmentStatus | None = Field(default=None)
    score: int | None = Field(default=None, ge=0, le=100)
    answers_json: dict | None = Field(default=None, sa_column=Column(JSON))
    progress_json: dict | None = Field(default=None, sa_column=Column(JSON))
    started_at: datetime | None = Field(default=None)
    completed_at: datetime | None = Field(default=None)
    time_spent_minutes: int | None = Field(default=None)
    last_saved_at: datetime | None = Field(default=None)


class AssignmentStudent(AssignmentStudentBase, table=True):
    """Assignment-student junction table for tracking progress"""
    __tablename__ = "assignment_students"

    model_config = {"validate_assignment": True}

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    assignment_id: uuid.UUID = Field(foreign_key="assignments.id", index=True, ondelete="CASCADE")
    student_id: uuid.UUID = Field(foreign_key="students.id", index=True, ondelete="CASCADE")

    # SQLAlchemy-level unique constraint
    __table_args__ = (
        UniqueConstraint('assignment_id', 'student_id', name='uq_assignment_student'),
    )

    # Relationships
    assignment: Assignment = Relationship(back_populates="assignment_students", sa_relationship_kwargs={"passive_deletes": True})
    student: Student = Relationship(back_populates="assignment_submissions", sa_relationship_kwargs={"passive_deletes": True})

    @model_validator(mode='after')
    def validate_score(self) -> 'AssignmentStudent':
        """Validate score is between 0 and 100"""
        if self.score is not None and (self.score < 0 or self.score > 100):
            raise ValueError("score must be between 0 and 100")
        return self


class AssignmentStudentPublic(AssignmentStudentBase):
    """Properties to return via API"""
    id: uuid.UUID
    assignment_id: uuid.UUID
    student_id: uuid.UUID


# ============================================================================
# Bulk Import Schemas
# ============================================================================


class StudentBulkImportRow(SQLModel):
    """Schema for student bulk import row from Excel"""
    first_name: str = Field(max_length=255, alias="First Name")
    last_name: str = Field(max_length=255, alias="Last Name")
    email: EmailStr = Field(max_length=255, alias="Email")
    grade_level: str | None = Field(default=None, max_length=50, alias="Grade Level")
    parent_email: EmailStr | None = Field(default=None, max_length=255, alias="Parent Email")


class TeacherBulkImportRow(SQLModel):
    """Schema for teacher bulk import row from Excel"""
    first_name: str = Field(max_length=255, alias="First Name")
    last_name: str = Field(max_length=255, alias="Last Name")
    email: EmailStr = Field(max_length=255, alias="Email")
    school_id: uuid.UUID = Field(alias="School ID")
    subject_specialization: str | None = Field(default=None, max_length=255, alias="Subject Specialization")


class PublisherBulkImportRow(SQLModel):
    """Schema for publisher bulk import row from Excel"""
    first_name: str = Field(max_length=255, alias="First Name")
    last_name: str = Field(max_length=255, alias="Last Name")
    email: EmailStr = Field(max_length=255, alias="Email")
    company_name: str = Field(max_length=255, alias="Company Name")
    contact_email: EmailStr = Field(max_length=255, alias="Contact Email")


class BulkImportErrorDetail(SQLModel):
    """Details of a single bulk import validation error"""
    row_number: int
    field: str | None = None
    message: str


class BulkImportResponse(SQLModel):
    """Response schema for bulk import endpoints"""
    success: bool
    total_rows: int
    created_count: int
    error_count: int
    errors: list[BulkImportErrorDetail]
    credentials: list[dict[str, str]] | None = None  # Only if success=True
