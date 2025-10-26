# Dream LMS Technical Architecture

**Project:** Dream LMS
**Document Version:** 1.0
**Last Updated:** 2025-10-23
**Author:** Winston (System Architect)
**Status:** Draft

---

## Table of Contents

1. [System Overview & Architecture Diagram](#1-system-overview--architecture-diagram)
2. [Database Schema Design](#2-database-schema-design)
3. [API Architecture](#3-api-architecture)
4. [Dream Central Storage Integration](#4-dream-central-storage-integration)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Activity Player Architecture](#6-activity-player-architecture)
7. [Analytics Engine](#7-analytics-engine)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Security Architecture](#9-security-architecture)
10. [Testing Strategy](#10-testing-strategy)
11. [Scalability Considerations](#11-scalability-considerations)
12. [Monitoring & Logging](#12-monitoring--logging)

---

## 1. System Overview & Architecture Diagram

### 1.1 Architecture Philosophy

Dream LMS adopts a **pragmatic monolithic architecture** optimized for MVP deployment while maintaining clear internal boundaries that enable future extraction to microservices if scaling demands it. This approach prioritizes:

- **Simplicity for MVP**: Single deployment unit reduces operational complexity
- **Clear Separation of Concerns**: Layered architecture with distinct responsibilities
- **Cost-Effective Scaling**: Runs on single VPS, vertical scaling first, horizontal when needed
- **Future-Proof Design**: Clean module boundaries allow microservice extraction without rewrites

**Key Architectural Decisions:**

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| Monolithic backend | Reduces operational complexity, faster development, sufficient for 100-1000 concurrent users | Harder to scale individual components, all services share resources |
| Async FastAPI | High concurrency with async/await, automatic OpenAPI docs, modern Python features | Requires async-aware libraries, more complex than Flask |
| PostgreSQL | Robust ACID transactions, excellent JSON support (JSONB), mature ORM support | Vertical scaling only, more resource-intensive than NoSQL |
| Monorepo structure | Atomic commits across frontend/backend, shared tooling, easier refactoring | Large repository size, potential for tight coupling |
| Docker Compose | Simple orchestration for MVP, easy local dev, single-command deployment | Not suitable for true production scale (use Kubernetes later) |

### 1.2 Template Customization Strategy

Dream LMS is built on the **official FastAPI Full-Stack Template** (https://github.com/fastapi/full-stack-fastapi-template), providing a production-ready foundation with authentication, database integration, Docker orchestration, and modern frontend tooling. This template-first approach accelerates development while maintaining best practices.

#### 1.2.1 What We Keep from Template

**Backend Infrastructure:**
- FastAPI framework with async support
- SQLModel ORM (combining SQLAlchemy 2.0 + Pydantic)
- PostgreSQL database with asyncpg driver
- JWT authentication system with refresh tokens
- Alembic database migrations
- Pytest testing framework with fixtures
- Docker Compose orchestration
- Traefik reverse proxy with auto-HTTPS

**Frontend Infrastructure:**
- React 18 with TypeScript
- Vite build tool and dev server
- TanStack Query for server state management
- TanStack Router for routing (or React Router v6 - decision pending)
- Playwright for E2E testing
- Docker multi-stage builds

**Development Tooling:**
- Pre-commit hooks
- Environment variable management
- Docker development workflow

#### 1.2.2 What We Replace in Template

**User & Role System:**
- Template: Simple `User` model with basic admin/user distinction
- Dream LMS: 4-role RBAC system (admin, publisher, teacher, student) with extended role-specific models (`publishers`, `schools`, `teachers`, `students` tables)

**Database Schema:**
- Template: Minimal schema (`users`, `items` tables for demo)
- Dream LMS: Comprehensive 20+ table schema for LMS domain (books, activities, assignments, classes, analytics, messaging, materials)

**Frontend UI:**
- Template: Chakra UI component library
- Dream LMS: Shadcn UI + Tailwind CSS (neumorphic design system, generated via Shadcn MCP)
- Template: Basic CRUD interfaces
- Dream LMS: Role-specific dashboards, activity players, analytics visualizations

**Business Logic:**
- Template: Simple item CRUD operations
- Dream LMS: Complex LMS workflows (assignment distribution, activity scoring, progress tracking, analytics engine, Dream Central Storage integration)

#### 1.2.3 What We Remove from Template

**Removed Components:**
- Copier template generation system (one-time setup, not needed after initial clone)
- Basic "items" demo feature and related code
- Simplified email system (will be extended for LMS notifications)
- Default Chakra UI theme configuration

**Why These Changes:**
- Copier adds unnecessary complexity for a single-project setup
- Demo features would clutter the production codebase
- Shadcn UI provides better design flexibility for our neumorphic aesthetic
- LMS-specific features require domain-specialized logic beyond template's scope

### 1.3 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  React 18 Single-Page Application (Vite + TypeScript)        │  │
│  │  • Role-based routing (Admin/Publisher/Teacher/Student)      │  │
│  │  • Shadcn UI + Tailwind CSS                                   │  │
│  │  • TanStack Query (server state) + Zustand (client state)    │  │
│  │  • Activity Players (6 types: drag-drop, match, circle, etc.)│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                          HTTPS (443)                                 │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                         LOAD BALANCER / REVERSE PROXY                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Traefik (Docker Container)                                   │  │
│  │  • Automatic SSL/TLS with Let's Encrypt                       │  │
│  │  • Service discovery via Docker labels                        │  │
│  │  • API request routing to FastAPI                             │  │
│  │  • Rate limiting middleware                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
          ┌────────────────────┴────────────────────┐
          │                                         │
          ▼                                         ▼
┌─────────────────────┐                 ┌─────────────────────────────┐
│   BACKEND API       │                 │   EXTERNAL SERVICES         │
│   (FastAPI)         │◄────────────────┤   Dream Central Storage     │
│                     │  Pre-signed URLs│   (MinIO S3-compatible)     │
│  ┌───────────────┐ │                 │   • Book assets (images)     │
│  │  API Layer    │ │                 │   • Audio files              │
│  │  (Routers)    │ │                 │   • Teacher materials (PDFs) │
│  └───────┬───────┘ │                 └─────────────────────────────┘
│          │         │
│  ┌───────▼───────┐ │
│  │ Service Layer │ │
│  │ (Business     │ │
│  │  Logic)       │ │
│  └───────┬───────┘ │
│          │         │
│  ┌───────▼───────┐ │
│  │  Data Layer   │ │
│  │  (SQLModel    │ │
│  │   ORM)        │ │
│  └───────┬───────┘ │
└──────────┼─────────┘
           │
           ▼
┌─────────────────────────────────┐       ┌──────────────────────┐
│   DATABASE TIER                 │       │   CACHING TIER       │
│   PostgreSQL 15+ (Docker)       │◄──────┤   Redis (Optional)   │
│   • User management             │       │   • Book data cache  │
│   • Assignments & activities    │       │   • Session storage  │
│   • Analytics data              │       │   • Token blacklist  │
│   • Persistent volumes          │       └──────────────────────┘
└─────────────────────────────────┘
```

### 1.4 Component Responsibilities

#### **1.4.1 Frontend (React Application)**

**Port:** 5173 (dev), served by Traefik (prod)
**Technology:** React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI

**Responsibilities:**
- Render role-specific UI (Admin, Publisher, Teacher, Student dashboards)
- Handle client-side routing with protected routes based on JWT role
- Manage form validation (React Hook Form + Zod)
- Execute activity players with client-side scoring
- Cache API responses (TanStack Query)
- Manage UI state (Zustand)

**Does NOT:**
- Direct database access (all via API)
- Server-side rendering (pure SPA)
- Authentication logic (JWT validation is backend)

#### **1.4.2 Backend API (FastAPI Application)**

**Port:** 8000
**Technology:** Python 3.11+, FastAPI, SQLModel (SQLAlchemy 2.0 + Pydantic)

**Responsibilities:**
- Expose RESTful API endpoints with automatic OpenAPI docs
- Authenticate requests (JWT validation)
- Authorize actions (role-based access control)
- Execute business logic (assignment creation, analytics calculations)
- Persist data to PostgreSQL via SQLModel ORM
- Proxy requests to Dream Central Storage
- Generate pre-signed URLs for media assets

**Layered Architecture:**

```python
# API Layer (routers/)
@router.post("/assignments")
async def create_assignment(
    assignment_data: AssignmentCreate,
    current_user: User = Depends(get_current_teacher)
):
    # Validate, call service layer
    return await assignment_service.create(assignment_data, current_user)

# Service Layer (services/)
class AssignmentService:
    async def create(self, data: AssignmentCreate, teacher: User):
        # Business logic: validate activity access, create assignment
        # Create AssignmentStudent records, trigger notifications
        pass

# Data Layer (models/)
from sqlmodel import SQLModel, Field

class Assignment(SQLModel, table=True):
    __tablename__ = "assignments"
    # SQLModel model definition (combines SQLAlchemy + Pydantic)
```

#### **1.4.3 Database (PostgreSQL)**

**Port:** 5432
**Technology:** PostgreSQL 15+

**Responsibilities:**
- Store all application data (users, assignments, analytics)
- Enforce data integrity (foreign keys, constraints)
- Support complex queries (joins, aggregations for analytics)
- Provide JSONB storage for flexible activity configurations

#### **1.4.4 Reverse Proxy (Traefik)**

**Ports:** 80 (HTTP redirect), 443 (HTTPS)

**Responsibilities:**
- Automatic SSL/TLS certificate management (Let's Encrypt)
- Terminate SSL/TLS connections
- Serve static React build files
- Proxy `/api/*` requests to FastAPI backend
- Apply rate limiting and middleware
- Compress responses (gzip)
- Auto-discovery of services via Docker labels

#### **1.4.5 Dream Central Storage (External - MinIO)**

**Protocol:** S3-compatible REST API

**Responsibilities:**
- Store and serve book assets (images, audio)
- Store teacher-uploaded materials (PDFs, videos)
- Generate pre-signed URLs for secure, direct browser access
- Handle file redundancy and backups

### 1.5 Data Flow Examples

#### **Example 1: Student Completes Assignment**

```
1. Student clicks "Start Assignment" in React app
   └─> GET /api/assignments/{id}/start
       └─> FastAPI validates JWT, checks student assignment
       └─> FastAPI queries PostgreSQL for activity config
       └─> FastAPI requests Dream Central Storage for activity assets
       └─> Dream Central Storage returns pre-signed URLs (1-hour expiry)
       └─> FastAPI transforms config JSON, injects pre-signed URLs
       └─> FastAPI returns activity data to React

2. Student interacts with activity player (all client-side)
   └─> React activity player renders UI
   └─> Every 30 seconds: POST /api/assignments/{id}/save-progress
       └─> FastAPI saves progress_json to AssignmentStudent table

3. Student clicks "Submit"
   └─> React calculates score client-side
   └─> POST /api/assignments/{id}/submit
       └─> FastAPI validates score, saves answers_json, updates status
       └─> FastAPI creates notification for teacher
       └─> FastAPI returns completion summary
   └─> React shows results screen
```

#### **Example 2: Teacher Views Class Analytics**

```
1. Teacher navigates to Class Analytics page
   └─> GET /api/classes/{id}/analytics?period=monthly
       └─> FastAPI validates JWT (requires teacher role)
       └─> FastAPI checks teacher owns this class
       └─> FastAPI executes complex aggregation queries:
           - Average scores by student
           - Completion rates by assignment
           - Error pattern analysis
       └─> FastAPI caches results in Redis (15-minute TTL)
       └─> FastAPI returns aggregated analytics JSON
   └─> React renders charts with Recharts

2. Teacher exports report as PDF
   └─> POST /api/reports/generate
       └─> FastAPI creates async job (if large dataset)
       └─> Background worker generates PDF with charts
       └─> FastAPI returns download URL
   └─> React downloads PDF
```

### 1.6 Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.x | UI library with concurrent features |
| | Vite | 5.x | Build tool and dev server |
| | TypeScript | 5.x | Type safety |
| | Tailwind CSS | 3.x | Utility-first styling |
| | Shadcn UI | Latest | Component library (Radix UI primitives) |
| | TanStack Query | 5.x | Server state management |
| | Zustand | 4.x | Client state management |
| | React Hook Form | 7.x | Form handling |
| | Zod | 3.x | Schema validation |
| | Recharts | 2.x | Data visualization |
| **Backend** | Python | 3.11+ | Modern Python with performance improvements |
| | FastAPI | 0.110+ | Async web framework |
| | Uvicorn | Latest | ASGI server |
| | Gunicorn | Latest | Process manager |
| | SQLModel | Latest | Modern ORM combining SQLAlchemy 2.0 + Pydantic |
| | Alembic | Latest | Database migrations |
| | Pydantic | 2.x | Data validation (built into FastAPI) |
| | python-jose | Latest | JWT handling |
| | passlib | Latest | Password hashing |
| | httpx | Latest | Async HTTP client |
| **Database** | PostgreSQL | 15+ | Primary data store |
| **Cache** | Redis | 7.x | Optional caching layer |
| **Proxy** | Traefik | Latest | Reverse proxy, auto-HTTPS with Let's Encrypt |
| **Deployment** | Docker | 24.x | Containerization |
| | Docker Compose | 2.x | Local orchestration |

---

## 2. Database Schema Design

### 2.1 Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│   users         │
├─────────────────┤
│ id (UUID) PK    │
│ email (unique)  │
│ password_hash   │
│ role (enum)     │──┐
│ is_active       │  │
│ created_at      │  │
│ updated_at      │  │
└─────────────────┘  │
                     │
     ┌───────────────┼───────────────┬─────────────┐
     │               │               │             │
     ▼               ▼               ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐
│publishers│  │ teachers │  │ students │  │   admins    │
├──────────┤  ├──────────┤  ├──────────┤  ├─────────────┤
│id PK     │  │id PK     │  │id PK     │  │id PK        │
│user_id FK│  │user_id FK│  │user_id FK│  │user_id FK   │
│name      │  │school_id │  │grade     │  │permissions  │
│contact   │  │subject   │  │parent_em │  └─────────────┘
└────┬─────┘  └────┬─────┘  └──────────┘
     │             │
     │             │
     ▼             │
┌──────────┐       │
│ schools  │◄──────┘
├──────────┤
│id PK     │
│name      │
│publisher_id FK
│address   │
│contact   │
└────┬─────┘
     │
     │         ┌──────────────┐
     └────────>│  classes     │
               ├──────────────┤
               │id PK         │
               │name          │
               │teacher_id FK │
               │school_id FK  │
               │grade_level   │
               │subject       │
               │academic_year │
               │is_active     │
               └────┬─────────┘
                    │
                    │ ┌───────────────────┐
                    └>│ class_students    │
                      ├───────────────────┤
                      │ id PK             │
                      │ class_id FK       │
                      │ student_id FK     │
                      │ enrolled_at       │
                      └───────────────────┘


┌──────────────────────┐         ┌──────────────────────┐
│   books              │         │   activities         │
├──────────────────────┤         ├──────────────────────┤
│ id PK                │         │ id PK                │
│ dream_storage_id     │◄────────│ book_id FK           │
│ title                │         │ dream_activity_id    │
│ publisher_id FK      │         │ activity_type        │
│ description          │         │ title                │
│ cover_image_url      │         │ config_json (JSONB)  │
│ created_at           │         │ order_index          │
│ updated_at           │         └────┬─────────────────┘
└────┬─────────────────┘              │
     │                                 │
     │  ┌────────────────┐             │
     └─>│  book_access   │             │
        ├────────────────┤             │
        │ id PK          │             │
        │ book_id FK     │             │
        │ publisher_id FK│             │
        │ granted_at     │             │
        └────────────────┘             │
                                       │
                                       ▼
                           ┌────────────────────────┐
                           │   assignments          │
                           ├────────────────────────┤
                           │ id PK                  │
                           │ teacher_id FK          │
                           │ activity_id FK         │
                           │ book_id FK             │
                           │ name                   │
                           │ instructions           │
                           │ due_date               │
                           │ time_limit_minutes     │
                           │ created_at             │
                           │ updated_at             │
                           └────┬───────────────────┘
                                │
                                │
                                ▼
                    ┌──────────────────────────┐
                    │ assignment_students      │
                    ├──────────────────────────┤
                    │ id PK                    │
                    │ assignment_id FK         │
                    │ student_id FK            │
                    │ status (enum)            │
                    │ score                    │
                    │ answers_json (JSONB)     │
                    │ progress_json (JSONB)    │
                    │ started_at               │
                    │ completed_at             │
                    │ time_spent_minutes       │
                    └────┬─────────────────────┘
                         │
                         │
                         ▼
                    ┌──────────────────────────┐
                    │   feedback               │
                    ├──────────────────────────┤
                    │ id PK                    │
                    │ assignment_student_id FK │
                    │ teacher_id FK            │
                    │ feedback_text            │
                    │ badges (ARRAY)           │
                    │ emoji_reactions (ARRAY)  │
                    │ created_at               │
                    │ updated_at               │
                    └──────────────────────────┘


┌────────────────────────┐
│   messages             │
├────────────────────────┤
│ id PK                  │
│ sender_id FK (users)   │
│ recipient_id FK (users)│
│ subject                │
│ body                   │
│ parent_message_id FK   │
│ is_read                │
│ sent_at                │
└────────────────────────┘


┌────────────────────────┐         ┌──────────────────────────┐
│   notifications        │         │ notification_preferences │
├────────────────────────┤         ├──────────────────────────┤
│ id PK                  │         │ id PK                    │
│ user_id FK             │◄────────│ user_id FK               │
│ type (enum)            │         │ notification_type        │
│ title                  │         │ enabled                  │
│ message                │         │ email_enabled            │
│ link                   │         └──────────────────────────┘
│ is_read                │
│ created_at             │
└────────────────────────┘


┌────────────────────────┐         ┌──────────────────────────┐
│   materials            │         │ material_assignments     │
├────────────────────────┤         ├──────────────────────────┤
│ id PK                  │         │ id PK                    │
│ teacher_id FK          │◄────────│ material_id FK           │
│ title                  │         │ assignment_id FK         │
│ description            │         │ class_id FK              │
│ material_type (enum)   │         │ student_id FK            │
│ file_url               │         │ shared_at                │
│ external_url           │         └──────────────────────────┘
│ file_size_bytes        │
│ created_at             │
│ updated_at             │
└────────────────────────┘
```

### 2.2 Complete Table Definitions

Due to the comprehensive nature of the database schema, I'll include the full SQL definitions with detailed comments. This is extensive but critical for implementation.

#### **2.2.1 User Management Tables**

**Table: `users`**

Core authentication table for all system users.

```sql
CREATE TYPE user_role AS ENUM ('admin', 'publisher', 'teacher', 'student');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
```

**Table: `publishers`**

```sql
CREATE TABLE publishers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_publishers_user_id ON publishers(user_id);
```

**Table: `schools`**

```sql
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    address TEXT,
    contact_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schools_publisher_id ON schools(publisher_id);
```

**Table: `teachers`**

```sql
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    subject_specialization VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_school_id ON teachers(school_id);
```

**Table: `students`**

```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grade_level VARCHAR(50),
    parent_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_user_id ON students(user_id);
```

#### **2.2.2 Content & Book Management Tables**

**Table: `books`**

```sql
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dream_storage_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    description TEXT,
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_books_publisher_id ON books(publisher_id);
CREATE INDEX idx_books_dream_storage_id ON books(dream_storage_id);
```

**Table: `book_access`**

```sql
CREATE TABLE book_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(book_id, publisher_id)
);

CREATE INDEX idx_book_access_book_publisher ON book_access(book_id, publisher_id);
```

**Table: `activities`**

```sql
CREATE TYPE activity_type AS ENUM (
    'dragdroppicture',
    'dragdroppicturegroup',
    'matchTheWords',
    'circle',
    'markwithx',
    'puzzleFindWords'
);

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    dream_activity_id VARCHAR(255),
    activity_type activity_type NOT NULL,
    title VARCHAR(500),
    config_json JSONB NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_book_id ON activities(book_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_config_json ON activities USING GIN(config_json);
```

#### **2.2.3 Class Management Tables**

**Table: `classes`**

```sql
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    grade_level VARCHAR(50),
    subject VARCHAR(100),
    academic_year VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_classes_is_active ON classes(is_active);
```

**Table: `class_students`**

```sql
CREATE TABLE class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(class_id, student_id)
);

CREATE INDEX idx_class_students_class_id ON class_students(class_id);
CREATE INDEX idx_class_students_student_id ON class_students(student_id);
```

#### **2.2.4 Assignment & Completion Tables**

**Table: `assignments`**

```sql
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    instructions TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    time_limit_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT time_limit_positive CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0)
);

CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX idx_assignments_activity_id ON assignments(activity_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
```

**Table: `assignment_students`**

```sql
CREATE TYPE assignment_status AS ENUM ('not_started', 'in_progress', 'completed');

CREATE TABLE assignment_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status assignment_status DEFAULT 'not_started',
    score INTEGER,
    answers_json JSONB,
    progress_json JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_minutes INTEGER DEFAULT 0,
    last_saved_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(assignment_id, student_id),
    CONSTRAINT score_range CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX idx_assignment_students_assignment_id ON assignment_students(assignment_id);
CREATE INDEX idx_assignment_students_student_id ON assignment_students(student_id);
CREATE INDEX idx_assignment_students_status ON assignment_students(status);
CREATE INDEX idx_assignment_students_completed_at ON assignment_students(completed_at);
CREATE INDEX idx_assignment_students_answers_json ON assignment_students USING GIN(answers_json);
```

#### **2.2.5 Communication Tables**

**Table: `messages`**

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(500),
    body TEXT NOT NULL,
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT no_self_messaging CHECK (sender_id != recipient_id)
);

CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_messages_is_read ON messages(is_read);
```

**Table: `notifications`**

```sql
CREATE TYPE notification_type AS ENUM (
    'assignment_created',
    'deadline_approaching',
    'feedback_received',
    'message_received',
    'student_completed',
    'past_due',
    'material_shared',
    'system_announcement'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
```

**Table: `notification_preferences`**

```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT false,

    UNIQUE(user_id, notification_type)
);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
```

**Table: `feedback`**

```sql
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_student_id UUID UNIQUE NOT NULL REFERENCES assignment_students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    feedback_text TEXT,
    badges TEXT[],
    emoji_reactions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_assignment_student_id ON feedback(assignment_student_id);
CREATE INDEX idx_feedback_teacher_id ON feedback(teacher_id);
```

#### **2.2.6 Material Management Tables**

**Table: `materials`**

```sql
CREATE TYPE material_type AS ENUM ('pdf', 'video', 'link');

CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    material_type material_type NOT NULL,
    file_url TEXT,
    external_url TEXT,
    file_size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT file_or_link CHECK (
        (material_type = 'link' AND external_url IS NOT NULL) OR
        (material_type IN ('pdf', 'video') AND file_url IS NOT NULL)
    )
);

CREATE INDEX idx_materials_teacher_id ON materials(teacher_id);
CREATE INDEX idx_materials_type ON materials(material_type);
```

**Table: `material_assignments`**

```sql
CREATE TABLE material_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT at_least_one_target CHECK (
        assignment_id IS NOT NULL OR class_id IS NOT NULL OR student_id IS NOT NULL
    )
);

CREATE INDEX idx_material_assignments_material_id ON material_assignments(material_id);
CREATE INDEX idx_material_assignments_assignment_id ON material_assignments(assignment_id);
CREATE INDEX idx_material_assignments_class_id ON material_assignments(class_id);
CREATE INDEX idx_material_assignments_student_id ON material_assignments(student_id);
```

### 2.3 Composite Indexes for Analytics

Performance-critical composite indexes for common query patterns:

```sql
-- Teacher accessing their students' assignments
CREATE INDEX idx_teacher_student_assignments
ON assignment_students(student_id, status, completed_at)
WHERE status = 'completed';

-- Class analytics queries
CREATE INDEX idx_class_analytics
ON assignment_students(assignment_id, status, score)
INCLUDE (completed_at, time_spent_minutes);

-- Student progress queries
CREATE INDEX idx_student_progress
ON assignment_students(student_id, completed_at DESC, score);

-- Deadline notifications
CREATE INDEX idx_upcoming_deadlines
ON assignments(due_date, teacher_id)
WHERE due_date > CURRENT_TIMESTAMP;

-- Unread notifications
CREATE INDEX idx_unread_notifications
ON notifications(user_id, created_at DESC)
WHERE is_read = false;
```

### 2.4 Database Functions & Triggers

**Auto-update `updated_at` timestamp:**

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publishers_updated_at BEFORE UPDATE ON publishers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- (Repeat for: schools, teachers, students, books, activities, classes,
--  assignments, assignment_students, feedback, materials)
```

**Automatic notification cleanup:**

```sql
-- Delete notifications older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule via cron or backend job
```

### 2.5 Data Retention Policy

| Entity | Retention | Strategy |
|--------|-----------|----------|
| Users (active) | Indefinite | Active accounts retained |
| Users (inactive) | 2 years | Soft delete, then hard delete |
| Assignments (completed) | 2 years | Archive to cold storage |
| Analytics aggregates | Indefinite | Keep for historical reporting |
| Notifications | 30 days | Auto-delete (see trigger above) |
| Messages | 1 year | Archive old threads |
| Progress data | Until assignment deleted | Tied to assignment lifecycle |

---

## 3. API Architecture

### 3.1 RESTful API Design Principles

Dream LMS API follows RESTful conventions with these design principles:

1. **Resource-Oriented URLs** - Nouns, not verbs (`/assignments` not `/getAssignments`)
2. **HTTP Methods** - Standard semantics (GET, POST, PUT/PATCH, DELETE)
3. **Stateless** - Each request contains all necessary information (JWT in header)
4. **JSON Format** - Request and response bodies use JSON
5. **Consistent Error Responses** - Standardized error format across all endpoints
6. **Versioning** - API version in URL path (`/api/v1/...`)
7. **Pagination** - Large collections use cursor or offset pagination
8. **HATEOAS (Light)** - Include relevant links in responses where helpful

### 3.2 API Versioning Strategy

**URL-Based Versioning:**

```
/api/v1/assignments
/api/v2/assignments  (future breaking changes)
```

**Version Support Policy:**
- Current version: v1
- Support latest 2 major versions simultaneously
- Deprecation notice: 6 months before removing old version
- Breaking changes trigger new major version

### 3.3 Authentication & Authorization Flow

**Authentication:**

```
1. Client: POST /api/v1/auth/login
   Body: { "email": "teacher@school.com", "password": "..." }

2. Server validates credentials
   - Hash password comparison
   - Check is_active flag

3. Server generates JWT
   Payload: {
     "user_id": "uuid",
     "email": "teacher@school.com",
     "role": "teacher",
     "teacher_id": "uuid",  // Role-specific ID
     "exp": 1234567890
   }

4. Server returns:
   {
     "access_token": "eyJ0eXAi...",
     "refresh_token": "dGhpcyBp...",
     "token_type": "Bearer",
     "expires_in": 3600
   }

5. Client stores tokens (localStorage or httpOnly cookie)

6. Subsequent requests include:
   Authorization: Bearer eyJ0eXAi...
```

**Authorization (Role-Based Access Control):**

```python
# FastAPI dependency for role checking
async def require_role(required_role: UserRole):
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ):
        if current_user.role != required_role:
            raise HTTPException(403, "Insufficient permissions")
        return current_user
    return role_checker

# Usage in router
@router.get("/teachers/students")
async def get_teacher_students(
    current_teacher: User = Depends(require_role(UserRole.TEACHER))
):
    # Automatically validated that user is a teacher
    pass
```

### 3.4 Complete API Endpoint Specification

#### **3.4.1 Authentication Endpoints**

```
POST   /api/v1/auth/login              # Login with credentials
POST   /api/v1/auth/refresh            # Refresh access token
POST   /api/v1/auth/logout             # Invalidate refresh token
POST   /api/v1/auth/change-password    # Change user password
```

#### **3.4.2 User Management Endpoints**

**Admin:**
```
GET    /api/v1/admin/users             # List all users (paginated)
POST   /api/v1/admin/publishers        # Create publisher
GET    /api/v1/admin/publishers        # List publishers
PUT    /api/v1/admin/publishers/:id    # Update publisher
DELETE /api/v1/admin/publishers/:id    # Delete publisher
POST   /api/v1/admin/schools           # Create school
POST   /api/v1/admin/bulk-import       # Bulk import users (Excel)
```

**Publisher:**
```
GET    /api/v1/publishers/me/schools   # My schools
POST   /api/v1/publishers/me/teachers  # Create teacher in my schools
GET    /api/v1/publishers/me/teachers  # List my teachers
PUT    /api/v1/publishers/me/teachers/:id  # Update teacher
```

**Teacher:**
```
GET    /api/v1/teachers/me/students    # My students
POST   /api/v1/teachers/me/students    # Create student
PUT    /api/v1/teachers/me/students/:id    # Update student
DELETE /api/v1/teachers/me/students/:id    # Delete student
POST   /api/v1/teachers/me/students/bulk-import  # Bulk import students
```

#### **3.4.3 Class Management Endpoints**

```
GET    /api/v1/classes                 # Teacher's classes
POST   /api/v1/classes                 # Create class
GET    /api/v1/classes/:id             # Class detail
PUT    /api/v1/classes/:id             # Update class
DELETE /api/v1/classes/:id             # Delete class
POST   /api/v1/classes/:id/students    # Add students to class
DELETE /api/v1/classes/:id/students/:student_id  # Remove student
GET    /api/v1/classes/:id/analytics   # Class performance analytics
```

#### **3.4.4 Book & Activity Endpoints**

```
GET    /api/v1/books                   # List accessible books (filtered by publisher)
GET    /api/v1/books/:id               # Book detail
GET    /api/v1/books/:id/activities    # List activities in book
GET    /api/v1/activities/:id          # Activity detail with config
POST   /api/v1/admin/books/sync        # Sync books from Dream Central Storage (admin only)
```

#### **3.4.5 Assignment Endpoints**

**Teacher:**
```
GET    /api/v1/assignments             # Teacher's assignments
POST   /api/v1/assignments             # Create assignment
GET    /api/v1/assignments/:id         # Assignment detail
PUT    /api/v1/assignments/:id         # Update assignment
DELETE /api/v1/assignments/:id         # Delete assignment
GET    /api/v1/assignments/:id/results # Assignment results (all students)
GET    /api/v1/assignments/:id/analytics  # Question-level analytics
```

**Student:**
```
GET    /api/v1/students/me/assignments         # My assignments
GET    /api/v1/students/me/assignments/:id     # Assignment detail
GET    /api/v1/assignments/:id/start           # Start assignment (marks in_progress)
POST   /api/v1/assignments/:id/save-progress   # Save partial progress
POST   /api/v1/assignments/:id/submit          # Submit final answers
```

#### **3.4.6 Analytics Endpoints**

```
GET    /api/v1/students/:id/analytics          # Individual student performance
GET    /api/v1/classes/:id/analytics           # Class-wide analytics
GET    /api/v1/teachers/me/insights            # Teacher insights (error patterns)
GET    /api/v1/students/me/progress            # Student personal progress
POST   /api/v1/reports/generate                # Generate PDF/Excel report
GET    /api/v1/reports/:job_id/status          # Check report generation status
GET    /api/v1/reports/:job_id/download        # Download generated report
```

#### **3.4.7 Communication Endpoints**

**Messages:**
```
GET    /api/v1/messages/conversations          # List conversations
GET    /api/v1/messages/thread/:user_id        # Message thread with user
POST   /api/v1/messages                        # Send new message
PATCH  /api/v1/messages/:id/read               # Mark message as read
```

**Notifications:**
```
GET    /api/v1/notifications                   # My notifications (paginated)
PATCH  /api/v1/notifications/:id/read          # Mark as read
POST   /api/v1/notifications/mark-all-read     # Mark all as read
GET    /api/v1/notifications/preferences       # Get preferences
PUT    /api/v1/notifications/preferences       # Update preferences
```

**Feedback:**
```
POST   /api/v1/assignments/:id/students/:student_id/feedback  # Provide feedback
PUT    /api/v1/feedback/:id                    # Update feedback
GET    /api/v1/assignments/:id/students/:student_id/feedback  # Get feedback
```

#### **3.4.8 Material Endpoints**

```
GET    /api/v1/materials                       # Teacher's materials
POST   /api/v1/materials                       # Upload material
GET    /api/v1/materials/:id                   # Material detail
PUT    /api/v1/materials/:id                   # Update material
DELETE /api/v1/materials/:id                   # Delete material
POST   /api/v1/materials/:id/share             # Share with students/classes
GET    /api/v1/students/me/materials           # Student's shared materials
```

### 3.5 Request/Response Formats

**Standard Success Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Mathematics Assignment 1",
    "created_at": "2025-10-23T10:30:00Z"
  },
  "meta": {
    "timestamp": "2025-10-23T10:30:00Z"
  }
}
```

**Paginated Response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8,
    "next_page": 2,
    "prev_page": null
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-10-23T10:30:00Z"
  }
}
```

**Standard Error Codes:**

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | INVALID_INPUT | Validation error |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Duplicate resource |
| 422 | UNPROCESSABLE_ENTITY | Business logic error |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Maintenance or Dream Central Storage down |

### 3.6 Rate Limiting

**Strategy:** Token bucket algorithm per user + per IP

```python
# Rate limits by endpoint type
RATE_LIMITS = {
    "auth": "5/minute",        # Login attempts
    "read": "100/minute",      # GET requests
    "write": "30/minute",      # POST/PUT/DELETE
    "upload": "10/minute",     # File uploads
    "analytics": "20/minute",  # Heavy queries
}
```

**Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1635340800
```

### 3.7 API Documentation

**OpenAPI/Swagger:** Auto-generated by FastAPI

- Available at: `GET /api/v1/docs` (Swagger UI)
- Available at: `GET /api/v1/redoc` (ReDoc)
- OpenAPI JSON: `GET /api/v1/openapi.json`

**Example Route with OpenAPI Annotations:**

```python
@router.post(
    "/assignments",
    response_model=AssignmentResponse,
    status_code=201,
    summary="Create new assignment",
    description="Creates a new assignment and assigns it to specified students",
    tags=["assignments"]
)
async def create_assignment(
    assignment: AssignmentCreate,
    current_teacher: User = Depends(get_current_teacher)
) -> AssignmentResponse:
    """
    Create a new assignment:
    - **name**: Assignment title
    - **activity_id**: Reference to activity
    - **due_date**: Optional deadline
    - **student_ids** or **class_ids**: Assignment recipients
    """
    return await assignment_service.create(assignment, current_teacher)
```

---

## 4. Dream Central Storage Integration

### 4.1 Overview

Dream Central Storage is an **existing MinIO-based S3-compatible object storage** that hosts all book assets (images, audio) and teacher-uploaded materials. Dream LMS integrates as a client, fetching assets and transforming relative paths to pre-signed URLs.

**Key Integration Points:**
1. Book catalog sync (admin-triggered)
2. Activity asset loading (pre-signed URL transformation)
3. Teacher material uploads (PDFs, videos)
4. Direct browser → MinIO access (no backend bottleneck)

### 4.2 MinIO Client Architecture

**Python SDK:** `minio` package

```python
from minio import Minio
from minio.error import S3Error
from datetime import timedelta

class DreamCentralStorageClient:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=True  # HTTPS
        )
        self.bucket = settings.MINIO_BUCKET_NAME

    async def get_presigned_url(
        self,
        object_path: str,
        expiry: timedelta = timedelta(hours=1)
    ) -> str:
        """Generate pre-signed URL for direct browser access"""
        try:
            url = self.client.presigned_get_object(
                self.bucket,
                object_path,
                expires=expiry
            )
            return url
        except S3Error as e:
            logger.error(f"Failed to generate pre-signed URL: {e}")
            raise

    async def upload_file(
        self,
        file_data: bytes,
        object_path: str,
        content_type: str
    ) -> str:
        """Upload teacher material to MinIO"""
        try:
            self.client.put_object(
                self.bucket,
                object_path,
                data=BytesIO(file_data),
                length=len(file_data),
                content_type=content_type
            )
            return await self.get_presigned_url(object_path)
        except S3Error as e:
            logger.error(f"Failed to upload file: {e}")
            raise

    async def delete_file(self, object_path: str):
        """Delete material from MinIO"""
        try:
            self.client.remove_object(self.bucket, object_path)
        except S3Error as e:
            logger.error(f"Failed to delete file: {e}")
            raise
```

### 4.3 Activity Config Transformation

**Problem:** Book `config.json` contains **relative paths** like:
```
"./books/SwitchtoCLIL/images/HB/modules/M1/pages/p8s1.png"
```

**Solution:** Backend transforms all paths to **pre-signed URLs** before sending to frontend.

```python
async def transform_activity_config(activity: Activity) -> dict:
    """Transform relative paths in config to pre-signed URLs"""
    config = activity.config_json.copy()

    # Transform based on activity type
    if activity.activity_type == "dragdroppicture":
        if "section_path" in config:
            config["section_path"] = await storage_client.get_presigned_url(
                normalize_path(config["section_path"])
            )

    elif activity.activity_type == "matchTheWords":
        # Match activities may have images in questions
        for word in config.get("match_words", []):
            if "image_path" in word:
                word["image_path"] = await storage_client.get_presigned_url(
                    normalize_path(word["image_path"])
                )

    # Handle audio paths (universal)
    if "audio_path" in config:
        config["audio_path"] = await storage_client.get_presigned_url(
            normalize_path(config["audio_path"])
        )

    return config

def normalize_path(relative_path: str) -> str:
    """Convert ./books/... to books/..."""
    return relative_path.lstrip("./")
```

**Example Transformation:**

```python
# Input (from database)
{
    "type": "dragdroppicture",
    "section_path": "./books/SwitchtoCLIL/images/HB/modules/M1/pages/p8s1.png",
    "words": ["capital", "old", "nice"]
}

# Output (API response to frontend)
{
    "type": "dragdroppicture",
    "section_path": "https://minio.yourdomain.com/dream-central-storage/books/SwitchtoCLIL/images/HB/modules/M1/pages/p8s1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
    "words": ["capital", "old", "nice"]
}
```

### 4.4 Book Catalog Sync

**Endpoint:** `POST /api/v1/admin/books/sync` (Admin only)

**Process:**
1. Admin triggers sync from Dream LMS UI
2. Backend fetches book list from Dream Central Storage
3. For each book:
   - Download `config.json`
   - Parse activities
   - Create/update `books` and `activities` tables
   - Transform cover image to pre-signed URL
4. Return sync summary

```python
async def sync_books_from_storage():
    """Sync book catalog from Dream Central Storage"""
    books_synced = 0
    activities_synced = 0

    # List all book directories
    book_objects = storage_client.list_objects(
        bucket="dream-central-storage",
        prefix="books/",
        recursive=False
    )

    for book_obj in book_objects:
        # Download config.json for each book
        config_path = f"{book_obj.object_name}/config.json"
        config_data = await storage_client.get_object(config_path)
        config = json.loads(config_data)

        # Create or update book record
        book = await create_or_update_book(config)
        books_synced += 1

        # Parse activities from config
        for module in config.get("books", [{}])[0].get("modules", []):
            for page in module.get("pages", []):
                for section in page.get("sections", []):
                    if section.get("activity"):
                        await create_or_update_activity(book.id, section["activity"])
                        activities_synced += 1

    return {
        "books_synced": books_synced,
        "activities_synced": activities_synced
    }
```

### 4.5 Teacher Material Upload

**Flow:**
1. Teacher selects file in React UI
2. Frontend: `POST /api/v1/materials` (multipart/form-data)
3. Backend validates file (type, size, virus scan)
4. Backend uploads to MinIO at path: `materials/{teacher_id}/{uuid}.{ext}`
5. Backend stores metadata in `materials` table with pre-signed URL
6. Backend returns material record to frontend

```python
@router.post("/materials")
async def upload_material(
    file: UploadFile,
    title: str = Form(...),
    description: str = Form(None),
    current_teacher: User = Depends(get_current_teacher)
):
    # Validate file type
    allowed_types = ["application/pdf", "video/mp4", "video/quicktime"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Invalid file type")

    # Validate file size (50 MB for PDFs, 100 MB for videos)
    max_size = 100 * 1024 * 1024  # 100 MB
    file_data = await file.read()
    if len(file_data) > max_size:
        raise HTTPException(400, "File too large")

    # Generate unique path
    file_ext = file.filename.split(".")[-1]
    object_path = f"materials/{current_teacher.teacher_id}/{uuid4()}.{file_ext}"

    # Upload to MinIO
    file_url = await storage_client.upload_file(
        file_data,
        object_path,
        file.content_type
    )

    # Create database record
    material = await material_service.create(
        teacher_id=current_teacher.teacher_id,
        title=title,
        description=description,
        material_type="pdf" if "pdf" in file.content_type else "video",
        file_url=file_url,
        file_size_bytes=len(file_data)
    )

    return material
```

### 4.6 Caching Strategy

**Problem:** Pre-signed URLs expire after 1 hour, frequent regeneration is expensive.

**Solution:** Redis cache with 45-minute TTL

```python
async def get_cached_presigned_url(object_path: str) -> str:
    """Get pre-signed URL from cache or generate new"""
    cache_key = f"presigned:{object_path}"

    # Try cache first
    cached_url = await redis.get(cache_key)
    if cached_url:
        return cached_url

    # Generate new URL
    url = await storage_client.get_presigned_url(object_path)

    # Cache for 45 minutes (before 1-hour expiry)
    await redis.setex(cache_key, 2700, url)

    return url
```

### 4.7 Error Handling

**Scenario:** Dream Central Storage is unavailable

```python
@router.get("/assignments/{id}/start")
async def start_assignment(id: UUID):
    try:
        activity = await get_activity(id)
        transformed_config = await transform_activity_config(activity)
        return transformed_config
    except S3Error as e:
        # Dream Central Storage error
        logger.error(f"Storage error: {e}")
        raise HTTPException(
            503,
            "Content storage temporarily unavailable. Please try again."
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(500, "Internal server error")
```

**Graceful Degradation:**
- Show cached book list (if available)
- Display friendly error message to students
- Queue activity starts for retry when storage recovers

---

## 5. Frontend Architecture

### 5.1 Project Structure

Dream LMS follows the FastAPI template's organization with `/backend` and `/frontend` as separate root directories:

```
dream-lms/
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── main.py              # FastAPI app initialization
│   │   ├── api/                 # API routers
│   │   │   ├── routes/          # Endpoint definitions
│   │   │   └── deps.py          # Dependencies (auth, db)
│   │   ├── core/                # Core configuration
│   │   │   ├── config.py        # Settings
│   │   │   └── security.py      # JWT, hashing
│   │   ├── models/              # SQLModel models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic layer
│   │   └── tests/               # Pytest tests
│   ├── alembic/                 # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                    # React application
│   ├── src/
│   │   ├── main.tsx             # Entry point
│   │   ├── App.tsx              # Root component
│   │   ├── router.tsx           # TanStack Router config
│   │   │
│   │   ├── components/          # Shared components
│   │   │   ├── ui/              # Shadcn UI primitives
│   │   │   ├── layout/          # Header, Sidebar, AppShell
│   │   │   ├── common/          # Badge, Avatar, StatCard
│   │   │   ├── forms/           # FormField, DatePicker, FileUpload
│   │   │   ├── charts/          # Recharts wrappers
│   │   │   └── notifications/   # NotificationBell, NotificationList
│   │   │
│   │   ├── features/            # Feature modules
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── assignments/
│   │   │   ├── activities/      # Activity players
│   │   │   ├── analytics/
│   │   │   └── messaging/
│   │   │
│   │   ├── pages/               # Route pages
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # API clients
│   │   ├── stores/              # Zustand stores (optional)
│   │   ├── lib/                 # Utilities
│   │   ├── types/               # TypeScript types
│   │   └── styles/              # Global CSS
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml           # Orchestration config
├── .env                         # Environment variables
└── README.md
```

### 5.2 State Management

**Server State (TanStack Query):**

```typescript
// hooks/useAssignments.ts
export function useAssignments() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: assignmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['assignments']);
      toast.success('Assignment created!');
    },
  });

  return {
    assignments: data ?? [],
    isLoading,
    createAssignment: createMutation.mutate,
  };
}
```

**Client State (Zustand):**

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),

  login: async (credentials) => {
    const { user, access_token } = await authService.login(credentials);
    localStorage.setItem('token', access_token);
    set({ user, token: access_token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));
```

### 5.3 Routing & Protected Routes

```typescript
// router.tsx
const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'assignments', element: <AssignmentsPage /> },
          { path: 'assignments/:id/play', element: <PlayActivityPage /> },
          // Role-specific routes
          {
            path: 'admin',
            element: <RoleGuard requiredRole="admin" />,
            children: [...]
          },
        ],
      },
    ],
  },
]);

// Protected route wrapper
function ProtectedRoute() {
  const { token } = useAuthStore();
  return token ? <Outlet /> : <Navigate to="/login" />;
}

// Role guard
function RoleGuard({ requiredRole, children }: Props) {
  const { user } = useAuthStore();
  return user?.role === requiredRole ? children : <Navigate to="/dashboard" />;
}
```

### 5.4 API Service Layer

```typescript
// services/api.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

// Request interceptor: Add JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => response.data.data, // Unwrap { success, data }
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    throw error;
  }
);

// services/assignmentService.ts
export const assignmentService = {
  getAll: () => api.get<Assignment[]>('/assignments'),
  getById: (id: string) => api.get<Assignment>(`/assignments/${id}`),
  create: (data: AssignmentCreate) => api.post<Assignment>('/assignments', data),
  start: (id: string) => api.get<ActivityConfig>(`/assignments/${id}/start`),
  submit: (id: string, data: SubmitData) => api.post(`/assignments/${id}/submit`, data),
};
```

---

## 6. Activity Player Architecture

### 6.1 Activity Rendering Engine

**Universal Player Component:**

```typescript
// features/activities/ActivityPlayer.tsx
export function ActivityPlayer({ assignmentId }: Props) {
  const { data: activity, isLoading } = useQuery({
    queryKey: ['activity', assignmentId],
    queryFn: () => assignmentService.start(assignmentId),
  });

  const [answers, setAnswers] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (answers) {
        assignmentService.saveProgress(assignmentId, answers);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [answers, assignmentId]);

  const handleSubmit = async () => {
    const score = calculateScore(answers, activity);
    await assignmentService.submit(assignmentId, { answers, score });
    setShowResults(true);
  };

  // Render appropriate player based on activity type
  const renderPlayer = () => {
    switch (activity.type) {
      case 'dragdroppicture':
        return <DragDropPicturePlayer activity={activity} onAnswersChange={setAnswers} />;
      case 'matchTheWords':
        return <MatchTheWordsPlayer activity={activity} onAnswersChange={setAnswers} />;
      // ... other types
    }
  };

  return (
    <div className="activity-player">
      <ActivityHeader activity={activity} timeLimit={activity.time_limit_minutes} />
      {renderPlayer()}
      <ActivityFooter onSubmit={handleSubmit} submitDisabled={!isComplete(answers)} />
      {showResults && <ActivityResults score={score} answers={answers} />}
    </div>
  );
}
```

### 6.2 Scoring Algorithms

**Client-Side Scoring (for immediate feedback):**

```typescript
// lib/scoring.ts
export function calculateScore(answers: any, activity: Activity): number {
  switch (activity.type) {
    case 'dragdroppicture':
      return scoreDragDrop(answers, activity.answer);
    case 'matchTheWords':
      return scoreMatch(answers, activity.sentences);
    case 'circle':
      return scoreCircle(answers, activity.answer);
    case 'puzzleFindWords':
      return scoreWordSearch(answers, activity.words);
  }
}

function scoreDragDrop(userAnswers: Map<string, string>, correctAnswers: DragDropAnswer[]): number {
  let correct = 0;
  correctAnswers.forEach(answer => {
    const dropZoneId = `${answer.coords.x}-${answer.coords.y}`;
    if (userAnswers.get(dropZoneId) === answer.text) {
      correct++;
    }
  });
  return Math.round((correct / correctAnswers.length) * 100);
}
```

---

## 7. Analytics Engine

### 7.1 Performance Calculation Queries

```python
# services/analytics_service.py
async def get_student_analytics(student_id: UUID, period: str):
    """Calculate student performance metrics"""
    query = select(
        func.avg(AssignmentStudent.score).label('avg_score'),
        func.count(AssignmentStudent.id).label('total_completed'),
        func.sum(AssignmentStudent.time_spent_minutes).label('total_time')
    ).where(
        AssignmentStudent.student_id == student_id,
        AssignmentStudent.status == 'completed',
        AssignmentStudent.completed_at >= get_period_start(period)
    )

    result = await db.execute(query)
    return result.one()
```

### 7.2 Error Pattern Detection

```python
async def detect_error_patterns(teacher_id: UUID):
    """Identify common mistakes across assignments"""
    # Query assignments with low scores
    low_score_assignments = await db.execute(
        select(Assignment, AssignmentStudent)
        .join(AssignmentStudent)
        .where(
            Assignment.teacher_id == teacher_id,
            AssignmentStudent.score < 65
        )
    )

    # Analyze answers_json for common incorrect patterns
    patterns = []
    for assignment, student_assignment in low_score_assignments:
        if assignment.activity.activity_type == 'matchTheWords':
            # Analyze which pairs are frequently mismatched
            pass

    return patterns
```

---

## 8. Deployment Architecture

### 8.1 Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    ports:
      - "80:80"
      - "443:443"
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@yourdomain.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:password@db:5432/dreamlms
      - REDIS_URL=redis://redis:6379/0
      - MINIO_ENDPOINT=minio.yourdomain.com
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`yourdomain.com`) && PathPrefix(`/api`, `/docs`, `/redoc`)"
      - "traefik.http.routers.backend.entrypoints=websecure"
      - "traefik.http.routers.backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.backend.loadbalancer.server.port=8000"
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=dreamlms
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

### 8.2 Traefik Configuration

**Key Features:**

1. **Automatic SSL/TLS Management**: Traefik automatically obtains and renews Let's Encrypt certificates
2. **Service Discovery**: Docker labels define routing rules, no manual configuration files needed
3. **HTTP to HTTPS Redirect**: Automatic redirect from port 80 to 443
4. **Path-Based Routing**: Frontend serves all routes except `/api/*`, `/docs`, `/redoc` which go to backend

**Additional Traefik Configuration** (optional `traefik.yml`):

```yaml
# docker/traefik/traefik.yml
api:
  dashboard: true
  insecure: true  # Disable in production

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true
  websecure:
    address: ":443"

providers:
  docker:
    exposedByDefault: false
    network: web

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@yourdomain.com
      storage: /letsencrypt/acme.json
      tlsChallenge: {}

# Rate limiting middleware
http:
  middlewares:
    rate-limit:
      rateLimit:
        average: 100
        period: 1m
        burst: 20
```

**Applying Middleware** (add to backend labels in docker-compose.yml):

```yaml
labels:
  - "traefik.http.routers.backend.middlewares=rate-limit@file"
```

---

## 9. Security Architecture

### 9.1 Template-Provided Security (Already Implemented)

**The FastAPI template provides complete authentication and security infrastructure:**

✅ **JWT Authentication:**
- `backend/app/core/security.py` - Token generation, validation, password hashing
- Access token (1-hour expiry) + Refresh token (7-day expiry)
- `python-jose` for JWT encoding/decoding
- `passlib` with bcrypt for password hashing

✅ **Authentication Endpoints:**
- `POST /api/v1/login/access-token` - Login with email/password
- `POST /api/v1/login/test-token` - Validate access token
- `POST /api/v1/password-recovery` - Request password reset
- `POST /api/v1/reset-password` - Reset password with token

✅ **User Dependencies:**
- `get_current_user()` - Extract and validate JWT from Authorization header
- `get_current_active_superuser()` - Require superuser role

✅ **Security Features:**
- CORS middleware configured
- SQLModel ORM prevents SQL injection
- Password complexity validation
- Secure session management

### 9.2 LMS Extension: 4-Role RBAC System

**What We Add for Dream LMS:**

**1. User Role Enum (backend/app/models.py):**

```python
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    publisher = "publisher"
    teacher = "teacher"
    student = "student"

# Extend User model
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    role: UserRole = Field(default=UserRole.student)  # NEW
    # ... other fields
```

**2. Role-Based Access Control Dependency (backend/app/api/deps.py):**

```python
def require_role(*allowed_roles: UserRole):
    """Dependency to check if user has one of the allowed roles"""
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access forbidden. Required roles: {allowed_roles}"
            )
        return current_user
    return Depends(role_checker)

# Usage examples
@router.get("/admin/publishers")
async def list_publishers(
    user: User = Depends(require_role(UserRole.admin))
):
    # Only admins can access
    pass

@router.post("/teachers/me/students")
async def create_student(
    user: User = Depends(require_role(UserRole.teacher))
):
    # Only teachers can create students
    pass
```

**3. Role-Based Data Filtering:**

```python
# Filter data by authenticated user's role
async def get_my_schools(
    db: AsyncSession,
    current_user: User = Depends(require_role(UserRole.publisher))
):
    # Publishers only see their own schools
    publisher = await db.get(Publisher, {"user_id": current_user.id})
    schools = await db.exec(
        select(School).where(School.publisher_id == publisher.id)
    )
    return schools
```

**4. JWT Payload Extension:**

Update token creation to include role:

```python
# In login endpoint
access_token = security.create_access_token(
    subject=str(user.id),
    extra_claims={"role": user.role}  # Include role in token
)
```

### 9.3 Frontend Authentication (Template-Provided + Extended)

**Template Provides:**
- TanStack Router auth guard (`beforeLoad` checks)
- Protected routes redirect to `/login`
- Auth context with TanStack Query
- API client with automatic token injection

**We Extend:**
- Role-specific route protection
- Role-based navigation menus
- Permission checking in components

```typescript
// src/hooks/useAuth.ts (extend template's hook)
export function useRequireRole(allowedRoles: UserRole[]) {
  const { user } = useAuth()

  if (!user || !allowedRoles.includes(user.role)) {
    throw redirect({ to: '/unauthorized' })
  }

  return user
}

// Usage in route
export const Route = createFileRoute('/_layout/admin/publishers')({
  beforeLoad: () => {
    useRequireRole(['admin'])
  }
})
```

### 9.4 Security Best Practices

**Implemented (Template + Extensions):**
- ✅ HTTPS only in production (Traefik with Let's Encrypt)
- ✅ Password hashing with bcrypt (cost factor 12)
- ✅ JWT tokens in httpOnly cookies (or Authorization header)
- ✅ SQL injection prevention via SQLModel parameterized queries
- ✅ XSS prevention via React's built-in escaping
- ✅ CORS configured for allowed origins
- ✅ Rate limiting via Traefik middleware
- ✅ Input validation via Pydantic schemas
- ✅ Role-based authorization on all protected endpoints

**Additional Considerations:**
- 🔒 Secrets in environment variables (never committed)
- 🔒 Database credentials rotated regularly
- 🔒 Audit logging for sensitive operations (admin actions)
- 🔒 Regular dependency updates for security patches

---

## 10. Testing Strategy

### 10.1 Template-Provided Testing Infrastructure

**Backend (pytest):**
✅ Template includes complete pytest setup:
- `backend/app/tests/` with test fixtures
- `conftest.py` with database fixtures (`TestingSessionLocal`, `override_get_db`)
- User authentication fixtures (`superuser_token_headers`, `normal_user_token_headers`)
- API client fixtures (`client: AsyncClient`)
- Example tests for user CRUD operations

**Frontend (Playwright):**
✅ Template includes Playwright for E2E testing:
- `frontend/tests/` directory
- Example E2E tests for login flow
- Configured in `playwright.config.ts`

**What We Add:**
- LMS domain-specific test cases (assignments, activities, analytics)
- Mock data fixtures for books, classes, students
- Activity player component tests
- Role-based access control tests

### 10.2 Backend Testing (pytest) - LMS Extensions

```python
# backend/app/tests/test_assignments.py
import pytest
from httpx import AsyncClient
from app.core.security import create_access_token
from app.models import UserRole

@pytest.fixture
async def teacher_token(db: AsyncSession) -> str:
    """Create a teacher user and return auth token"""
    # Create teacher user with role
    user = User(email="teacher@test.com", role=UserRole.teacher, ...)
    db.add(user)
    await db.commit()
    return create_access_token(subject=str(user.id), extra_claims={"role": "teacher"})

@pytest.mark.asyncio
async def test_create_assignment(client: AsyncClient, teacher_token: str):
    """Test that teachers can create assignments"""
    response = await client.post(
        "/api/v1/assignments",
        json={
            "name": "Test Assignment",
            "activity_id": "uuid-here",
            "due_date": "2025-12-31T23:59:59Z",
            "student_ids": ["student-uuid-1", "student-uuid-2"]
        },
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Test Assignment"

@pytest.mark.asyncio
async def test_student_cannot_create_assignment(client: AsyncClient, student_token: str):
    """Test role-based access control"""
    response = await client.post(
        "/api/v1/assignments",
        json={"name": "Test"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 403  # Forbidden
```

### 10.3 Frontend Testing - LMS Extensions

**Component Tests (Vitest + React Testing Library):**

```typescript
// frontend/src/components/AssignmentCard.test.tsx
import { render, screen } from '@testing-library/react'
import { AssignmentCard } from '@/components/AssignmentCard'

describe('AssignmentCard', () => {
  it('renders assignment with countdown timer', () => {
    const assignment = {
      id: '1',
      name: 'Math Quiz',
      due_date: '2025-12-31T23:59:59Z',
      status: 'pending',
      book: { title: 'Algebra Basics' }
    }

    render(<AssignmentCard assignment={assignment} />)

    expect(screen.getByText('Math Quiz')).toBeInTheDocument()
    expect(screen.getByText(/Due:/)).toBeInTheDocument()
    expect(screen.getByTestId('countdown-timer')).toBeInTheDocument()
  })

  it('shows past due badge for overdue assignments', () => {
    const assignment = {
      id: '1',
      name: 'Late Assignment',
      due_date: '2020-01-01T00:00:00Z',  // Past date
      status: 'pending'
    }

    render(<AssignmentCard assignment={assignment} />)

    expect(screen.getByText(/Past Due/i)).toBeInTheDocument()
    expect(screen.getByTestId('warning-badge')).toHaveClass('text-red-500')
  })
})
```

**E2E Tests (Playwright):**

```typescript
// frontend/tests/e2e/assignment-creation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Assignment Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as teacher (using template's auth)
    await page.goto('/login')
    await page.fill('[name="email"]', 'teacher@test.com')
    await page.fill('[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/teacher/dashboard')
  })

  test('teacher can create assignment', async ({ page }) => {
    // Navigate to books
    await page.click('text=Books')
    await page.click('text=View Activities')

    // Click assign button
    await page.click('text=Assign')

    // Fill assignment wizard
    await page.click('text=Next')  // Step 1
    await page.check('[data-testid="student-checkbox-1"]')  // Step 2
    await page.click('text=Next')
    await page.fill('[name="due_date"]', '2025-12-31')  // Step 3
    await page.click('text=Create Assignment')

    // Verify success
    await expect(page.locator('text=Assignment created')).toBeVisible()
  })
})
```

### 10.4 Testing Scripts

See `/docs/development-guide.md` Section 3 for complete testing scripts:
- `scripts/test-backend.sh` - Run all backend tests with coverage
- `scripts/test-frontend.sh` - Run unit + component tests
- `scripts/run-all-tests.sh` - Sequential execution of all test suites

---

## 11. Scalability Considerations

### 11.1 Current MVP Limitations

- **Single VPS**: All services on one server
- **Vertical Scaling Only**: Add more CPU/RAM to existing server
- **PostgreSQL Bottleneck**: Single database instance
- **No Auto-Scaling**: Manual intervention for traffic spikes

**Capacity Estimate:**
- 100-1000 concurrent users
- 10,000 total users
- 50,000 assignments/month

### 11.2 Scaling Path

**Phase 2: Separate Database (Month 3-6)**
- Move PostgreSQL to managed service (AWS RDS, DigitalOcean Managed DB)
- Enable read replicas for analytics queries
- Implement connection pooling (PgBouncer)

**Phase 3: Horizontal Scaling (Month 6-12)**
- Deploy multiple app servers behind load balancer
- Implement sticky sessions for WebSocket (future real-time features)
- Use Redis for distributed session storage

**Phase 4: Kubernetes (Year 2)**
- Migrate to Kubernetes for auto-scaling
- Implement microservices (analytics service, notification service)
- Use message queue (RabbitMQ/Kafka) for async tasks

---

## 12. Monitoring & Logging

### 12.1 Structured Logging

```python
import structlog

logger = structlog.get_logger()

@router.post("/assignments")
async def create_assignment(assignment: AssignmentCreate, user: User):
    logger.info(
        "assignment_created",
        teacher_id=user.teacher_id,
        assignment_name=assignment.name,
        student_count=len(assignment.student_ids)
    )
    # ... implementation
```

### 12.2 Application Performance Monitoring

**Recommended:** Sentry for error tracking

```python
import sentry_sdk

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.ENVIRONMENT,
    traces_sample_rate=0.1
)
```

**Key Metrics to Track:**
- API response times (p50, p95, p99)
- Database query duration
- Dream Central Storage latency
- Active users (concurrent)
- Assignment completion rate

---

## 13. Implementation Priorities

**Note:** FastAPI template provides foundation (Docker, auth, basic CRUD). We extend it.

### Epic 1: Extend Template for LMS Domain (Weeks 1-3) - Backend

**What Template Provides:** ✅ Docker, FastAPI, JWT auth, User CRUD, Alembic, pytest

**What We Build:**
1. Remove Items demo feature
2. Add `role` field to User model (enum: admin/publisher/teacher/student)
3. Create 20+ LMS tables: Publishers, Schools, Teachers, Students, Classes, Books, Activities, Assignments, Analytics, Messages, Materials
4. Build role-specific API endpoints (admin creates publishers, publishers create teachers, etc.)
5. Implement bulk import (Excel upload)
6. Extend RBAC with `require_role()` dependency

**Deliverable:** Complete backend schema + APIs ready for frontend

---

### Epic 2: UI Migration & LMS Pages (Weeks 4-8) - Frontend with Mock Data

**What Template Provides:** ✅ Login, navbar, sidebar, admin page (Chakra UI), TanStack Router/Query

**What We Build (All with Mock Data):**
1. **Week 4:** Remove Chakra UI → Install Shadcn + Tailwind + design tokens
2. **Week 5:** Migrate existing pages (login, navbar, sidebar, admin) to Shadcn
3. **Week 6:** Build 4 role dashboards + books/assignments pages (mock data)
4. **Week 7:** Build 6 activity player components (mock data)
5. **Week 8:** Build analytics, messaging, materials pages (mock data)

**Deliverable:** Fully functional frontend demo (no backend integration needed yet)

---

### Epic 3: Books & Assignments Backend + Integration (Weeks 9-11)

**Build:**
1. Dream Central Storage MinIO client integration
2. Book sync API + activity parsing (config.json)
3. Class management API
4. Assignment creation/management API
5. Connect Epic 2's mock-data UIs to real APIs

**Deliverable:** Teachers assign books, students see assignments (players not functional)

---

### Epic 4: Activity Players Backend + Integration (Weeks 12-16)

**Build:**
1. Activity submission API with JSONB response storage
2. Server-side scoring/validation
3. Progress tracking (AssignmentStudent updates)
4. Connect Epic 2's activity player UIs to real APIs
5. Implement all 6 activity types end-to-end

**Deliverable:** Students complete activities, scores recorded, teachers see completion

---

### Epic 5: Analytics Backend + Integration (Weeks 17-18)

**Build:**
1. Analytics calculation engine (aggregate queries)
2. Error pattern analysis
3. Progress tracking API
4. Connect Epic 2's analytics dashboards to real APIs

**Deliverable:** Teachers see performance insights, students see progress charts

---

### Epic 6: Messaging & Materials Backend + Integration (Weeks 19-20)

**Build:**
1. Messaging API (threads, notifications)
2. Materials upload to Dream Central Storage
3. Feedback system API
4. Connect Epic 2's messaging/materials UIs to real APIs

**Deliverable:** Full communication system functional

---

### Total Timeline: ~20 weeks (5 months)

**Key Insight:** Template saves ~4 weeks by providing infrastructure. Epic 2 builds all UI upfront with mock data, then Epics 3-6 just connect APIs (faster integration).

---

## Conclusion

This architecture document provides a comprehensive blueprint for building Dream LMS. The design prioritizes **pragmatic simplicity for MVP** while maintaining **clear boundaries for future scaling**. Key highlights:

- **Monolithic FastAPI backend** with clean service layers for future microservices extraction
- **PostgreSQL database** with optimized indexes for analytics workloads
- **React SPA frontend** with modern state management (TanStack Query + Zustand)
- **MinIO integration** via pre-signed URLs for secure, direct browser access
- **JWT authentication** with role-based access control
- **Docker Compose deployment** on single VPS, scalable to Kubernetes

**Next Steps:**
1. Review with development team
2. Set up development environment
3. Begin Phase 1 implementation
4. Establish sprint planning cadence

**Questions or Clarifications Needed:**
- Dream Central Storage API documentation (endpoints, authentication)
- Existing book catalog size (for initial sync planning)
- Peak concurrent user estimate (for capacity planning)

---

**End of Architecture Document**

