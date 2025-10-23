# Dream LMS - Learning Management System

**Version:** 0.1.0
**Status:** MVP Development

Dream LMS is a modern Learning Management System designed for interactive language learning with FlowBook integration, teacher management, and comprehensive analytics.

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## 🏗️ Architecture Overview

Dream LMS follows a **modern monorepo architecture** with:

- **Backend**: FastAPI (Python 3.11+) with async/await patterns
- **Frontend**: React 18 + Vite + TypeScript
- **Database**: PostgreSQL 15+ with SQLAlchemy 2.0 async ORM
- **Storage Integration**: Dream Central Storage (MinIO-based)
- **Deployment**: Docker Compose for local development

```
┌─────────────────────┐
│   React Frontend    │
│   (Vite + TS)       │
└──────────┬──────────┘
           │ HTTP/REST
           ▼
┌─────────────────────┐       ┌──────────────────┐
│   FastAPI Backend   │◄──────┤   PostgreSQL     │
│   (Python 3.11+)    │       │   Database       │
└──────────┬──────────┘       └──────────────────┘
           │
           ▼
┌─────────────────────┐
│ Dream Central       │
│ Storage (MinIO)     │
└─────────────────────┘
```

---

## 🛠️ Technology Stack

### Backend
- **Python 3.11+** - Modern async Python
- **FastAPI 0.110+** - High-performance web framework
- **SQLAlchemy 2.0+** - Async ORM
- **Pydantic 2.x** - Data validation
- **Alembic** - Database migrations
- **pytest + pytest-asyncio** - Testing framework

### Frontend
- **React 18.x** - UI library
- **Vite 5.x** - Build tool and dev server
- **TypeScript 5.x** - Type safety
- **Tailwind CSS 3.x** - Utility-first CSS
- **Shadcn UI** - Component library
- **TanStack Query 5.x** - Server state management
- **Zustand 4.x** - Client state management
- **Vitest** - Testing framework

### Infrastructure
- **Docker 24.x + Docker Compose 2.x**
- **PostgreSQL 15+**
- **Nginx 1.24+** (production)

---

## ✅ Prerequisites

Before you begin, ensure you have installed:

- **Docker** (24.x or higher) - [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** (2.x or higher) - Usually included with Docker Desktop
- **Git** - [Install Git](https://git-scm.com/downloads)

Optional (for local development without Docker):
- **Python 3.11+** - [Install Python](https://www.python.org/downloads/)
- **Node.js 20+** - [Install Node.js](https://nodejs.org/)

---

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dream-lms
   ```

2. **Create environment files**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the applications**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Database: localhost:5432

5. **Seed the admin user** (First time setup)
   ```bash
   cd backend
   python scripts/seed_admin.py
   ```

   **Admin Credentials:**
   - Email: `admin@dreamlms.com`
   - Password: `Admin123!`

   ⚠️ **Important:** Change the admin password after first login in production!

### Local Development (Without Docker)

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
dream-lms/
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── core/           # Configuration, security
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── db/             # Database utilities
│   ├── tests/              # Backend tests
│   ├── pyproject.toml      # Python dependencies
│   ├── Dockerfile          # Backend container
│   └── .env.example        # Environment variables template
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/        # Shadcn UI components
│   │   │   ├── layout/    # Layout components
│   │   │   ├── common/    # Shared components
│   │   │   └── forms/     # Form components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   ├── stores/        # Zustand stores
│   │   ├── lib/           # Utilities
│   │   └── types/         # TypeScript types
│   ├── tests/             # Frontend tests
│   ├── package.json       # Node dependencies
│   ├── Dockerfile         # Frontend container
│   └── .env.example       # Environment variables template
├── docs/                  # Project documentation
│   ├── prd/              # Product requirements
│   ├── architecture/     # Technical architecture
│   └── stories/          # User stories
├── docker-compose.yml    # Docker orchestration
└── README.md            # This file
```

---

## 🔧 Development

### Backend Development

**Run tests:**
```bash
cd backend
pytest
```

**Run linting:**
```bash
black --check .
flake8 app/ tests/
```

**Format code:**
```bash
black .
```

**Create database migration:**
```bash
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Frontend Development

**Run tests:**
```bash
cd frontend
npm run test
```

**Run linting:**
```bash
npm run lint
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

---

## 🧪 Testing

### Backend Tests

```bash
# Run all tests
cd backend
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_health.py
```

### Frontend Tests

```bash
# Run all tests
cd frontend
npm run test

# Run with UI
npm run test:ui

# Run once (CI mode)
npm run test:run
```

---

## 📚 Documentation

- **Product Requirements**: [docs/prd/](./docs/prd/)
- **Technical Architecture**: [docs/architecture/](./docs/architecture/)
- **User Stories**: [docs/stories/](./docs/stories/)
- **API Documentation**: http://localhost:8000/docs (when running)
- **Dream Central Storage Integration**: [docs/dream-central-storage-integration.md](./docs/dream-central-storage-integration.md)

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our development workflow, coding standards, and commit message format.

### Quick Guidelines

1. **Branch naming**: `feature/description`, `bugfix/description`
2. **Commit messages**: Follow conventional commits format
3. **Code style**: Black for Python, ESLint for TypeScript
4. **Tests**: All new features must include tests
5. **Documentation**: Update relevant docs with changes

---

## 📝 License

[Add your license here]

---

## 👥 Team

- **Product Owner**: Sarah
- **Scrum Master**: Bob
- **Developers**: James, Alex

---

## 🔗 Links

- **Project Repository**: [GitHub URL]
- **Issue Tracker**: [Issues URL]
- **Documentation**: [Docs URL]

---

**Happy Coding! 🚀**
