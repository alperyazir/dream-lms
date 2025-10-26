# Dream LMS - Local Development Setup

This guide helps you run **backend and frontend locally** (native Python/Node) while using Docker only for database and supporting services.

## Prerequisites

- **Python 3.11+** installed
- **Node.js 18+** and npm installed
- **Docker and Docker Compose** (for PostgreSQL, Adminer, Mailcatcher)
- **Git** installed

---

## Step 1: Start Supporting Services with Docker

We'll use Docker Compose to run only the database and helper services:

```bash
# From project root
docker compose up -d db adminer mailcatcher
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **Adminer** (DB admin UI) on `http://localhost:8080`
- **Mailcatcher** (email testing) on `http://localhost:1080`

Verify database is running:
```bash
docker compose ps
# Should show 'db' as healthy
```

---

## Step 2: Setup Backend (Python/FastAPI)

### 2.1 Install Python Dependencies

```bash
cd backend

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies using uv (recommended) or pip
# Option A: Using uv (faster)
pip install uv
uv pip install -e .
uv pip install pytest pytest-asyncio httpx coverage
pip install "fastapi[standard]>=0.114.2"  # Ensure standard extras are installed

# Option B: Using pip
pip install -e .
pip install pytest pytest-asyncio httpx coverage
pip install "fastapi[standard]>=0.114.2"  # Ensure standard extras are installed
```

### 2.2 Run Database Migrations

```bash

# Run migrations to create tables
alembic upgrade head

# You should see:
# INFO  [alembic.runtime.migration] Running upgrade  -> e2412789c190, Initialize models
# INFO  [alembic.runtime.migration] Running upgrade e2412789c190 -> d98dd8ec85a3, edit replace id integers...
# ... (more migrations)
# INFO  [alembic.runtime.migration] Running upgrade 1a31ce608336 -> 2c0159a5ffb6, remove_items_add_user_role

cd ..
```

### 2.3 Create Initial Admin User

```bash
# From backend/ directory
python -m app.initial_data

# You should see:
# INFO:app.initial_data:Creating initial data
# INFO:app.initial_data:Initial data created
```

This creates an admin user:
- **Email:** `admin@example.com`
- **Password:** `changethis`
- **Role:** `admin`

### 2.4 Start Backend Server

```bash
# From backend/ directory with venv activated

# Option A: Using fastapi CLI (recommended)
fastapi dev app/main.py

# Option B: Using uvicorn directly (if fastapi command doesn't work)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend is now running on **http://localhost:8000**

Test it:
```bash
curl http://localhost:8000/api/v1/utils/health-check/
# Expected: {"message":"ok"}
```

Access API docs: **http://localhost:8000/docs**

---

## Step 3: Setup Frontend (React/Vite)

Open a **new terminal window** (keep backend running):

### 3.1 Install Node Dependencies

```bash
cd frontend

# Install dependencies
npm install
```

### 3.2 Configure API URL

Create/update `.env.local` file:

```bash
# frontend/.env.local
VITE_API_URL=http://localhost:8000
```

### 3.3 Start Frontend Dev Server

```bash
# From frontend/ directory
npm run dev
```

Frontend is now running on **http://localhost:5173**

---

## Step 4: Validate Story 1.1 (RBAC Implementation)

### Option A: Automated Validation Script

```bash
# From project root
chmod +x validate_story_1.1.sh
./validate_story_1.1.sh
```

### Option B: Manual Testing

**1. Test Admin Login**
```bash
curl -X POST http://localhost:8000/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@example.com&password=changethis"
```

Save the `access_token` from response.

**2. Verify Token Contains Role**
```bash
TOKEN="<paste_your_token_here>"

# Test token endpoint
curl http://localhost:8000/api/v1/login/test-token \
  -H "Authorization: Bearer $TOKEN"
```

Expected response includes `"role": "admin"`

**3. Test Admin Access**
```bash
curl http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer $TOKEN"
```

Should return user list (200 OK)

**4. Create Student User**
```bash
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "studentpass123",
    "full_name": "Test Student",
    "role": "student"
  }'
```

**5. Login as Student**
```bash
curl -X POST http://localhost:8000/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=student@example.com&password=studentpass123"
```

**6. Test Student Access (Should Fail)**
```bash
STUDENT_TOKEN="<paste_student_token_here>"

curl http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

Expected: `403 Forbidden` ✅

---

## Step 5: Run Tests

### Backend Tests

```bash
cd backend

# Activate venv if not already
source .venv/bin/activate

# Run all tests
pytest app/tests/ -v

# Run with coverage
pytest app/tests/ --cov=app --cov-report=html

# View coverage report
open htmlcov/index.html
```

### Frontend Tests (if available)

```bash
cd frontend

# Run unit tests
npm run test

# Run E2E tests (requires backend running)
npm run test:e2e
```

---

## Access Points Summary

| Service | URL | Credentials |
|---------|-----|-------------|
| **Backend API** | http://localhost:8000 | - |
| **API Docs** | http://localhost:8000/docs | - |
| **Frontend** | http://localhost:5173 | Login with admin user |
| **Adminer (DB)** | http://localhost:8080 | Server: `db`<br>User: `postgres`<br>Password: `changethis`<br>Database: `app` |
| **Mailcatcher** | http://localhost:1080 | - |

**Default Admin User:**
- Email: `admin@example.com`
- Password: `changethis`
- Role: `admin`

---

## Database Management

### View Database Schema

```bash
# Connect to database
docker compose exec db psql -U postgres -d app

# In psql:
\d user              # Show user table structure
SELECT * FROM "user"; # View all users
\q                   # Quit
```

### Reset Database

```bash
# Stop backend first (Ctrl+C)

# Drop and recreate database
docker compose down db
docker compose up -d db

# Wait for DB to be ready, then re-run migrations
cd backend
source .venv/bin/activate
alembic upgrade head
python -m app.initial_data
```

### Create Additional Test Users

```bash
# Use the API (need admin token first)
TOKEN="<admin_token>"

# Create Publisher
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "publisher@example.com",
    "password": "publisherpass123",
    "full_name": "Test Publisher",
    "role": "publisher"
  }'

# Create Teacher
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "teacherpass123",
    "full_name": "Test Teacher",
    "role": "teacher"
  }'
```

---

## Troubleshooting

### Backend Issues

**"Module not found" errors:**
```bash
cd backend
source venv/bin/activate
pip install -e .
```

**"Connection refused" to database:**
```bash
# Check if database is running
docker compose ps

# Restart database
docker compose restart db

# Check .env has correct settings:
# POSTGRES_SERVER=localhost
# POSTGRES_PORT=5432
```

**Migration errors:**
```bash
cd backend/app
alembic current  # Check current migration
alembic history  # View migration history
alembic upgrade head  # Apply all migrations
```

### Frontend Issues

**"Cannot connect to API" errors:**
- Ensure backend is running on http://localhost:8000
- Check `frontend/.env.local` has `VITE_API_URL=http://localhost:8000`
- Restart frontend dev server after changing .env

**Port 5173 already in use:**
```bash
# Kill process using port
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 5174
```

### Database Issues

**Can't connect to Adminer:**
- Use server name: `db` (not `localhost`)
- Or use: `docker compose exec db psql -U postgres -d app`

---

## Development Workflow

### Typical Development Session

```bash
# Terminal 1: Start Docker services
docker compose up -d db adminer mailcatcher

# Terminal 2: Backend
cd backend
source .venv/bin/activate
fastapi dev app/main.py

# Terminal 3: Frontend
cd frontend
npm run dev

# Browse to http://localhost:5173
```

### Making Code Changes

**Backend changes:**
- FastAPI auto-reloads when you save Python files
- No need to restart server

**Frontend changes:**
- Vite auto-reloads on file save
- HMR (Hot Module Replacement) updates instantly

**Database schema changes:**
1. Modify models in `backend/app/models.py`
2. Create migration: `alembic revision --autogenerate -m "description"`
3. Review generated migration in `backend/app/alembic/versions/`
4. Apply: `alembic upgrade head`

---

## Next Steps

✅ **Story 1.1 Complete** - RBAC foundation in place

Ready for:
- **Story 1.2:** Role-specific tables (Publisher, Teacher, Student)
- **Story 1.3:** Class management
- **Story 2.x:** Frontend UI migration to Shadcn

---

## Quick Reference

```bash
# Start services
docker compose up -d db adminer mailcatcher

# Backend (in venv)
cd backend && source .venv/bin/activate
fastapi dev app/main.py

# Frontend
cd frontend && npm run dev

# Tests
cd backend && pytest app/tests/ -v

# Stop services
docker compose down

# View logs
docker compose logs -f db
```
