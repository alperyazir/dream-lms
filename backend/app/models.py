import re
import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from pydantic import EmailStr, field_validator, model_validator
from sqlalchemy import JSON, CheckConstraint, Column, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models import (
        Activity,
        Assignment,
        AssignmentActivity,
        AssignmentStudent,
        AssignmentStudentActivity,
        Book,
        BookAccess,
        Class,
        ClassStudent,
        DirectMessage,
        Feedback,
        Notification,
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


def validate_username_format(username: str | None) -> str | None:
    """
    Validate username contains only alphanumeric characters, underscores, and hyphens.

    Args:
        username: The username to validate (can be None for optional fields)

    Returns:
        The validated username

    Raises:
        ValueError: If username contains invalid characters
    """
    if username is None:
        return username
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        raise ValueError('Username must contain only letters, numbers, underscores, and hyphens')
    return username


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    username: str = Field(
        unique=True,
        index=True,
        min_length=3,
        max_length=50
    )
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole = Field(default=UserRole.student)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate username format."""
        return validate_username_format(v)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    username: str | None = Field(default=None, min_length=3, max_length=50)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str | None) -> str | None:
        """Validate username format."""
        return validate_username_format(v)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    username: str | None = Field(default=None, min_length=3, max_length=50)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str | None) -> str | None:
        """Validate username format."""
        return validate_username_format(v)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    initial_password: str | None = Field(default=None, max_length=255)  # Stored for admin reference

    # Relationships to role-specific tables (one-to-one, optional)
    publisher: Optional["Publisher"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    teacher: Optional["Teacher"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    student: Optional["Student"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    initial_password: str | None = None  # Only visible to admins


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
    benchmarking_enabled: bool = Field(default=True, description="Enable performance benchmarking for publisher's content")


class PublisherCreate(PublisherBase):
    """Properties to receive via API on Publisher creation"""
    user_id: uuid.UUID


class PublisherUpdate(SQLModel):
    """Properties to receive via API on Publisher update"""
    name: str | None = Field(default=None, max_length=255)
    contact_email: str | None = Field(default=None, max_length=255)
    user_email: str | None = Field(default=None, max_length=255)
    user_full_name: str | None = Field(default=None, max_length=255)
    benchmarking_enabled: bool | None = Field(default=None)


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
    user_username: str
    user_full_name: str
    user_initial_password: str | None = None
    created_at: datetime
    updated_at: datetime


class PublisherCreateAPI(SQLModel):
    """Properties for API endpoint publisher creation (includes user creation)"""
    name: str = Field(max_length=255)
    contact_email: EmailStr = Field(max_length=255)
    username: str = Field(min_length=3, max_length=50)
    user_email: EmailStr = Field(max_length=255)
    full_name: str = Field(max_length=255)


# --- School Models ---

class SchoolBase(SQLModel):
    """Shared School properties"""
    name: str = Field(max_length=255)
    address: str | None = Field(default=None)
    contact_info: str | None = Field(default=None)
    benchmarking_enabled: bool = Field(default=True, description="Enable performance benchmarking for this school")


class SchoolCreate(SchoolBase):
    """Properties to receive via API on School creation"""
    publisher_id: uuid.UUID


class SchoolCreateByPublisher(SchoolBase):
    """Properties to receive via API on School creation by Publisher (publisher_id set automatically)"""
    pass


class SchoolUpdate(SQLModel):
    """Properties to receive via API on School update"""
    name: str | None = Field(default=None, max_length=255)
    address: str | None = Field(default=None)
    contact_info: str | None = Field(default=None)
    publisher_id: uuid.UUID | None = Field(default=None)
    benchmarking_enabled: bool | None = Field(default=None)


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
    user_username: str
    user_full_name: str
    user_initial_password: str | None = None
    school_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class TeacherCreateAPI(SQLModel):
    """Properties for API endpoint teacher creation (includes user creation)"""
    username: str = Field(min_length=3, max_length=50)
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
    user_username: str | None = Field(default=None, min_length=3, max_length=50)
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
    user_username: str
    user_full_name: str
    user_initial_password: str | None = None
    created_at: datetime
    updated_at: datetime


class StudentCreateAPI(SQLModel):
    """Properties for API endpoint student creation (includes user creation)"""
    username: str = Field(min_length=3, max_length=50)
    user_email: EmailStr = Field(max_length=255)
    full_name: str = Field(max_length=255)
    grade_level: str | None = Field(default=None, max_length=50)
    parent_email: EmailStr | None = Field(default=None, max_length=255)


# Response for user creation endpoints with temporary password
class UserCreationResponse(SQLModel):
    """Response schema for role-specific user creation endpoints"""
    user: UserPublic
    initial_password: str
    role_record: PublisherPublic | TeacherPublic | StudentPublic


# Dashboard statistics
class DashboardStats(SQLModel):
    """Dashboard statistics for admin view"""
    total_users: int
    total_publishers: int
    total_teachers: int
    total_students: int
    active_schools: int


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


class ClassCreateByTeacher(ClassBase):
    """Properties to receive via API on Class creation by Teacher (teacher_id and school_id set automatically from teacher's record)"""
    pass


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


class ClassResponse(ClassPublic):
    """Class response with computed student count"""
    student_count: int = Field(default=0, description="Number of enrolled students")


class StudentInClass(SQLModel):
    """Student info for class detail response"""
    id: uuid.UUID
    email: str
    full_name: str
    grade: str | None = None


class ClassDetailResponse(ClassResponse):
    """Class detail response with enrolled students"""
    enrolled_students: list[StudentInClass] = Field(default_factory=list)


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


class ClassStudentAdd(SQLModel):
    """Schema for adding students to a class"""
    student_ids: list[uuid.UUID] = Field(description="List of student UUIDs to add to the class")


# --- Book Models ---

class BookStatus(str, Enum):
    """Book status enumeration"""
    published = "published"
    draft = "draft"
    archived = "archived"


class BookBase(SQLModel):
    """Shared Book properties"""
    dream_storage_id: str = Field(unique=True, index=True, max_length=255)
    title: str = Field(max_length=500)
    book_name: str = Field(max_length=255)
    publisher_name: str = Field(max_length=255)
    language: str | None = Field(default=None, max_length=50)
    category: str | None = Field(default=None, max_length=100)
    status: BookStatus = Field(default=BookStatus.published)
    description: str | None = Field(default=None)
    cover_image_url: str | None = Field(default=None)
    config_json: dict = Field(default_factory=dict, sa_column=Column(JSON))
    # Activity metadata from Dream Central Storage (source of truth for counts)
    dcs_activity_count: int | None = Field(default=None)  # Total activity count from DCS
    dcs_activity_details: dict | None = Field(default=None, sa_column=Column(JSON))  # Activity breakdown by type


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
    synced_at: datetime | None = Field(default=None)

    # Relationships
    publisher: Publisher = Relationship(back_populates="books", sa_relationship_kwargs={"passive_deletes": True})
    activities: list["Activity"] = Relationship(back_populates="book", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    assignments: list["Assignment"] = Relationship(back_populates="book", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    book_access: list["BookAccess"] = Relationship(back_populates="book", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class BookPublic(BookBase):
    """Properties to return via API"""
    id: uuid.UUID
    publisher_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    synced_at: datetime | None


# --- BookAccess Model ---

class BookAccess(SQLModel, table=True):
    """Book access permissions for publishers"""
    __tablename__ = "book_access"
    __table_args__ = (
        UniqueConstraint("book_id", "publisher_id", name="uq_book_access_book_publisher"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    book_id: uuid.UUID = Field(foreign_key="books.id", index=True, ondelete="CASCADE")
    publisher_id: uuid.UUID = Field(foreign_key="publishers.id", index=True, ondelete="CASCADE")
    granted_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    book: Book = Relationship(back_populates="book_access", sa_relationship_kwargs={"passive_deletes": True})
    publisher: Publisher = Relationship(sa_relationship_kwargs={"passive_deletes": True})


# --- Activity Models ---

class ActivityType(str, Enum):
    """Activity type enumeration"""
    matchTheWords = "matchTheWords"
    dragdroppicture = "dragdroppicture"
    dragdroppicturegroup = "dragdroppicturegroup"
    fillSentencesWithDots = "fillSentencesWithDots"
    fillpicture = "fillpicture"
    circle = "circle"
    puzzleFindWords = "puzzleFindWords"
    markwithx = "markwithx"


class ActivityBase(SQLModel):
    """Shared Activity properties"""
    dream_activity_id: str | None = Field(default=None, max_length=255)
    module_name: str = Field(max_length=255)
    page_number: int
    section_index: int
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
    # New relationships for multi-activity support
    assignment_activities: list["AssignmentActivity"] = Relationship(back_populates="activity", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    student_activity_progress: list["AssignmentStudentActivity"] = Relationship(back_populates="activity", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class ActivityPublic(ActivityBase):
    """Properties to return via API"""
    id: uuid.UUID
    book_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Book Catalog Response Schemas (Story 3.6) ---

class BookResponse(SQLModel):
    """Book response schema for catalog listings"""
    id: uuid.UUID
    dream_storage_id: str
    title: str
    publisher_name: str
    description: str | None = None
    cover_image_url: str | None = None
    activity_count: int = Field(default=0, description="Number of activities in book")


class ActivityResponse(SQLModel):
    """Activity response schema for book detail"""
    id: uuid.UUID
    book_id: uuid.UUID
    activity_type: ActivityType
    title: str | None = None
    config_json: dict
    order_index: int


class BookListResponse(SQLModel):
    """Paginated book list response"""
    items: list[BookResponse]
    total: int
    skip: int
    limit: int


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
    book_id: uuid.UUID
    # Backward compatible: either activity_id OR activity_ids must be provided
    activity_id: uuid.UUID | None = None
    activity_ids: list[uuid.UUID] | None = None

    @model_validator(mode='after')
    def validate_activity_ids(self) -> 'AssignmentCreate':
        """Validate that either activity_id OR activity_ids is provided"""
        if self.activity_id is None and (self.activity_ids is None or len(self.activity_ids) == 0):
            raise ValueError("Either activity_id or activity_ids must be provided")
        if self.activity_id is not None and self.activity_ids is not None and len(self.activity_ids) > 0:
            raise ValueError("Cannot provide both activity_id and activity_ids")
        return self


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
    # Keep activity_id for backward compatibility during migration
    activity_id: uuid.UUID | None = Field(default=None, foreign_key="activities.id", index=True, ondelete="CASCADE")
    book_id: uuid.UUID = Field(foreign_key="books.id", index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    teacher: Teacher = Relationship(back_populates="assignments", sa_relationship_kwargs={"passive_deletes": True})
    activity: Optional["Activity"] = Relationship(back_populates="assignments", sa_relationship_kwargs={"passive_deletes": True})
    book: Book = Relationship(back_populates="assignments", sa_relationship_kwargs={"passive_deletes": True})
    assignment_students: list["AssignmentStudent"] = Relationship(back_populates="assignment", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    # New relationship for multi-activity support
    assignment_activities: list["AssignmentActivity"] = Relationship(back_populates="assignment", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

    @property
    def activities(self) -> list["Activity"]:
        """Returns ordered list of activities via junction table"""
        sorted_aa = sorted(self.assignment_activities, key=lambda aa: aa.order_index)
        return [aa.activity for aa in sorted_aa]

    @property
    def is_multi_activity(self) -> bool:
        """Check if assignment has multiple activities"""
        return len(self.assignment_activities) > 1

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
    book_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    # Backward compatible: keep activity_id for single-activity assignments
    activity_id: uuid.UUID | None = None
    # New field for multi-activity assignments
    activities: list["ActivityPublic"] = []
    activity_count: int = 0


# ============================================================================
# AssignmentActivity - Junction table for multi-activity assignments
# ============================================================================


class AssignmentActivityBase(SQLModel):
    """Shared AssignmentActivity properties"""
    order_index: int = Field(default=0, ge=0)


class AssignmentActivityCreate(AssignmentActivityBase):
    """Properties to receive via API on AssignmentActivity creation"""
    assignment_id: uuid.UUID
    activity_id: uuid.UUID


class AssignmentActivity(AssignmentActivityBase, table=True):
    """Junction table linking assignments to activities with ordering"""
    __tablename__ = "assignment_activities"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    assignment_id: uuid.UUID = Field(foreign_key="assignments.id", index=True, ondelete="CASCADE")
    activity_id: uuid.UUID = Field(foreign_key="activities.id", index=True, ondelete="CASCADE")

    # SQLAlchemy-level unique constraint
    __table_args__ = (
        UniqueConstraint('assignment_id', 'activity_id', name='uq_assignment_activity'),
    )

    # Relationships
    assignment: "Assignment" = Relationship(back_populates="assignment_activities", sa_relationship_kwargs={"passive_deletes": True})
    activity: "Activity" = Relationship(back_populates="assignment_activities", sa_relationship_kwargs={"passive_deletes": True})


class AssignmentActivityPublic(AssignmentActivityBase):
    """Properties to return via API"""
    id: uuid.UUID
    assignment_id: uuid.UUID
    activity_id: uuid.UUID


# --- AssignmentStudent Junction Table ---

class AssignmentStatus(str, Enum):
    """Assignment completion status"""
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"


class AssignmentStudentBase(SQLModel):
    """Shared AssignmentStudent properties"""
    status: AssignmentStatus = Field(default=AssignmentStatus.not_started)
    score: float | None = Field(default=None, ge=0, le=100)
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
    # New relationship for per-activity progress
    activity_progress: list["AssignmentStudentActivity"] = Relationship(back_populates="assignment_student", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    # Feedback relationship (one-to-one)
    feedback: Optional["Feedback"] = Relationship(back_populates="assignment_student", sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"})

    def calculate_combined_score(self) -> float | None:
        """Calculate combined score from child activity progress as percentage (0-100)"""
        if not self.activity_progress:
            return None

        completed_activities = [ap for ap in self.activity_progress if ap.score is not None]
        if not completed_activities:
            return None

        total_score = sum(ap.score for ap in completed_activities)
        total_max_score = sum(ap.max_score for ap in completed_activities)

        if total_max_score == 0:
            return None

        return (total_score / total_max_score) * 100

    def calculate_total_max_score(self) -> float:
        """Calculate total max score from all child activities"""
        if not self.activity_progress:
            return 0.0
        return sum(ap.max_score for ap in self.activity_progress)

    @property
    def all_activities_completed(self) -> bool:
        """Check if all activities in the assignment are completed"""
        if not self.activity_progress:
            return False
        return all(
            ap.status == AssignmentStudentActivityStatus.completed
            for ap in self.activity_progress
        )

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
    # New field for per-activity progress
    activity_progress: list["AssignmentStudentActivityPublic"] = []



# ============================================================================
# AssignmentStudentActivity - Per-activity progress tracking
# ============================================================================


class AssignmentStudentActivityStatus(str, Enum):
    """Per-activity completion status"""
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"


class AssignmentStudentActivityBase(SQLModel):
    """Shared AssignmentStudentActivity properties"""
    status: AssignmentStudentActivityStatus = Field(default=AssignmentStudentActivityStatus.not_started)
    score: float | None = Field(default=None, ge=0)
    max_score: float = Field(default=100.0, ge=0)
    response_data: dict | None = Field(default=None, sa_column=Column(JSON))
    started_at: datetime | None = Field(default=None)
    completed_at: datetime | None = Field(default=None)


class AssignmentStudentActivityCreate(AssignmentStudentActivityBase):
    """Properties to receive via API on AssignmentStudentActivity creation"""
    assignment_student_id: uuid.UUID
    activity_id: uuid.UUID


class AssignmentStudentActivityUpdate(SQLModel):
    """Properties to receive via API on AssignmentStudentActivity update"""
    status: AssignmentStudentActivityStatus | None = None
    score: float | None = None
    max_score: float | None = None
    response_data: dict | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class AssignmentStudentActivity(AssignmentStudentActivityBase, table=True):
    """Per-activity progress tracking for assignment students"""
    __tablename__ = "assignment_student_activities"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    assignment_student_id: uuid.UUID = Field(foreign_key="assignment_students.id", index=True, ondelete="CASCADE")
    activity_id: uuid.UUID = Field(foreign_key="activities.id", index=True, ondelete="CASCADE")

    # SQLAlchemy-level unique constraint
    __table_args__ = (
        UniqueConstraint('assignment_student_id', 'activity_id', name='uq_assignment_student_activity'),
    )

    # Relationships
    assignment_student: "AssignmentStudent" = Relationship(back_populates="activity_progress", sa_relationship_kwargs={"passive_deletes": True})
    activity: "Activity" = Relationship(back_populates="student_activity_progress", sa_relationship_kwargs={"passive_deletes": True})


class AssignmentStudentActivityPublic(AssignmentStudentActivityBase):
    """Properties to return via API"""
    id: uuid.UUID
    assignment_student_id: uuid.UUID
    activity_id: uuid.UUID


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


# ============================================================================
# Webhook Event Models
# ============================================================================


class WebhookEventType(str, Enum):
    """Webhook event type enumeration"""
    book_created = "book.created"
    book_updated = "book.updated"
    book_deleted = "book.deleted"


class WebhookEventStatus(str, Enum):
    """Webhook event processing status"""
    pending = "pending"
    processing = "processing"
    success = "success"
    failed = "failed"
    retrying = "retrying"


class WebhookBookData(SQLModel):
    """Book data from webhook payload"""
    id: int
    book_name: str
    book_title: str
    publisher: str
    language: str
    category: str
    status: str
    version: str | None = None  # Optional - not always sent by Dream Central Storage


class WebhookPayload(SQLModel):
    """Webhook payload schema from Dream Central Storage"""
    event: WebhookEventType
    timestamp: datetime
    data: WebhookBookData


class WebhookEventLog(SQLModel, table=True):
    """Webhook event log database model for auditing and processing"""
    __tablename__ = "webhook_event_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    event_type: WebhookEventType = Field(index=True)
    book_id: int | None = Field(default=None, index=True)  # dream_storage_id from payload
    payload_json: dict = Field(sa_column=Column(JSON))  # Full webhook payload for debugging
    status: WebhookEventStatus = Field(default=WebhookEventStatus.pending, index=True)
    retry_count: int = Field(default=0)
    error_message: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)
    processed_at: datetime | None = Field(default=None)


class WebhookEventLogPublic(SQLModel):
    """Properties to return via API"""
    id: uuid.UUID
    event_type: WebhookEventType
    book_id: int | None
    status: WebhookEventStatus
    retry_count: int
    created_at: datetime
    processed_at: datetime | None


# ============================================================================
# Teacher Insights Models (Story 5.4)
# ============================================================================


class DismissedInsight(SQLModel, table=True):
    """Stores insights dismissed by teachers to filter from future views"""
    __tablename__ = "dismissed_insights"
    __table_args__ = (
        UniqueConstraint("teacher_id", "insight_key", name="uq_dismissed_insight_teacher_key"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    teacher_id: uuid.UUID = Field(foreign_key="teachers.id", index=True, ondelete="CASCADE")
    insight_key: str = Field(max_length=255)  # e.g., "low_perf_assignment_{uuid}"
    dismissed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationship
    teacher: Teacher = Relationship(sa_relationship_kwargs={"passive_deletes": True})


# --- Report Models (Story 5.6) ---


class ReportJobStatusEnum(str, Enum):
    """Status of a report generation job."""

    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ReportTypeEnum(str, Enum):
    """Type of report."""

    student = "student"
    class_ = "class"
    assignment = "assignment"


class ReportFormatEnum(str, Enum):
    """Output format for reports."""

    pdf = "pdf"
    excel = "excel"


class ReportJob(SQLModel, table=True):
    """Tracks report generation jobs for async processing and history."""

    __tablename__ = "report_jobs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    teacher_id: uuid.UUID = Field(foreign_key="teachers.id", index=True, ondelete="CASCADE")
    status: ReportJobStatusEnum = Field(
        default=ReportJobStatusEnum.pending,
        sa_column=Column(
            SAEnum(
                "pending", "processing", "completed", "failed",
                name="reportjobstatusenum",
                create_constraint=False,
                native_enum=True,
            ),
            nullable=False,
        ),
    )
    report_type: ReportTypeEnum = Field(
        sa_column=Column(
            SAEnum(
                "student", "class", "assignment",
                name="reporttypeenum",
                create_constraint=False,
                native_enum=True,
            ),
            nullable=False,
        ),
    )
    template_type: str | None = Field(default=None, max_length=100)
    config_json: dict = Field(default={}, sa_column=Column(JSON))
    file_path: str | None = Field(default=None, max_length=500)
    progress_percentage: int = Field(default=0, ge=0, le=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None
    expires_at: datetime | None = None
    error_message: str | None = None

    # Relationship
    teacher: Teacher = Relationship(sa_relationship_kwargs={"passive_deletes": True})


class SavedReportConfig(SQLModel, table=True):
    """Saved report configurations for recurring reports."""

    __tablename__ = "saved_report_configs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    teacher_id: uuid.UUID = Field(foreign_key="teachers.id", index=True, ondelete="CASCADE")
    name: str = Field(max_length=255)
    config_json: dict = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationship
    teacher: Teacher = Relationship(sa_relationship_kwargs={"passive_deletes": True})


# =============================================================================
# Notification Models (Story 6.1)
# =============================================================================


class NotificationType(str, Enum):
    """Notification type enumeration"""
    assignment_created = "assignment_created"
    deadline_approaching = "deadline_approaching"
    feedback_received = "feedback_received"
    message_received = "message_received"
    student_completed = "student_completed"
    past_due = "past_due"
    material_shared = "material_shared"
    system_announcement = "system_announcement"


class Notification(SQLModel, table=True):
    """Notification database model for in-app notifications."""

    __tablename__ = "notifications"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    type: NotificationType = Field(
        sa_column=Column(SAEnum(NotificationType, name="notification_type"), nullable=False)
    )
    title: str = Field(max_length=500)
    message: str
    link: str | None = Field(default=None, max_length=500)
    is_read: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)

    # Relationship
    user: "User" = Relationship(sa_relationship_kwargs={"passive_deletes": True})


# =============================================================================
# Direct Messaging Models (Story 6.3)
# =============================================================================


class DirectMessage(SQLModel, table=True):
    """Direct message database model for teacher-student communication."""

    __tablename__ = "direct_messages"
    __table_args__ = (
        CheckConstraint("sender_id != recipient_id", name="no_self_messaging"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    sender_id: uuid.UUID = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    recipient_id: uuid.UUID = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    subject: str | None = Field(default=None, max_length=500)
    body: str = Field(min_length=1)
    parent_message_id: uuid.UUID | None = Field(
        default=None, foreign_key="direct_messages.id", ondelete="SET NULL"
    )
    is_read: bool = Field(default=False, index=True)
    sent_at: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)

    # Relationships
    sender: "User" = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[DirectMessage.sender_id]",
            "passive_deletes": True,
        }
    )
    recipient: "User" = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[DirectMessage.recipient_id]",
            "passive_deletes": True,
        }
    )


# =============================================================================
# Feedback Models (Story 6.4)
# =============================================================================


class Feedback(SQLModel, table=True):
    """Feedback database model for teacher feedback on student assignments."""

    __tablename__ = "feedback"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    assignment_student_id: uuid.UUID = Field(
        foreign_key="assignment_students.id",
        unique=True,
        index=True,
        ondelete="CASCADE",
    )
    teacher_id: uuid.UUID = Field(
        foreign_key="teachers.id",
        index=True,
        ondelete="CASCADE",
    )
    feedback_text: str | None = Field(default=None, max_length=1000)
    badges: list[str] = Field(default=[], sa_column=Column(JSON))
    emoji_reactions: list[str] = Field(default=[], sa_column=Column(JSON))
    is_draft: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    assignment_student: "AssignmentStudent" = Relationship(
        back_populates="feedback",
        sa_relationship_kwargs={"passive_deletes": True}
    )
    teacher: "Teacher" = Relationship(
        sa_relationship_kwargs={"passive_deletes": True}
    )


# =============================================================================
# Notification Preferences Models (Story 6.8)
# =============================================================================


class NotificationPreference(SQLModel, table=True):
    """User notification preference settings for each notification type."""

    __tablename__ = "notification_preferences"
    __table_args__ = (
        UniqueConstraint("user_id", "notification_type", name="uq_user_notification_type"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    notification_type: NotificationType = Field(
        sa_column=Column(SAEnum(NotificationType, name="notification_type", create_type=False), nullable=False)
    )
    enabled: bool = Field(default=True)
    email_enabled: bool = Field(default=False)

    # Relationship
    user: "User" = Relationship(sa_relationship_kwargs={"passive_deletes": True})


class NotificationMute(SQLModel, table=True):
    """Global notification mute setting for temporary silence."""

    __tablename__ = "notification_mutes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, index=True, ondelete="CASCADE")
    muted_until: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationship
    user: "User" = Relationship(sa_relationship_kwargs={"passive_deletes": True})
