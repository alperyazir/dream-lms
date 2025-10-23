# 3. API Architecture

## 3.1 RESTful API Design Principles

Dream LMS API follows RESTful conventions with these design principles:

1. **Resource-Oriented URLs** - Nouns, not verbs (`/assignments` not `/getAssignments`)
2. **HTTP Methods** - Standard semantics (GET, POST, PUT/PATCH, DELETE)
3. **Stateless** - Each request contains all necessary information (JWT in header)
4. **JSON Format** - Request and response bodies use JSON
5. **Consistent Error Responses** - Standardized error format across all endpoints
6. **Versioning** - API version in URL path (`/api/v1/...`)
7. **Pagination** - Large collections use cursor or offset pagination
8. **HATEOAS (Light)** - Include relevant links in responses where helpful

## 3.2 API Versioning Strategy

**URL-Based Versioning:**

```
/api/v1/assignments
/api/v2/assignments  (future breaking changes)
```

**Version Support Policy:**
- Current version: v1
- Support latest 2 major versions simultaneously
- Deprecation notice: 6 months before removing old version
- Breaking changes trigger new major version

## 3.3 Authentication & Authorization Flow

**Authentication:**

```
1. Client: POST /api/v1/auth/login
   Body: { "email": "teacher@school.com", "password": "..." }

2. Server validates credentials
   - Hash password comparison
   - Check is_active flag

3. Server generates JWT
   Payload: {
     "user_id": "uuid",
     "email": "teacher@school.com",
     "role": "teacher",
     "teacher_id": "uuid",  // Role-specific ID
     "exp": 1234567890
   }

4. Server returns:
   {
     "access_token": "eyJ0eXAi...",
     "refresh_token": "dGhpcyBp...",
     "token_type": "Bearer",
     "expires_in": 3600
   }

5. Client stores tokens (localStorage or httpOnly cookie)

6. Subsequent requests include:
   Authorization: Bearer eyJ0eXAi...
```

**Authorization (Role-Based Access Control):**

```python
# FastAPI dependency for role checking
async def require_role(required_role: UserRole):
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ):
        if current_user.role != required_role:
            raise HTTPException(403, "Insufficient permissions")
        return current_user
    return role_checker

# Usage in router
@router.get("/teachers/students")
async def get_teacher_students(
    current_teacher: User = Depends(require_role(UserRole.TEACHER))
):
    # Automatically validated that user is a teacher
    pass
```

## 3.4 Complete API Endpoint Specification

### **3.4.1 Authentication Endpoints**

```
POST   /api/v1/auth/login              # Login with credentials
POST   /api/v1/auth/refresh            # Refresh access token
POST   /api/v1/auth/logout             # Invalidate refresh token
POST   /api/v1/auth/change-password    # Change user password
```

### **3.4.2 User Management Endpoints**

**Admin:**
```
GET    /api/v1/admin/users             # List all users (paginated)
POST   /api/v1/admin/publishers        # Create publisher
GET    /api/v1/admin/publishers        # List publishers
PUT    /api/v1/admin/publishers/:id    # Update publisher
DELETE /api/v1/admin/publishers/:id    # Delete publisher
POST   /api/v1/admin/schools           # Create school
POST   /api/v1/admin/bulk-import       # Bulk import users (Excel)
```

**Publisher:**
```
GET    /api/v1/publishers/me/schools   # My schools
POST   /api/v1/publishers/me/teachers  # Create teacher in my schools
GET    /api/v1/publishers/me/teachers  # List my teachers
PUT    /api/v1/publishers/me/teachers/:id  # Update teacher
```

**Teacher:**
```
GET    /api/v1/teachers/me/students    # My students
POST   /api/v1/teachers/me/students    # Create student
PUT    /api/v1/teachers/me/students/:id    # Update student
DELETE /api/v1/teachers/me/students/:id    # Delete student
POST   /api/v1/teachers/me/students/bulk-import  # Bulk import students
```

### **3.4.3 Class Management Endpoints**

```
GET    /api/v1/classes                 # Teacher's classes
POST   /api/v1/classes                 # Create class
GET    /api/v1/classes/:id             # Class detail
PUT    /api/v1/classes/:id             # Update class
DELETE /api/v1/classes/:id             # Delete class
POST   /api/v1/classes/:id/students    # Add students to class
DELETE /api/v1/classes/:id/students/:student_id  # Remove student
GET    /api/v1/classes/:id/analytics   # Class performance analytics
```

### **3.4.4 Book & Activity Endpoints**

```
GET    /api/v1/books                   # List accessible books (filtered by publisher)
GET    /api/v1/books/:id               # Book detail
GET    /api/v1/books/:id/activities    # List activities in book
GET    /api/v1/activities/:id          # Activity detail with config
POST   /api/v1/admin/books/sync        # Sync books from Dream Central Storage (admin only)
```

### **3.4.5 Assignment Endpoints**

**Teacher:**
```
GET    /api/v1/assignments             # Teacher's assignments
POST   /api/v1/assignments             # Create assignment
GET    /api/v1/assignments/:id         # Assignment detail
PUT    /api/v1/assignments/:id         # Update assignment
DELETE /api/v1/assignments/:id         # Delete assignment
GET    /api/v1/assignments/:id/results # Assignment results (all students)
GET    /api/v1/assignments/:id/analytics  # Question-level analytics
```

**Student:**
```
GET    /api/v1/students/me/assignments         # My assignments
GET    /api/v1/students/me/assignments/:id     # Assignment detail
GET    /api/v1/assignments/:id/start           # Start assignment (marks in_progress)
POST   /api/v1/assignments/:id/save-progress   # Save partial progress
POST   /api/v1/assignments/:id/submit          # Submit final answers
```

### **3.4.6 Analytics Endpoints**

```
GET    /api/v1/students/:id/analytics          # Individual student performance
GET    /api/v1/classes/:id/analytics           # Class-wide analytics
GET    /api/v1/teachers/me/insights            # Teacher insights (error patterns)
GET    /api/v1/students/me/progress            # Student personal progress
POST   /api/v1/reports/generate                # Generate PDF/Excel report
GET    /api/v1/reports/:job_id/status          # Check report generation status
GET    /api/v1/reports/:job_id/download        # Download generated report
```

### **3.4.7 Communication Endpoints**

**Messages:**
```
GET    /api/v1/messages/conversations          # List conversations
GET    /api/v1/messages/thread/:user_id        # Message thread with user
POST   /api/v1/messages                        # Send new message
PATCH  /api/v1/messages/:id/read               # Mark message as read
```

**Notifications:**
```
GET    /api/v1/notifications                   # My notifications (paginated)
PATCH  /api/v1/notifications/:id/read          # Mark as read
POST   /api/v1/notifications/mark-all-read     # Mark all as read
GET    /api/v1/notifications/preferences       # Get preferences
PUT    /api/v1/notifications/preferences       # Update preferences
```

**Feedback:**
```
POST   /api/v1/assignments/:id/students/:student_id/feedback  # Provide feedback
PUT    /api/v1/feedback/:id                    # Update feedback
GET    /api/v1/assignments/:id/students/:student_id/feedback  # Get feedback
```

### **3.4.8 Material Endpoints**

```
GET    /api/v1/materials                       # Teacher's materials
POST   /api/v1/materials                       # Upload material
GET    /api/v1/materials/:id                   # Material detail
PUT    /api/v1/materials/:id                   # Update material
DELETE /api/v1/materials/:id                   # Delete material
POST   /api/v1/materials/:id/share             # Share with students/classes
GET    /api/v1/students/me/materials           # Student's shared materials
```

## 3.5 Request/Response Formats

**Standard Success Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Mathematics Assignment 1",
    "created_at": "2025-10-23T10:30:00Z"
  },
  "meta": {
    "timestamp": "2025-10-23T10:30:00Z"
  }
}
```

**Paginated Response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8,
    "next_page": 2,
    "prev_page": null
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-10-23T10:30:00Z"
  }
}
```

**Standard Error Codes:**

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | INVALID_INPUT | Validation error |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Duplicate resource |
| 422 | UNPROCESSABLE_ENTITY | Business logic error |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Maintenance or Dream Central Storage down |

## 3.6 Rate Limiting

**Strategy:** Token bucket algorithm per user + per IP

```python
# Rate limits by endpoint type
RATE_LIMITS = {
    "auth": "5/minute",        # Login attempts
    "read": "100/minute",      # GET requests
    "write": "30/minute",      # POST/PUT/DELETE
    "upload": "10/minute",     # File uploads
    "analytics": "20/minute",  # Heavy queries
}
```

**Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1635340800
```

## 3.7 API Documentation

**OpenAPI/Swagger:** Auto-generated by FastAPI

- Available at: `GET /api/v1/docs` (Swagger UI)
- Available at: `GET /api/v1/redoc` (ReDoc)
- OpenAPI JSON: `GET /api/v1/openapi.json`

**Example Route with OpenAPI Annotations:**

```python
@router.post(
    "/assignments",
    response_model=AssignmentResponse,
    status_code=201,
    summary="Create new assignment",
    description="Creates a new assignment and assigns it to specified students",
    tags=["assignments"]
)
async def create_assignment(
    assignment: AssignmentCreate,
    current_teacher: User = Depends(get_current_teacher)
) -> AssignmentResponse:
    """
    Create a new assignment:
    - **name**: Assignment title
    - **activity_id**: Reference to activity
    - **due_date**: Optional deadline
    - **student_ids** or **class_ids**: Assignment recipients
    """
    return await assignment_service.create(assignment, current_teacher)
```

---
