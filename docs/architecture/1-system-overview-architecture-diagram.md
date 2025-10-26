# 1. System Overview & Architecture Diagram

## 1.1 Architecture Philosophy

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

## 1.2 Template Customization Strategy

Dream LMS is built on the **official FastAPI Full-Stack Template** (https://github.com/fastapi/full-stack-fastapi-template), providing a production-ready foundation with authentication, database integration, Docker orchestration, and modern frontend tooling. This template-first approach accelerates development while maintaining best practices.

### 1.2.1 What We Keep from Template

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

### 1.2.2 What We Replace in Template

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

### 1.2.3 What We Remove from Template

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

## 1.3 High-Level System Architecture

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

## 1.4 Component Responsibilities

### **1.4.1 Frontend (React Application)**

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

### **1.4.2 Backend API (FastAPI Application)**

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

### **1.4.3 Database (PostgreSQL)**

**Port:** 5432
**Technology:** PostgreSQL 15+

**Responsibilities:**
- Store all application data (users, assignments, analytics)
- Enforce data integrity (foreign keys, constraints)
- Support complex queries (joins, aggregations for analytics)
- Provide JSONB storage for flexible activity configurations

### **1.4.4 Reverse Proxy (Traefik)**

**Ports:** 80 (HTTP redirect), 443 (HTTPS)

**Responsibilities:**
- Automatic SSL/TLS certificate management (Let's Encrypt)
- Terminate SSL/TLS connections
- Serve static React build files
- Proxy `/api/*` requests to FastAPI backend
- Apply rate limiting and middleware
- Compress responses (gzip)
- Auto-discovery of services via Docker labels

### **1.4.5 Dream Central Storage (External - MinIO)**

**Protocol:** S3-compatible REST API

**Responsibilities:**
- Store and serve book assets (images, audio)
- Store teacher-uploaded materials (PDFs, videos)
- Generate pre-signed URLs for secure, direct browser access
- Handle file redundancy and backups

## 1.5 Data Flow Examples

### **Example 1: Student Completes Assignment**

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

### **Example 2: Teacher Views Class Analytics**

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

## 1.6 Technology Stack Summary

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
