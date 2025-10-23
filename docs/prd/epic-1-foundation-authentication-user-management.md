# Epic 1: Foundation, Authentication & User Management

**Epic Goal:**

Establish the complete technical foundation for Dream LMS including project infrastructure, development environment, database architecture, and
secure authentication system. Deliver comprehensive user management capabilities for all four roles (Admin, Publisher, Teacher, Student) with
support for individual account creation and Excel bulk import. By the end of this epic, administrators can fully manage the system, publishers
can onboard teachers, teachers can manage students (individually or in bulk), and all users can securely authenticate and access their
role-specific dashboards.

## Story 1.1: Project Foundation & Development Environment

As a **developer**,
I want **a fully configured development environment with project structure, Docker setup, and CI/CD pipeline**,
so that **the team can begin feature development with consistent tooling and automated deployments**.

### Acceptance Criteria:

1. Monorepo structure is created with `/backend`, `/frontend`, `/docker`, and `/docs` directories
2. Backend FastAPI application runs on `localhost:8000` with a health check endpoint (`GET /api/health`) returning `{"status": "healthy"}`
3. Frontend React + Vite application runs on `localhost:5173` with a placeholder home page
4. Docker Compose configuration includes services for PostgreSQL, FastAPI backend, and React dev server
5. All services start successfully with `docker-compose up` command
6. Environment variable configuration is documented with `.env.example` files for both backend and frontend
7. README.md includes setup instructions, architecture overview, and development commands
8. GitHub Actions workflow runs on pull requests to execute linting checks (Black, Flake8 for backend; ESLint for frontend)
9. Backend includes basic project structure: routers, services, models, database, and config directories
10. Frontend includes basic structure: components, pages, hooks, services, and utils directories
11. Git repository is initialized with appropriate `.gitignore` files for Python and Node.js

## Story 1.2: Database Schema & User Models

As a **developer**,
I want **PostgreSQL database schema with SQLAlchemy models for all user roles and relationships**,
so that **the application has a solid data foundation for user management**.

### Acceptance Criteria:

1. PostgreSQL database is accessible via SQLAlchemy async engine with connection pooling configured
2. Alembic is configured for database migrations with initial migration script created
3. User model includes fields: id (UUID), email (unique), password_hash, role (enum: admin/publisher/teacher/student), created_at, updated_at, 
is_active
4. Publisher model includes: id, name, contact_email, created_at, updated_at
5. School model includes: id, name, publisher_id (foreign key), address, contact_info, created_at, updated_at
6. Teacher model includes: id, user_id (foreign key), school_id (foreign key), subject_specialization (optional), created_at, updated_at
7. Student model includes: id, user_id (foreign key), grade_level (optional), parent_email (optional), created_at, updated_at
8. Database indexes are created on foreign keys and email field for query performance
9. Database migration runs successfully with `alembic upgrade head` command
10. Seed script creates one admin user with credentials documented in README
11. All models include proper relationships (e.g., Publisher has many Schools, School has many Teachers)
12. Unit tests verify model creation, relationships, and database constraints

## Story 1.3: JWT Authentication System

As a **user of any role**,  
I want **to securely log in with credentials provided by my admin/publisher/teacher and receive a JWT token**,  
so that **I can access protected endpoints according to my role permissions**.

### Acceptance Criteria:

1. No public registration endpoint - all user creation happens through role-specific endpoints
2. `POST /api/auth/login` endpoint validates credentials and returns JWT access token (1-hour expiration) and refresh token (7-day expiration)
3. JWT payload includes user_id, role, and relevant role-specific IDs (publisher_id, teacher_id, student_id)
4. `POST /api/auth/refresh` endpoint accepts refresh token and issues new access token
5. `POST /api/auth/logout` endpoint invalidates refresh token (blacklist in memory or Redis if available)
6. FastAPI dependency function `get_current_user` extracts and validates JWT from Authorization header
7. FastAPI dependency function `require_role` checks if current user has required role (e.g., admin, teacher)
8. Password validation enforces minimum 8 characters, at least one uppercase, one lowercase, one number
9. Failed login attempts return appropriate error messages (401 Unauthorized) without leaking user existence
10. All user creation happens through role-specific endpoints (admin creates publishers, publishers create teachers, teachers create students)
11. Unit tests cover token generation, validation, expiration, and refresh flow
12. Integration tests verify protected endpoints reject invalid/expired tokens
13. OpenAPI documentation shows authentication requirements for protected endpoints

## Story 1.4: Admin User Management Interface

As an **admin**,
I want **to create, view, edit, and delete all user types (publishers, teachers, students) through a web interface**,
so that **I can manage the entire system and onboard new organizations**.

### Acceptance Criteria:

1. Admin dashboard displays system statistics: total publishers, schools, teachers, students
2. Admin can navigate to Publishers list view showing all publishers with search and pagination
3. Admin can create new publisher via form modal (fields: name, contact_email)
4. Admin can edit existing publisher details via form modal
5. Admin can delete publisher (soft delete) with confirmation dialog
6. Admin can navigate to Schools list view showing all schools with associated publisher name
7. Admin can create new school via form modal (fields: name, publisher selection, address, contact_info)
8. Admin can edit/delete schools with appropriate confirmations
9. Admin can navigate to Teachers list view showing all teachers with school and publisher info
10. Admin can navigate to Students list view showing all students with associated teacher/school info
11. All list views include search functionality and column sorting
12. API endpoints for admin operations verify admin role via `require_role` dependency
13. Frontend displays appropriate error messages for failed operations
14. Responsive design works on desktop and tablet screen sizes
15. Unit and integration tests cover all admin CRUD operations

## Story 1.5: Publisher User Management

As a **publisher**,
I want **to create and manage teacher accounts for schools assigned to me**,
so that **I can onboard educators who will use my content**.

### Acceptance Criteria:

1. Publisher dashboard displays statistics: total schools assigned, total teachers created
2. Publisher can view list of schools assigned to their organization (read-only school list)
3. Publisher can navigate to Teachers list view showing only teachers in their assigned schools
4. Publisher can create new teacher via form modal (fields: email, first name, last name, school selection from their schools, subject
specialization)
5. System auto-generates temporary password for new teacher and displays it once (with copy button)
6. Publisher can edit teacher details (except school reassignment after creation requires admin)
7. Publisher can deactivate teacher accounts (soft delete/is_active flag)
8. Publisher cannot view or manage students (access denied with appropriate message)
9. Publisher cannot view teachers from schools not assigned to them (query filtered by publisher_id)
10. API endpoints verify publisher role and filter data by publisher_id
11. Frontend shows appropriate permissions-based UI (e.g., no student management menu)
12. Integration tests verify publisher can only access their own schools/teachers
13. Unit tests cover publisher-scoped queries and permission checks

## Story 1.6: Teacher Student Management (Individual)

As a **teacher**,  
I want **to create and manage student accounts individually**,  
so that **I can onboard my students one at a time when needed**.

### Acceptance Criteria:

1. Teacher dashboard displays statistics: total students created, total classes (placeholder for Epic 2)
2. Teacher can view list of students they created with search and filter capabilities
3. Teacher can create new student via form modal (fields: first name, last name, email, grade level, parent email)
4. System auto-generates temporary password for new student and displays it once (with copy button)
5. Teacher can edit student details (name, email, grade, parent email)
6. Teacher can deactivate student accounts with confirmation dialog
7. Teacher can view individual student profile showing basic info (assignments/progress placeholder for later epics)
8. Teacher cannot view students created by other teachers
9. API endpoints verify teacher role and filter students by teacher_id (creator)
10. Student list view includes pagination and displays student status (active/inactive)
11. Frontend validates all form inputs before submission
12. Integration tests verify teacher can only access their own students
13. Unit tests cover student CRUD operations and teacher-scoped queries

## Story 1.7: Bulk Import System (Excel)

As a **teacher or admin**,
I want **to bulk import multiple student accounts via Excel file upload**,
so that **I can efficiently onboard entire classes without manual entry**.

### Acceptance Criteria:

1. Teacher dashboard includes "Bulk Import Students" button that opens import dialog
2. Import dialog provides "Download Template" button that generates Excel file with predefined structure (columns: First Name, Last Name, Email,
Grade Level, Parent Email)
3. Import dialog includes file upload drag-and-drop area accepting `.xlsx` and `.xls` files
4. Backend endpoint `POST /api/students/bulk-import` accepts Excel file and validates structure
5. Validation checks: required columns present, valid email formats, no duplicate emails in file, no conflicts with existing users
6. If validation fails, API returns detailed error report with line numbers and specific error messages (e.g., "Row 5: Invalid email format")
7. If validation succeeds, system creates all student accounts with auto-generated passwords
8. Backend returns success summary: total created, list of generated credentials (student email + temporary password)
9. Frontend displays validation errors in scrollable modal with option to download error report
10. Frontend displays success results with option to download credentials CSV for distribution
11. Admin can bulk import any user type (publishers, teachers, students) with role-specific templates
12. Import history is logged with timestamp, uploader, file name, and results summary
13. Maximum file size is enforced (e.g., 5 MB, ~1000 rows)
14. Unit tests cover Excel parsing, validation logic, and bulk creation
15. Integration tests verify end-to-end import flow with sample files

## Story 1.8: Student Dashboard & Profile

As a **student**,
I want **to log in and see my personal dashboard with my profile information**,
so that **I can access the system and prepare for future assignment work**.

### Acceptance Criteria:

1. Student can log in using credentials provided by teacher (email + temporary password)
2. Student is prompted to change password on first login
3. Student dashboard displays welcome message with student name
4. Student dashboard shows empty state for assignments section with message "No assignments yet"
5. Student dashboard shows empty state for progress section with message "Complete assignments to see your progress"
6. Student can navigate to Profile page showing: name, email, grade level, school name (read-only)
7. Student can update their own password through profile settings
8. Student cannot access admin, publisher, or teacher routes (403 Forbidden with appropriate message)
9. Student navigation menu shows only relevant options: Dashboard, Profile, Assignments (disabled/empty), Messages (placeholder)
10. API endpoints verify student role and filter data by student user_id
11. Frontend implements role-based routing with proper access control
12. Integration tests verify student can only access student-scoped routes
13. Responsive design works on mobile devices (students may use phones)

---
