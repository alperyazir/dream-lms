# Implementation Foundation

## FastAPI Full-Stack Template Foundation

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

## What We Need to Build on Top of Template

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

## Development Workflow

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
