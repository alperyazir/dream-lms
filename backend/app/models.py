import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models import Publisher, School, Teacher, Student


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


class Publisher(PublisherBase, table=True):
    """Publisher database model"""
    __tablename__ = "publishers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: User = Relationship(back_populates="publisher", sa_relationship_kwargs={"passive_deletes": True})
    schools: list["School"] = Relationship(back_populates="publisher", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class PublisherPublic(PublisherBase):
    """Properties to return via API"""
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


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


class School(SchoolBase, table=True):
    """School database model"""
    __tablename__ = "schools"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    publisher_id: uuid.UUID = Field(foreign_key="publishers.id", index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    publisher: Publisher = Relationship(back_populates="schools", sa_relationship_kwargs={"passive_deletes": True})
    teachers: list["Teacher"] = Relationship(back_populates="school", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


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


class Teacher(TeacherBase, table=True):
    """Teacher database model"""
    __tablename__ = "teachers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, index=True, ondelete="CASCADE")
    school_id: uuid.UUID = Field(foreign_key="schools.id", index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: User = Relationship(back_populates="teacher", sa_relationship_kwargs={"passive_deletes": True})
    school: School = Relationship(back_populates="teachers", sa_relationship_kwargs={"passive_deletes": True})


class TeacherPublic(TeacherBase):
    """Properties to return via API"""
    id: uuid.UUID
    user_id: uuid.UUID
    school_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


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
    grade_level: str | None = Field(default=None, max_length=50)
    parent_email: str | None = Field(default=None, max_length=255)


class Student(StudentBase, table=True):
    """Student database model"""
    __tablename__ = "students"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, index=True, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: User = Relationship(back_populates="student", sa_relationship_kwargs={"passive_deletes": True})


class StudentPublic(StudentBase):
    """Properties to return via API"""
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
