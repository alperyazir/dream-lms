# Source Tree Structure

This document provides a comprehensive overview of the Dream LMS project directory structure, explaining the purpose of each directory and key files.

## Project Root

```
dream-lms/
├── backend/                 # FastAPI backend application
├── frontend/                # React frontend application
├── docker/                  # Docker configuration files
├── docs/                    # Project documentation
├── .bmad-core/              # BMAD framework configuration
├── .claude/                 # Claude Code configuration
├── .github/                 # GitHub workflows and templates
├── docker-compose.yml       # Multi-container Docker setup
├── .gitignore               # Git ignore patterns
├── README.md                # Project overview and setup
└── CONTRIBUTING.md          # Contribution guidelines
```

## Backend Structure

```
backend/
├── app/                     # Main application package
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   │
│   ├── core/                # Core configuration and utilities
│   │   ├── __init__.py
│   │   ├── config.py        # Application settings (Pydantic BaseSettings)
│   │   ├── security.py      # JWT, password hashing, authentication
│   │   └── deps.py          # FastAPI dependency injection functions
│   │
│   ├── models/              # SQLAlchemy ORM models (database tables)
│   │   ├── __init__.py
│   │   ├── user.py          # User, Publisher, Teacher, Student, Admin
│   │   ├── school.py        # School, Class, ClassStudent
│   │   ├── book.py          # Book, Activity, BookAccess
│   │   ├── assignment.py    # Assignment, AssignmentStudent
│   │   ├── communication.py # Message, Notification, NotificationPreference
│   │   ├── material.py      # Material, MaterialAssignment
│   │   └── feedback.py      # Feedback
│   │
│   ├── schemas/             # Pydantic schemas for request/response validation
│   │   ├── __init__.py
│   │   ├── user.py          # UserCreate, UserUpdate, UserResponse
│   │   ├── assignment.py    # AssignmentCreate, AssignmentResponse
│   │   ├── activity.py      # ActivityConfig, ActivityResponse
│   │   └── auth.py          # LoginRequest, TokenResponse
│   │
│   ├── routers/             # API route handlers (controllers)
│   │   ├── __init__.py
│   │   ├── auth.py          # POST /auth/login, /auth/refresh, /auth/logout
│   │   ├── admin.py         # Admin-only endpoints (user management, bulk import)
│   │   ├── publishers.py    # Publisher management endpoints
│   │   ├── teachers.py      # Teacher endpoints (manage students, classes)
│   │   ├── students.py      # Student endpoints (view assignments, materials)
│   │   ├── classes.py       # Class management
│   │   ├── books.py         # Book and activity browsing
│   │   ├── assignments.py   # Assignment CRUD, submission, progress
│   │   ├── analytics.py     # Analytics and reporting
│   │   ├── messages.py      # Messaging between users
│   │   ├── notifications.py # Notification management
│   │   └── materials.py     # Material upload and sharing
│   │
│   ├── services/            # Business logic layer (service layer pattern)
│   │   ├── __init__.py
│   │   ├── assignment_service.py  # Assignment creation, validation, submission
│   │   ├── analytics_service.py   # Complex analytics calculations
│   │   ├── notification_service.py # Notification creation and delivery
│   │   ├── storage_service.py     # Dream Central Storage integration
│   │   └── user_service.py        # User management business logic
│   │
│   └── db/                  # Database utilities
│       ├── __init__.py
│       └── session.py       # Async session factory, get_db dependency
│
├── alembic/                 # Database migrations (Alembic)
│   ├── versions/            # Migration version files
│   ├── env.py               # Alembic environment configuration
│   ├── script.py.mako       # Migration template
│   └── alembic.ini          # Alembic configuration
│
├── tests/                   # Test suite (pytest)
│   ├── __init__.py
│   ├── conftest.py          # pytest fixtures (test database, test client)
│   ├── test_auth.py         # Authentication tests
│   ├── test_assignments.py  # Assignment endpoint tests
│   ├── test_analytics.py    # Analytics tests
│   └── test_services/       # Service layer unit tests
│
├── scripts/                 # Utility scripts
│   ├── seed_admin.py        # Create initial admin user
│   └── sync_books.py        # Sync books from Dream Central Storage
│
├── docs/                    # Backend-specific documentation
│   └── qa/                  # Quality assurance documentation
│       └── gates/           # Gate documents for releases
│
├── .venv/                   # Python virtual environment (gitignored)
├── requirements.txt         # Python dependencies (production)
├── requirements-dev.txt     # Development dependencies (pytest, black, mypy)
├── pyproject.toml           # Python project configuration (Black, isort)
├── pytest.ini               # pytest configuration
├── Dockerfile               # Backend Docker image
└── .env.example             # Environment variable template
```

### Key Backend Files

| File | Purpose |
|------|---------|
| `app/main.py` | FastAPI application initialization, middleware, CORS, router registration |
| `app/core/config.py` | Environment variables, database URLs, JWT secrets (Pydantic BaseSettings) |
| `app/core/security.py` | Password hashing (bcrypt), JWT token creation/validation |
| `app/core/deps.py` | FastAPI dependencies: `get_db()`, `get_current_user()`, role guards |
| `alembic/env.py` | Alembic migration environment (connects to database) |
| `scripts/seed_admin.py` | Creates initial admin user for fresh deployments |

## Frontend Structure

```
frontend/
├── src/                     # Source code
│   ├── main.tsx             # Application entry point (ReactDOM.render)
│   ├── App.tsx              # Root component (providers, router)
│   ├── router.tsx           # React Router configuration (route definitions)
│   │
│   ├── components/          # Shared/reusable components
│   │   ├── ui/              # Shadcn UI primitives (Button, Card, Dialog, etc.)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── badge.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/          # Layout components
│   │   │   ├── AppShell.tsx      # Main layout wrapper (header + sidebar + content)
│   │   │   ├── Header.tsx        # Top navigation bar
│   │   │   ├── Sidebar.tsx       # Side navigation
│   │   │   └── ProtectedRoute.tsx # Route guard for authentication
│   │   │
│   │   ├── common/          # Common reusable components
│   │   │   ├── Avatar.tsx
│   │   │   ├── StatCard.tsx      # Dashboard stat cards
│   │   │   ├── DataTable.tsx     # Generic table component
│   │   │   └── LoadingSpinner.tsx
│   │   │
│   │   └── forms/           # Form-related components
│   │       ├── FormField.tsx     # React Hook Form wrapper
│   │       ├── DatePicker.tsx
│   │       ├── FileUpload.tsx
│   │       └── SearchInput.tsx
│   │
│   ├── features/            # Feature-based modules (domain-driven)
│   │   ├── auth/            # Authentication feature
│   │   │   ├── components/       # LoginForm, RegisterForm
│   │   │   ├── hooks/            # useAuth, useLogin
│   │   │   └── types.ts          # Auth-specific types
│   │   │
│   │   ├── dashboard/       # Dashboard feature
│   │   │   ├── components/       # DashboardStats, RecentActivity
│   │   │   └── hooks/            # useDashboardData
│   │   │
│   │   ├── assignments/     # Assignment management
│   │   │   ├── components/       # AssignmentCard, AssignmentForm, AssignmentList
│   │   │   ├── hooks/            # useAssignments, useAssignmentSubmit
│   │   │   └── types.ts
│   │   │
│   │   ├── activities/      # Activity players (6 types)
│   │   │   ├── DragDropPicture.tsx
│   │   │   ├── DragDropPictureGroup.tsx
│   │   │   ├── MatchTheWords.tsx
│   │   │   ├── Circle.tsx
│   │   │   ├── MarkWithX.tsx
│   │   │   ├── PuzzleFindWords.tsx
│   │   │   └── ActivityPlayer.tsx  # Router component
│   │   │
│   │   ├── analytics/       # Analytics and reporting
│   │   │   ├── components/       # Charts, Reports, Filters
│   │   │   └── hooks/            # useAnalytics
│   │   │
│   │   └── messaging/       # Messaging and notifications
│   │       ├── components/       # MessageThread, NotificationBell
│   │       └── hooks/            # useMessages, useNotifications
│   │
│   ├── pages/               # Page components (route entry points)
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── AssignmentsPage.tsx
│   │   ├── AssignmentDetailPage.tsx
│   │   ├── PlayActivityPage.tsx  # Activity player page
│   │   ├── AnalyticsPage.tsx
│   │   ├── ClassesPage.tsx
│   │   ├── StudentsPage.tsx
│   │   └── ...
│   │
│   ├── hooks/               # Global custom hooks
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useMediaQuery.ts
│   │   └── useTimer.ts
│   │
│   ├── services/            # API client services
│   │   ├── api.ts           # Axios instance with interceptors
│   │   ├── authService.ts   # Login, logout, refresh token
│   │   ├── assignmentService.ts  # Assignment CRUD, submit
│   │   ├── analyticsService.ts   # Fetch analytics data
│   │   ├── bookService.ts        # Browse books and activities
│   │   └── userService.ts        # User management
│   │
│   ├── stores/              # Zustand state management stores
│   │   ├── authStore.ts     # User, token, login/logout
│   │   ├── uiStore.ts       # Sidebar open/close, theme
│   │   └── notificationStore.ts  # Unread notification count
│   │
│   ├── lib/                 # Utility functions and helpers
│   │   ├── utils.ts         # General utilities (cn, formatters)
│   │   ├── validators.ts    # Zod schemas for form validation
│   │   ├── constants.ts     # Application constants
│   │   └── queryClient.ts   # TanStack Query configuration
│   │
│   ├── types/               # Global TypeScript type definitions
│   │   ├── index.ts         # Re-exports
│   │   ├── user.ts          # User, Teacher, Student, Publisher types
│   │   ├── assignment.ts    # Assignment, AssignmentStatus types
│   │   ├── activity.ts      # Activity types and configs
│   │   └── api.ts           # API response wrappers
│   │
│   ├── styles/              # Global styles
│   │   ├── globals.css      # Tailwind directives, global CSS
│   │   └── themes.css       # CSS variables for theming
│   │
│   └── test/                # Test utilities
│       ├── setup.ts         # Vitest setup
│       └── testUtils.tsx    # Testing Library wrappers
│
├── public/                  # Static assets
│   ├── favicon.ico
│   └── robots.txt
│
├── node_modules/            # npm dependencies (gitignored)
├── dist/                    # Production build output (gitignored)
├── package.json             # npm dependencies and scripts
├── package-lock.json        # Dependency lock file
├── tsconfig.json            # TypeScript configuration
├── tsconfig.node.json       # TypeScript config for Vite
├── vite.config.ts           # Vite build configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── .eslintrc.json           # ESLint rules
├── .prettierrc              # Prettier configuration
├── vitest.config.ts         # Vitest test configuration
└── .env.example             # Environment variable template
```

### Key Frontend Files

| File | Purpose |
|------|---------|
| `src/main.tsx` | Application entry point, renders App component |
| `src/App.tsx` | Root component with providers (TanStack Query, Router) |
| `src/router.tsx` | Route definitions, protected routes, role guards |
| `src/services/api.ts` | Axios instance with JWT interceptor, error handling |
| `src/lib/queryClient.ts` | TanStack Query client configuration |
| `src/lib/utils.ts` | Utility functions (cn for className merging) |
| `vite.config.ts` | Vite configuration, path aliases (@/ → src/) |
| `tailwind.config.js` | Tailwind theme, colors, plugins |

## Docker Configuration

```
docker/
├── nginx/
│   └── nginx.conf           # Nginx reverse proxy configuration
```

## Documentation Structure

```
docs/
├── architecture/            # Architecture documentation (sharded)
│   ├── table-of-contents.md
│   ├── index.md
│   ├── 1-system-overview-architecture-diagram.md
│   ├── 2-database-schema-design.md
│   ├── 3-api-architecture.md
│   ├── 4-dream-central-storage-integration.md
│   ├── 5-frontend-architecture.md
│   ├── 6-activity-player-architecture.md
│   ├── 7-analytics-engine.md
│   ├── 8-deployment-architecture.md
│   ├── 9-security-architecture.md
│   ├── 10-testing-strategy.md
│   ├── 11-scalability-considerations.md
│   ├── 12-monitoring-logging.md
│   ├── 13-implementation-priorities.md
│   ├── tech-stack.md        # Technology choices and versions
│   ├── coding-standards.md  # Code conventions and patterns
│   ├── source-tree.md       # This file
│   ├── testing-strategy.md  # Testing approach
│   └── conclusion.md
│
├── prd.md                   # Product Requirements Document (master)
├── prd/                     # PRD shards
│   └── ...
│
├── stories/                 # User stories and feature specifications
│   ├── 1.1.story.md
│   ├── 1.2.story.md
│   └── 1.3.story.md
│
└── qa/                      # Quality assurance documentation
    └── gates/               # Gate documents for releases
```

## Configuration Files

### BMAD Framework

```
.bmad-core/                  # BMAD agent framework
├── core-config.yaml         # Project configuration
├── agents/                  # Agent definitions
├── tasks/                   # Reusable tasks
├── templates/               # Document templates
└── checklists/              # Validation checklists
```

### Claude Code

```
.claude/                     # Claude Code configuration
└── commands/                # Custom slash commands
```

### GitHub

```
.github/
├── workflows/               # CI/CD workflows
│   ├── backend-tests.yml    # Backend test automation
│   └── frontend-tests.yml   # Frontend test automation
└── ISSUE_TEMPLATE/          # Issue templates
```

## Important Paths for Development

### Backend Development

| Path | Purpose |
|------|---------|
| `backend/app/routers/` | Add new API endpoints here |
| `backend/app/services/` | Add business logic here |
| `backend/app/models/` | Define database tables here |
| `backend/app/schemas/` | Define API request/response schemas |
| `backend/alembic/versions/` | Database migration files |
| `backend/tests/` | Add tests for backend functionality |

### Frontend Development

| Path | Purpose |
|------|---------|
| `frontend/src/pages/` | Add new page components |
| `frontend/src/features/*/components/` | Add feature-specific components |
| `frontend/src/components/` | Add shared/reusable components |
| `frontend/src/services/` | Add API client functions |
| `frontend/src/hooks/` | Add custom React hooks |
| `frontend/src/stores/` | Add Zustand stores for client state |

## Environment Files

Both backend and frontend use `.env` files for configuration:

```bash
# Backend (.env)
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dreamlms
SECRET_KEY=your-secret-key
MINIO_ENDPOINT=storage.example.com
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

**Never commit `.env` files to git!** Use `.env.example` as templates.

## Build Artifacts (gitignored)

```
backend/.venv/               # Python virtual environment
backend/__pycache__/         # Python bytecode cache
backend/.pytest_cache/       # pytest cache

frontend/node_modules/       # npm dependencies
frontend/dist/               # Production build
frontend/.vite/              # Vite cache
```

## Navigation Tips

- **Finding a feature**: Check `frontend/src/features/{feature-name}/`
- **Finding an API endpoint**: Check `backend/app/routers/{domain}.py`
- **Finding business logic**: Check `backend/app/services/{domain}_service.py`
- **Finding a database table**: Check `backend/app/models/{domain}.py`
- **Finding tests**: Check `backend/tests/test_{feature}.py` or `frontend/src/test/`

---

**Last Updated**: 2025-10-24
**Version**: 1.0
**Maintained by**: Development Team
