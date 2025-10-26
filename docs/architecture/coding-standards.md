# Coding Standards

**Dream LMS Development Standards**
**Last Updated:** 2025-10-26
**Architecture Version:** v4

---

## General Principles

1. **Write for Readability** - Code is read 10x more than written
2. **Keep It Simple** - Favor boring, proven solutions over clever code
3. **Test Your Code** - Aim for >80% coverage on new code
4. **Type Everything** - Use TypeScript and Python type hints extensively
5. **Document Why, Not What** - Code shows what; comments explain why
6. **Follow Existing Patterns** - Consistency > personal preference

---

## Python Backend Standards

### Code Style

**Formatter:** `black` (line length: 88)
**Linter:** `ruff` or `flake8`
**Type Checker:** `mypy`

```python
# ✅ Good: Type hints, clear names, docstrings
async def get_user_by_email(
    email: str,
    db: AsyncSession
) -> User | None:
    """
    Retrieve user by email address.

    Returns None if user not found.
    """
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()


# ❌ Bad: No types, unclear name, no docs
async def get(e, db):
    r = await db.execute(select(User).where(User.email == e))
    return r.scalar_one_or_none()
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Variables** | snake_case | `user_id`, `is_active` |
| **Functions** | snake_case | `create_user()`, `validate_token()` |
| **Classes** | PascalCase | `UserRole`, `AssignmentService` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| **Private** | _leading_underscore | `_internal_method()` |
| **Type vars** | PascalCase | `T`, `ModelType` |

### FastAPI Route Patterns

```python
# ✅ Good: Clear endpoint, proper dependencies, typed responses
@router.post("/assignments", response_model=AssignmentResponse, status_code=201)
async def create_assignment(
    assignment: AssignmentCreate,
    current_user: User = Depends(require_role(UserRole.teacher)),
    db: AsyncSession = Depends(get_db)
) -> AssignmentResponse:
    """Create new assignment for students."""
    # Implementation
    pass


# Route naming: plural nouns, lowercase
# /api/v1/users
# /api/v1/assignments
# /api/v1/classes
```

### Database Patterns

**SQLModel Models:**

```python
# ✅ Good: Clear field definitions, relationships, validation
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    role: UserRole = Field(default=UserRole.student)

    # Relationships
    publisher: "Publisher | None" = Relationship(back_populates="user")

    # Validation
    @validator("email")
    def validate_email(cls, v: str) -> str:
        if not re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", v):
            raise ValueError("Invalid email format")
        return v.lower()
```

**Query Patterns:**

```python
# ✅ Good: Async/await, proper session handling
async def get_teacher_students(
    teacher_id: uuid.UUID,
    db: AsyncSession
) -> list[Student]:
    result = await db.execute(
        select(Student)
        .join(Teacher)
        .where(Teacher.id == teacher_id)
    )
    return result.scalars().all()


# Always use async session methods
# await db.execute()
# await db.commit()
# await db.refresh()
```

### Error Handling

```python
# ✅ Good: Specific exceptions, user-friendly messages
from fastapi import HTTPException, status

if not user:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )

if user.role != UserRole.admin:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions"
    )
```

### Testing Patterns

```python
# ✅ Good: Clear test name, arrange-act-assert, async
@pytest.mark.asyncio
async def test_create_assignment_requires_teacher_role(
    client: AsyncClient,
    student_token: str
):
    """Test that students cannot create assignments."""
    # Arrange
    assignment_data = {"name": "Test", "activity_id": "uuid"}

    # Act
    response = await client.post(
        "/api/v1/assignments",
        json=assignment_data,
        headers={"Authorization": f"Bearer {student_token}"}
    )

    # Assert
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"]
```

---

## TypeScript Frontend Standards

### Code Style

**Formatter:** `prettier`
**Linter:** `eslint` with TypeScript rules
**Type Checker:** `tsc --noEmit`

```typescript
// ✅ Good: Explicit types, clear interface
interface AssignmentCardProps {
  assignment: Assignment
  onComplete: (id: string) => void
  isLoading?: boolean
}

export function AssignmentCard({
  assignment,
  onComplete,
  isLoading = false
}: AssignmentCardProps) {
  // Implementation
}


// ❌ Bad: Implicit any, unclear props
export function AssignmentCard({ assignment, onComplete, isLoading }) {
  // Implementation
}
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Components** | PascalCase | `UserCard`, `AssignmentList` |
| **Hooks** | camelCase (use prefix) | `useAuth`, `useAssignments` |
| **Functions** | camelCase | `calculateScore`, `formatDate` |
| **Constants** | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_FILE_SIZE` |
| **Types/Interfaces** | PascalCase | `User`, `AssignmentResponse` |
| **Files** | Match export | `UserCard.tsx`, `useAuth.ts` |

### Component Patterns

```typescript
// ✅ Good: Typed props, clear structure, exported for testing
export interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export function LoginForm({
  onSuccess,
  redirectTo = '/dashboard'
}: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login({ email, password })
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* JSX */}
    </form>
  )
}
```

### Custom Hooks Pattern

```typescript
// ✅ Good: Clear return type, proper TanStack Query usage
export function useAssignments() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const createMutation = useMutation({
    mutationFn: assignmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['assignments'])
      toast.success('Assignment created!')
    },
  })

  return {
    assignments: data ?? [],
    isLoading,
    error,
    createAssignment: createMutation.mutate,
  }
}
```

### API Service Pattern

```typescript
// ✅ Good: Typed requests/responses, consistent error handling
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
})

// Request interceptor: Add JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => response.data.data, // Unwrap { success, data }
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    throw error
  }
)

export const assignmentService = {
  getAll: (): Promise<Assignment[]> =>
    api.get('/assignments'),

  create: (data: AssignmentCreate): Promise<Assignment> =>
    api.post('/assignments', data),
}
```

### Testing Patterns

```typescript
// ✅ Good: Clear test, proper mocking, accessibility checks
import { render, screen, fireEvent } from '@testing-library/react'
import { AssignmentCard } from './AssignmentCard'

describe('AssignmentCard', () => {
  it('renders assignment details correctly', () => {
    const assignment = {
      id: '1',
      name: 'Math Quiz',
      dueDate: '2025-12-31T23:59:59Z',
    }

    render(<AssignmentCard assignment={assignment} onComplete={jest.fn()} />)

    expect(screen.getByText('Math Quiz')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete/i })).toBeEnabled()
  })

  it('calls onComplete when button clicked', () => {
    const onComplete = jest.fn()
    const assignment = { id: '1', name: 'Test' }

    render(<AssignmentCard assignment={assignment} onComplete={onComplete} />)

    fireEvent.click(screen.getByRole('button', { name: /complete/i }))

    expect(onComplete).toHaveBeenCalledWith('1')
  })
})
```

---

## Git Commit Standards

**Format:** `<type>(<scope>): <subject>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `test`: Add/update tests
- `docs`: Documentation
- `chore`: Tooling, dependencies
- `style`: Formatting (not CSS)

**Examples:**
```
feat(auth): add role-based access control
fix(assignments): correct score calculation
refactor(api): extract assignment service layer
test(users): add role validation tests
docs(readme): update setup instructions
```

---

## File Organization

### Backend
- One model per file (large projects) OR single `models.py` (small projects)
- Routes grouped by resource (`users.py`, `assignments.py`)
- Services optional - only when business logic is complex
- Tests mirror source structure

### Frontend
- Components in feature folders when specific to feature
- Shared components in `components/`
- One component per file
- Collocate tests with source files

---

## Documentation Standards

### Code Comments

```python
# ✅ Good: Explains WHY, not WHAT
# Use exponential backoff to handle rate limits from external API
await asyncio.sleep(2 ** retry_count)

# ❌ Bad: States the obvious
# Sleep for 2 seconds
await asyncio.sleep(2)
```

### Docstrings

**Python (Google style):**

```python
def calculate_score(answers: dict, correct: dict) -> int:
    """
    Calculate assignment score as percentage.

    Args:
        answers: Student's submitted answers
        correct: Correct answer key

    Returns:
        Score as integer percentage (0-100)

    Raises:
        ValueError: If answer formats don't match
    """
```

**TypeScript (JSDoc):**

```typescript
/**
 * Calculate assignment score as percentage
 *
 * @param answers - Student's submitted answers
 * @param correct - Correct answer key
 * @returns Score as integer percentage (0-100)
 * @throws {Error} If answer formats don't match
 */
export function calculateScore(
  answers: Record<string, any>,
  correct: Record<string, any>
): number {
  // Implementation
}
```

---

## Performance Best Practices

### Backend
- Use async/await consistently
- Implement database indexes on foreign keys and frequently queried columns
- Paginate large result sets
- Cache expensive queries (Redis)
- Use select fields instead of loading full objects when possible

### Frontend
- Memoize expensive calculations (`useMemo`)
- Prevent unnecessary re-renders (`React.memo`, `useCallback`)
- Lazy load routes and heavy components
- Debounce search inputs
- Virtualize long lists

---

## Security Best Practices

### Backend
- ✅ Never log passwords or tokens
- ✅ Validate all inputs with Pydantic
- ✅ Use parameterized queries (SQLModel does this)
- ✅ Implement rate limiting on auth endpoints
- ✅ Use HTTPS only in production

### Frontend
- ✅ Sanitize user inputs (React does this by default)
- ✅ Store tokens securely (httpOnly cookies preferred)
- ✅ Validate data from API responses
- ✅ Implement CSRF protection
- ✅ Use Content Security Policy headers

---

## Code Review Checklist

Before submitting PR:
- [ ] Code follows naming conventions
- [ ] Types/type hints present on all functions
- [ ] Tests written and passing (>80% coverage)
- [ ] No console.logs or print statements
- [ ] Error handling implemented
- [ ] Documentation updated if needed
- [ ] No sensitive data hardcoded
- [ ] Linter passes with no errors
- [ ] Commits follow commit message format

---

**These standards are living documents - update as patterns evolve!**

**Reference:** See `docs/architecture/10-testing-strategy.md` for detailed testing guidelines.
