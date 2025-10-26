# 9. Security Architecture

## 9.1 Template-Provided Security (Already Implemented)

**The FastAPI template provides complete authentication and security infrastructure:**

✅ **JWT Authentication:**
- `backend/app/core/security.py` - Token generation, validation, password hashing
- Access token (1-hour expiry) + Refresh token (7-day expiry)
- `python-jose` for JWT encoding/decoding
- `passlib` with bcrypt for password hashing

✅ **Authentication Endpoints:**
- `POST /api/v1/login/access-token` - Login with email/password
- `POST /api/v1/login/test-token` - Validate access token
- `POST /api/v1/password-recovery` - Request password reset
- `POST /api/v1/reset-password` - Reset password with token

✅ **User Dependencies:**
- `get_current_user()` - Extract and validate JWT from Authorization header
- `get_current_active_superuser()` - Require superuser role

✅ **Security Features:**
- CORS middleware configured
- SQLModel ORM prevents SQL injection
- Password complexity validation
- Secure session management

## 9.2 LMS Extension: 4-Role RBAC System

**What We Add for Dream LMS:**

**1. User Role Enum (backend/app/models.py):**

```python
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    publisher = "publisher"
    teacher = "teacher"
    student = "student"

# Extend User model
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    role: UserRole = Field(default=UserRole.student)  # NEW
    # ... other fields
```

**2. Role-Based Access Control Dependency (backend/app/api/deps.py):**

```python
def require_role(*allowed_roles: UserRole):
    """Dependency to check if user has one of the allowed roles"""
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access forbidden. Required roles: {allowed_roles}"
            )
        return current_user
    return Depends(role_checker)

# Usage examples
@router.get("/admin/publishers")
async def list_publishers(
    user: User = Depends(require_role(UserRole.admin))
):
    # Only admins can access
    pass

@router.post("/teachers/me/students")
async def create_student(
    user: User = Depends(require_role(UserRole.teacher))
):
    # Only teachers can create students
    pass
```

**3. Role-Based Data Filtering:**

```python
# Filter data by authenticated user's role
async def get_my_schools(
    db: AsyncSession,
    current_user: User = Depends(require_role(UserRole.publisher))
):
    # Publishers only see their own schools
    publisher = await db.get(Publisher, {"user_id": current_user.id})
    schools = await db.exec(
        select(School).where(School.publisher_id == publisher.id)
    )
    return schools
```

**4. JWT Payload Extension:**

Update token creation to include role:

```python
# In login endpoint
access_token = security.create_access_token(
    subject=str(user.id),
    extra_claims={"role": user.role}  # Include role in token
)
```

## 9.3 Frontend Authentication (Template-Provided + Extended)

**Template Provides:**
- TanStack Router auth guard (`beforeLoad` checks)
- Protected routes redirect to `/login`
- Auth context with TanStack Query
- API client with automatic token injection

**We Extend:**
- Role-specific route protection
- Role-based navigation menus
- Permission checking in components

```typescript
// src/hooks/useAuth.ts (extend template's hook)
export function useRequireRole(allowedRoles: UserRole[]) {
  const { user } = useAuth()

  if (!user || !allowedRoles.includes(user.role)) {
    throw redirect({ to: '/unauthorized' })
  }

  return user
}

// Usage in route
export const Route = createFileRoute('/_layout/admin/publishers')({
  beforeLoad: () => {
    useRequireRole(['admin'])
  }
})
```

## 9.4 Security Best Practices

**Implemented (Template + Extensions):**
- ✅ HTTPS only in production (Traefik with Let's Encrypt)
- ✅ Password hashing with bcrypt (cost factor 12)
- ✅ JWT tokens in httpOnly cookies (or Authorization header)
- ✅ SQL injection prevention via SQLModel parameterized queries
- ✅ XSS prevention via React's built-in escaping
- ✅ CORS configured for allowed origins
- ✅ Rate limiting via Traefik middleware
- ✅ Input validation via Pydantic schemas
- ✅ Role-based authorization on all protected endpoints

**Additional Considerations:**
- 🔒 Secrets in environment variables (never committed)
- 🔒 Database credentials rotated regularly
- 🔒 Audit logging for sensitive operations (admin actions)
- 🔒 Regular dependency updates for security patches

---
