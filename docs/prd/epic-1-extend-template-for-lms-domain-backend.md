# Epic 1: Extend Template for LMS Domain (Backend)

**Epic Goal:**

Transform the template's simple User/Item demonstration into a complete LMS backend with 4-role RBAC system and 20+ domain tables. Remove template's demo features, extend the User model, build all LMS database schema (Publishers, Schools, Teachers, Students, Classes, Books, Activities, Assignments, etc.), and create role-specific API endpoints. By the end of this epic, the backend is ready for frontend integration with complete data models and APIs for user management, bulk import, and role-based permissions.

**What Template Already Provides (Skip These):**
- ✅ FastAPI app structure, Docker Compose, Traefik
- ✅ JWT authentication (login, refresh, logout)
- ✅ User CRUD API endpoints
- ✅ Alembic migrations setup
- ✅ Admin page backend (user list with pagination)
- ✅ Password hashing, email system
- ✅ Testing framework (pytest with fixtures)

**What We Build in This Epic:**
- ✅ Remove template's "Items" demo feature
- ✅ Extend User model with `role` field (enum: admin, publisher, teacher, student)
- ✅ Add 20+ LMS domain tables (see architecture.md Section 2 for full schema)
- ✅ Build role-specific user creation endpoints (admin creates publishers, publishers create teachers, teachers create students)
- ✅ Build bulk import system (Excel upload)
- ✅ Update existing admin page backend to support role filtering

## Story 1.1: Remove Template Demo & Extend User Model

As a **developer**,
I want **to remove the template's "Items" demo and extend the User model for 4-role RBAC**,
so that **we have a clean foundation for LMS-specific features**.

### Acceptance Criteria:

1. Remove template's "Items" feature: delete `backend/app/api/routes/items.py`, `Item` model from `models.py`, frontend items pages
2. Extend `User` model in `backend/app/models.py` with `role` field: `role: UserRole = Field(default=UserRole.student)` where `UserRole` is enum(admin, publisher, teacher, student)
3. Remove `items` relationship from User model
4. Create Alembic migration: `alembic revision -m "remove_items_add_user_role"`
5. Migration drops `items` table and adds `role` column to `users` table
6. Update existing user creation endpoints to require `role` parameter
7. Update JWT payload to include `role` field
8. Update `require_role()` dependency in `backend/app/api/deps.py` to check user role
9. Update admin user seed script to set role="admin"
10. Unit tests verify role validation works correctly
11. Integration tests verify role-based access control

## Story 1.2: LMS Domain Schema - Publishers, Schools, Teachers, Students

As a **developer**,
I want **database models for Publishers, Schools, Teachers, and Students with proper relationships**,
so that **we can implement the 4-role LMS user hierarchy**.

### Acceptance Criteria:

1. Create `Publisher` model in `backend/app/models.py`:
   - Fields: id (UUID), user_id (FK to users), name, contact_email, created_at, updated_at
   - Relationship: `user: User = Relationship(back_populates="publisher")`
2. Create `School` model:
   - Fields: id, name, publisher_id (FK), address, contact_info, created_at, updated_at
   - Relationship: `publisher: Publisher = Relationship(back_populates="schools")`
3. Create `Teacher` model:
   - Fields: id, user_id (FK), school_id (FK), subject_specialization, created_at, updated_at
   - Relationships: user, school
4. Create `Student` model:
   - Fields: id, user_id (FK), grade_level, parent_email, created_at, updated_at
   - Relationship: user
5. Update `User` model relationships: `publisher`, `teacher`, `student` (one-to-one optional)
6. Create Alembic migration: `alembic revision --autogenerate -m "add_lms_user_tables"`
7. Migration creates 4 new tables with proper indexes (user_id, school_id, publisher_id)
8. Update seed script to create: 1 admin, 1 publisher user, 1 school, 1 teacher user, 2 student users
9. Unit tests verify all relationships and cascading deletes
10. See `architecture.md` Section 2 for complete schema specifications

## Story 1.3: LMS Domain Schema - Classes, Books, Activities, Assignments

As a **developer**,
I want **database models for Classes, Books, Activities, and Assignments**,
so that **we can implement the core LMS assignment workflow**.

### Acceptance Criteria:

1. Create `Class` model: id, name, teacher_id (FK), school_id (FK), grade_level, subject, academic_year, is_active
2. Create `ClassStudent` junction table: id, class_id (FK), student_id (FK), enrolled_at
3. Create `Book` model: id, dream_storage_id, title, publisher_id (FK), description, cover_image_url, created_at, updated_at
4. Create `Activity` model: id, book_id (FK), dream_activity_id, activity_type (enum), title, config_json (JSONB), order_index
5. Create `Assignment` model: id, teacher_id (FK), activity_id (FK), book_id (FK), name, instructions, due_date, time_limit_minutes, created_at, updated_at
6. Create `AssignmentStudent` junction table: id, assignment_id (FK), student_id (FK), status (enum: not_started, in_progress, completed), score, started_at, completed_at, time_spent_minutes
7. Create activity_type enum with values: `dragdroppicture`, `dragdroppicturegroup`, `matchTheWords`, `circle`, `markwithx`, `puzzleFindWords`
8. Create Alembic migration: `alembic revision --autogenerate -m "add_lms_core_tables"`
9. Migration creates 6 new tables with proper indexes and foreign key constraints
10. Unit tests verify models and relationships
11. See `architecture.md` Section 2 for complete table definitions

###Story 1.4: Role-Specific API Endpoints

As a **developer**,
I want **API endpoints for role-specific user creation and management**,
so that **admins can create publishers, publishers can create teachers, and teachers can create students**.

### Acceptance Criteria:

**Note:** Template already has basic user CRUD. We extend it for role-based creation:

1. **Admin endpoints** (`backend/app/api/routes/admin.py`):
   - `POST /api/v1/admin/publishers` - Create publisher user + Publisher record
   - `POST /api/v1/admin/schools` - Create school linked to publisher
   - `GET /api/v1/admin/publishers`, `GET /api/v1/admin/schools`, `GET /api/v1/admin/teachers`, `GET /api/v1/admin/students` - List all with filtering
2. **Publisher endpoints** (`backend/app/api/routes/publishers.py`):
   - `GET /api/v1/publishers/me/schools` - List schools assigned to authenticated publisher
   - `POST /api/v1/publishers/me/teachers` - Create teacher user linked to publisher's school
   - Auto-generate temporary password, return in response
3. **Teacher endpoints** (`backend/app/api/routes/teachers.py`):
   - `POST /api/v1/teachers/me/students` - Create student user
   - `GET /api/v1/teachers/me/students` - List authenticated teacher's students
   - Auto-generate temporary password
4. All endpoints verify role using `require_role()` dependency
5. All endpoints filter data by authenticated user's role-specific ID (publisher_id, teacher_id, etc.)
6. Unit tests verify role-based access control
7. Integration tests verify cross-role access is denied
8. OpenAPI docs updated with role requirements

## Story 1.5: Bulk Import System (Excel Upload)

As a **teacher or admin**,
I want **to bulk import users via Excel file upload**,
so that **I can efficiently onboard many students or teachers at once**.

### Acceptance Criteria:

1. Backend endpoint `POST /api/v1/students/bulk-import` accepts Excel file (.xlsx, .xls)
2. Excel template structure: First Name, Last Name, Email, Grade Level, Parent Email
3. Validation: required columns, valid emails, no duplicates, no conflicts with existing users
4. If validation fails: return detailed error report with line numbers (e.g., "Row 5: Invalid email")
5. If validation succeeds: create all user accounts with auto-generated passwords
6. Response includes: total created, list of credentials (email + temp password)
7. Admin can bulk import publishers/teachers/students with role-specific templates
8. Use `openpyxl` library for Excel parsing
9. Maximum file size: 5MB (~1000 rows)
10. Unit tests verify Excel parsing and validation logic
11. Integration tests verify end-to-end flow with sample files

**Frontend:** Deferred to Epic 2 (UI with file upload dialog)

---
