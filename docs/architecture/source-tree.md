# Project Source Tree

**Dream LMS Project Structure**
**Last Updated:** 2025-10-26
**Architecture Version:** v4

---

## Root Structure

```
dream-lms/
├── backend/                    # FastAPI application
├── frontend/                   # React application
├── docs/                       # Project documentation
│   ├── prd/                   # Sharded PRD sections
│   ├── architecture/          # Sharded architecture docs
│   └── stories/               # User story files
├── .bmad-core/                # BMAD workflow configuration
├── docker-compose.yml         # Container orchestration
├── .env                       # Environment variables
└── README.md
```

---

## Backend Structure

Based on FastAPI Full-Stack Template:

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI app initialization
│   │
│   ├── api/                   # API Layer
│   │   ├── __init__.py
│   │   ├── main.py           # API router aggregation
│   │   ├── deps.py           # Dependencies (auth, db, RBAC)
│   │   └── routes/           # Endpoint definitions
│   │       ├── __init__.py
│   │       ├── login.py      # Auth endpoints (template)
│   │       ├── users.py      # User CRUD (template)
│   │       ├── admin.py      # Admin endpoints (to be added)
│   │       ├── publishers.py # Publisher endpoints (to be added)
│   │       ├── teachers.py   # Teacher endpoints (to be added)
│   │       ├── students.py   # Student endpoints (to be added)
│   │       ├── classes.py    # Class management (to be added)
│   │       ├── books.py      # Book catalog (to be added)
│   │       ├── assignments.py # Assignment CRUD (to be added)
│   │       └── ...           # More routes as needed
│   │
│   ├── core/                  # Core Configuration
│   │   ├── __init__.py
│   │   ├── config.py         # Settings (Pydantic BaseSettings)
│   │   ├── security.py       # JWT, password hashing
│   │   └── db.py             # Database connection
│   │
│   ├── models/                # SQLModel ORM Models (Data Layer)
│   │   ├── __init__.py
│   │   └── (single models.py or separate files per model)
│   │
│   ├── schemas/               # Pydantic Schemas (Optional)
│   │   ├── __init__.py
│   │   └── ...               # Request/response schemas
│   │
│   ├── services/              # Business Logic Layer (Optional)
│   │   ├── __init__.py
│   │   └── ...               # Service classes
│   │
│   ├── tests/                 # Pytest Tests
│   │   ├── __init__.py
│   │   ├── conftest.py       # Test fixtures
│   │   ├── test_api/         # API endpoint tests
│   │   ├── test_models/      # Model tests
│   │   └── ...
│   │
│   └── initial_data.py        # Database seeding script
│
├── alembic/                   # Database Migrations
│   ├── versions/             # Migration files
│   ├── env.py
│   └── alembic.ini
│
├── Dockerfile                 # Backend container image
├── requirements.txt           # Python dependencies
└── pyproject.toml            # Python project config (optional)
```

---

## Frontend Structure

Based on FastAPI template with modifications:

```
frontend/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Root component
│   ├── router.tsx            # TanStack Router config
│   │
│   ├── components/           # Shared Components
│   │   ├── ui/              # Shadcn UI primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── layout/          # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── AppShell.tsx
│   │   ├── common/          # Common components
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── StatCard.tsx
│   │   ├── forms/           # Form components
│   │   │   ├── FormField.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   └── FileUpload.tsx
│   │   ├── charts/          # Recharts wrappers
│   │   │   └── ...
│   │   └── notifications/   # Notification system
│   │       ├── NotificationBell.tsx
│   │       └── NotificationList.tsx
│   │
│   ├── features/            # Feature Modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   ├── dashboard/
│   │   ├── assignments/
│   │   ├── activities/      # Activity players
│   │   ├── analytics/
│   │   └── messaging/
│   │
│   ├── pages/               # Route Pages
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   └── ...
│   │
│   ├── hooks/               # Custom React Hooks
│   │   ├── useAuth.ts
│   │   ├── useAssignments.ts
│   │   └── ...
│   │
│   ├── services/            # API Clients
│   │   ├── api.ts          # Axios instance
│   │   ├── authService.ts
│   │   ├── assignmentService.ts
│   │   └── ...
│   │
│   ├── stores/              # Zustand Stores (Optional)
│   │   ├── authStore.ts
│   │   └── ...
│   │
│   ├── lib/                 # Utilities
│   │   ├── utils.ts
│   │   ├── scoring.ts      # Activity scoring logic
│   │   └── ...
│   │
│   ├── types/               # TypeScript Types
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── ...
│   │
│   └── styles/              # Global CSS
│       ├── globals.css
│       └── tailwind.css
│
├── tests/                    # Frontend Tests
│   ├── unit/                # Vitest unit tests
│   ├── e2e/                 # Playwright E2E tests
│   └── ...
│
├── public/                   # Static assets
│   └── ...
│
├── Dockerfile               # Frontend container image
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── playwright.config.ts
```

---

## Documentation Structure

```
docs/
├── prd/                     # Sharded PRD (6 epics)
│   ├── index.md
│   ├── goals-and-background-context.md
│   ├── epic-1-extend-template-for-lms-domain-backend.md
│   ├── epic-2-ui-migration-lms-pages-frontend-with-mock-data.md
│   └── ...
│
├── architecture/            # Sharded Architecture (16 sections)
│   ├── index.md
│   ├── 1-system-overview-architecture-diagram.md
│   ├── 2-database-schema-design.md
│   ├── 3-api-architecture.md
│   ├── coding-standards.md          # ← This file
│   ├── tech-stack.md                # ← This file
│   ├── source-tree.md               # ← This file
│   └── ...
│
└── stories/                 # User Stories
    ├── 1.1.remove-template-demo-extend-user-model.md
    └── ...
```

---

## Key Naming Conventions

### Backend Files
- **Models:** `backend/app/models.py` or `backend/app/models/<model_name>.py`
- **Routes:** `backend/app/api/routes/<resource>.py` (lowercase, plural)
- **Tests:** `backend/app/tests/test_<feature>.py`
- **Migrations:** `backend/alembic/versions/<timestamp>_<description>.py`

### Frontend Files
- **Components:** PascalCase (e.g., `UserCard.tsx`)
- **Hooks:** camelCase with "use" prefix (e.g., `useAuth.ts`)
- **Services:** camelCase with "Service" suffix (e.g., `authService.ts`)
- **Pages:** PascalCase with "Page" suffix (e.g., `DashboardPage.tsx`)
- **Types:** camelCase files (e.g., `types/api.ts`)

---

## Architecture Pattern

**Backend:** Layered Architecture
```
API Layer (routers) → Service Layer (business logic) → Data Layer (SQLModel ORM) → Database
```

**Frontend:** Feature-Based Architecture
```
Pages → Features → Components → Services → API
```

---

**Reference:** See `docs/architecture/5-frontend-architecture.md` and `docs/architecture/1-system-overview-architecture-diagram.md` for detailed structure discussion.
