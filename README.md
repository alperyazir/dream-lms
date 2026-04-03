# Flow Learn (FL)

Learning Management System for managing schools, teachers, students, assignments, and interactive book-based activities.

## Architecture

```
frontend/          React + TypeScript (Vite, TanStack Router, Tailwind CSS)
backend/           Python FastAPI (SQLModel, PostgreSQL, Redis, Alembic)
pgbouncer/         Connection pooling for PostgreSQL
load-tests/        k6 load testing scripts
scripts/           Deployment and utility scripts
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TanStack Router & Query, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, SQLModel/SQLAlchemy, PostgreSQL 17, Redis 7, Alembic
- **Auth**: JWT-based authentication with role-based access control (admin, supervisor, publisher, teacher, student)
- **Storage**: Integrates with Flow Central Storage (FCS) for books, media, and teacher materials
- **Background Jobs**: ARQ worker for async tasks
- **Deployment**: Docker Compose, Traefik reverse proxy, GitHub Actions CI/CD

## Roles

| Role | Description |
|------|-------------|
| Admin | Full system access, user management, school/publisher management |
| Supervisor | Manages teachers and students within assigned scope |
| Publisher | Manages book content, assigns books to schools |
| Teacher | Creates assignments, manages students, uploads materials |
| Student | Completes assignments, views progress |

## Key Features

- Interactive book viewer with activity markers
- Multiple activity types (quizzes, drag-drop, reading comprehension, vocabulary, etc.)
- Teacher material management with direct R2 storage access
- AI-powered content generation from uploaded materials
- Student progress tracking and analytics
- Bulk student import via Excel
- Multi-language support (Turkish/English)

## Development

```bash
# Backend
cd backend
uv sync
uv run bash scripts/prestart.sh   # Run migrations
uv run uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

Requires `.env` file with database credentials, API keys, and `PASSWORD_ENCRYPTION_KEY`.

## License

Proprietary - All rights reserved.
