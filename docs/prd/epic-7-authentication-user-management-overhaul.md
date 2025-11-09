# Epic 7: Authentication & User Management Overhaul

**Epic Goal:**

Transform the authentication system from open self-registration with email-only login to a secure hierarchical user management system. Add username field as primary login identifier, remove public signup, implement role-based user creation permissions (Admin→All, Publisher→Teacher/Student, Teacher→Student), clean all mock data except admin, and update UI/API for username-based operations.

**Current State:**
- ✅ JWT authentication with email-only login
- ✅ Public self-registration via `/signup` endpoint
- ✅ Mock data seeded in `init_db()` (publisher, teacher, 2 students)
- ✅ Hardcoded quick test login buttons on login page
- ✅ User model has email field only (no username)

**What We Build in This Epic:**
- ✅ Add `username` field to User model (unique, indexed)
- ✅ Update login to accept username OR email
- ✅ Remove signup route and UI completely
- ✅ Implement hierarchical user creation permissions with role checks
- ✅ Clean all mock data from database (keep only admin user)
- ✅ Dynamic quick test login based on actual users in database
- ✅ Update all user creation forms to include username
- ✅ Update all API endpoints to support username operations

---

## Story 7.1: Add Username Field to User Model

As a **developer**,
I want **to add a username field to the User model and database schema**,
so that **users can log in with username instead of email**.

### Acceptance Criteria:

1. Add `username` field to `UserBase` model in `backend/app/models.py`:
   - `username: str = Field(unique=True, index=True, min_length=3, max_length=50)`
2. Update `UserCreate` schema to require username field
3. Update `UserRegister` schema to include username (for future use if needed)
4. Update `UserUpdate` and `UserUpdateMe` schemas to allow username modification
5. Create Alembic migration: `alembic revision --autogenerate -m "add_username_to_user"`
6. Migration adds `username` column to `users` table with unique constraint and index
7. Update seed script in `backend/app/core/db.py` to assign usernames:
   - Admin: `username="admin"`
   - Publisher: `username="publisher1"`
   - Teacher: `username="teacher1"`
   - Students: `username="student1"`, `username="student2"`
8. Update `crud.get_user_by_email()` to also support `crud.get_user_by_username()`
9. Add validation in user creation to check both email AND username uniqueness
10. Unit tests verify username uniqueness constraint
11. Integration tests verify username-based user retrieval

### Integration Verification:

- **IV1**: Existing email-based authentication still works after migration
- **IV2**: All existing user records have valid usernames after migration
- **IV3**: Database migration is reversible (down migration removes username column)

---

## Story 7.2: Update Login System for Username/Email Support

As a **user**,
I want **to log in with either my username OR email**,
so that **I have flexible login options**.

### Acceptance Criteria:

1. Update `login_access_token()` endpoint in `backend/app/api/routes/login.py`:
   - Accept `username` parameter (rename from OAuth2 required field)
   - Check if input matches username pattern or email pattern
   - Query database by username first, fall back to email
   - Return same JWT token with user info
2. Update login form in `frontend/src/routes/login.tsx`:
   - Change input field label to "Username or Email"
   - Update placeholder text: "Enter username or email"
   - Remove email-specific validation pattern
   - Keep general required validation
3. Update `Body_login_login_access_token` TypeScript type in frontend schemas
4. Update form validation to accept both username and email formats
5. Update error messages to be format-agnostic ("Invalid credentials" instead of "Invalid email")
6. Integration tests verify login works with both username and email
7. Frontend tests verify form accepts both formats

### Integration Verification:

- **IV1**: Existing users can log in with their email addresses
- **IV2**: Users can also log in with their new usernames
- **IV3**: Invalid credentials return appropriate error message
- **IV4**: JWT token payload remains unchanged (contains user_id and role)

---

## Story 7.3: Remove Public Signup Route and UI

As a **system administrator**,
I want **to completely remove the public self-registration feature**,
so that **only authorized users can create accounts through hierarchical permissions**.

### Acceptance Criteria:

1. **Backend Changes**:
   - Remove `/signup` endpoint from `backend/app/api/routes/users.py`
   - Remove `register_user()` function
   - Keep `UserRegister` schema for potential future internal use
   - Update OpenAPI documentation to reflect removed endpoint
2. **Frontend Changes**:
   - Delete `frontend/src/routes/signup.tsx` file entirely
   - Remove signup route from router configuration
   - Update login page `frontend/src/routes/login.tsx`:
     - Remove "Don't have an account? Sign Up" link
     - Remove import for RouterLink to `/signup`
   - Remove any other UI references to signup/registration
3. **Navigation Updates**:
   - Ensure no sidebar or navbar links point to `/signup`
   - Remove signup from any breadcrumb or navigation components
4. **Error Handling**:
   - Add 404 handler for anyone trying to access `/signup` route
   - Return clear error message: "Public registration is disabled"
5. Integration tests verify `/signup` endpoint returns 404
6. Frontend tests verify signup route is not accessible
7. Manual testing confirms no UI path to signup page exists

### Integration Verification:

- **IV1**: Existing login functionality works without signup route
- **IV2**: No broken links or navigation errors in frontend
- **IV3**: API documentation accurately reflects available endpoints
- **IV4**: Unauthenticated users see only login page

---

## Story 7.4: Implement Hierarchical User Creation Permissions

As a **system administrator**,
I want **role-based user creation permissions enforced across the system**,
so that **admins create all users, publishers create teachers/students, and teachers create students**.

### Acceptance Criteria:

1. **Backend Permission Logic**:
   - Update `backend/app/api/routes/admin.py` user creation endpoints:
     - `/admin/publishers` - Admin only (existing, verify enforcement)
     - `/admin/teachers` - Admin AND Publisher (new permission)
     - `/admin/students` - Admin, Publisher, AND Teacher (new permission)
   - Create new dependency `require_role_any()` in `backend/app/api/deps.py`:
     - Accepts list of allowed roles: `require_role_any([UserRole.admin, UserRole.publisher])`
     - Returns current user if role matches any in list
     - Raises 403 Forbidden if role doesn't match
2. **Publisher User Creation**:
   - Add new endpoint: `POST /admin/teachers` (Publisher can create teachers)
   - Add new endpoint: `POST /admin/students` (Publisher can create students)
   - Ensure publisher can only assign teachers to their own schools
   - Ensure publisher can only create students within their organization
3. **Teacher User Creation**:
   - Add new endpoint: `POST /teacher/students` (Teacher can create students)
   - Teacher can only create students for their classes
   - Auto-enroll created students in teacher's class
4. **Permission Validation**:
   - Admin creating users: no restrictions
   - Publisher creating teachers: must specify school_id they own
   - Publisher creating students: can create for any teacher in their schools
   - Teacher creating students: students auto-assigned to their classes
5. **Username Generation**:
   - All user creation endpoints must accept and validate username
   - Username uniqueness validated before user creation
   - Return temporary password in creation response
6. Update API documentation with permission requirements
7. Unit tests for each permission level
8. Integration tests verify cross-role creation attempts fail with 403

### Integration Verification:

- **IV1**: Admin can still create all user types
- **IV2**: Publisher attempting to create users in another publisher's schools fails
- **IV3**: Teacher attempting to create teachers or publishers fails with 403
- **IV4**: Student cannot create any users (no endpoints accessible)
- **IV5**: Existing user creation workflows remain functional

---

## Story 7.5: Clean Mock Data from Database

As a **system administrator**,
I want **all mock/test data removed from the database initialization**,
so that **production systems start with only an admin user and real data**.

### Acceptance Criteria:

1. Update `backend/app/core/db.py` in `init_db()` function:
   - **KEEP**: Admin user creation (lines 40-51)
   - **REMOVE**: All mock publisher user creation (lines 53-74)
   - **REMOVE**: All mock school creation (lines 76-85)
   - **REMOVE**: All mock teacher user creation (lines 87-103)
   - **REMOVE**: All mock student users creation (lines 104-123)
   - **REMOVE**: All mock class creation (lines 126-138)
   - **REMOVE**: All mock class enrollments (lines 140-148)
   - **REMOVE**: All mock book creation (lines 150-160)
   - **REMOVE**: All mock activities creation (lines 162-199)
   - **REMOVE**: All mock assignment creation (lines 202-227)
2. Update admin user creation to include username:
   - `username="admin"` in `UserCreate`
3. Ensure `init_db()` only creates single admin superuser
4. Update or remove any seed scripts that reference mock data
5. Add database reset script for development: `scripts/reset_db.sh`
   - Drops all tables
   - Runs migrations
   - Runs init_db (creates only admin)
6. Update development documentation with new initialization process
7. Create migration script to clean existing databases
8. Unit tests verify init_db creates only admin user
9. Integration tests verify clean database state

### Integration Verification:

- **IV1**: Admin user is created successfully with username="admin"
- **IV2**: Database has zero publishers, teachers, students after init
- **IV3**: Application starts without errors (no foreign key violations)
- **IV4**: Admin can log in immediately after initialization
- **IV5**: API endpoints handle empty data states gracefully

---

## Story 7.6: Dynamic Quick Test Login

As a **developer**,
I want **the quick test login buttons to dynamically show actual users from the database**,
so that **I can easily test with real users instead of hardcoded mock data**.

### Acceptance Criteria:

1. **Backend API Endpoint**:
   - Create `GET /api/dev/quick-login-users` endpoint in `backend/app/api/routes/dev.py`
   - Only accessible in development mode (check `settings.ENVIRONMENT`)
   - Returns list of users grouped by role:
     ```json
     {
       "admin": [{"username": "admin", "email": "admin@example.com"}],
       "publisher": [{"username": "pub1", "email": "pub1@example.com"}],
       "teacher": [{"username": "teacher1", "email": "teacher1@example.com"}],
       "student": [{"username": "student1", "email": "student1@example.com"}]
     }
     ```
   - Limit to 5 users per role
   - Sort by created_at descending (newest first)
2. **Frontend Implementation**:
   - Update `frontend/src/routes/login.tsx`:
     - Add `useQuery` to fetch quick login users on component mount
     - Only make request if `import.meta.env.DEV` is true
     - Render buttons dynamically based on API response
     - Show first 2 users per role (or all if less than 2)
     - Button format: `{role_emoji} {username}` (e.g., "👑 admin")
     - On click, pass `username` instead of email to login
3. **Fallback Handling**:
   - If API returns no users for a role, hide that section
   - If API fails, show error message: "Quick login unavailable"
   - If only admin exists, show only admin button
4. **UI Updates**:
   - Keep existing emoji icons (👑 Admin, 📚 Publisher, 🍎 Teacher, 🎓 Student)
   - Add username label to each button
   - Maintain grid layout (2 columns)
   - Add tooltip showing full email on hover
5. Unit tests for API endpoint
6. Frontend tests for dynamic button rendering
7. Manual testing with various user counts (0, 1, 2, 5+ per role)

### Integration Verification:

- **IV1**: Quick login works in development mode only
- **IV2**: Production builds do not include quick login section
- **IV3**: Login functionality works with dynamically loaded users
- **IV4**: Test login passes username to login endpoint successfully
- **IV5**: No console errors when no users exist for a role

---

## Story 7.7: Update User Creation Forms with Username

As a **administrator/publisher/teacher**,
I want **all user creation forms to include a username field**,
so that **I can create users with both username and email**.

### Acceptance Criteria:

1. **Admin Publisher Creation Form** (`frontend/src/routes/_layout/admin/publishers.tsx`):
   - Add username input field to create publisher modal
   - Validation: required, 3-50 characters, alphanumeric + underscore/hyphen
   - Position: above email field
   - Update form submission to include username
2. **Admin Teacher Creation Form** (`frontend/src/routes/_layout/admin/teachers.tsx`):
   - Add username input field to create teacher modal
   - Same validation as publisher form
   - Update form submission to include username
3. **Admin Student Creation Form** (`frontend/src/routes/_layout/admin/students.tsx`):
   - Add username input field to create student modal
   - Same validation as publisher form
   - Update form submission to include username
4. **Publisher-specific Forms** (if separate components exist):
   - Add username field to teacher creation
   - Add username field to student creation
   - Enforce same validation rules
5. **Teacher Student Creation** (if UI exists):
   - Add username field to student creation form
   - Same validation rules
6. **Form Validation**:
   - Client-side: regex pattern `/^[a-zA-Z0-9_-]{3,50}$/`
   - Display error: "Username must be 3-50 characters, alphanumeric, underscore, or hyphen"
   - Real-time uniqueness check (optional): debounced API call
7. **Display Updates**:
   - User list tables show username column
   - Sort by username option in table headers
   - Search/filter supports username
8. Update TypeScript schemas for all user creation types
9. Frontend tests for form validation
10. Integration tests for form submission with username

### Integration Verification:

- **IV1**: Existing user creation workflows work with new username field
- **IV2**: Form validation catches invalid usernames before submission
- **IV3**: Backend username uniqueness validation works correctly
- **IV4**: User lists display username alongside email
- **IV5**: No layout breakage in responsive design

---

## Story 7.8: Update API Response Schemas with Username

As a **developer**,
I want **all API responses to include username in user objects**,
so that **frontend can display and use username consistently**.

### Acceptance Criteria:

1. Update `UserPublic` schema in `backend/app/models.py`:
   - Ensure `username` field is included in response
2. Update `PublisherPublic`, `TeacherPublic`, `StudentPublic` schemas:
   - Include `user_username` field alongside `user_email` and `user_full_name`
   - Populate from joined User relationship
3. Update all user listing endpoints to return username:
   - `GET /api/users/` (admin user list)
   - `GET /api/admin/publishers`
   - `GET /api/admin/teachers`
   - `GET /api/admin/students`
4. Update `UserCreationResponse` schema:
   - Include username in response
5. Regenerate frontend TypeScript schemas:
   - Run schema generation script
   - Verify `UserPublic` interface includes username
   - Update imports in affected components
6. Update serialization logic in CRUD functions:
   - `crud.create_publisher()` → populate user_username
   - `crud.create_teacher()` → populate user_username
   - `crud.create_student()` → populate user_username
7. Update API documentation (OpenAPI schema)
8. Unit tests verify username in all responses
9. Integration tests verify schema compliance

### Integration Verification:

- **IV1**: All existing API endpoints return valid responses with username
- **IV2**: Frontend TypeScript compilation succeeds with new schemas
- **IV3**: No breaking changes to existing API consumers
- **IV4**: API documentation accurately reflects schema changes

---

## Epic Completion Checklist

- [ ] All 8 stories completed with acceptance criteria met
- [ ] Database migration applied successfully
- [ ] All tests passing (unit, integration, E2E)
- [ ] API documentation updated
- [ ] Username-based login works in production
- [ ] Public signup completely removed
- [ ] Hierarchical user creation permissions enforced
- [ ] Mock data cleaned from initialization
- [ ] Quick test login shows real users
- [ ] All forms include username field
- [ ] All API responses include username

---

## Rollback Plan

If issues are discovered post-deployment:

1. **Database Rollback**:
   - Run down migration: `alembic downgrade -1`
   - Removes username column and constraints
2. **Code Rollback**:
   - Revert to previous git tag/commit
   - Redeploy backend and frontend
3. **Data Recovery**:
   - Username data is not critical (can be regenerated)
   - Email-based login still works during rollback
4. **Partial Rollback**:
   - Can keep username field but revert login changes
   - Can keep removed signup but delay permission enforcement

---

## Security Considerations

1. **Username Enumeration**:
   - Login errors should not reveal whether username exists
   - Use generic "Invalid credentials" message
2. **SQL Injection**:
   - All username queries use parameterized statements
   - SQLModel ORM handles escaping
3. **Brute Force Protection**:
   - Existing rate limiting applies to username login
   - Consider adding account lockout after failed attempts
4. **Permission Bypass**:
   - All endpoints must use `require_role()` or `require_role_any()`
   - No direct user creation without permission check

---

## Performance Considerations

1. **Database Indexes**:
   - Username column has unique index (fast lookups)
   - No performance degradation for login queries
2. **Quick Login API**:
   - Cached in frontend (query on mount only)
   - Limited to 5 users per role (small payload)
3. **Form Validation**:
   - Client-side validation prevents unnecessary API calls
   - Debounced uniqueness check (if implemented)

---

## Documentation Updates Required

1. **User Documentation**:
   - Update "Getting Started" guide with username login
   - Remove signup instructions
   - Add hierarchical user creation guide for each role
2. **Developer Documentation**:
   - Update API documentation with new endpoints
   - Document permission model
   - Update database schema diagrams
3. **Deployment Documentation**:
   - Migration instructions
   - Data cleanup procedures
   - Rollback procedures
