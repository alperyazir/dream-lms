# Epic 14: Supervisor Role

**Status:** Draft
**Type:** Brownfield Enhancement
**Created:** 2025-12-19
**Author:** John (PM Agent)

---

## Epic Goal

Add a new "Supervisor" user role that has Admin-level permissions but with restricted deletion capabilities, enabling hierarchical user management where Supervisors can manage most users but cannot delete Admins or other Supervisors.

---

## Epic Description

### Existing System Context

- **Current functionality:** Four user roles exist (Admin, Publisher, Teacher, Student) with role-based access control
- **Technology stack:** FastAPI backend with SQLModel ORM, React/TypeScript frontend with Shadcn UI
- **Integration points:**
  - `UserRole` enum in `backend/app/models.py`
  - Role-based route permissions across all API endpoints
  - Frontend role-based navigation and UI components
  - Admin user management screens

### Enhancement Details

**What's being added:**
1. New `supervisor` value in the `UserRole` enum
2. Supervisor inherits Admin permissions with these restrictions:
   - Cannot delete Admin users
   - Cannot delete other Supervisor users
   - Can delete Publishers, Teachers, and Students
3. New "Supervisors" tab in Admin panel for CRUD operations on Supervisor users
4. Removal of "Danger Zone" (self-deletion) from all user profile areas

**How it integrates:**
- Database migration to add `supervisor` to UserRole enum
- Permission checks in delete endpoints for hierarchical restrictions
- New admin route `/admin/supervisors` for Supervisor management
- Frontend components extended to recognize and handle Supervisor role

**Success criteria:**
- Supervisors can perform all Admin actions except deleting Admins/Supervisors
- Admin users can create, edit, and delete Supervisor accounts
- Supervisors appear in dedicated management tab
- No user can delete their own account (Danger Zone removed)
- Existing Admin functionality remains unchanged

---

## Stories

### Story 14.1: Backend - Supervisor Role Infrastructure

**Description:** Add Supervisor role to the system with proper permissions and deletion restrictions.

**Key deliverables:**
- Add `supervisor` to `UserRole` enum
- Database migration for enum update
- Update permission decorators to include Supervisor with Admin-level access
- Implement hierarchical deletion restrictions in user delete endpoint:
  - Supervisors cannot delete Admins or other Supervisors
  - Admins can delete anyone except themselves
- Update user creation to support Supervisor role
- Add unit tests for new permission logic

**Acceptance Criteria:**
- [ ] `UserRole.supervisor` exists and persists correctly
- [ ] Supervisors have same API access as Admins (except deletion restrictions)
- [ ] DELETE `/api/v1/users/{id}` returns 403 for restricted deletions
- [ ] Self-deletion returns 403 for all roles
- [ ] Tests cover all permission scenarios

---

### Story 14.2: Backend - Supervisor CRUD Endpoints

**Description:** Create API endpoints for managing Supervisor users from Admin panel.

**Key deliverables:**
- `GET /api/v1/supervisors` - List all supervisors (Admin/Supervisor access)
- `POST /api/v1/supervisors` - Create new supervisor (Admin only)
- `GET /api/v1/supervisors/{id}` - Get supervisor details (Admin/Supervisor access)
- `PUT /api/v1/supervisors/{id}` - Update supervisor (Admin only)
- `DELETE /api/v1/supervisors/{id}` - Delete supervisor (Admin only)
- Reuse existing user creation patterns (password generation, email validation)

**Acceptance Criteria:**
- [ ] All CRUD endpoints functional and secured
- [ ] Only Admins can create/update/delete Supervisors
- [ ] Supervisors can view but not modify other Supervisors
- [ ] Proper validation and error messages
- [ ] Email notification on Supervisor account creation

---

### Story 14.3: Frontend - Supervisor Management UI

**Description:** Add Supervisor management tab to Admin panel and remove Danger Zone from all profiles.

**Key deliverables:**
- New "Supervisors" tab in Admin left navigation
- Supervisors list page with table view (matching existing Admin patterns)
- Create Supervisor dialog with form validation
- Edit Supervisor dialog
- Delete Supervisor confirmation
- Remove "Danger Zone" section from all user profile/settings pages
- Update role display badges to include Supervisor styling
- Supervisor dashboard (clone Admin dashboard with role-appropriate greeting)

**Acceptance Criteria:**
- [ ] Supervisors tab visible to Admin and Supervisor users
- [ ] CRUD operations work from UI with proper feedback
- [ ] Danger Zone removed from Admin, Publisher, Teacher, Student profiles
- [ ] Supervisor role badge displays correctly throughout app
- [ ] Supervisor sees Admin-like dashboard after login

---

## Technical Specifications

### Database Migration

```python
# Alembic migration: Add supervisor to UserRole enum
def upgrade():
    # PostgreSQL enum type update
    op.execute("ALTER TYPE userrole ADD VALUE 'supervisor'")

def downgrade():
    # Note: Removing enum values in PostgreSQL is complex
    # Would require recreating the enum type
    pass
```

### Permission Logic

```python
# backend/app/api/deps.py (updated)

def can_delete_user(current_user: User, target_user: User) -> bool:
    """Check if current user can delete target user."""
    # No one can delete themselves
    if current_user.id == target_user.id:
        return False

    # Admins can delete anyone (except themselves, handled above)
    if current_user.role == UserRole.admin:
        return True

    # Supervisors cannot delete Admins or other Supervisors
    if current_user.role == UserRole.supervisor:
        if target_user.role in [UserRole.admin, UserRole.supervisor]:
            return False
        return True

    # Other roles cannot delete users
    return False
```

### Frontend Route Updates

```typescript
// Add to admin routes
{
  path: '/admin/supervisors',
  element: <SupervisorsPage />,
  roles: ['admin', 'supervisor']
},
{
  path: '/admin/supervisors/:id',
  element: <SupervisorDetailPage />,
  roles: ['admin', 'supervisor']
}
```

### API Response Types

```typescript
// frontend/src/client/types.gen.ts (updated)
export type UserRole = 'admin' | 'supervisor' | 'publisher' | 'teacher' | 'student';
```

---

## Compatibility Requirements

- [x] Existing Admin functionality unchanged
- [x] Existing user management APIs backward compatible
- [x] All four original roles continue to work identically
- [x] Database migration is additive (new enum value)
- [x] Frontend gracefully handles new role (badge, permissions)

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Enum migration issues | Low | High | Test migration on staging first; have rollback script ready |
| Permission gaps | Medium | High | Comprehensive test suite for all role combinations |
| UI inconsistency | Low | Medium | Follow existing Admin patterns exactly |
| Session/token issues for new role | Low | Medium | Test login/logout cycle thoroughly |

**Rollback Plan:**
1. Disable Supervisor routes via feature flag
2. Reassign Supervisor users to Admin role via direct DB update
3. Remove migration (requires enum recreation in PostgreSQL)

---

## Definition of Done

- [ ] Supervisor role added to backend enum and database
- [ ] All CRUD endpoints for Supervisors functional
- [ ] Permission restrictions enforced (cannot delete Admin/Supervisor)
- [ ] Self-deletion blocked for all roles (Danger Zone removed)
- [ ] Supervisors tab in Admin navigation
- [ ] Supervisor management UI complete with list/create/edit/delete
- [ ] Supervisor badge styling consistent with design system
- [ ] All unit tests passing
- [ ] Integration tests for permission scenarios
- [ ] No regression in existing Admin/Publisher/Teacher/Student functionality

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to Dream LMS running FastAPI (Python) backend and React/TypeScript frontend
- Integration points:
  - UserRole enum in backend/app/models.py
  - Permission decorators in backend/app/api/deps.py
  - User management routes in backend/app/api/routes/
  - Admin navigation in frontend/src/routes/admin/
  - Role-based routing in frontend/src/routes/
- Existing patterns to follow:
  - User CRUD: Reference existing Publisher/Teacher management
  - Role badges: Follow existing UserRoleBadge component
  - Navigation: Mirror existing Admin sidebar structure
- Critical compatibility requirements:
  - Must not change behavior for existing four roles
  - Database migration must be reversible
- Each story must include verification that existing functionality remains intact

The epic should maintain system integrity while delivering the Supervisor role capability."

---

## Related Documentation

- [Story 9.2: Admin User Management Enhancements](./9.2.admin-user-management-enhancements.md)
- [Architecture: Tech Stack](../architecture/tech-stack.md)
