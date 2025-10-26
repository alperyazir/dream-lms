# Dream LMS Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Enable structured learning management for FlowBook ecosystem connecting schools, publishers, teachers, and students
- Provide teachers with tools to assign, monitor, and provide feedback on interactive FlowBook activities
- Give students a clear view of assignments, progress, and personalized feedback
- Allow publishers to control content access and distribution to schools/teachers
- Create a centralized platform for admin oversight of all users and data
- Make digital learning interactive, measurable, and enjoyable through activity-based classroom management

### Background Context

FlowBook has successfully transformed traditional books into interactive digital learning experiences with drag-and-drop activities, word
matching, quizzes, and puzzles. While FlowBook excels at delivering engaging content, teachers and schools need structured tools to manage
assignments, track student progress, and provide meaningful feedback at scale.

Dream LMS fills this gap by layering a complete learning management system over the FlowBook ecosystem. By integrating with Dream Central
Storage's existing book data and activity definitions, Dream LMS enables teachers to assign specific activities as homework, monitor performance
analytics, identify common mistakes, and deliver personalized feedback. Publishers gain control over content distribution, while administrators
can oversee the entire system. This transforms FlowBook from an individual learning tool into a comprehensive classroom management platform that
saves teachers time, keeps students motivated, and helps publishers distribute content securely.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-21 | 1.0 | Initial PRD creation | PM Agent (John) |

---

## Requirements

### Functional Requirements

**User Management & Authentication:**

- FR1: System shall support four distinct user roles: Admin, Publisher, Teacher, and Student with role-based access control
- FR2: Admin shall be able to create, view, modify, and delete all user accounts across all roles
- FR3: Publishers shall be able to create Teacher accounts associated with specific schools
- FR4: Teachers shall be able to create and manage Student accounts individually or via bulk import
- FR4a: Admin shall be able to bulk import users (Publishers, Teachers, Students) via Excel file upload with a defined template structure
- FR4b: System shall provide downloadable Excel templates for bulk user import with required fields and format specifications
- FR4c: System shall validate Excel file structure and data before processing bulk imports and provide detailed error reports for invalid entries

**Content & Book Management:**

- FR5: System shall integrate with Dream Central Storage to access existing FlowBook data and activity configurations
- FR6: Publishers shall only be able to view and manage their own published books
- FR7: Publishers shall be able to assign book access permissions to specific schools and teachers
- FR8: System shall parse and interpret book `config.json` files to identify assignable activities

**Class & Assignment Management:**

- FR9: Teachers shall be able to create and manage multiple classes
- FR10: Teachers shall be able to add students to classes individually or in bulk
- FR11: Teachers shall be able to assign specific books, units, or individual activities as homework to entire classes or individual students
- FR12: Teachers shall be able to set due dates and time limits for assignments
- FR13: Students shall be able to view all assigned homework with assignment details and deadlines

**Activity Completion & Tracking:**

- FR14: Students shall be able to complete interactive activities (drag-and-drop, word matching, multiple-choice, true/false, word search) within
 the platform
- FR15: System shall automatically record student activity completion, scores, and response data
- FR16: Teachers shall be able to view real-time progress of student assignments
- FR17: Teachers shall be able to view individual student performance and class-wide analytics

**Performance Analytics & Reporting:**

- FR18: System shall generate detailed student performance reports showing scores, completion rates, and common mistakes
- FR19: Teachers shall be able to view performance analytics over configurable time periods (weekly, monthly, yearly)
- FR20: Students shall be able to view their own progress charts and learning history
- FR21: Teachers shall be able to identify patterns in student errors across activities

**Feedback & Communication:**

- FR22: Teachers shall be able to provide text feedback on student assignments
- FR23: Teachers shall be able to award badges or emoji reactions to student work
- FR24: System shall support direct messaging between teachers and students
- FR25: Students shall be able to ask questions to their teachers through the messaging system

**Notifications:**

- FR26: System shall provide an in-app notification center for all user roles
- FR27: System shall send notifications for new assignments, approaching deadlines, and received feedback
- FR28: Students shall receive notifications when teachers provide feedback or comments

**Additional Materials:**

- FR29: Teachers shall be able to upload supplementary materials (PDFs, videos, web links)
- FR30: Teachers shall be able to share uploaded materials with entire classes or individual students

**Administrative Oversight:**

- FR31: Admin shall be able to view and manage all schools, publishers, teachers, and students in the system
- FR32: Admin shall be able to access system-wide reports and analytics
- FR33: Admin shall be able to manage publisher accounts and their content permissions

### Non-Functional Requirements

**Performance:**

- NFR1: Activity loading and completion shall respond within 2 seconds under normal network conditions
- NFR2: System shall support concurrent access by at least 1,000 active users without performance degradation
- NFR3: Report generation shall complete within 5 seconds for datasets up to 500 students

**Security & Privacy:**

- NFR4: All user authentication shall use industry-standard encryption and secure password storage
- NFR5: Student data shall be isolated and accessible only to authorized teachers, publishers, and administrators
- NFR6: System shall comply with educational data privacy regulations (e.g., FERPA, COPPA where applicable)
- NFR7: Publisher content shall be protected with access controls preventing unauthorized distribution

**Usability:**

- NFR8: User interface shall be intuitive enough for teachers to create assignments without training
- NFR9: Student activity interface shall be consistent with existing FlowBook user experience
- NFR10: System shall support multiple languages for international publisher/school adoption

**Reliability:**

- NFR11: System shall maintain 99.5% uptime during school hours (8 AM - 6 PM local time)
- NFR12: All student activity data shall be automatically saved to prevent data loss
- NFR13: System shall implement automatic backups of all user data and activity responses

**Scalability:**

- NFR14: Architecture shall support horizontal scaling to accommodate growing user base
- NFR15: System shall handle schools with up to 10,000 students without architectural changes

**Integration:**

- NFR16: System shall maintain compatibility with Dream Central Storage API for real-time book data access
- NFR17: System shall support standard data export formats (CSV, PDF) for reports and analytics

**Maintainability:**

- NFR18: Codebase shall follow established coding standards and include comprehensive documentation
- NFR19: System shall include logging and monitoring for troubleshooting and performance tracking

---

## User Interface Design Goals

### Overall UX Vision

Dream LMS shall provide a clean, intuitive interface that maintains visual and interaction consistency with the existing FlowBook application.
The platform prioritizes ease of use for teachers (who may have limited technical expertise) while keeping students engaged through familiar
activity patterns. Each user role receives a tailored dashboard experience optimized for their primary workflows: Admin focuses on oversight and
system management, Publishers manage content distribution, Teachers handle classroom operations, and Students access assignments and track
progress. The interface design emphasizes quick task completion, clear information hierarchy, and minimal clicks to achieve common goals.

### Key Interaction Paradigms

- **Role-Based Dashboards**: Each user role sees a customized home screen with relevant actions and information
- **Dialog-Based Assignment Creation**: Teachers create assignments through guided modal dialogs: select book → choose activity → configure
settings (due date, time limit, recipients)
- **Real-Time Progress Visualization**: Charts and progress bars update live as students complete work
- **Contextual Actions**: Right-click or hover menus provide quick access to common operations (view report, message student, view details)
- **Notification-Driven Workflow**: Users are proactively alerted to items requiring attention (new assignments, pending feedback, approaching
deadlines)
- **Bulk Operations Support**: Multi-select checkboxes for batch actions (assign to multiple classes, message multiple students)
- **Responsive Data Tables**: Sortable, filterable lists for managing students, assignments, and reports
- **Modal-Based Detail Views**: Activity details, student profiles, and reports open in overlay modals to maintain context

### Core Screens and Views

1. **Login/Authentication Screen** - Universal entry point for all user roles
2. **Admin Dashboard** - System overview with user statistics, school management, and publisher oversight
3. **Publisher Dashboard** - Book catalog management and school/teacher assignment interface
4. **Teacher Dashboard** - Class overview, recent activity, upcoming deadlines, and quick-assign tools
5. **Teacher Class Management** - Student roster, bulk import interface, class settings
6. **Teacher Assignment Creator** - Book/activity browser with assignment configuration (due dates, time limits)
7. **Teacher Analytics View** - Performance charts, student reports, error pattern analysis
8. **Teacher Messaging Center** - Conversation threads with students, notification management
9. **Student Dashboard** - Assigned homework list, progress summary, recent feedback
10. **Student Activity Player** - Interactive activity interface (consistent with FlowBook)
11. **Student Progress View** - Personal performance charts and learning history
12. **Shared Notification Center** - Unified notification panel for all user roles
13. **Materials Library** - Teacher upload/management and student access to supplementary content

### Accessibility: WCAG AA

Dream LMS shall meet WCAG 2.1 Level AA standards to ensure usability for students and teachers with disabilities. This includes keyboard
navigation support, screen reader compatibility, sufficient color contrast ratios, resizable text, and alternative text for all meaningful
images. Interactive activities inherited from FlowBook shall be evaluated and enhanced for accessibility compliance.

### Branding

The platform shall adopt a professional educational aesthetic with a warm, approachable color palette that appeals to both teachers and students.
 Visual design should feel modern but not overly playful (balancing K-12 engagement with professional credibility). Consistency with FlowBook's
existing visual language is essential for brand recognition and ease of adoption. The interface shall use clear iconography, readable typography
(minimum 14px body text), and adequate whitespace to reduce cognitive load.

### Target Device and Platforms: Web Responsive

Dream LMS shall be delivered as a responsive web application accessible via modern browsers (Chrome, Firefox, Safari, Edge) on desktop, tablet,
and mobile devices. The interface shall adapt gracefully across screen sizes:

- **Desktop (1024px+)**: Full feature set with multi-column layouts and advanced data tables
- **Tablet (768px-1023px)**: Optimized for touch with simplified navigation and stacked layouts
- **Mobile (320px-767px)**: Essential workflows only (student activity completion, teacher quick feedback, notifications)

Native mobile app development is explicitly OUT OF SCOPE for MVP but may be considered for future phases based on user feedback and adoption
metrics.

---

## Technical Assumptions

### Repository Structure: Monorepo

The project uses a monorepo structure based on the FastAPI Full-Stack Template with clear separation between frontend and backend:

```
dream-lms/
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── main.py              # FastAPI app initialization
│   │   ├── api/                 # API routers
│   │   ├── core/                # Configuration and security
│   │   ├── models/              # SQLModel models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic layer
│   │   └── tests/               # Pytest tests
│   ├── alembic/                 # Database migrations
│   └── Dockerfile
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/          # Shared components (Shadcn UI)
│   │   ├── features/            # Feature modules
│   │   ├── pages/               # Route pages
│   │   ├── services/            # API clients
│   │   └── stores/              # State management
│   └── Dockerfile
├── docker-compose.yml           # Orchestration
├── docs/                        # Project documentation
└── .env                         # Environment variables
```

**Rationale**: The FastAPI template's monorepo structure enables coordinated development, shared tooling, and atomic commits across full-stack features, which is ideal for a small team and MVP development pace. The template provides production-ready organization patterns that accelerate development.

### Service Architecture

**Monolithic Architecture with Service Layer Pattern**

Dream LMS shall be built as a monolithic application with FastAPI backend and React frontend, deployed as Docker containers on a single VPS. The
backend follows a layered architecture:

- **API Layer**: FastAPI routers handling HTTP requests
- **Service Layer**: Business logic and orchestration
- **Data Layer**: SQLModel ORM models and database access
- **Integration Layer**: Dream Central Storage REST API client

**Rationale**: Monolithic architecture reduces operational complexity for MVP deployment on single VPS while maintaining clear code organization
for future microservices extraction if scaling requires it.

### Backend Technology Stack

**Core Framework:**

- **Python 3.11+**: Modern Python with performance improvements
- **FastAPI**: Async web framework with automatic OpenAPI documentation
- **Uvicorn**: ASGI server for running FastAPI
- **Gunicorn**: Production process manager with multiple Uvicorn workers

**Data & Persistence:**

- **PostgreSQL 15+**: Primary relational database
- **SQLModel**: Modern ORM combining SQLAlchemy 2.0 + Pydantic for unified models
- **Alembic**: Database migration management
- **Pydantic**: Data validation and serialization (built into FastAPI and SQLModel)

**Authentication & Security:**

- **JWT (JSON Web Tokens)**: Stateless authentication
- **python-jose**: JWT token generation and validation
- **passlib + bcrypt**: Password hashing
- **python-multipart**: File upload handling for Excel bulk imports

**Integration & External Services:**

- **httpx**: Async HTTP client for Dream Central Storage API integration
- **openpyxl**: Excel file parsing for bulk import functionality
- **MinIO Python SDK**: Direct interaction with Dream Central Storage if needed

**Testing & Quality:**

- **pytest**: Primary testing framework
- **pytest-asyncio**: Async test support
- **httpx**: API integration testing
- **coverage.py**: Code coverage measurement

### Frontend Technology Stack

**Core Framework:**

- **React 18**: UI library with concurrent features
- **Vite**: Build tool and dev server (faster than CRA)
- **TypeScript**: Type safety and better developer experience
- **React Router v6**: Client-side routing

**UI Framework & Styling:**

- **Shadcn UI**: High-quality, accessible React components built on Radix UI
- **Radix UI**: Unstyled, accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library (consistent with Shadcn ecosystem)

**State Management:**

- **TanStack Query (React Query)**: Server state management, caching, and API calls
- **Zustand**: Lightweight client state management for UI state

**Forms & Validation:**

- **React Hook Form**: Performant form handling
- **Zod**: TypeScript-first schema validation (integrates with React Hook Form)

**Data Visualization:**

- **Recharts**: Composable charting library for performance analytics and progress tracking

**Testing:**

- **Vitest**: Fast unit testing (Vite-native)
- **React Testing Library**: Component testing
- **MSW (Mock Service Worker)**: API mocking for tests

### Database Design

**PostgreSQL 15+ with SQLModel ORM**

Key database design decisions:

- **Multi-tenancy**: Publisher-based data isolation using foreign keys and query filters
- **Activity Data**: JSON columns for storing flexible activity configurations from Dream Central Storage
- **Audit Trails**: Timestamps (created_at, updated_at) on all entities
- **Soft Deletes**: Logical deletion for critical entities (students, assignments) to preserve historical data

**Performance Considerations:**

- Indexed foreign keys for role-based queries
- Composite indexes on (teacher_id, class_id) for class management queries
- Full-text search indexes for book/activity search

### Dream Central Storage Integration

**REST API Integration via HTTP Client**

Dream LMS shall integrate with Dream Central Storage as the authoritative source for:

- Book catalog and metadata
- Activity definitions (config.json parsing)
- Media assets (images, audio for activities)
- Teacher-uploaded supplementary materials (PDFs, videos)

**Integration Pattern:**

- **Backend Proxy**: FastAPI backend proxies requests to Dream Central Storage (avoids CORS, centralizes auth)
- **Caching Layer**: Redis or in-memory caching for frequently accessed book data
- **Error Handling**: Graceful degradation if Dream Central Storage is temporarily unavailable

**Required from Dream Central Storage:**

- API endpoint documentation
- Authentication mechanism (API keys, OAuth, or existing JWT)
- Rate limits and usage quotas
- Webhook support for content updates (if available)

### Authentication & Authorization

**JWT-Based Authentication**

**Authentication Flow:**

1. User logs in with credentials provided by admin/publisher/teacher (email/password)
2. Backend validates credentials against PostgreSQL user table
3. Backend issues JWT token containing user_id, role, and relevant IDs (publisher_id, teacher_id, etc.)
4. Frontend stores JWT in httpOnly cookie or localStorage
5. Frontend includes JWT in Authorization header for all API requests
6. Backend middleware validates JWT and extracts user context for authorization

**Authorization Strategy:**

- **Role-Based Access Control (RBAC)**: Four roles with hierarchical permissions
- **Resource-Based Authorization**: Publishers see only their books, teachers see only their classes
- **FastAPI Dependencies**: Reusable dependency functions for role/permission checking

**Token Management:**

- Access tokens: 1-hour expiration
- Refresh tokens: 7-day expiration for seamless re-authentication
- Token revocation: Blacklist in Redis for logout functionality

**Account Creation Chain:**

- No public registration endpoint
- Admin creates Publisher accounts manually
- Publishers create Teacher accounts
- Teachers create Student accounts (individual or bulk)
- All accounts receive auto-generated temporary passwords

### File Storage Strategy

**Dream Central Storage (MinIO-backed) for All File Assets**

All file uploads shall be stored in Dream Central Storage:

- **Teacher-uploaded materials**: PDFs, videos, web links
- **Excel bulk import files**: Temporary storage for processing, then deleted
- **User profile images**: Optional avatar uploads (future enhancement)

**Upload Flow:**

1. Frontend uploads file to FastAPI backend
2. Backend validates file (type, size, virus scan if applicable)
3. Backend uploads to Dream Central Storage via REST API
4. Backend stores file reference (URL/key) in PostgreSQL
5. Frontend retrieves files via signed URLs from Dream Central Storage

**Storage Quotas:**

- Per-teacher material storage limit (e.g., 500 MB)
- Maximum file size per upload (e.g., 50 MB)
- Configurable via admin settings

### Deployment Architecture

**Single VPS Deployment with Docker**

**MVP Deployment (Single VPS):**

```
VPS (Ubuntu 22.04 LTS)
├── Docker Compose Stack
│   ├── Traefik (reverse proxy, auto-HTTPS with Let's Encrypt)
│   ├── Frontend Container (React build, served via Traefik)
│   ├── Backend Container (FastAPI with Gunicorn + Uvicorn workers)
│   ├── PostgreSQL (persistent volume)
│   └── Redis (caching, optional)
└── Docker Volumes (database, letsencrypt certificates)
```

**Scaling Strategy (Future):**

- **Phase 2**: Separate database to managed PostgreSQL (e.g., AWS RDS, DigitalOcean Managed DB)
- **Phase 3**: Load balancer + multiple app servers
- **Phase 4**: Kubernetes orchestration for auto-scaling

**CI/CD Pipeline:**

- GitHub Actions for automated testing and Docker image builds
- Docker Registry (Docker Hub or private) for image storage
- SSH deployment to VPS or Docker Swarm for orchestration

**Backup Strategy:**

- Daily PostgreSQL backups to external storage
- Dream Central Storage handles file redundancy
- Database migration scripts in version control

### Testing Requirements

**Unit Testing + Integration Testing (Manual E2E)**

**Backend Testing (pytest):**

- Unit tests for service layer business logic (target: 80% coverage)
- Integration tests for API endpoints using TestClient
- Database tests with test database fixtures
- Mock Dream Central Storage API for isolated tests

**Frontend Testing (Vitest + React Testing Library):**

- Unit tests for utility functions and hooks
- Component tests for UI components (target: 70% coverage)
- Integration tests for user flows (assignment creation, bulk import dialog)

**Manual Testing:**

- End-to-end user journeys performed manually by project team
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Responsive design testing (desktop, tablet, mobile viewports)
- Accessibility testing with screen readers (WCAG AA validation)

**Test Data:**

- Seed scripts for creating test users, books, and assignments
- Anonymized production-like data for realistic testing

### Additional Technical Assumptions and Requests

**Performance Targets:**

- API response times under 200ms for standard queries (excluding Dream Central Storage calls)
- Page load time under 3 seconds on 3G connection
- Support 100 concurrent users on single VPS (MVP scale)

**Monitoring & Logging:**

- Structured logging with Python logging module (JSON format)
- Application Performance Monitoring (APM) - consider Sentry for error tracking
- Basic metrics: request counts, response times, error rates

**Code Quality & Standards:**

- **Backend**: PEP 8 style guide, enforced by Black formatter and Flake8 linter
- **Frontend**: ESLint + Prettier for code formatting
- **Git**: Feature branch workflow with pull request reviews
- **Documentation**: OpenAPI/Swagger auto-generated for API docs

**Security Considerations:**

- HTTPS only (Let's Encrypt SSL certificates)
- SQL injection prevention via SQLModel parameterized queries
- XSS prevention via React's built-in escaping
- CSRF protection for state-changing operations
- Rate limiting on API endpoints (e.g., 100 requests/minute per user)
- Input validation on all user-supplied data

**Development Environment:**

- Docker Compose for local development (PostgreSQL + Redis + backend + frontend)
- Environment variables for configuration (`.env` files, never committed)
- VS Code recommended with Python, TypeScript, and ESLint extensions

**FlowBook Activity Player:**

- Interactive activities shall be rebuilt as React components from scratch
- UX and interaction patterns shall reference FlowBook screenshots for consistency
- WebAssembly reuse is OUT OF SCOPE for MVP due to integration complexity
- Activity types to support: drag-and-drop, word matching, multiple-choice, true/false, word search
- Activity rendering shall parse config.json structure from Dream Central Storage

**Excel Bulk Import Structure:**

- Required columns for student import: First Name, Last Name, Email, Grade/Class
- Optional columns: Student ID, Date of Birth, Parent Email
- Template file shall be downloadable from the admin/teacher interface
- Validation errors shall be reported line-by-line with specific error messages

---

## Implementation Foundation

### FastAPI Full-Stack Template Foundation

Dream LMS is built on the **official FastAPI Full-Stack Template** (https://github.com/fastapi/full-stack-fastapi-template), which provides a production-ready foundation that **eliminates weeks of infrastructure work**:

**✅ What Template Already Provides (No Need to Build):**

**Backend - Complete & Production-Ready:**
- FastAPI application with async support
- SQLModel ORM (SQLAlchemy 2.0 + Pydantic)
- JWT authentication (login, refresh, password reset)
- User CRUD endpoints (create, read, update, delete)
- Admin user management page with pagination
- PostgreSQL database with Alembic migrations
- Email system (password recovery)
- Pytest testing framework with fixtures
- Docker Compose with Traefik reverse proxy
- Auto-HTTPS with Let's Encrypt

**Frontend - Complete & Production-Ready:**
- React 19 + TypeScript + Vite
- TanStack Router (file-based routing)
- TanStack Query (server state + caching)
- Chakra UI v3 component library
- React Hook Form for forms
- Authentication pages (login, signup, password reset)
- Protected routes with role guards
- Admin dashboard with user table
- Settings page (user profile editing)
- Navbar + Sidebar layout
- Playwright E2E testing
- Auto-generated API client from OpenAPI

**Development Tools:**
- Pre-commit hooks (linting, formatting)
- Environment variable management
- Docker multi-stage builds
- GitHub Actions workflows (placeholder)

### What We Need to Build on Top of Template

**Backend Extensions (3-4 weeks):**
- ✅ Extend User model with `role` field (admin/publisher/teacher/student)
- ✅ Add 20+ LMS domain tables: Publishers, Schools, Teachers, Students, Classes, Books, Activities, Assignments, Analytics, Messages, Materials
- ✅ Build LMS-specific API endpoints (assignments, activities, analytics, messaging)
- ✅ Integrate with Dream Central Storage (MinIO) for books and assets
- ✅ Implement activity scoring algorithms
- ✅ Build analytics calculations and reporting

**Frontend Transformation (4-5 weeks):**
- ✅ Migrate from Chakra UI → Shadcn UI + Tailwind (neumorphic design system)
- ✅ Extend navigation for 4 roles (admin/publisher/teacher/student dashboards)
- ✅ Build all LMS pages with **mock data first**: books, assignments, activity players, analytics, messaging, materials
- ✅ Replace template's "Items" demo with LMS domain features
- ✅ Implement 6 activity player types with client-side scoring

**Integration Phase (2-3 weeks):**
- ✅ Connect all mock-data UIs to real backend APIs
- ✅ Replace dummy data with TanStack Query hooks
- ✅ End-to-end testing of all user workflows

**What We Remove from Template:**
- ❌ Copier system (used once during initial setup, then deleted)
- ❌ "Items" demo feature (backend + frontend)
- ❌ Chakra UI dependencies (replaced with Shadcn)
- ❌ Signup page (no public registration - all user creation is role-based)

### Development Workflow

**Frontend Development Approach:**
1. Build all pages and UI components with dummy/mock data first
2. Use **Shadcn MCP server** to rapidly generate Shadcn UI components during development
3. Implement routing, forms, and state management with mock API responses
4. Connect to backend APIs only after frontend UX is validated

**Testing Scripts:**
- `setup-fresh.sh`: Clean environment setup script for testing fresh installations
- `run-all-tests.sh`: Sequential test runner (backend unit + integration + frontend E2E)
- `postman_collection.json`: Backend API testing collection (updated as APIs are added)

**Story-Based Branching:**
- Each new story gets a dedicated feature branch (e.g., `feature/story-3.2`)
- System warns if previous story branch not merged before starting new branch
- Merge to main only after story acceptance criteria met and tests pass

**Shadcn MCP Integration:**
During frontend development, developers will use the Shadcn MCP server to quickly scaffold new UI components by requesting them from the AI assistant, which will generate the appropriate Shadcn components with proper styling and accessibility features.

---

## Epic List

### Epic 1: Extend Template for LMS Domain (Backend)

**Estimated Effort:** 2-3 weeks | **Status:** 🚀 READY TO START

Extend the template's simple User/Item model to support Dream LMS's 4-role system and complete domain model. Add 20+ tables for Publishers, Schools, Teachers, Students, Classes, Books, Activities, Assignments, Analytics, Messages, and Materials. Remove template's demo "Items" feature.

**What Template Provides:** User model, JWT auth, CRUD endpoints, Alembic migrations, admin page
**What We Build:** Role field + 20+ LMS domain tables + role-specific API endpoints + bulk import

**Deliverable:** Complete backend schema and core APIs ready for frontend integration

---

### Epic 2: UI Migration & LMS Pages (Frontend with Mock Data)

**Estimated Effort:** 4-5 weeks | **Status:** ⏸️ BLOCKED (requires Epic 1 schema)

Replace template's Chakra UI with Shadcn UI + Tailwind (neumorphic design). Build all LMS pages (dashboards, books, assignments, activity players, analytics, messaging) using **mock/dummy data only**. Extend template's navbar/sidebar for 4 roles.

**What Template Provides:** Login page, protected routes, navbar, sidebar, admin dashboard with Chakra UI
**What We Build:** Chakra → Shadcn migration + 4 role dashboards + all LMS pages with mock data

**Deliverable:** Fully functional frontend demo with polished UI (no backend needed yet)

---

### Epic 3: Books & Assignments (Backend + Integration)

**Estimated Effort:** 3-4 weeks | **Status:** ⏸️ BLOCKED (requires Epic 2 UI)

Build backend APIs for Dream Central Storage integration, book catalog sync, class management, and assignment creation. Connect Epic 2's mock-data UIs to real APIs. Students see assignments, teachers create assignments.

**Deliverable:** Teachers can assign books, students see assignments (activity players not functional yet)

---

### Epic 4: Activity Players (Backend + Integration)

**Estimated Effort:** 4-5 weeks | **Status:** ⏸️ BLOCKED (requires Epic 3)

Build backend APIs for activity submission and scoring. Connect Epic 2's activity player UIs to real APIs. Implement 6 activity types (drag-drop, word matching, multiple choice, true/false, circle, word search) with client-side scoring and server-side recording.

**Deliverable:** Students can complete activities, scores are recorded, teachers see completion status

---

### Epic 5: Analytics & Reporting (Backend + Integration)

**Estimated Effort:** 2-3 weeks | **Status:** ⏸️ BLOCKED (requires Epic 4)

Build backend APIs for performance analytics, error pattern analysis, and progress tracking. Connect Epic 2's analytics dashboard UIs to real APIs. Generate teacher insights, student progress charts, class statistics.

**Deliverable:** Teachers see detailed analytics, students see progress charts, admins see system-wide reports

---

### Epic 6: Messaging & Materials (Backend + Integration)

**Estimated Effort:** 2-3 weeks | **Status:** ⏸️ BLOCKED (requires Epic 2)

Build backend APIs for teacher-student messaging, notifications, feedback, and material uploads to Dream Central Storage. Connect Epic 2's messaging/materials UIs to real APIs.

**Deliverable:** Full communication system - messaging, notifications, feedback, file sharing

---

## Epic 1: Extend Template for LMS Domain (Backend)

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

### Story 1.1: Remove Template Demo & Extend User Model

As a **developer**,
I want **to remove the template's "Items" demo and extend the User model for 4-role RBAC**,
so that **we have a clean foundation for LMS-specific features**.

#### Acceptance Criteria:

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

### Story 1.2: LMS Domain Schema - Publishers, Schools, Teachers, Students

As a **developer**,
I want **database models for Publishers, Schools, Teachers, and Students with proper relationships**,
so that **we can implement the 4-role LMS user hierarchy**.

#### Acceptance Criteria:

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

### Story 1.3: LMS Domain Schema - Classes, Books, Activities, Assignments

As a **developer**,
I want **database models for Classes, Books, Activities, and Assignments**,
so that **we can implement the core LMS assignment workflow**.

#### Acceptance Criteria:

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

#### Acceptance Criteria:

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

### Story 1.5: Bulk Import System (Excel Upload)

As a **teacher or admin**,
I want **to bulk import users via Excel file upload**,
so that **I can efficiently onboard many students or teachers at once**.

#### Acceptance Criteria:

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

## Epic 2: UI Migration & LMS Pages (Frontend with Mock Data)

**Status:** ⏸️ BLOCKED by Epic 1 (needs schema) | **Estimated Effort:** 4-5 weeks

**Epic Goal:**

Transform the template's Chakra UI frontend into a polished Shadcn UI + Tailwind application with neumorphic design. Build ALL LMS pages (4 role dashboards, books, assignments, activity players, analytics, messaging, materials) using **mock/dummy data only**. Extend template's navbar and sidebar for 4 distinct roles. By the end of this epic, we have a fully functional, beautiful frontend demo that can be shown to stakeholders without needing any backend beyond login.

**What Template Already Provides (We Modify):**
- ✅ Login page (restyle with Shadcn, keep auth logic)
- ✅ Protected routes system (keep as-is)
- ✅ Navbar + Sidebar layout (restyle, extend for 4 roles)
- ✅ Admin user table page (restyle, extend for publishers/schools/teachers/students)
- ✅ Settings page (restyle)
- ✅ TanStack Router file-based routing (keep)
- ✅ TanStack Query setup (keep, use for mock data hooks)

**What We Build (All with Mock Data):**
- ✅ Remove Chakra UI, install Shadcn + Tailwind
- ✅ Design system tokens (colors, neumorphic shadows, typography)
- ✅ 4 role-specific dashboards (admin/publisher/teacher/student)
- ✅ Book catalog page + book detail
- ✅ Assignment creation wizard (multi-step form)
- ✅ Assignment list + assignment detail
- ✅ Class management pages
- ✅ 6 activity player components (drag-drop, matching, etc.)
- ✅ Analytics dashboards (charts with mock data)
- ✅ Messaging inbox + conversation view
- ✅ Materials library (upload UI + file list)
- ✅ Notification system
- ✅ Dark mode support

**Key Principle:** Build UI first, connect APIs later (Epics 3-6)

### Story 2.1: Remove Chakra UI & Install Shadcn + Design System

As a **developer**,
I want **to replace Chakra UI with Shadcn UI + Tailwind and configure the neumorphic design system**,
so that **we have a clean foundation for Dream LMS's unique visual aesthetic**.

#### Acceptance Criteria:

1. Remove Chakra UI: `npm uninstall @chakra-ui/react @emotion/react @emotion/styled`
2. Install Shadcn: `npx shadcn-ui@latest init` with Tailwind + TypeScript
3. Configure `tailwind.config.ts` with Dream LMS color palette (Teal 500: #14B8A6, Cyan 500: #06B6D4, full scale)
4. Add neumorphic shadow utilities to Tailwind config (neuro-sm, neuro, neuro-lg)
5. Install core Shadcn components (20+): button, card, input, select, table, dialog, sheet, dropdown-menu, toast, form, etc.
6. Create design system file `src/lib/design-tokens.ts` with colors, spacing, typography
7. Configure dark mode with `next-themes` (already in template)
8. Update global CSS with Inter font, gradient backgrounds
9. All components work in light + dark mode
10. Document component usage in `/docs/components.md`

### Story 2.2: Migrate Existing Pages (Login, Navbar, Sidebar, Admin)

As a **developer**,
I want **to migrate template's existing pages from Chakra to Shadcn**,
so that **we maintain all functionality while adopting the new design system**.

#### Acceptance Criteria:

1. **Login page** (`src/routes/login.tsx`): Replace Chakra components with Shadcn Button, Input, Card
2. **Navbar** (`src/components/Common/Navbar.tsx`): Replace with Shadcn DropdownMenu, Avatar, theme toggle
3. **Sidebar** (`src/components/Common/Sidebar.tsx`): Redesign with neumorphic styling, role-based menus
4. **Admin page** (`src/routes/_layout/admin.tsx`): Replace Chakra Table with Shadcn Table + TanStack Table
5. **Settings page** (`src/routes/_layout/settings.tsx`): Replace forms with Shadcn Form + React Hook Form
6. Remove all `<Box>`, `<Flex>`, `<Stack>` → replace with Tailwind classes
7. Replace `useToast()` → Shadcn `toast()` + `<Toaster />`
8. All pages responsive and accessible
9. Dark mode works on all pages
10. Authentication logic unchanged (keep TanStack Query hooks)

### Story 2.3: Build 4 Role-Specific Dashboards (Mock Data)

As a **user**,
I want **a role-specific dashboard showing relevant information for my role**,
so that **I see only what's relevant to me**.

#### Acceptance Criteria:

**Mock data in `src/lib/mockData.ts`**

1. **Admin Dashboard** (`src/routes/_layout/admin/dashboard.tsx`):
   - System stats cards: Total users (432), Active schools (12), Total assignments (1,245)
   - Recent activity feed (mock data)
   - Quick actions: Add publisher, Add school
   - Charts: User growth (Recharts line chart), Activity by type (bar chart)
2. **Publisher Dashboard** (`src/routes/_layout/publisher/dashboard.tsx`):
   - My schools (5 schools with mock data)
   - My books (8 books with mock covers)
   - Teachers created (23)
   - Quick actions: Create teacher, Assign book
3. **Teacher Dashboard** (`src/routes/_layout/teacher/dashboard.tsx`):
   - My classes (3 classes with student counts)
   - Recent assignments (5 with completion rates)
   - Upcoming deadlines
   - Quick actions: Create assignment, Create class
   - Charts: Class performance, Assignment completion trend
4. **Student Dashboard** (`src/routes/_layout/student/dashboard.tsx`):
   - Assignments due (4 cards with countdown timers)
   - Progress chart (mock score history)
   - Recent feedback
   - Achievements/badges (mock)
5. All dashboards use neumorphic cards with gradients
6. All use mock data (no API calls)
7. Responsive design

### Story 2.4: Build Books & Assignments Pages (Mock Data)

As a **teacher/student**,
I want **to browse books and manage assignments**,
so that **I can assign work and see what's due**.

#### Acceptance Criteria:

**Mock data includes 12 books, 20 activities, 15 assignments**

1. **Book Catalog** (`src/routes/_layout/teacher/books/index.tsx`):
   - Grid view of books with cover images
   - Search + filter by publisher, activity type
   - "View Activities" button → book detail page
2. **Book Detail** (`src/routes/_layout/teacher/books/$bookId.tsx`):
   - Book info + activities list
   - "Assign" button → opens assignment wizard
3. **Assignment Creation Wizard** (multi-step dialog):
   - Step 1: Review activity
   - Step 2: Select students/classes
   - Step 3: Configure (due date, time limit, instructions)
   - Step 4: Review + Create
   - Stores to mock assignment list (no API)
4. **Teacher Assignment List** (`src/routes/_layout/teacher/assignments/index.tsx`):
   - Table with: Name, Book, Due date, Completion rate, Actions
   - Filter by status, sort by due date
   - "View Details" → assignment detail
5. **Assignment Detail** (`src/routes/_layout/teacher/assignments/$assignmentId.tsx`):
   - Assignment info
   - Student completion table (mock scores)
6. **Student Assignment View** (`src/routes/_layout/student/assignments/index.tsx`):
   - Tabs: To Do, Completed, Past Due
   - Assignment cards with status badges
   - "Start Assignment" → activity player

### Story 2.5: Build 6 Activity Player Components (Mock Data)

As a **student**,
I want **to complete interactive activities**,
so that **I can do my homework and see my score**.

#### Acceptance Criteria:

**All activity players use mock config data (no API calls)**

1. **DragDropPicturePlayer** (`src/components/ActivityPlayers/DragDropPicturePlayer.tsx`):
   - Background image, draggable words, drop zones
   - Client-side scoring on submit
   - Mock score display
2. **MatchTheWordsPlayer**: Two columns, drag to match pairs
3. **MultipleChoicePlayer**: Question + 4 options, radio select
4. **TrueFalsePlayer** (CirclePlayer): Mark statements as true/false by circling
5. **MarkWithXPlayer**: Mark incorrect items with X
6. **PuzzleFindWordsPlayer**: Word search grid
7. All players:
   - Timer (if time limit set in mock assignment)
   - Submit button → show mock score
   - "Back to Assignments" button
   - Responsive design
   - Accessibility (keyboard navigation)
8. See `front-end-spec.md` Section 4 for detailed player specs

### Story 2.6: Build Analytics, Messaging, Materials Pages (Mock Data)

As a **teacher**,
I want **analytics dashboards, messaging, and materials management**,
so that **I can monitor performance and communicate with students**.

#### Acceptance Criteria:

1. **Analytics Dashboard** (`src/routes/_layout/teacher/analytics/index.tsx`):
   - Recharts: Student performance over time, activity type breakdown, error patterns
   - Filter by date range, class, student
   - Export button (mock download)
2. **Student Analytics Detail** (`src/routes/_layout/teacher/analytics/$studentId.tsx`):
   - Individual student progress chart
   - Activity history table
   - Strengths/weaknesses summary
3. **Messaging Inbox** (`src/routes/_layout/messaging/index.tsx`):
   - Message list (mock conversations)
   - Unread count badge
   - Search messages
4. **Conversation View** (`src/routes/_layout/messaging/$conversationId.tsx`):
   - Message thread (mock messages)
   - Send message form (stores locally, no API)
5. **Materials Library** (`src/routes/_layout/teacher/materials/index.tsx`):
   - File upload dropzone (stores to mock list)
   - File list table (name, type, size, actions)
   - Share with class/student (mock)
6. All use mock data, responsive, accessible

**Epic 2 Complete:** Fully functional frontend demo with polished UI, ready for backend integration in Epics 3-6

---

## Epic 3: Book Integration & Assignment Management

**Epic Goal:**

Integrate Dream LMS with Dream Central Storage to provide access to the complete book catalog and activity definitions. Enable teachers to create
 and manage classes, browse available books and their interactive activities, and create assignments with configurable settings (due dates, time 
limits, target students/classes). Students can view their assigned homework with all relevant details and deadlines. By the end of this epic, the
 core LMS assignment workflow is complete: teachers assign work, students see what's due, setting the foundation for activity completion in Epic
4.

### Story 3.1: Dream Central Storage API Integration

As a **developer**,  
I want **a reusable HTTP client service that authenticates with and queries Dream Central Storage REST API**,  
so that **the backend can retrieve book catalogs, activity configurations, and media assets**.

#### Acceptance Criteria:

1. Backend service class `DreamCentralStorageClient` is created using httpx async client
2. Client authenticates with Dream Central Storage using provided credentials/API keys (configuration from environment variables)
3. Client implements retry logic with exponential backoff for transient failures (max 3 retries)
4. Client includes timeout configuration (e.g., 30 seconds for API calls)
5. Error handling differentiates between client errors (4xx), server errors (5xx), and network failures
6. Client implements connection pooling for performance optimization
7. Client methods include: `get_books()`, `get_book_by_id(book_id)`, `get_book_config(book_id)`, `get_asset_url(asset_path)`
8. Response caching layer stores frequently accessed book data (e.g., 15-minute TTL using in-memory cache or Redis)
9. API endpoint documentation from Dream Central Storage is incorporated into developer documentation
10. Unit tests mock Dream Central Storage responses to test error handling and retry logic
11. Integration tests verify successful communication with actual Dream Central Storage API (using test credentials)
12. Logging captures all API requests/responses for debugging and monitoring
13. Rate limiting is respected based on Dream Central Storage API quotas

### Story 3.2: Book Catalog & Activity Data Models

As a **developer**,
I want **database models and API schemas for books, activities, and their metadata**,
so that **the application can store book references and parse activity configurations**.

#### Acceptance Criteria:

1. Book model includes: id, dream_storage_id (external ID), title, publisher_id (foreign key), description, cover_image_url, created_at,
updated_at
2. BookAccess model implements publisher permissions: id, book_id (foreign key), publisher_id (foreign key), granted_at
3. Activity model includes: id, book_id (foreign key), dream_activity_id, activity_type (enum: drag_drop, word_match, multiple_choice, 
true_false, word_search), title, config_json (JSONB field), order_index
4. Database migration creates these tables with appropriate indexes (book_id, publisher_id, activity_type)
5. Backend service `BookService` syncs book data from Dream Central Storage to local database
6. Config.json parser extracts activity definitions and populates Activity table
7. API endpoint `GET /api/books/sync` (admin-only) triggers book catalog synchronization from Dream Central Storage
8. Pydantic schemas for API responses: BookResponse, ActivityResponse with proper validation
9. Unit tests verify config.json parsing for all activity types
10. Integration tests verify book sync creates/updates database records correctly
11. Composite index on (publisher_id, book_id) for efficient permission queries

### Story 3.3: Teacher Class Management

As a **teacher**,
I want **to create and manage classes and assign students to them**,
so that **I can organize my students into logical groups for assignment distribution**.

#### Acceptance Criteria:

1. Class model includes: id, name, teacher_id (foreign key), school_id (foreign key), grade_level, subject, academic_year, created_at, 
updated_at, is_active
2. ClassStudent model (junction table): id, class_id (foreign key), student_id (foreign key), enrolled_at
3. Teacher dashboard displays list of classes with student count and recent activity summary
4. Teacher can create new class via form modal (fields: class name, grade level, subject, academic year)
5. Teacher can edit class details (name, grade, subject)
6. Teacher can archive/deactivate class (soft delete) with confirmation
7. Teacher can view class detail page showing enrolled students list
8. Teacher can add students to class via multi-select dropdown (shows only students they created)
9. Teacher can remove students from class with confirmation
10. Teacher can add multiple students at once using checkboxes
11. API endpoint `POST /api/classes` creates new class owned by authenticated teacher
12. API endpoint `GET /api/classes` returns only classes owned by authenticated teacher
13. API endpoint `POST /api/classes/{class_id}/students` adds students to class with validation (student must belong to teacher)
14. Frontend shows empty state when teacher has no classes: "Create your first class to get started"
15. Unit tests verify teacher can only manage their own classes and students
16. Integration tests cover full class CRUD workflow

### Story 3.4: Book Catalog Browsing for Teachers

As a **teacher**,
I want **to browse the catalog of books available to me and view their interactive activities**,
so that **I can discover content to assign to my students**.

#### Acceptance Criteria:

1. Teacher navigation includes "Books" menu item leading to book catalog page
2. Book catalog displays all books accessible to teacher's publisher with grid or list view toggle
3. Each book card shows: cover image, title, publisher name, description (truncated), and "View Activities" button
4. Book catalog includes search functionality (by title or publisher)
5. Book catalog includes filter options: publisher, activity type, grade level (if metadata available)
6. Clicking "View Activities" opens book detail page or modal showing list of all activities
7. Activity list displays: activity title, activity type badge (drag-drop, word-match, etc.), estimated duration (if available)
8. Each activity has "Preview" button (placeholder/disabled for now - full preview in Epic 3)
9. Each activity has "Assign" button that opens assignment creation dialog
10. API endpoint `GET /api/books` returns books filtered by teacher's publisher with pagination
11. API endpoint `GET /api/books/{book_id}/activities` returns activities for specified book with config data
12. Backend verifies teacher has access to book through publisher permissions (BookAccess table)
13. Frontend displays appropriate message if no books are available: "No books assigned to your school yet. Contact your administrator."
14. Responsive design: grid view on desktop, list view on mobile
15. Integration tests verify teacher can only see books from their publisher

### Story 3.5: Assignment Creation Dialog & Configuration

As a **teacher**,
I want **to create assignments by selecting a book activity and configuring settings through a guided dialog**,
so that **I can assign work to my students with appropriate deadlines and parameters**.

#### Acceptance Criteria:

1. Clicking "Assign" button on any activity opens assignment creation dialog (modal)
2. **Dialog Step 1 - Review Activity**: Shows activity title, book name, activity type, and brief description with "Next" button
3. **Dialog Step 2 - Select Recipients**: Multi-select interface to choose target classes or individual students with "Select All" and search
functionality
4. **Dialog Step 3 - Configure Settings**: Form with fields: assignment name (auto-populated, editable), due date (date picker), optional time
limit (number input in minutes), instructions (textarea, optional)
5. **Dialog Step 4 - Review & Create**: Summary view showing activity, recipients count, due date, time limit, with "Create Assignment" and
"Back" buttons
6. Assignment model includes: id, teacher_id (FK), activity_id (FK), book_id (FK), name, instructions, due_date, time_limit_minutes, created_at, 
updated_at
7. AssignmentStudent model (junction): id, assignment_id (FK), student_id (FK), status (enum: not_started, in_progress, completed), score,
started_at, completed_at, time_spent_minutes
8. API endpoint `POST /api/assignments` creates assignment and links to students/classes
9. Backend validates: due date is in future, time limit is positive integer, teacher has access to activity, all selected students belong to
teacher
10. Frontend validates all form fields before allowing submission
11. Success confirmation shows "Assignment created successfully! X students will be notified."
12. Dialog can be cancelled at any step, discarding unsaved data with confirmation
13. After creation, teacher is redirected to assignment detail page
14. Unit tests verify assignment creation logic and validation rules
15. Integration tests verify end-to-end assignment creation flow with various configurations

### Story 3.6: Teacher Assignment Management Dashboard

As a **teacher**,
I want **to view and manage all assignments I've created**,
so that **I can track which work has been assigned and monitor upcoming deadlines**.

#### Acceptance Criteria:

1. Teacher navigation includes "Assignments" menu item leading to assignments dashboard
2. Assignments dashboard displays list of all assignments with columns: assignment name, book/activity, assigned to (class/student count), due
date, completion rate, actions
3. List view includes status badges: "Upcoming", "In Progress", "Past Due", "Completed"
4. List is sortable by: due date, creation date, completion rate, assignment name
5. List is filterable by: status, class, book, date range
6. Search functionality allows finding assignments by name
7. Each row has action buttons: "View Details", "Edit", "Delete"
8. Clicking "View Details" navigates to assignment detail page showing student completion list (detailed in Epic 4)
9. Clicking "Edit" opens dialog to modify: assignment name, instructions, due date, time limit (cannot change activity or recipients)
10. Clicking "Delete" shows confirmation dialog and soft-deletes assignment
11. Empty state when no assignments exist: "No assignments yet. Browse books to create your first assignment."
12. API endpoint `GET /api/assignments` returns all assignments created by authenticated teacher with eager-loaded relationships
13. API endpoint `PATCH /api/assignments/{assignment_id}` updates editable fields with validation
14. API endpoint `DELETE /api/assignments/{assignment_id}` soft-deletes assignment
15. Completion rate calculated as: (completed students / total assigned students) × 100%
16. Integration tests verify teacher can only view/edit/delete their own assignments

### Story 3.7: Student Assignment View & Dashboard

As a **student**,
I want **to see all homework assigned to me with due dates and status**,
so that **I know what work I need to complete and when it's due**.

#### Acceptance Criteria:

1. Student dashboard "Assignments" section now displays actual assigned homework (replacing empty state from Epic 1)
2. Assignments are organized into tabs: "To Do" (not started + in progress), "Completed", "Past Due"
3. Each assignment card shows: assignment name, book cover thumbnail, activity type badge, due date (with countdown timer if within 24 hours),
status (not started/in progress/completed), score (if completed)
4. "To Do" tab sorts assignments by due date (soonest first)
5. Past due assignments display warning badge and red highlight
6. Clicking assignment card navigates to assignment detail page showing: full description, instructions, book/activity info, time limit (if set),
 "Start Assignment" button
7. "Start Assignment" button is placeholder for Epic 3 (shows message: "Activity player coming soon")
8. Completed assignments show score, completion date, and "View Feedback" button (placeholder for Epic 5)
9. API endpoint `GET /api/students/me/assignments` returns all assignments for authenticated student with filtering by status
10. Backend calculates assignment status based on due_date and AssignmentStudent.status
11. Frontend displays appropriate empty states for each tab
12. Notification dot appears on "Assignments" menu when student has new assignments (count badge)
13. Student cannot see assignments assigned to other students
14. Responsive design optimized for mobile devices (students may primarily use phones)
15. Integration tests verify student can only view their own assignments

---

## Epic 4: Interactive Activities & Student Completion

**Epic Goal:**

Build complete interactive activity player components in React for all five activity types (drag-and-drop, word matching, multiple-choice, 
true/false, word search) that parse activity configurations from Dream Central Storage and provide engaging, accessible user experiences. Enable 
students to complete assignments, with automatic score calculation, progress tracking, and result submission to the backend. Implement activity 
state persistence so students can pause and resume work. By the end of this epic, students can complete their assigned homework, see their scores
 immediately, and teachers can view completion status (detailed analytics in Epic 4).

### Story 4.1: Activity Player Framework & Layout

As a **student**,  
I want **a consistent activity player interface that loads any activity type and provides navigation controls**,  
so that **I have a familiar experience regardless of which activity I'm completing**.

#### Acceptance Criteria:

1. Clicking "Start Assignment" from student assignment detail page navigates to `/assignments/{assignment_id}/play`
2. Activity player page includes header showing: assignment name, book title, activity type badge, timer (if time limit set), progress indicator
(question X of Y for multi-part activities)
3. API endpoint `GET /api/assignments/{assignment_id}/start` marks assignment as "in_progress" and returns full activity config and content
4. Frontend fetches activity configuration (config.json data) and media assets from Dream Central Storage via backend proxy
5. Activity player includes main content area for activity-specific rendering
6. Footer includes action buttons: "Submit" (disabled until activity completion criteria met), "Save Progress" (for later stories), "Exit" (with 
unsaved changes warning)
7. Timer counts down if time_limit_minutes is set, showing warning at 5 minutes remaining
8. If timer reaches zero, activity auto-submits current state
9. Activity player implements responsive layout optimized for tablets and desktops (primary devices for interactive activities)
10. Loading state displays while fetching activity data from Dream Central Storage
11. Error state handles scenarios: activity not found, Dream Central Storage unavailable, student already completed assignment
12. Unit tests verify activity data fetching and error handling
13. Integration tests verify navigation and initial load workflow

### Story 4.2: Multiple Choice Activity Player

As a **student**,  
I want **to answer multiple-choice questions with immediate visual feedback**,  
so that **I can complete multiple-choice assignments**.

#### Acceptance Criteria:

1. Multiple choice player parses config.json structure for question text, options, correct answer(s), and media (images/audio if present)
2. Each question displays: question text, numbered options (radio buttons for single-select, checkboxes for multi-select), optional image/media 
above question
3. Student can select one or more answers depending on question type (single vs. multi-select)
4. "Next" button advances to next question, "Previous" button returns to previous question
5. Progress indicator shows current question number out of total (e.g., "Question 3 of 10")
6. Visual indicator shows which questions have been answered (e.g., green checkmark on progress dots)
7. "Submit" button becomes enabled when all questions have at least one answer selected
8. On submit, frontend calculates score: (correct answers / total questions) × 100
9. Results screen displays: total score percentage, breakdown of correct/incorrect answers, option to review answers with correct/incorrect 
indicators
10. Answer review shows: student's selection (marked), correct answer (highlighted in green), incorrect answers (highlighted in red)
11. Component handles edge cases: no options provided, missing question text, invalid config structure (graceful error display)
12. Unit tests verify score calculation for various answer patterns
13. Accessibility: keyboard navigation between questions, screen reader announcements for question changes

### Story 4.3: True/False Activity Player

As a **student**,  
I want **to answer true/false questions with a simple, clear interface**,  
so that **I can quickly complete true/false assignments**.

#### Acceptance Criteria:

1. True/False player parses config.json structure for statement text, correct answer (true/false), and optional explanation
2. Each question displays: statement text, two large buttons labeled "True" and "False", optional media (image/audio)
3. Student clicks True or False button to select answer (selected button highlights)
4. Student can change answer before moving to next question
5. "Next" button advances to next statement, "Previous" button returns
6. Progress indicator shows current statement number out of total
7. Visual feedback shows which statements have been answered
8. "Submit" button becomes enabled when all statements have been answered
9. Score calculation: (correct answers / total statements) × 100
10. Results screen shows score and statement-by-statement review with student answer, correct answer, and optional explanation if provided in 
config
11. Component handles rapid clicking (debounce) to prevent accidental double-selection
12. Mobile-optimized: large touch targets for True/False buttons
13. Unit tests verify score calculation and answer state management
14. Accessibility: keyboard support (T for True, F for False, arrow keys for navigation)

### Story 4.4: Word Matching Activity Player

As a **student**,  
I want **to match words or phrases by dragging and dropping or clicking pairs**,  
so that **I can complete word matching assignments**.

#### Acceptance Criteria:

1. Word matching player parses config.json structure for pairs (term/definition or word/translation)
2. Activity displays two columns: left column with terms/words, right column with definitions/translations (randomized order)
3. **Desktop interaction**: Student drags item from left column and drops onto matching item in right column
4. **Mobile/touch interaction**: Student taps item in left column (highlights it), then taps matching item in right column to create pair
5. When correct match is made, both items highlight green and lock in place
6. When incorrect match is attempted, both items flash red and reset
7. Visual feedback shows which items are already matched (disabled/grayed out)
8. Student can unmatch pairs by clicking "Unmatch" button next to matched pair
9. "Submit" button becomes enabled when all items are matched
10. Score calculation: (correct matches / total pairs) × 100 (no partial credit for incorrect attempts)
11. Results screen shows final score and review of all correct pairs
12. Component handles edge cases: odd number of items, duplicate terms
13. Drag-and-drop implements proper touch event handling for tablets
14. Unit tests verify matching logic and score calculation
15. Accessibility: keyboard navigation with arrow keys, Enter to select/match, Esc to unmatch

### Story 4.5: Fill-in-the-Blank (Drag-and-Drop) Activity Player

As a **student**,  
I want **to complete sentences by dragging words into blank spaces**,  
so that **I can complete fill-in-the-blank assignments**.

#### Acceptance Criteria:

1. Fill-in-the-blank player parses config.json structure for sentences with blank markers and word bank
2. Activity displays: sentence(s) with blank drop zones (represented as underlined spaces or boxes), word bank at bottom/side with available 
words
3. **Desktop interaction**: Student drags word from word bank and drops into blank space
4. **Mobile/touch interaction**: Student taps word in word bank (highlights), then taps blank space to place word
5. Placed words can be removed by dragging back to word bank or clicking "Remove" icon on the word
6. Word bank visually indicates which words have been used (grayed out or removed from bank depending on config - single use vs. reusable words)
7. Multiple blank sentences display sequentially or all at once depending on config
8. "Submit" button becomes enabled when all blanks are filled
9. Score calculation: (correct placements / total blanks) × 100
10. Results screen shows completed sentences with correct answers highlighted in green, incorrect in red, and shows correct answer below
11. Component handles edge cases: more words than blanks, fewer words than blanks (requires partial answers)
12. Drag-and-drop supports touch gestures on tablets
13. Unit tests verify placement logic and score calculation
14. Accessibility: keyboard navigation to select words and blanks, Enter to place, Backspace to remove

### Story 4.6: Word Search Activity Player

As a **student**,  
I want **to find and select words in a letter grid**,  
so that **I can complete word search assignments**.

#### Acceptance Criteria:

1. Word search player parses config.json structure for grid dimensions, letter grid, and target words list
2. Activity displays: letter grid (table/grid layout), list of target words to find (with checkboxes or strikethrough when found)
3. **Desktop interaction**: Student clicks first letter, drags to last letter, releases to select word
4. **Mobile/touch interaction**: Student taps first letter, taps last letter to select word (or swipes)
5. When correct word is selected, letters highlight in color (different color per word) and word is marked as found
6. When incorrect selection is made, selection clears with no penalty
7. Student can deselect found word by clicking it again (removes highlight)
8. Words can be oriented: horizontal, vertical, diagonal (all directions as defined in config)
9. Progress indicator shows: "Found X of Y words"
10. "Submit" button becomes enabled when all words are found (or allow partial submission with penalty)
11. Optional hint system: clicking hint button highlights first letter of an unfound word (1 hint per word)
12. Score calculation: (words found / total words) × 100
13. Results screen shows grid with all words highlighted and list of found/missed words
14. Timer integration: word search often has time limits, integrate with activity player timer
15. Unit tests verify word selection logic and found word detection
16. Accessibility: keyboard navigation to traverse grid, spacebar to start/end selection

### Story 4.7: Assignment Submission & Result Storage

As a **student**,  
I want **my completed activity automatically saved with my score and answers**,  
so that **my teacher can see that I finished my work and my grade is recorded**.

#### Acceptance Criteria:

1. When student clicks "Submit" on activity player, frontend sends completion data to backend
2. API endpoint `POST /api/assignments/{assignment_id}/submit` accepts payload: answers_json (all student responses), score (calculated 
frontend), time_spent_minutes, completed_at timestamp
3. Backend validates: assignment belongs to student, assignment is not already completed, score is between 0-100
4. Backend updates AssignmentStudent record: status="completed", score, completed_at, time_spent_minutes, answers_json (JSONB field)
5. Backend stores complete answer data for teacher review (detailed view in Epic 4)
6. API returns success response with completion summary
7. Frontend displays success screen: "Assignment completed! Your score: X%" with confetti animation or positive visual feedback
8. Success screen includes buttons: "View Results" (shows answer review), "Back to Dashboard"
9. After submission, student cannot retake assignment (assignment detail page shows "Completed" with score, no "Start" button)
10. If submission fails (network error, server error), frontend shows error message and "Retry" button preserving student answers
11. Backend prevents duplicate submissions (idempotent endpoint - if already submitted, returns success with existing score)
12. Unit tests verify submission validation and data storage
13. Integration tests verify end-to-end activity completion and submission flow
14. Submission triggers notification to teacher (implementation in Epic 5, placeholder here)

### Story 4.8: Activity Progress Persistence (Save & Resume)

As a **student**,
I want **my partial progress automatically saved so I can resume later if interrupted**,
so that **I don't lose my work if I close the browser or run out of time**.

#### Acceptance Criteria:

1. Activity player auto-saves student progress every 30 seconds while activity is in progress
2. API endpoint `POST /api/assignments/{assignment_id}/save-progress` accepts partial_answers_json, time_spent_minutes
3. Backend stores progress in AssignmentStudent record using separate field: progress_json (JSONB), last_saved_at timestamp
4. "Save Progress" button in activity player footer allows manual save with visual confirmation ("Progress saved ✓")
5. When student returns to assignment detail page for in-progress assignment, "Resume Assignment" button replaces "Start Assignment"
6. Clicking "Resume" loads activity player with previously saved answers pre-filled and timer resuming from saved time
7. Progress restoration works for all activity types: multiple-choice (selected answers), word matching (created pairs), fill-in-blank (placed 
words), word search (found words)
8. If student clicks "Exit" during activity, confirmation dialog offers: "Save & Exit" or "Exit without Saving"
9. Auto-save triggers before page unload (browser close/refresh) using beforeunload event
10. Backend differentiates between progress_json (in-progress work) and answers_json (final submission)
11. Unit tests verify progress save/restore logic for each activity type
12. Integration tests verify save/resume workflow across browser sessions
13. Progress data is cleared after successful submission (only final answers_json retained)

---

## Epic 5: Analytics, Reporting & Teacher Insights

**Epic Goal:**

Provide teachers with comprehensive performance analytics and reporting tools to understand student progress, identify learning gaps, and make
data-driven instructional decisions. Enable teachers to view individual student performance, class-wide statistics, error pattern analysis, and
configurable time-period reports (weekly, monthly, yearly). Students can view their own progress charts and learning history. By the end of this
epic, teachers have actionable insights to support their students effectively, and students can track their own growth.

### Story 5.1: Individual Student Performance Dashboard

As a **teacher**,
I want **to view detailed performance metrics for any individual student**,
so that **I can understand their strengths, weaknesses, and progress over time**.

#### Acceptance Criteria:

1. Teacher can access student performance page from: class roster (clicking student name), assignment detail view (clicking student), or search
2. Student performance dashboard displays header with: student name, profile photo (if available), overall average score, total assignments
completed, current streak (consecutive days with completed work)
3. **Recent Activity Section**: List of last 10 completed assignments with score, completion date, time spent
4. **Performance Chart**: Line graph showing score trends over time (x-axis: date, y-axis: score percentage)
5. Chart allows time period selection: Last 7 days, Last 30 days, Last 3 months, All time
6. **Subject/Activity Breakdown**: Bar chart or table showing average scores by activity type (multiple-choice, true/false, word matching, etc.)
7. **Assignment Status Summary**: Counts for: not started, in progress, completed, past due
8. **Time Analytics**: Average time spent per assignment, total learning time this week/month
9. API endpoint `GET /api/students/{student_id}/analytics` returns aggregated performance data with date range filtering
10. Backend calculates: average score, completion rate, activity type performance, time-based metrics
11. Teacher can export student report as PDF with all charts and statistics
12. Page includes "Send Message" and "View Full History" action buttons
13. Data visualizations use Recharts library for consistency
14. Responsive design: charts stack vertically on mobile/tablet
15. Integration tests verify data accuracy across different date ranges

### Story 5.2: Class-Wide Performance Analytics

As a **teacher**,
I want **to view aggregated performance metrics for an entire class**,
so that **I can identify class-wide trends and adjust my teaching strategy**.

#### Acceptance Criteria:

1. Class detail page includes "Analytics" tab alongside "Students" and "Assignments" tabs
2. **Class Overview Section**: Displays average class score, completion rate, total assignments given, active students count
3. **Score Distribution Chart**: Histogram showing how many students fall into score ranges (0-59%, 60-69%, 70-79%, 80-89%, 90-100%)
4. **Leaderboard**: Top 5 performing students (by average score) with option to view full ranked list
5. **Struggling Students Alert**: Highlights students with average score below 70% or multiple past due assignments
6. **Assignment Performance Table**: Lists all assignments with columns: assignment name, average score, completion rate, average time spent
7. **Activity Type Performance**: Bar chart comparing class average across different activity types
8. **Time Period Selector**: Weekly, Monthly, Semester, Year-to-Date filtering for all metrics
9. **Trend Analysis**: Comparison metrics showing improvement/decline vs. previous period (e.g., "Average score up 5% from last month")
10. API endpoint `GET /api/classes/{class_id}/analytics` returns aggregated class data
11. Backend performs efficient aggregation queries with proper indexing
12. Teacher can export class report as PDF or Excel with all data
13. Visual indicators for positive trends (green arrows) and concerning trends (red arrows)
14. Integration tests verify accurate aggregation across multiple students and assignments

### Story 5.3: Assignment-Specific Analytics & Common Mistakes

As a **teacher**,
I want **to see detailed results for a specific assignment including which questions students struggled with**,
so that **I can identify common misconceptions and reteach difficult concepts**.

#### Acceptance Criteria:

1. Assignment detail page includes "Results" tab showing completion statistics
2. **Completion Overview**: Shows completed count, in progress count, not started count, past due count with visual progress bar
3. **Score Statistics**: Displays average score, median score, highest score, lowest score
4. **Student Results Table**: Lists all assigned students with columns: student name, status, score, time spent, completion date, "View Details"
button
5. Table is sortable by any column and filterable by status
6. **Question-Level Analysis** (activity-type specific):
   - Multiple-choice/True-False: Shows each question with percentage of students who answered correctly
   - **Most Missed Questions**: Highlights top 3 questions with lowest correct percentage
   - **Answer Distribution**: For each question, shows how many students selected each option
7. Word matching: Shows which pairs were most commonly matched incorrectly
8. Fill-in-blank: Shows which blanks had lowest correct rate and common incorrect answers
9. Word search: Shows which words were found least often
10. API endpoint `GET /api/assignments/{assignment_id}/detailed-results` returns question-level analytics
11. Backend aggregates answers_json from all students to calculate question statistics
12. Visual heatmap for multiple-choice showing correct (green) vs. incorrect (red) answer distributions
13. Teacher can click "View Details" for individual student to see their full submitted answers
14. Export functionality for assignment results (PDF/Excel)
15. Integration tests verify accurate question-level aggregation

### Story 5.4: Error Pattern Detection & Insights

As a **teacher**,  
I want **the system to automatically identify patterns in student errors across assignments**,  
so that **I can discover systematic learning gaps without manual analysis**.

#### Acceptance Criteria:

1. Teacher dashboard includes "Insights" card showing AI-generated or rule-based learning insights
2. **Pattern Detection**: System analyzes completed assignments to identify: topics/concepts with consistently low performance, students who 
struggle with specific activity types, time-of-day patterns (if students rush assignments close to deadline)
3. **Insight Categories**:
   - "Students struggling with [topic]" - based on low scores in related questions
   - "Common misconception detected" - same wrong answer chosen by >50% of students
   - "Time management issue" - students with incomplete work or rushing (very short completion times with low scores)
   - "Recommended review topics" - concepts requiring reteaching based on error rates
4. Insights page displays cards for each detected pattern with: description, affected student count, recommended action
5. Teacher can click insight card to view: detailed breakdown, list of affected students, related assignments/questions
6. API endpoint `GET /api/teachers/insights` returns pattern analysis for teacher's classes
7. Backend implements rule-based pattern detection (ML/AI enhancement is future phase):
   - Query assignments with avg score < 65%
   - Identify questions where >60% answered incorrectly
   - Flag students with >3 past due assignments
   - Detect activity types where student consistently underperforms
8. Insights are cached and refreshed daily (not real-time to reduce compute)
9. Teacher can dismiss insights that aren't actionable
10. Visual indicators: warning (yellow) for moderate concerns, alert (red) for critical issues
11. Integration tests verify pattern detection logic with sample data

### Story 5.5: Student Progress Tracking & Personal Analytics

As a **student**,  
I want **to view my own performance statistics and progress over time**,  
so that **I can track my learning growth and identify areas to improve**.

#### Acceptance Criteria:

1. Student dashboard includes "My Progress" section or dedicated progress page
2. **Overall Performance Card**: Shows total assignments completed, overall average score, current streak, recent achievements
3. **Progress Chart**: Line graph showing score trends over time (last 30 days default)
4. **Activity Type Breakdown**: Shows student's average score for each activity type with visual comparison (bar chart or radial chart)
5. **Recent Assignments**: List of last 5 completed assignments with scores and feedback indicator
6. **Achievements/Badges** (if Epic 5 feedback implemented): Display earned badges (e.g., "Perfect Score", "10 Day Streak", "Fast Learner")
7. **Study Time**: Total time spent on assignments this week/month
8. **Improvement Indicators**: Shows whether recent scores are improving, stable, or declining with encouraging messaging
9. API endpoint `GET /api/students/me/progress` returns student's performance analytics
10. Charts use student-friendly, encouraging language (e.g., "You're improving!" vs. "Performance declining")
11. Data visualizations use colors and icons that are motivating for students
12. Student can filter progress view by date range: This week, This month, All time
13. Progress page includes tips: "Try reviewing [activity type] to improve your score"
14. Responsive mobile design since students may primarily view on phones
15. Integration tests verify accurate student-specific data filtering

### Story 4.6: Time-Based Reporting & Trend Analysis

As a **teacher**,  
I want **to generate reports for specific time periods and compare performance across weeks/months**,  
so that **I can track progress over the school year and prepare for parent-teacher conferences**.

#### Acceptance Criteria:

1. Teacher navigation includes "Reports" section with report builder interface
2. **Report Builder**: Form to configure report with fields: Report type (student/class/assignment), time period (custom date range, week, month,
 semester), target (select class or student), format (PDF/Excel)
3. **Predefined Report Templates**:
   - "Weekly Class Summary" - class performance for selected week
   - "Student Progress Report" - individual student for semester/year
   - "Monthly Assignment Overview" - all assignments in a month
   - "Parent-Teacher Conference Report" - comprehensive student report
4. Report generation triggers backend job that compiles requested data
5. Generated reports include: cover page with date range and teacher name, summary statistics, detailed tables, charts (embedded in PDF), 
comparison to previous period
6. **Trend Analysis**: Reports show percentage change vs. previous equivalent period (e.g., "This month's avg score: 85% (+7% from last month)")
7. Reports include narrative summaries: "Students showed improvement in multiple-choice activities but struggled with word searches"
8. API endpoint `POST /api/reports/generate` accepts report configuration and returns report file or job ID
9. For large reports, use asynchronous job processing with status endpoint `GET /api/reports/{job_id}/status`
10. Generated reports are stored temporarily and accessible via download link
11. Teacher can save report configurations as templates for recurring use
12. Report history shows previously generated reports with download links (7-day retention)
13. Unit tests verify report data accuracy and formatting
14. Integration tests verify end-to-end report generation workflow

### Story 4.7: Performance Comparison & Benchmarking

As a **teacher**,
I want **to compare my class performance against school or publisher averages (anonymized)**,
so that **I can understand if my students are on track relative to peers**.

#### Acceptance Criteria:

1. Class analytics page includes "Benchmarking" section (if enabled by school/publisher)
2. Displays comparison metrics: "Your class average: 82% | School average: 78% | Publisher average: 80%"
3. Comparison chart shows class performance vs. aggregated benchmarks over time (line graph)
4. Benchmarks are calculated anonymously across: all classes in the same school, all classes using the same publisher's content (opt-in for
privacy)
5. Activity-type benchmarking: "Your class scores 15% higher in word matching compared to school average"
6. Backend calculates aggregated benchmarks with proper anonymization (minimum 5 classes required for benchmark display)
7. API endpoint `GET /api/classes/{class_id}/benchmarks` returns comparison data if available
8. Privacy controls: Teachers cannot see other teachers' specific class data, only aggregates
9. Benchmarking can be disabled at school/publisher level for privacy compliance
10. Encouraging messaging when class outperforms benchmarks: "Your class is excelling!"
11. Constructive messaging when below benchmarks: "Opportunities for growth in [area]"
12. Admin dashboard shows system-wide benchmarks for oversight
13. Integration tests verify benchmark calculations and anonymization

---

## Epic 6: Communication, Feedback & Supplementary Materials

**Epic Goal:**

Enable rich communication between teachers and students through direct messaging, implement a comprehensive notification system for all users
(new assignments, approaching deadlines, received feedback), provide teachers with multiple feedback mechanisms (text comments, badges, emoji
reactions), and allow teachers to upload and share supplementary learning materials (PDFs, videos, web links). By the end of this epic, Dream LMS
 delivers a complete learning ecosystem where teachers can communicate effectively, provide personalized feedback, and enhance assignments with
additional resources.

### Story 6.1: Notification System Foundation

As a **user of any role**,
I want **to receive in-app notifications about important events relevant to my role**,
so that **I stay informed about new assignments, deadlines, feedback, and system updates**.

#### Acceptance Criteria:

1. Notification model includes: id, user_id (FK), type (enum: assignment_created, deadline_approaching, feedback_received, message_received, 
system_announcement), title, message, link (optional URL to relevant page), is_read, created_at
2. All user role dashboards include notification bell icon in header showing unread count badge
3. Clicking notification bell opens notification dropdown/panel showing recent 10 notifications
4. Each notification displays: icon (type-specific), title, message snippet, timestamp (relative: "2 hours ago"), read/unread indicator
5. Clicking notification marks it as read and navigates to linked page (e.g., assignment detail, message thread)
6. Notification panel includes "Mark all as read" button and "View all notifications" link to full page
7. Full notifications page shows all notifications with filtering: All, Unread, By type
8. API endpoint `GET /api/notifications` returns notifications for authenticated user with pagination
9. API endpoint `PATCH /api/notifications/{id}/read` marks notification as read
10. API endpoint `POST /api/notifications/mark-all-read` marks all as read
11. Backend service `NotificationService` provides methods: `create_notification(user_id, type, title, message, link)`
12. Real-time notification delivery using polling (every 30 seconds) or WebSocket (future enhancement)
13. Notification retention: auto-delete notifications older than 30 days
14. Unit tests verify notification creation and delivery logic
15. Integration tests verify end-to-end notification flow

### Story 6.2: Assignment & Deadline Notifications

As a **student**,
I want **to receive notifications when new assignments are created and when deadlines are approaching**,
so that **I never miss homework and can plan my study time**.

#### Acceptance Criteria:

1. When teacher creates assignment, system sends notification to all assigned students with type "assignment_created"
2. Notification title: "New assignment: [Assignment Name]", message: "Due: [Due Date]", link: `/assignments/{id}`
3. Daily automated job runs at 8 AM to check for approaching deadlines (due within 24 hours)
4. Students with assignments due soon receive "deadline_approaching" notification
5. Notification title: "Assignment due soon: [Assignment Name]", message: "Due in [X hours]", link: `/assignments/{id}`
6. When student completes assignment, teacher receives "student_completed" notification
7. Teacher notification: "Student completed: [Student Name] finished [Assignment Name]", score displayed, link: `/assignments/{id}/results`
8. When assignment is past due and student hasn't submitted, student receives "past_due" notification (sent once, 1 day after deadline)
9. Backend uses NotificationService to create notifications at appropriate trigger points
10. Scheduled task (cron job or Celery) handles deadline reminder checks
11. Notifications batch to avoid spam: max 1 deadline reminder per student per day (aggregates multiple assignments)
12. Students can adjust notification preferences: enable/disable deadline reminders (settings page, Story 5.8)
13. Unit tests verify notification triggers for various assignment scenarios
14. Integration tests verify scheduled tasks execute correctly

### Story 6.3: Direct Messaging Between Teachers & Students

As a **teacher**,
I want **to send and receive direct messages with my students**,
so that **I can answer questions, provide guidance, and maintain communication**.

#### Acceptance Criteria:

1. Message model includes: id, sender_id (FK user), recipient_id (FK user), subject, body, parent_message_id (FK for threading), is_read, sent_at
2. Teacher and student navigation includes "Messages" menu item with unread count badge
3. Messages page displays inbox with list of conversations (grouped by participants)
4. Each conversation shows: participant name/photo, last message preview, timestamp, unread indicator
5. Clicking conversation opens message thread view showing all messages in chronological order
6. **Compose New Message**: Button opens modal with fields: recipient (searchable dropdown - teacher sees their students, student sees their
teachers), subject, message body (rich text editor with formatting)
7. **Message Thread View**: Shows all messages in conversation with sender name, timestamp, message body
8. **Reply**: Text input at bottom of thread to send reply (auto-fills recipient and subject as "Re: [subject]")
9. API endpoint `POST /api/messages` creates new message and sends notification to recipient
10. API endpoint `GET /api/messages/conversations` returns list of conversations for authenticated user
11. API endpoint `GET /api/messages/thread/{user_id}` returns full message thread with specific user
12. When message is received, recipient gets "message_received" notification
13. Marking message as read updates is_read flag and clears notification
14. Search functionality allows finding messages by participant name or subject
15. Messages include basic XSS protection (sanitize HTML input)
16. Teacher can message multiple students (creates separate threads, not group chat)
17. Students can only message teachers who have assigned them work (privacy protection)
18. Integration tests verify messaging workflow between teacher and student

### Story 6.4: Teacher Feedback on Assignments (Text Comments)

As a **teacher**,
I want **to provide written feedback on completed student assignments**,
so that **students understand what they did well and where to improve**.

#### Acceptance Criteria:

1. Assignment results page (teacher view) includes "Provide Feedback" button for each completed assignment
2. Clicking button opens feedback modal with: student name, assignment name, score, text area for feedback
3. Feedback model includes: id, assignment_student_id (FK AssignmentStudent junction table), teacher_id (FK), feedback_text, badges (array),
emoji_reactions (array), created_at, updated_at
4. Teacher can write detailed feedback (max 1000 characters) with formatting support
5. Feedback can be saved as draft (not visible to student) or published (student sees immediately)
6. API endpoint `POST /api/assignments/{assignment_id}/students/{student_id}/feedback` creates or updates feedback
7. When feedback is published, student receives "feedback_received" notification
8. Student notification: "Feedback received on [Assignment Name]", link: `/assignments/{id}`
9. Student assignment detail page shows feedback section below their results with: teacher name, feedback text, timestamp
10. Teacher can edit feedback after publishing (student sees updated version)
11. Assignment results review shows feedback indicator (icon) next to students who have received feedback
12. Feedback history is preserved (audit trail of edits) with updated_at timestamp
13. Students can reply to feedback via message thread (opens messaging with pre-filled context)
14. Unit tests verify feedback creation and update logic
15. Integration tests verify feedback notification delivery

### Story 6.5: Feedback Enhancements (Badges & Emoji Reactions)

As a **teacher**,  
I want **to award badges and add emoji reactions to student work**,  
so that **I can provide quick, encouraging, visual feedback**.

#### Acceptance Criteria:

1. Feedback modal (from Story 5.4) includes badge selection section with predefined badges
2. **Predefined Badges**: "Perfect Score 💯", "Great Improvement 📈", "Creative Thinking 💡", "Hard Worker 💪", "Fast Learner ⚡", "Needs Review 
📚"
3. Teacher can select multiple badges to award (checkboxes)
4. Feedback modal includes emoji reaction picker (similar to social media reactions)
5. **Available Emoji Reactions**: 👍, ❤️, 🌟, 🎉, 🔥, 💯 (customizable via admin settings)
6. Teacher can select one emoji reaction per feedback instance
7. Selected badges and emoji are stored in Feedback model (badges array, emoji_reactions array)
8. Student assignment results page displays awarded badges as visual icons/labels
9. Student progress page shows "Badges Earned" section with count of each badge type
10. Badge achievements contribute to student motivation (displayed prominently on dashboard)
11. When badge is awarded, student notification includes badge name: "You earned 'Perfect Score' badge!"
12. Emoji reactions appear next to feedback text in student view (larger display)
13. Teacher can remove badges/emoji by deselecting and updating feedback
14. System tracks badge totals for student analytics (e.g., "Earned 15 badges this month")
15. Unit tests verify badge and emoji storage and retrieval
16. Badges are purely motivational (no grade impact)

### Story 6.6: Supplementary Materials Upload & Management

As a **teacher**,
I want **to upload PDFs, videos, and web links as supplementary materials**,
so that **I can provide additional learning resources to my students**.

#### Acceptance Criteria:

1. Material model includes: id, teacher_id (FK), title, description, material_type (enum: pdf, video, link), file_url (for uploaded files), 
external_url (for links), file_size_bytes, created_at, updated_at
2. MaterialAssignment model (junction): id, material_id (FK), assignment_id (FK, nullable), class_id (FK, nullable), student_id (FK, nullable),
shared_at
3. Teacher dashboard includes "Materials" section or dedicated materials library page
4. Materials library displays uploaded materials in grid/list view with: thumbnail/icon, title, type badge, upload date
5. **Upload Material Button** opens modal with tabs: "Upload File" (PDF/Video), "Add Link"
6. **Upload File Tab**: Drag-and-drop area accepting PDF (max 50 MB), video files MP4/MOV (max 100 MB), title field, description field
7. **Add Link Tab**: URL input (validates URL format), title field, description field, optional thumbnail URL
8. File upload sends file to Dream Central Storage via backend proxy endpoint
9. API endpoint `POST /api/materials` handles file upload/link creation and stores reference in database
10. Backend validates: file type, file size, teacher ownership, storage quota (500 MB per teacher default)
11. Teacher can edit material metadata (title, description) and delete materials with confirmation
12. Deleting material removes it from Dream Central Storage (if file) and database
13. Materials library includes search and filter by type (PDF, Video, Link)
14. Teacher can view material details and preview (PDF viewer, video player, link preview)
15. Integration tests verify file upload to Dream Central Storage and database record creation

### Story 6.7: Sharing Materials with Students

As a **teacher**,  
I want **to share supplementary materials with specific students, classes, or attach to assignments**,  
so that **students have access to resources that support their learning**.

#### Acceptance Criteria:

1. Material detail page (teacher view) includes "Share" button opening share modal
2. Share modal provides options: "Share with Class", "Share with Students", "Attach to Assignment"
3. **Share with Class**: Multi-select dropdown showing teacher's classes, confirmation creates MaterialAssignment records for all students in 
selected classes
4. **Share with Students**: Multi-select dropdown showing teacher's students, confirmation creates MaterialAssignment records for selected 
students
5. **Attach to Assignment**: Dropdown showing teacher's assignments, attaches material to assignment (visible when students view assignment 
details)
6. When material is shared, students receive "material_shared" notification
7. Notification: "New learning material: [Material Title]", link: `/materials/{id}`
8. Student dashboard includes "Materials" section showing shared materials
9. Student materials page displays: material title, teacher name, shared date, type badge, "View" button
10. Clicking "View" opens: PDF in browser viewer, video in embedded player, link opens in new tab
11. Students can only access materials shared with them (filtered by MaterialAssignment.student_id)
12. Assignment detail page (student view) shows attached materials section: "Supplementary Resources"
13. Teacher can unshare materials (delete MaterialAssignment records) with confirmation
14. Teacher can see sharing history: which students/classes have access to each material
15. API endpoint `POST /api/materials/{id}/share` creates MaterialAssignment records
16. API endpoint `DELETE /api/materials/{id}/share/{share_id}` removes access
17. Integration tests verify material sharing and student access control

### Story 6.8: Notification Preferences & Settings

As a **user of any role**,
I want **to customize my notification preferences**,
so that **I receive notifications that matter to me without being overwhelmed**.

#### Acceptance Criteria:

1. User settings page includes "Notifications" tab with preference controls
2. NotificationPreference model: id, user_id (FK), notification_type, enabled (boolean), email_enabled (boolean, future email notifications)
3. Preferences page lists all notification types relevant to user role with toggle switches
4. **Student Notification Preferences**: Assignment Created (on/off), Deadline Approaching (on/off), Feedback Received (on/off), Message Received
 (on/off)
5. **Teacher Notification Preferences**: Student Completed Assignment (on/off), Message Received (on/off), System Announcements (on/off)
6. **Admin/Publisher Notification Preferences**: System Announcements (on/off), User Activity Alerts (on/off)
7. Default settings: All notifications enabled for new users
8. Changing preference immediately updates database and affects future notifications
9. API endpoint `GET /api/users/me/notification-preferences` returns current preferences
10. API endpoint `PATCH /api/users/me/notification-preferences` updates preferences
11. NotificationService checks user preferences before creating notifications (respects enabled flags)
12. Settings page includes "Email Notifications" section (disabled/grayed out with "Coming soon" label - future phase)
13. Global notification mute: "Pause all notifications" toggle for temporary silence (24-hour max)
14. Unit tests verify preference filtering logic
15. Integration tests verify notifications respect user preferences

---

## Next Steps

### UX Expert Prompt

Sally, our UX Expert, please review this PRD and create a comprehensive front-end specification document that will guide our React 
implementation. Focus on:

1. **Component Architecture**: Based on the 13 core screens identified (Login, Admin Dashboard, Publisher Dashboard, Teacher Dashboard, Teacher 
Class Management, Teacher Assignment Creator, Teacher Analytics View, Teacher Messaging Center, Student Dashboard, Student Activity Player,
Student Progress View, Notification Center, Materials Library), design a component hierarchy and reusable component library using Shadcn UI and
Radix UI primitives.

2. **Interactive Activity Players**: Design detailed UI specifications for all five activity types (drag-and-drop, word matching, 
multiple-choice, true/false, word search) ensuring they are:
   - Accessible (WCAG AA compliant)
   - Mobile-responsive with proper touch interactions
   - Visually consistent across all types
   - Include clear progress indicators and feedback mechanisms

3. **Data Visualization Design**: Specify chart types, color schemes, and interaction patterns for all analytics screens using Recharts. Ensure 
charts are readable, meaningful, and encourage positive action.

4. **Assignment Creation Flow**: Design the multi-step dialog interface that guides teachers through book/activity selection, recipient 
selection, and configuration. Make this intuitive for non-technical users.

5. **Notification UX**: Design the notification bell dropdown, notification panel, and notification preferences interface to be unobtrusive yet 
effective.

6. **Bulk Import Experience**: Design the Excel upload interface with drag-and-drop, validation error display, and success confirmation that 
clearly communicates what happened.

7. **Responsive Breakpoints**: Define specific breakpoint behavior for desktop (1024px+), tablet (768px-1023px), and mobile (320px-767px) for all
 key screens.

8. **Design System Documentation**: Create a style guide covering: color palette, typography scale, spacing system, component states (hover, 
active, disabled, error), icon usage, and animation principles.

Please reference the FlowBook screenshots (when provided) to maintain visual consistency with the existing ecosystem. Deliver a front-end 
specification document (`docs/front-end-spec.md`) that developers can follow to build the React application.

---

### Architect Prompt

Winston, our System Architect, please review this PRD and create a comprehensive technical architecture document that will guide implementation. 
Focus on:

1. **System Architecture Diagram**: Create a high-level architecture showing: React frontend, FastAPI backend, PostgreSQL database, Dream Central
 Storage integration, and deployment on single VPS with Docker.

2. **Database Schema Design**: Design complete ERD (Entity-Relationship Diagram) including all tables mentioned in the epics:
   - User management: User, Publisher, School, Teacher, Student
   - Content: Book, BookAccess, Activity
   - Classes: Class, ClassStudent
   - Assignments: Assignment, AssignmentStudent
   - Communication: Message, Notification, NotificationPreference, Feedback
   - Materials: Material, MaterialAssignment
   - Include indexes, foreign keys, constraints, and data types

3. **API Architecture**: Design RESTful API structure with:
   - Authentication/authorization strategy (JWT implementation details)
   - API versioning approach
   - Rate limiting strategy
   - Error handling and response formats
   - OpenAPI/Swagger documentation plan

4. **Dream Central Storage Integration**: Specify:
   - API client architecture with retry logic and caching
   - File upload/download flow for teacher materials
   - Config.json parsing strategy for activities
   - Error handling when Dream Central Storage is unavailable
   - Request the specific endpoint documentation needed

5. **Frontend Architecture**: Design React application structure:
   - Folder structure (components, pages, hooks, services, utils)
   - State management approach (TanStack Query + Zustand)
   - Routing strategy with role-based access control
   - Form validation architecture (React Hook Form + Zod)
   - API client service layer

6. **Activity Player Architecture**: Design the activity rendering engine that:
   - Parses config.json for each activity type
   - Handles progress persistence (save/resume)
   - Calculates scores
   - Manages timer and auto-submit
   - Consider creating an activity player framework that can be extended for new activity types

7. **Analytics Engine**: Design the backend analytics calculation system:
   - Aggregation query patterns
   - Caching strategy for expensive calculations
   - Report generation architecture (synchronous vs. async)
   - Pattern detection algorithm for error insights

8. **Deployment Architecture**: Specify Docker Compose configuration:
   - Nginx reverse proxy configuration
   - Gunicorn + Uvicorn worker setup
   - PostgreSQL with persistent volumes
   - Redis for caching (optional but recommended)
   - Environment variable management
   - SSL/TLS setup with Let's Encrypt
   - Backup strategy

9. **Security Architecture**: Detail:
   - JWT token structure and validation
   - Password hashing strategy
   - Role-based access control implementation
   - CSRF protection
   - XSS prevention
   - SQL injection prevention
   - Rate limiting per endpoint
   - Data encryption at rest and in transit

10. **Testing Strategy**: Define:
    - Backend test structure (pytest fixtures, test database)
    - Frontend test structure (Vitest, React Testing Library)
    - Integration test approach
    - CI/CD pipeline with automated testing
    - Test data seeding strategy

11. **Scalability Considerations**: Document:
    - Current MVP limitations (100 concurrent users, single VPS)
    - Bottlenecks to monitor
    - Migration path to Phase 2 (managed database)
    - Migration path to Phase 3 (load balancer + multiple servers)
    - Database query optimization recommendations

12. **Monitoring & Logging**: Specify:
    - Structured logging format
    - Log aggregation strategy
    - Application performance monitoring (APM) recommendations
    - Key metrics to track
    - Alerting thresholds

Please deliver a comprehensive architecture document (`docs/architecture.md`) that covers all technical decisions, includes diagrams (use Mermaid
 or ASCII art), and provides clear implementation guidance for the development team.

**Important**: Request any clarifications about Dream Central Storage API capabilities, as integration details are critical to system design.

