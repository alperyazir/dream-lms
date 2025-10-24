# Coding Standards

This document defines coding conventions, patterns, and best practices for the Dream LMS codebase to ensure consistency, maintainability, and code quality across both frontend and backend.

## General Principles

1. **Readability over cleverness** - Write code that others can understand
2. **Consistent naming** - Follow established patterns throughout the codebase
3. **DRY (Don't Repeat Yourself)** - Extract reusable logic into functions/components
4. **SOLID principles** - Especially Single Responsibility and Dependency Inversion
5. **Fail fast** - Validate inputs early, throw meaningful errors
6. **Type safety** - Use TypeScript/Python type hints everywhere

## Backend (Python/FastAPI) Standards

### File Organization

```python
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application entry point
│   ├── core/                # Configuration, security, dependencies
│   │   ├── config.py        # Settings (use pydantic BaseSettings)
│   │   ├── security.py      # JWT, password hashing
│   │   └── deps.py          # FastAPI dependencies
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── assignment.py
│   ├── schemas/             # Pydantic schemas for validation
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── assignment.py
│   ├── routers/             # API route handlers (thin layer)
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   └── assignments.py
│   ├── services/            # Business logic (thick layer)
│   │   ├── __init__.py
│   │   ├── assignment_service.py
│   │   └── analytics_service.py
│   └── db/                  # Database utilities
│       ├── __init__.py
│       └── session.py
├── alembic/                 # Database migrations
├── tests/                   # Test suite
└── scripts/                 # Utility scripts
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | snake_case | `assignment_service.py` |
| Classes | PascalCase | `AssignmentService` |
| Functions | snake_case | `create_assignment()` |
| Variables | snake_case | `assignment_data` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE_MB` |
| Private methods | _leading_underscore | `_validate_access()` |
| Pydantic models | PascalCase | `AssignmentCreate` |
| SQLAlchemy models | PascalCase | `Assignment` |

### Layered Architecture Pattern

**API Layer (Routers)** - Thin layer, handles HTTP concerns only:

```python
# routers/assignments.py
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from app.services.assignment_service import AssignmentService
from app.core.deps import get_current_teacher

router = APIRouter(prefix="/api/v1/assignments", tags=["assignments"])

@router.post(
    "",
    response_model=AssignmentResponse,
    status_code=201,
    summary="Create new assignment",
    description="Creates an assignment and assigns it to specified students"
)
async def create_assignment(
    assignment_data: AssignmentCreate,
    current_teacher: User = Depends(get_current_teacher),
    service: AssignmentService = Depends()
) -> AssignmentResponse:
    """
    Create a new assignment.

    - **name**: Assignment title (required)
    - **activity_id**: Reference to activity UUID
    - **due_date**: Optional deadline
    - **student_ids** or **class_ids**: Recipients
    """
    return await service.create(assignment_data, current_teacher)
```

**Service Layer** - Contains all business logic:

```python
# services/assignment_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Assignment, AssignmentStudent
from app.schemas.assignment import AssignmentCreate

class AssignmentService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    async def create(
        self,
        data: AssignmentCreate,
        teacher: User
    ) -> Assignment:
        """
        Create assignment and assign to students.

        Business rules:
        1. Verify teacher has access to the activity
        2. Validate due_date is in future
        3. Create assignment record
        4. Create AssignmentStudent records for each student
        5. Send notifications to students
        """
        # Validate activity access
        activity = await self._get_activity_or_404(data.activity_id)
        await self._verify_teacher_access(teacher, activity)

        # Create assignment
        assignment = Assignment(**data.dict(), teacher_id=teacher.id)
        self.db.add(assignment)
        await self.db.flush()

        # Assign to students
        await self._assign_to_students(assignment, data.student_ids)

        # Send notifications
        await self._notify_students(assignment, data.student_ids)

        await self.db.commit()
        await self.db.refresh(assignment)
        return assignment

    async def _get_activity_or_404(self, activity_id: UUID) -> Activity:
        """Private helper: Get activity or raise 404."""
        activity = await self.db.get(Activity, activity_id)
        if not activity:
            raise HTTPException(404, "Activity not found")
        return activity
```

### Type Hints

**Always use type hints** for function parameters and return values:

```python
# Good
async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()

# Bad - no type hints
async def get_user_by_email(db, email):
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()
```

### Error Handling

```python
from fastapi import HTTPException

# Use appropriate HTTP status codes
raise HTTPException(status_code=400, detail="Invalid input")  # Bad Request
raise HTTPException(status_code=401, detail="Unauthorized")    # Auth required
raise HTTPException(status_code=403, detail="Forbidden")       # Insufficient permissions
raise HTTPException(status_code=404, detail="Not found")       # Resource missing
raise HTTPException(status_code=409, detail="Conflict")        # Duplicate resource
raise HTTPException(status_code=422, detail="Unprocessable")   # Business logic error

# Include error details for validation errors
raise HTTPException(
    status_code=400,
    detail={
        "message": "Validation failed",
        "errors": [
            {"field": "email", "message": "Invalid email format"}
        ]
    }
)
```

### Async/Await

**Always use async/await** for I/O operations:

```python
# Good
async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    user = User(**user_data.dict())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

# Bad - blocking call
def create_user(db: Session, user_data: UserCreate) -> User:
    user = User(**user_data.dict())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

### Database Queries

```python
# Use SQLAlchemy 2.0 style queries
from sqlalchemy import select

# Good - explicit select
async def get_assignments_by_teacher(db: AsyncSession, teacher_id: UUID):
    result = await db.execute(
        select(Assignment)
        .where(Assignment.teacher_id == teacher_id)
        .order_by(Assignment.created_at.desc())
    )
    return result.scalars().all()

# Use joins for related data
async def get_assignment_with_students(db: AsyncSession, assignment_id: UUID):
    result = await db.execute(
        select(Assignment)
        .options(selectinload(Assignment.assignment_students))
        .where(Assignment.id == assignment_id)
    )
    return result.scalar_one_or_none()
```

### Code Formatting

- **Black**: Use Black for Python formatting (line length: 88)
- **isort**: Sort imports automatically
- **Run before commit**: `black . && isort .`

```python
# Import order (isort handles this)
# 1. Standard library
import os
from datetime import datetime
from typing import Optional

# 2. Third-party
from fastapi import APIRouter, Depends
from sqlalchemy import select

# 3. Local application
from app.models import User
from app.schemas.user import UserCreate
from app.core.deps import get_db
```

## Frontend (React/TypeScript) Standards

### File Organization

```
frontend/src/
├── main.tsx                 # Entry point
├── App.tsx                  # Root component
├── router.tsx               # React Router config
├── components/              # Shared components
│   ├── ui/                  # Shadcn UI primitives
│   ├── layout/              # Header, Sidebar, AppShell
│   ├── common/              # Reusable components
│   └── forms/               # Form components
├── features/                # Feature-based modules
│   ├── auth/
│   │   ├── components/      # Feature-specific components
│   │   ├── hooks/           # Feature-specific hooks
│   │   └── types.ts         # Feature-specific types
│   └── assignments/
├── pages/                   # Route page components
├── hooks/                   # Global custom hooks
├── services/                # API client functions
├── stores/                  # Zustand stores
├── lib/                     # Utilities
├── types/                   # Global TypeScript types
└── styles/                  # Global CSS
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files (components) | PascalCase | `AssignmentCard.tsx` |
| Files (utils) | camelCase | `formatDate.ts` |
| Components | PascalCase | `AssignmentCard` |
| Functions | camelCase | `formatDate()` |
| Variables | camelCase | `assignmentData` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Hooks | use + PascalCase | `useAssignments` |
| Types/Interfaces | PascalCase | `Assignment`, `UserRole` |

### Component Patterns

**Functional components with TypeScript**:

```typescript
// components/AssignmentCard.tsx
import { FC } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Assignment } from '@/types/assignment';

interface AssignmentCardProps {
  assignment: Assignment;
  onStart?: () => void;
  className?: string;
}

export const AssignmentCard: FC<AssignmentCardProps> = ({
  assignment,
  onStart,
  className
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{assignment.name}</CardTitle>
        <Badge variant={assignment.status === 'completed' ? 'success' : 'default'}>
          {assignment.status}
        </Badge>
      </CardHeader>
      <CardContent>
        {assignment.due_date && (
          <p className="text-sm text-muted-foreground">
            Due: {new Date(assignment.due_date).toLocaleDateString()}
          </p>
        )}
        {onStart && (
          <button onClick={onStart}>Start Assignment</button>
        )}
      </CardContent>
    </Card>
  );
};
```

### Custom Hooks

```typescript
// hooks/useAssignments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentService } from '@/services/assignmentService';
import { toast } from 'sonner';

export function useAssignments() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: assignmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create assignment: ${error.message}`);
    },
  });

  return {
    assignments: data ?? [],
    isLoading,
    error,
    createAssignment: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
```

### State Management

**Server state (TanStack Query)** - For API data:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['assignment', id],
  queryFn: () => assignmentService.getById(id),
});
```

**Client state (Zustand)** - For UI state:

```typescript
// stores/authStore.ts
import { create } from 'zustand';

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

### TypeScript Types

```typescript
// types/assignment.ts

// Use interfaces for object shapes
export interface Assignment {
  id: string;
  name: string;
  activity_id: string;
  due_date: string | null;
  status: AssignmentStatus;
  created_at: string;
}

// Use type for unions and utilities
export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed';

// Create types for API requests/responses
export interface AssignmentCreate {
  name: string;
  activity_id: string;
  due_date?: string;
  student_ids: string[];
}

// Use Omit/Pick for derived types
export type AssignmentUpdate = Partial<Omit<Assignment, 'id' | 'created_at'>>;
```

### API Service Layer

```typescript
// services/api.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const api = axios.create({
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

// Response interceptor: Unwrap data, handle errors
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
import { api } from './api';
import { Assignment, AssignmentCreate } from '@/types/assignment';

export const assignmentService = {
  getAll: () => api.get<Assignment[]>('/assignments'),

  getById: (id: string) => api.get<Assignment>(`/assignments/${id}`),

  create: (data: AssignmentCreate) =>
    api.post<Assignment>('/assignments', data),

  submit: (id: string, answers: unknown) =>
    api.post(`/assignments/${id}/submit`, { answers }),
};
```

### Code Formatting

- **ESLint**: Enforce code quality rules
- **Prettier**: Consistent formatting
- **Run before commit**: `npm run lint && npm run format`

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

## Testing Standards

### Backend Testing (pytest)

```python
# tests/test_assignments.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_assignment_success(
    client: AsyncClient,
    teacher_token: str,
    test_activity: Activity
):
    """Test successful assignment creation"""
    response = await client.post(
        "/api/v1/assignments",
        json={
            "name": "Math Quiz",
            "activity_id": str(test_activity.id),
            "student_ids": ["..."],
        },
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Math Quiz"
    assert data["activity_id"] == str(test_activity.id)
```

### Frontend Testing (Vitest + Testing Library)

```typescript
// tests/components/AssignmentCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssignmentCard } from '@/components/AssignmentCard';

describe('AssignmentCard', () => {
  it('renders assignment details correctly', () => {
    const assignment = {
      id: '1',
      name: 'Math Quiz',
      status: 'pending',
      due_date: '2025-12-31',
    };

    render(<AssignmentCard assignment={assignment} />);

    expect(screen.getByText('Math Quiz')).toBeInTheDocument();
    expect(screen.getByText(/Due: /)).toBeInTheDocument();
  });
});
```

## Git Commit Standards

Follow **Conventional Commits**:

```
feat: add assignment creation endpoint
fix: resolve date parsing issue in analytics
docs: update API documentation
refactor: extract assignment validation logic
test: add tests for assignment submission
chore: update dependencies
```

## Code Review Checklist

- [ ] Code follows naming conventions
- [ ] Functions have type hints (Python) or TypeScript types
- [ ] No hardcoded values (use config/environment variables)
- [ ] Error handling is appropriate
- [ ] Tests are included for new functionality
- [ ] Documentation/comments explain "why" not "what"
- [ ] No console.log or print statements in production code
- [ ] Async/await used correctly
- [ ] No security vulnerabilities (SQL injection, XSS)

---

**Last Updated**: 2025-10-24
**Version**: 1.0
**Maintained by**: Development Team
