# Testing Strategy

This document outlines the comprehensive testing strategy for Dream LMS, covering backend and frontend testing approaches, tools, coverage targets, and best practices.

## Testing Philosophy

1. **Test Pyramid Approach** - Many unit tests, fewer integration tests, minimal E2E tests
2. **Test Business Logic** - Focus tests on business rules and critical paths
3. **Fast Feedback** - Tests should run quickly in development
4. **Confidence over Coverage** - Aim for meaningful tests, not just high coverage numbers
5. **Test Behavior, Not Implementation** - Tests should survive refactoring

## Testing Levels

```
        /\
       /  \      E2E Tests (5%)
      /    \     - Critical user journeys
     /------\    - Cross-system flows
    /        \
   /  Integration Tests (15%)
  /    - API endpoints        \
 /     - Database queries       \
/--------------------------------\
        Unit Tests (80%)
        - Business logic
        - Utilities
        - Components
```

## Backend Testing (Python/FastAPI)

### Testing Framework: pytest

**Installation:**

```bash
pip install pytest pytest-asyncio pytest-cov httpx faker
```

### Test Structure

```
backend/tests/
├── conftest.py              # Shared fixtures
├── test_auth.py             # Authentication tests
├── test_assignments.py      # Assignment endpoint tests
├── test_analytics.py        # Analytics tests
├── test_services/           # Service layer unit tests
│   ├── test_assignment_service.py
│   └── test_analytics_service.py
└── test_models/             # Model/database tests
    ├── test_user_model.py
    └── test_assignment_model.py
```

### Unit Tests - Business Logic

Test services in isolation with mocked dependencies:

```python
# tests/test_services/test_assignment_service.py
import pytest
from unittest.mock import AsyncMock, Mock
from app.services.assignment_service import AssignmentService
from app.models import Assignment, Activity, Teacher
from app.schemas.assignment import AssignmentCreate

@pytest.mark.asyncio
async def test_create_assignment_validates_activity_access():
    """Test that teachers can only create assignments for activities they have access to"""
    # Arrange
    mock_db = AsyncMock()
    service = AssignmentService(db=mock_db)

    teacher = Teacher(id="teacher-1", school_id="school-1")
    activity = Activity(id="activity-1", book_id="book-1")
    assignment_data = AssignmentCreate(
        name="Math Quiz",
        activity_id="activity-1",
        student_ids=["student-1"]
    )

    # Mock database calls
    mock_db.get.return_value = activity

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await service.create(assignment_data, teacher)

    assert exc_info.value.status_code == 403
    assert "access" in str(exc_info.value.detail).lower()
```

### Integration Tests - API Endpoints

Test full request/response cycle with test database:

```python
# tests/test_assignments.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_assignment(
    client: AsyncClient,
    teacher_token: str,
    test_activity: Activity,
    test_students: list[Student]
):
    """Test creating an assignment via API"""
    response = await client.post(
        "/api/v1/assignments",
        json={
            "name": "Math Quiz",
            "activity_id": str(test_activity.id),
            "due_date": "2025-12-31T23:59:59Z",
            "student_ids": [str(s.id) for s in test_students]
        },
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Math Quiz"
    assert data["activity_id"] == str(test_activity.id)
    assert len(data["students"]) == len(test_students)

@pytest.mark.asyncio
async def test_create_assignment_requires_authentication(client: AsyncClient):
    """Test that unauthenticated users cannot create assignments"""
    response = await client.post(
        "/api/v1/assignments",
        json={"name": "Test", "activity_id": "123"}
    )

    assert response.status_code == 401
```

### Test Fixtures (conftest.py)

Shared test setup and data:

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import get_db
from app.models import Base, User, Teacher, Student, Activity
from app.core.security import create_access_token

# Test database URL
TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/test_dreamlms"

@pytest.fixture
async def db_session():
    """Create test database session"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=True)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        yield session

    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client(db_session):
    """Create test HTTP client"""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
async def test_teacher(db_session) -> Teacher:
    """Create test teacher"""
    user = User(email="teacher@test.com", role="teacher", password_hash="...")
    db_session.add(user)
    await db_session.flush()

    teacher = Teacher(user_id=user.id, school_id="...")
    db_session.add(teacher)
    await db_session.commit()

    return teacher

@pytest.fixture
def teacher_token(test_teacher) -> str:
    """Generate JWT token for test teacher"""
    return create_access_token({"user_id": str(test_teacher.id), "role": "teacher"})
```

### Running Backend Tests

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_assignments.py

# Run tests matching pattern
pytest -k "test_create_assignment"

# Run with verbose output
pytest -v
```

### Backend Coverage Target: 80%

Focus coverage on:
- ✅ Services (business logic) - **90%+**
- ✅ Routers (API endpoints) - **80%+**
- ✅ Models (database logic) - **70%+**
- ⚠️ Configuration files - **50%+**

## Frontend Testing (TypeScript/React)

### Testing Framework: Vitest + Testing Library

**Installation:**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Test Structure

```
frontend/src/
├── test/
│   ├── setup.ts             # Vitest setup
│   └── testUtils.tsx        # Testing utilities
├── components/
│   └── AssignmentCard.test.tsx
├── features/
│   └── assignments/
│       ├── components/
│       │   └── AssignmentForm.test.tsx
│       └── hooks/
│           └── useAssignments.test.ts
└── lib/
    └── utils.test.ts
```

### Unit Tests - Components

Test components in isolation:

```typescript
// components/AssignmentCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssignmentCard } from './AssignmentCard';
import type { Assignment } from '@/types/assignment';

describe('AssignmentCard', () => {
  const mockAssignment: Assignment = {
    id: '1',
    name: 'Math Quiz',
    activity_id: 'activity-1',
    status: 'not_started',
    due_date: '2025-12-31T23:59:59Z',
    created_at: '2025-10-01T00:00:00Z',
  };

  it('renders assignment details correctly', () => {
    render(<AssignmentCard assignment={mockAssignment} />);

    expect(screen.getByText('Math Quiz')).toBeInTheDocument();
    expect(screen.getByText(/Due:/)).toBeInTheDocument();
  });

  it('displays correct status badge', () => {
    render(<AssignmentCard assignment={mockAssignment} />);

    const badge = screen.getByText('not_started');
    expect(badge).toBeInTheDocument();
  });

  it('calls onStart when Start button is clicked', () => {
    const handleStart = vi.fn();
    render(<AssignmentCard assignment={mockAssignment} onStart={handleStart} />);

    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);

    expect(handleStart).toHaveBeenCalledTimes(1);
  });

  it('does not show Start button for completed assignments', () => {
    const completedAssignment = { ...mockAssignment, status: 'completed' as const };
    render(<AssignmentCard assignment={completedAssignment} />);

    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
  });
});
```

### Integration Tests - Hooks with API

Test custom hooks that interact with API:

```typescript
// features/assignments/hooks/useAssignments.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAssignments } from './useAssignments';
import * as assignmentService from '@/services/assignmentService';

// Mock the service
vi.mock('@/services/assignmentService');

describe('useAssignments', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches assignments successfully', async () => {
    const mockAssignments = [
      { id: '1', name: 'Math Quiz' },
      { id: '2', name: 'Science Test' },
    ];

    vi.mocked(assignmentService.getAll).mockResolvedValue(mockAssignments);

    const { result } = renderHook(() => useAssignments(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.assignments).toEqual(mockAssignments);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors gracefully', async () => {
    const error = new Error('Network error');
    vi.mocked(assignmentService.getAll).mockRejectedValue(error);

    const { result } = renderHook(() => useAssignments(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.assignments).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});
```

### Test Utilities (testUtils.tsx)

Shared testing utilities and wrappers:

```typescript
// test/testUtils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

export const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
```

### Running Frontend Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm run test AssignmentCard.test.tsx

# Run with UI
npm run test:ui
```

### Frontend Coverage Target: 75%

Focus coverage on:
- ✅ Business logic hooks - **85%+**
- ✅ Complex components - **80%+**
- ✅ Form validation - **90%+**
- ✅ Utility functions - **85%+**
- ⚠️ UI components - **60%+** (focus on logic, not styling)

## E2E Testing (Future)

**Tool**: Playwright (when needed)

```typescript
// e2e/assignment-flow.spec.ts
import { test, expect } from '@playwright/test';

test('teacher creates and assigns activity', async ({ page }) => {
  // Login as teacher
  await page.goto('/login');
  await page.fill('[name="email"]', 'teacher@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Navigate to assignments
  await page.click('a[href="/assignments"]');

  // Create new assignment
  await page.click('button:has-text("New Assignment")');
  await page.fill('[name="name"]', 'Math Quiz');
  await page.selectOption('[name="activity"]', 'activity-1');
  await page.click('button:has-text("Assign")');

  // Verify assignment created
  await expect(page.locator('text=Math Quiz')).toBeVisible();
});
```

**When to write E2E tests:**
- Critical user journeys (login, assignment submission)
- Multi-step workflows (create assignment → assign → student completes)
- Cross-system flows (backend + frontend + external storage)

**Limit E2E tests** - They are slow and brittle. Only for critical paths.

## Test Data Management

### Backend - Use Factories

```python
# tests/factories.py
from faker import Faker
from app.models import User, Teacher, Student, Assignment

fake = Faker()

def create_user(**kwargs):
    defaults = {
        "email": fake.email(),
        "password_hash": "hashed_password",
        "role": "student",
        "is_active": True,
    }
    return User(**{**defaults, **kwargs})

def create_teacher(db_session, **kwargs):
    user = create_user(role="teacher")
    db_session.add(user)
    db_session.flush()

    teacher = Teacher(user_id=user.id, school_id="...", **kwargs)
    db_session.add(teacher)
    return teacher
```

### Frontend - Mock Data Files

```typescript
// test/mockData/assignments.ts
export const mockAssignments: Assignment[] = [
  {
    id: '1',
    name: 'Math Quiz',
    activity_id: 'activity-1',
    status: 'not_started',
    due_date: '2025-12-31T23:59:59Z',
    created_at: '2025-10-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Science Test',
    activity_id: 'activity-2',
    status: 'completed',
    due_date: null,
    created_at: '2025-09-15T00:00:00Z',
  },
];
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: pytest --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Testing Best Practices

### Do's ✅

- **Write tests first** for new features (TDD when appropriate)
- **Test behavior**, not implementation details
- **Use descriptive test names** that explain what is being tested
- **Keep tests isolated** - no shared mutable state
- **Mock external dependencies** (APIs, storage, time)
- **Assert on meaningful outcomes**, not intermediate steps
- **Use fixtures/factories** for test data

### Don'ts ❌

- **Don't test framework code** (React internals, FastAPI internals)
- **Don't test private methods directly** - test through public API
- **Don't write flaky tests** - avoid time-dependent tests without mocking
- **Don't skip tests** without a good reason (and document why)
- **Don't test implementation** - refactoring shouldn't break tests
- **Don't write tests without assertions**

## Test Organization Checklist

For each new feature:

- [ ] Unit tests for business logic (services/hooks)
- [ ] Integration tests for API endpoints
- [ ] Component tests for complex UI logic
- [ ] Form validation tests
- [ ] Error handling tests
- [ ] Edge case tests (empty states, null values)
- [ ] Permission/authorization tests

## Coverage Reports

### Viewing Coverage

**Backend:**
```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

**Frontend:**
```bash
npm run test:coverage
open coverage/index.html
```

### Coverage Goals

| Area | Target | Priority |
|------|--------|----------|
| Services | 90% | High |
| API Routers | 80% | High |
| React Hooks | 85% | High |
| Form Validation | 90% | High |
| Components | 75% | Medium |
| Utilities | 85% | Medium |
| Config | 50% | Low |

---

**Last Updated**: 2025-10-24
**Version**: 1.0
**Maintained by**: QA Team
