# Technology Stack

**Dream LMS Technology Stack Reference**
**Last Updated:** 2025-10-26
**Architecture Version:** v4

---

## Backend Stack

| Technology | Version | Purpose | Notes |
|-----------|---------|---------|-------|
| **Python** | 3.11+ | Backend language | Modern Python with performance improvements |
| **FastAPI** | 0.110+ | Web framework | Async framework with automatic OpenAPI docs |
| **Uvicorn** | Latest | ASGI server | High-performance async server |
| **Gunicorn** | Latest | Process manager | Multi-worker orchestration |
| **SQLModel** | Latest | ORM | Combines SQLAlchemy 2.0 + Pydantic |
| **Alembic** | Latest | Database migrations | Schema version control |
| **Pydantic** | 2.x | Data validation | Built into FastAPI |
| **python-jose** | Latest | JWT handling | Token generation/validation |
| **passlib** | Latest | Password hashing | bcrypt with cost factor 12 |
| **httpx** | Latest | Async HTTP client | For external API calls |
| **PostgreSQL** | 15+ | Primary database | ACID transactions, JSONB support |
| **asyncpg** | Latest | Postgres driver | Async PostgreSQL driver |

---

## Frontend Stack

| Technology | Version | Purpose | Notes |
|-----------|---------|---------|-------|
| **React** | 18.x | UI library | Concurrent features support |
| **Vite** | 5.x | Build tool | Fast dev server and builds |
| **TypeScript** | 5.x | Type safety | Full type coverage required |
| **Tailwind CSS** | 3.x | Styling | Utility-first CSS framework |
| **Shadcn UI** | Latest | Component library | Radix UI primitives + Tailwind |
| **TanStack Query** | 5.x | Server state | API caching and synchronization |
| **Zustand** | 4.x | Client state | Lightweight state management |
| **React Hook Form** | 7.x | Form handling | Performant form validation |
| **Zod** | 3.x | Schema validation | Type-safe validation library |
| **Recharts** | 2.x | Data visualization | Charts for analytics dashboards |
| **Playwright** | Latest | E2E testing | Browser automation testing |

---

## Infrastructure & DevOps

| Technology | Version | Purpose | Notes |
|-----------|---------|---------|-------|
| **Docker** | 24.x | Containerization | Multi-stage builds for prod |
| **Docker Compose** | 2.x | Local orchestration | Development environment |
| **Traefik** | Latest | Reverse proxy | Auto-HTTPS with Let's Encrypt |
| **Redis** | 7.x | Caching (optional) | Session storage, token blacklist |

---

## Testing & Quality

| Technology | Version | Purpose | Notes |
|-----------|---------|---------|-------|
| **Pytest** | Latest | Backend testing | Async test support |
| **Vitest** | Latest | Frontend unit tests | Fast Vite-native testing |
| **React Testing Library** | Latest | Component tests | User-centric testing |
| **Playwright** | Latest | E2E testing | Cross-browser automation |

---

## External Services

| Service | Purpose | Protocol |
|---------|---------|----------|
| **Dream Central Storage** | Book assets, materials | MinIO S3-compatible API |

---

## Template Source

Dream LMS is built on the **official FastAPI Full-Stack Template**:
https://github.com/fastapi/full-stack-fastapi-template

**What We Keep:**
- ✅ FastAPI + SQLModel backend structure
- ✅ JWT authentication system
- ✅ Alembic migrations
- ✅ Pytest testing framework
- ✅ Docker Compose orchestration
- ✅ React 18 + TypeScript frontend
- ✅ TanStack Query/Router

**What We Replace:**
- 🔄 Chakra UI → Shadcn UI + Tailwind CSS
- 🔄 Simple User model → 4-role RBAC system
- 🔄 Minimal schema → 20+ table LMS domain

**What We Remove:**
- ❌ Copier template system
- ❌ Items demo feature
- ❌ Default Chakra UI theme

---

## Package Management

**Backend:** `pip` with `requirements.txt`
**Frontend:** `npm` with `package.json`

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Monolithic backend** | Reduces complexity, faster MVP development |
| **Async FastAPI** | High concurrency with async/await |
| **PostgreSQL** | ACID transactions, JSONB for flexible data |
| **Monorepo structure** | Atomic commits, shared tooling |
| **Docker Compose** | Simple MVP orchestration |

---

**Reference:** See `docs/architecture/1-system-overview-architecture-diagram.md` for detailed architecture discussion.
