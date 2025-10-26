# Dream LMS Development Guide

**Project:** Dream LMS
**Document Version:** 1.0
**Last Updated:** 2025-10-26
**Purpose:** Complete developer onboarding and workflow reference

---

## Table of Contents

1. [Fresh Environment Setup](#1-fresh-environment-setup)
2. [Development Workflow & Story-Based Branching](#2-development-workflow--story-based-branching)
3. [Testing Scripts & Strategy](#3-testing-scripts--strategy)
4. [Postman Collection Management](#4-postman-collection-management)
5. [Branching Strategy & Pre-Merge Checklist](#5-branching-strategy--pre-merge-checklist)
6. [Template Customization Guide](#6-template-customization-guide)

---

## 1. Fresh Environment Setup

### Prerequisites

Before running the setup script, ensure you have:

- **Docker Desktop** 24.x+ (with Docker Compose v2)
- **Node.js** 18+ and npm 9+
- **Python** 3.11+
- **Git** 2.x+
- **PostgreSQL client tools** (optional, for manual DB access)

### Setup Script: `setup-fresh.sh`

This script sets up a complete Dream LMS development environment from scratch.

**Location:** `/scripts/setup-fresh.sh`

```bash
#!/bin/bash
set -e  # Exit on any error

echo "🚀 Dream LMS Fresh Environment Setup"
echo "======================================"

# Step 1: Clone repository (if not already cloned)
if [ ! -d ".git" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

echo "✅ Repository found"

# Step 2: Copy environment files
echo ""
echo "📝 Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file (please configure with your values)"
else
    echo "⚠️  .env already exists, skipping"
fi

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
fi

if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
fi

# Step 3: Backend setup
echo ""
echo "🐍 Setting up Python backend..."
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Created Python virtual environment"
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Installed backend dependencies"

cd ..

# Step 4: Frontend setup
echo ""
echo "⚛️  Setting up React frontend..."
cd frontend

# Install dependencies
npm install
echo "✅ Installed frontend dependencies"

cd ..

# Step 5: Docker setup
echo ""
echo "🐳 Starting Docker services..."
docker-compose down --volumes  # Clean any existing containers
docker-compose up -d db redis traefik

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Step 6: Database migrations
echo ""
echo "🗄️  Running database migrations..."
cd backend
source venv/bin/activate
alembic upgrade head
echo "✅ Database migrations applied"

# Optional: Seed database
read -p "🌱 Do you want to seed the database with test data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python scripts/seed_database.py
    echo "✅ Database seeded"
fi

cd ..

# Step 7: Verify setup
echo ""
echo "🔍 Verifying setup..."

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Docker containers running"
else
    echo "❌ Error: Docker containers not running"
    exit 1
fi

# Step 8: Display next steps
echo ""
echo "✅ Setup complete!"
echo ""
echo "📌 Next Steps:"
echo "   1. Configure .env files with your settings (API keys, etc.)"
echo "   2. Start backend: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "   3. Start frontend: cd frontend && npm run dev"
echo "   4. Access app: http://localhost:5173"
echo "   5. Access API docs: http://localhost:8000/docs"
echo "   6. Access Traefik dashboard: http://localhost:8080"
echo ""
echo "📚 See docs/development-guide.md for development workflow"
```

**Make script executable:**
```bash
chmod +x scripts/setup-fresh.sh
```

**Usage:**
```bash
# From project root
./scripts/setup-fresh.sh
```

### Manual Setup (Alternative)

If the script fails or you prefer manual setup:

**1. Environment Variables:**
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit each .env file with your settings
```

**2. Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
```

**3. Frontend:**
```bash
cd frontend
npm install
```

**4. Docker:**
```bash
docker-compose up -d db redis traefik
```

**5. Start Services:**
```bash
# Terminal 1: Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## 2. Development Workflow & Story-Based Branching

### Story-Based Development

Dream LMS follows a **story-based Git workflow** where each user story gets its own feature branch. This ensures:
- Atomic, reviewable changes
- Clear progress tracking
- Easy rollback if needed
- Prevents merge conflicts

### Workflow Steps

#### 1. Pick a Story from PRD

Stories are documented in `/docs/prd.md` under each Epic. Example:

```
Epic 3: Book Integration & Assignment Management
  Story 3.1: Sync books from Dream Central Storage
  Story 3.2: Display book catalog to teachers
  Story 3.3: Create assignment from book activity
```

#### 2. Create Feature Branch

**Branch naming convention:**
```
feature/story-<epic>.<story>-<short-description>

Examples:
- feature/story-3.1-sync-books
- feature/story-3.2-book-catalog
- feature/story-4.5-word-search-player
```

**Create branch:**
```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create and switch to feature branch
git checkout -b feature/story-3.1-sync-books
```

#### 3. Branch Conflict Warning

**🚨 Pre-Branch Check:**

Before creating a new feature branch, the system should warn you if the previous story branch hasn't been merged yet:

**Check script:** `scripts/check-unmerged-branches.sh`

```bash
#!/bin/bash

# Get current epic number from branch name or prompt
CURRENT_EPIC=$1

if [ -z "$CURRENT_EPIC" ]; then
    read -p "Which epic are you working on? (e.g., 3): " CURRENT_EPIC
fi

# Find unmerged branches for this epic
UNMERGED=$(git branch --no-merged main | grep "feature/story-${CURRENT_EPIC}\.")

if [ -n "$UNMERGED" ]; then
    echo "⚠️  WARNING: Unmerged branches detected for Epic ${CURRENT_EPIC}:"
    echo "$UNMERGED"
    echo ""
    read -p "Do you want to continue creating a new branch? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
```

**Usage:**
```bash
./scripts/check-unmerged-branches.sh 3
```

#### 4. Develop the Story

**Frontend-First Approach:**

1. **Build UI with Dummy Data:**
   ```bash
   cd frontend
   npm run dev
   ```
   - Create components with mock data
   - Implement routing and navigation
   - Style with Shadcn UI (use MCP for rapid scaffolding)
   - Test user interactions

2. **Connect to Backend:**
   - Implement API service functions
   - Replace mock data with TanStack Query hooks
   - Handle loading and error states

**Commit Frequently:**
```bash
git add .
git commit -m "feat(story-3.1): add book sync endpoint"
git commit -m "feat(story-3.1): implement book catalog UI"
git commit -m "test(story-3.1): add book sync tests"
```

**Commit message format:**
```
<type>(<scope>): <description>

Types:
- feat: New feature
- fix: Bug fix
- refactor: Code refactoring
- test: Adding tests
- docs: Documentation
- style: Formatting, no code change
- chore: Maintenance tasks

Examples:
- feat(story-3.1): sync books from Dream Central Storage
- fix(story-4.2): correct drag-drop scoring logic
- test(assignments): add integration tests for assignment creation
```

#### 5. Testing

Before pushing, ensure:
```bash
# Run all tests
./scripts/run-all-tests.sh

# Or run individually
./scripts/test-backend.sh
./scripts/test-frontend.sh
```

#### 6. Push and Create PR

```bash
# Push branch to origin
git push -u origin feature/story-3.1-sync-books

# Create PR via GitHub CLI (optional)
gh pr create --title "Story 3.1: Sync books from Dream Central Storage" \
             --body "Implements book catalog sync from Dream Central Storage API"
```

**PR Template** (`.github/pull_request_template.md`):

```markdown
## Story Reference

Story: [Epic X.Y - Story Title](link to PRD section)

## Changes

- Added book sync endpoint (`POST /api/v1/admin/books/sync`)
- Implemented MinIO client for Dream Central Storage
- Created book catalog UI component
- Added tests for sync functionality

## Testing

- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manually tested UI flows
- [ ] Postman collection updated

## Screenshots

(If UI changes, add screenshots)

## Checklist

- [ ] Code follows project style guide
- [ ] Tests added/updated
- [ ] Documentation updated (if needed)
- [ ] No merge conflicts with main
- [ ] PR title follows convention
```

---

## 3. Testing Scripts & Strategy

### Testing Overview

Dream LMS uses a comprehensive testing strategy:

**Backend (pytest):**
- Unit tests for service layer
- Integration tests for API endpoints
- Database tests with fixtures

**Frontend (Vitest + Playwright):**
- Unit tests for utility functions
- Component tests with React Testing Library
- E2E tests with Playwright

### Testing Scripts

#### Master Test Script: `run-all-tests.sh`

Runs all tests sequentially in the correct order.

**Location:** `/scripts/run-all-tests.sh`

```bash
#!/bin/bash
set -e

echo "🧪 Dream LMS Test Suite"
echo "======================="
echo ""

# Track failures
FAILURES=0

# 1. Backend Unit Tests
echo "1️⃣  Running Backend Unit Tests..."
echo "-----------------------------------"
./scripts/test-backend.sh
if [ $? -ne 0 ]; then
    FAILURES=$((FAILURES + 1))
    echo "❌ Backend tests failed"
else
    echo "✅ Backend tests passed"
fi
echo ""

# 2. Frontend Unit Tests
echo "2️⃣  Running Frontend Unit Tests..."
echo "-----------------------------------"
./scripts/test-frontend.sh
if [ $? -ne 0 ]; then
    FAILURES=$((FAILURES + 1))
    echo "❌ Frontend tests failed"
else
    echo "✅ Frontend tests passed"
fi
echo ""

# 3. E2E Tests (Optional)
read -p "Run E2E tests? (slower, requires services running) (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "3️⃣  Running E2E Tests..."
    echo "-----------------------------------"
    cd frontend
    npm run test:e2e
    if [ $? -ne 0 ]; then
        FAILURES=$((FAILURES + 1))
        echo "❌ E2E tests failed"
    else
        echo "✅ E2E tests passed"
    fi
    cd ..
    echo ""
fi

# Summary
echo "📊 Test Summary"
echo "==============="
if [ $FAILURES -eq 0 ]; then
    echo "✅ All tests passed!"
    exit 0
else
    echo "❌ $FAILURES test suite(s) failed"
    exit 1
fi
```

#### Backend Test Script: `test-backend.sh`

**Location:** `/scripts/test-backend.sh`

```bash
#!/bin/bash
set -e

cd backend

# Activate virtual environment
source venv/bin/activate

# Run pytest with coverage
echo "Running backend tests with coverage..."
pytest tests/ \
    --cov=app \
    --cov-report=term-missing \
    --cov-report=html \
    --cov-fail-under=80 \
    -v

echo ""
echo "Coverage report generated: backend/htmlcov/index.html"
```

#### Frontend Test Script: `test-frontend.sh`

**Location:** `/scripts/test-frontend.sh`

```bash
#!/bin/bash
set -e

cd frontend

# Run Vitest unit tests
echo "Running frontend unit tests..."
npm run test:unit

# Run component tests
echo "Running frontend component tests..."
npm run test:components

echo ""
echo "✅ Frontend tests complete"
```

### Test Organization

**Backend Tests (`backend/tests/`):**
```
tests/
├── conftest.py              # Pytest fixtures
├── test_auth.py             # Authentication tests
├── test_users.py            # User management tests
├── test_assignments.py      # Assignment CRUD tests
├── test_activities.py       # Activity player tests
├── test_analytics.py        # Analytics calculation tests
└── integration/
    ├── test_api_assignments.py
    └── test_api_books.py
```

**Frontend Tests (`frontend/src/`):**
```
src/
├── __tests__/
│   ├── utils.test.ts        # Utility function tests
│   └── scoring.test.ts      # Scoring algorithm tests
├── components/
│   └── __tests__/
│       ├── Button.test.tsx
│       └── AssignmentCard.test.tsx
└── e2e/
    ├── login.spec.ts
    ├── assignment-creation.spec.ts
    └── activity-completion.spec.ts
```

### Running Specific Tests

```bash
# Backend: Specific test file
cd backend && pytest tests/test_assignments.py -v

# Backend: Specific test function
cd backend && pytest tests/test_assignments.py::test_create_assignment -v

# Frontend: Specific test
cd frontend && npm run test -- src/components/__tests__/Button.test.tsx

# Frontend: Watch mode (re-run on changes)
cd frontend && npm run test:watch
```

---

## 4. Postman Collection Management

### Overview

The Postman collection (`postman_collection.json`) provides a comprehensive set of API requests for manual testing and debugging.

**Location:** `/postman_collection.json`

### Collection Structure

```
Dream LMS API
├── Authentication
│   ├── Login (POST /api/v1/auth/login)
│   ├── Refresh Token (POST /api/v1/auth/refresh)
│   └── Logout (POST /api/v1/auth/logout)
├── Admin
│   ├── List Users (GET /api/v1/admin/users)
│   ├── Create Publisher (POST /api/v1/admin/publishers)
│   └── Bulk Import Users (POST /api/v1/admin/bulk-import)
├── Publishers
│   ├── My Schools (GET /api/v1/publishers/me/schools)
│   └── Create Teacher (POST /api/v1/publishers/me/teachers)
├── Teachers
│   ├── Create Assignment (POST /api/v1/assignments)
│   ├── List Assignments (GET /api/v1/assignments)
│   └── View Results (GET /api/v1/assignments/:id/results)
├── Students
│   ├── My Assignments (GET /api/v1/students/me/assignments)
│   ├── Start Assignment (GET /api/v1/assignments/:id/start)
│   └── Submit Assignment (POST /api/v1/assignments/:id/submit)
└── Books
    ├── List Books (GET /api/v1/books)
    ├── Book Details (GET /api/v1/books/:id)
    └── Sync Books (POST /api/v1/admin/books/sync)
```

### Environment Variables

**Postman Environments:**

Create separate environments for:
- **Local Development** (`localhost:8000`)
- **Staging** (if applicable)
- **Production** (with extra caution)

**Variables:**
```json
{
  "base_url": "http://localhost:8000",
  "access_token": "",
  "refresh_token": "",
  "admin_email": "admin@dreamlms.com",
  "teacher_id": "",
  "student_id": ""
}
```

### Update Workflow

**When adding a new API endpoint:**

1. **Implement endpoint in backend**
2. **Add request to Postman collection:**
   - Create new request in appropriate folder
   - Set method and URL with variables (`{{base_url}}/api/v1/...`)
   - Add request body example (JSON)
   - Add authentication header (if needed): `Authorization: Bearer {{access_token}}`
   - Document in request description

3. **Export collection:**
   ```
   Postman → Collections → Dream LMS API → ... → Export → Collection v2.1
   Save as: postman_collection.json
   ```

4. **Commit to repository:**
   ```bash
   git add postman_collection.json
   git commit -m "chore: update Postman collection with new endpoint"
   ```

### Pre-Request Scripts

**Auto-refresh token script** (Collection level):

```javascript
// Auto-refresh if token expired
const accessToken = pm.environment.get("access_token");
const tokenExpiry = pm.environment.get("token_expiry");

if (!accessToken || (tokenExpiry && Date.now() > tokenExpiry)) {
    const refreshToken = pm.environment.get("refresh_token");

    pm.sendRequest({
        url: pm.environment.get("base_url") + "/api/v1/auth/refresh",
        method: "POST",
        header: {
            "Content-Type": "application/json"
        },
        body: {
            mode: "raw",
            raw: JSON.stringify({ refresh_token: refreshToken })
        }
    }, (err, res) => {
        if (!err) {
            const json = res.json();
            pm.environment.set("access_token", json.access_token);
            pm.environment.set("token_expiry", Date.now() + (json.expires_in * 1000));
        }
    });
}
```

---

## 5. Branching Strategy & Pre-Merge Checklist

### Git Branching Model

```
main
  └── feature/story-3.1-sync-books
  └── feature/story-3.2-book-catalog
  └── hotfix/critical-auth-bug
```

**Branch Types:**

| Type | Naming | Purpose | Base | Merge To |
|------|--------|---------|------|----------|
| `feature/story-X.Y-*` | Story implementation | New features | `main` | `main` |
| `hotfix/*` | Critical bug fixes | Production bugs | `main` | `main` |
| `refactor/*` | Code refactoring | No behavior change | `main` | `main` |
| `docs/*` | Documentation updates | Docs only | `main` | `main` |

### Pre-Merge Checklist

Before merging any feature branch to `main`, ensure:

#### ✅ Code Quality

- [ ] Code follows project style guide (Black, ESLint, Prettier)
- [ ] No commented-out code or debug prints
- [ ] No hardcoded credentials or secrets
- [ ] Meaningful variable and function names
- [ ] Complex logic has comments explaining "why"

#### ✅ Testing

- [ ] All backend unit tests pass (`./scripts/test-backend.sh`)
- [ ] All frontend unit tests pass (`./scripts/test-frontend.sh`)
- [ ] New code has test coverage (aim for 80%+)
- [ ] Manual testing performed on affected features
- [ ] No regressions in existing functionality

#### ✅ Documentation

- [ ] API changes documented in OpenAPI/Swagger
- [ ] README updated (if setup process changed)
- [ ] Postman collection updated with new endpoints
- [ ] Story marked as complete in PRD (if applicable)

#### ✅ Git Hygiene

- [ ] No merge conflicts with `main`
- [ ] Commit messages follow convention
- [ ] Branch is up to date with `main`: `git rebase main`
- [ ] Squash commits if needed (multiple WIP commits → 1-3 logical commits)

#### ✅ Security & Performance

- [ ] No SQL injection vulnerabilities (use SQLModel parameterized queries)
- [ ] No XSS vulnerabilities (React handles this, but check manual HTML)
- [ ] Sensitive data not logged
- [ ] Database queries optimized (indexes, no N+1 queries)
- [ ] API responses fast (< 200ms for standard queries)

#### ✅ Deployment Readiness

- [ ] Environment variables documented in `.env.example`
- [ ] Database migrations created (if schema changed)
- [ ] Docker build succeeds: `docker-compose build`
- [ ] Docker services start: `docker-compose up`

### Merge Process

**Option 1: Squash and Merge (Preferred for Stories)**

```bash
# Update feature branch with latest main
git checkout feature/story-3.1-sync-books
git fetch origin
git rebase origin/main

# Push updated branch
git push --force-with-lease

# Merge via GitHub PR
# Select "Squash and merge" to create single commit on main
```

**Option 2: Regular Merge (For Multi-Developer Branches)**

```bash
git checkout main
git pull origin main
git merge --no-ff feature/story-3.1-sync-books
git push origin main
```

**After Merge:**

```bash
# Delete local branch
git branch -d feature/story-3.1-sync-books

# Delete remote branch
git push origin --delete feature/story-3.1-sync-books
```

---

## 6. Template Customization Guide

### Initial Template Setup

The FastAPI Full-Stack Template was cloned and customized for Dream LMS. This guide documents the customization process for reference and future projects.

### Step 1: Clone Template

```bash
git clone https://github.com/fastapi/full-stack-fastapi-template.git dream-lms
cd dream-lms
```

### Step 2: Remove Copier System

The template uses Copier for project generation. After initial setup, remove it:

**Files to remove:**
```bash
rm -rf .copier-answers.yml
rm -rf copier.yml
```

**Why:** Copier is for initial project generation. Once set up, it adds unnecessary complexity.

### Step 3: Remove Demo Features

The template includes demo "items" CRUD feature. Remove it:

**Backend:**
```bash
rm backend/app/api/routes/items.py
rm backend/app/models/item.py
rm backend/app/schemas/item.py
# Remove items routes from backend/app/api/main.py
```

**Frontend:**
```bash
rm -rf frontend/src/components/Items
# Remove items routes from frontend/src/router.tsx
```

**Database:**
```bash
# Create migration to drop items table
alembic revision -m "remove_items_table"
# Edit migration file to drop table
alembic upgrade head
```

### Step 4: Replace Chakra UI with Shadcn UI

**Remove Chakra:**
```bash
cd frontend
npm uninstall @chakra-ui/react @emotion/react @emotion/styled framer-motion
```

**Install Shadcn:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install Shadcn CLI
npx shadcn-ui@latest init
```

**Configure Tailwind** (`tailwind.config.ts`):
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dream LMS color system
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          // ... full palette
        },
      },
      boxShadow: {
        // Neumorphic shadows
        'neuro-sm': '3px 3px 6px rgba(203, 213, 225, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.9)',
        'neuro': '6px 6px 12px rgba(203, 213, 225, 0.5), -6px -6px 12px rgba(255, 255, 255, 1)',
        // ... more shadows
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

**Migrate Components:** Replace Chakra components one page at a time, starting with login page.

### Step 5: Extend User Model for 4-Role System

**Backend Database Schema:**

The template has a simple `User` model. Extend it:

**Create new models** (`backend/app/models/`):
```python
# models/user.py (extend existing)
from sqlmodel import Field, Relationship, SQLModel
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    publisher = "publisher"
    teacher = "teacher"
    student = "student"

class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    role: UserRole
    is_active: bool = True
    # Relationships
    publisher: Optional["Publisher"] = Relationship(back_populates="user")
    teacher: Optional["Teacher"] = Relationship(back_populates="user")
    student: Optional["Student"] = Relationship(back_populates="user")
```

**Create role-specific models:**
```python
# models/publisher.py
class Publisher(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", unique=True)
    name: str
    contact_email: str | None = None
    # Relationships
    user: User = Relationship(back_populates="publisher")
    schools: list["School"] = Relationship(back_populates="publisher")
```

Repeat for `Teacher` and `Student` models (see `architecture.md` for full schema).

**Create Alembic migration:**
```bash
cd backend
alembic revision --autogenerate -m "add_4_role_system"
alembic upgrade head
```

### Step 6: Update Docker Compose for Traefik

The template may use Nginx. Update to Traefik:

**docker-compose.yml:**
```yaml
services:
  traefik:
    image: traefik:v2.10
    ports:
      - "80:80"
      - "443:443"
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt

  frontend:
    build: ./frontend
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"

  backend:
    build: ./backend
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`yourdomain.com`) && PathPrefix(`/api`, `/docs`)"
      - "traefik.http.routers.backend.entrypoints=websecure"
      - "traefik.http.routers.backend.tls.certresolver=letsencrypt"
```

### Step 7: Add LMS-Specific Tables

Add remaining 15+ tables (books, activities, assignments, etc.) via Alembic migrations. See `docs/architecture.md` Section 2 for complete schema.

```bash
alembic revision -m "add_books_activities_tables"
# Edit migration file to create tables
alembic upgrade head
```

### Step 8: Configure Shadcn MCP (Development)

Install Shadcn MCP server for rapid component generation during development:

**Claude Desktop Config** (`~/.config/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-shadcn"]
    }
  }
}
```

**Usage:** During development, ask Claude to generate Shadcn components via MCP.

---

## Summary

This development guide provides everything a new developer needs to:

1. ✅ Set up a fresh Dream LMS environment
2. ✅ Follow the story-based development workflow
3. ✅ Run comprehensive tests before merging
4. ✅ Maintain the Postman API collection
5. ✅ Adhere to branching strategy and merge checklist
6. ✅ Understand template customizations made

**Key Principles:**

- **Frontend-first development** with dummy data
- **Story-based branching** for clear progress tracking
- **Comprehensive testing** before every merge
- **Living documentation** via Postman collection
- **Shadcn MCP** for rapid component generation

For questions or issues, refer to:
- `/docs/prd.md` - Product requirements and stories
- `/docs/architecture.md` - Technical architecture
- `/docs/front-end-spec.md` - Frontend design system
- `/README.md` - Quick start guide

---

**Document Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-26 | Initial comprehensive guide |

