# 10. Testing Strategy

## 10.1 Template-Provided Testing Infrastructure

**Backend (pytest):**
✅ Template includes complete pytest setup:
- `backend/app/tests/` with test fixtures
- `conftest.py` with database fixtures (`TestingSessionLocal`, `override_get_db`)
- User authentication fixtures (`superuser_token_headers`, `normal_user_token_headers`)
- API client fixtures (`client: AsyncClient`)
- Example tests for user CRUD operations

**Frontend (Playwright):**
✅ Template includes Playwright for E2E testing:
- `frontend/tests/` directory
- Example E2E tests for login flow
- Configured in `playwright.config.ts`

**What We Add:**
- LMS domain-specific test cases (assignments, activities, analytics)
- Mock data fixtures for books, classes, students
- Activity player component tests
- Role-based access control tests

## 10.2 Backend Testing (pytest) - LMS Extensions

```python
# backend/app/tests/test_assignments.py
import pytest
from httpx import AsyncClient
from app.core.security import create_access_token
from app.models import UserRole

@pytest.fixture
async def teacher_token(db: AsyncSession) -> str:
    """Create a teacher user and return auth token"""
    # Create teacher user with role
    user = User(email="teacher@test.com", role=UserRole.teacher, ...)
    db.add(user)
    await db.commit()
    return create_access_token(subject=str(user.id), extra_claims={"role": "teacher"})

@pytest.mark.asyncio
async def test_create_assignment(client: AsyncClient, teacher_token: str):
    """Test that teachers can create assignments"""
    response = await client.post(
        "/api/v1/assignments",
        json={
            "name": "Test Assignment",
            "activity_id": "uuid-here",
            "due_date": "2025-12-31T23:59:59Z",
            "student_ids": ["student-uuid-1", "student-uuid-2"]
        },
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Test Assignment"

@pytest.mark.asyncio
async def test_student_cannot_create_assignment(client: AsyncClient, student_token: str):
    """Test role-based access control"""
    response = await client.post(
        "/api/v1/assignments",
        json={"name": "Test"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 403  # Forbidden
```

## 10.3 Frontend Testing - LMS Extensions

**Component Tests (Vitest + React Testing Library):**

```typescript
// frontend/src/components/AssignmentCard.test.tsx
import { render, screen } from '@testing-library/react'
import { AssignmentCard } from '@/components/AssignmentCard'

describe('AssignmentCard', () => {
  it('renders assignment with countdown timer', () => {
    const assignment = {
      id: '1',
      name: 'Math Quiz',
      due_date: '2025-12-31T23:59:59Z',
      status: 'pending',
      book: { title: 'Algebra Basics' }
    }

    render(<AssignmentCard assignment={assignment} />)

    expect(screen.getByText('Math Quiz')).toBeInTheDocument()
    expect(screen.getByText(/Due:/)).toBeInTheDocument()
    expect(screen.getByTestId('countdown-timer')).toBeInTheDocument()
  })

  it('shows past due badge for overdue assignments', () => {
    const assignment = {
      id: '1',
      name: 'Late Assignment',
      due_date: '2020-01-01T00:00:00Z',  // Past date
      status: 'pending'
    }

    render(<AssignmentCard assignment={assignment} />)

    expect(screen.getByText(/Past Due/i)).toBeInTheDocument()
    expect(screen.getByTestId('warning-badge')).toHaveClass('text-red-500')
  })
})
```

**E2E Tests (Playwright):**

```typescript
// frontend/tests/e2e/assignment-creation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Assignment Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as teacher (using template's auth)
    await page.goto('/login')
    await page.fill('[name="email"]', 'teacher@test.com')
    await page.fill('[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/teacher/dashboard')
  })

  test('teacher can create assignment', async ({ page }) => {
    // Navigate to books
    await page.click('text=Books')
    await page.click('text=View Activities')

    // Click assign button
    await page.click('text=Assign')

    // Fill assignment wizard
    await page.click('text=Next')  // Step 1
    await page.check('[data-testid="student-checkbox-1"]')  // Step 2
    await page.click('text=Next')
    await page.fill('[name="due_date"]', '2025-12-31')  // Step 3
    await page.click('text=Create Assignment')

    // Verify success
    await expect(page.locator('text=Assignment created')).toBeVisible()
  })
})
```

## 10.4 Testing Scripts

See `/docs/development-guide.md` Section 3 for complete testing scripts:
- `scripts/test-backend.sh` - Run all backend tests with coverage
- `scripts/test-frontend.sh` - Run unit + component tests
- `scripts/run-all-tests.sh` - Sequential execution of all test suites

---
