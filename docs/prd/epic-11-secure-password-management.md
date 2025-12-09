# Epic 11: Secure Password Management & Email Notifications

**Estimated Effort:** 1-2 weeks | **Status:** Planning

## Brownfield Enhancement

This is a targeted enhancement to the existing user management system, improving security by removing plaintext password storage and adding email-based credential delivery.

---

## Epic Goal

Transform user creation from insecure plaintext password display to a secure workflow where temporary passwords are emailed to users, and first-time login forces password change. Admins/Publishers retain ability to reset passwords without seeing actual credentials.

---

## Existing System Context

- **Current Functionality:** Admin creates users and can see `initial_password` field in UI; Publishers can create teachers/students with similar visibility
- **Technology Stack:** FastAPI backend, PostgreSQL, React/TanStack Router frontend, existing email service integration
- **Integration Points:**
  - `User` model with `initial_password` field (backend/app/models.py)
  - `create_user` endpoint with email capability (backend/app/api/routes/users.py)
  - Admin pages for user management (frontend/src/routes/_layout/admin/)
  - Publisher pages for teacher/student management

---

## Enhancement Details

### What's Being Changed

1. **Remove plaintext password storage** - Delete `initial_password` field from User model
2. **Add force password change flag** - New `must_change_password` boolean field
3. **Email temporary credentials** - Send secure temporary password via email on user creation
4. **First-login password change** - Redirect users to password change screen on first login
5. **Admin password reset** - Generate new temporary password and email it (admin never sees it)
6. **Publisher parity** - Publishers have same secure workflow for teachers/students they create

### How It Integrates

- Extends existing User model with new field
- Modifies existing user creation endpoints
- Adds new password reset endpoint
- Frontend login flow adds password change redirect
- Uses existing email service infrastructure

### Success Criteria

- [ ] Admin/Publisher cannot see user passwords in any UI
- [ ] New users receive temporary password via email
- [ ] First login forces password change
- [ ] Password reset sends new temporary password via email
- [ ] Existing users unaffected (no forced password change)
- [ ] Works for all user creation flows (Admin→All roles, Publisher→Teacher/Student)

---

## Stories

### Story 11.1: Backend - Secure Password Infrastructure

**Description:** Replace `initial_password` with `must_change_password` flag, update user creation to generate temporary passwords and send via email.

**Acceptance Criteria:**
- Remove `initial_password` column from User model
- Add `must_change_password` boolean field (default: false)
- Update `create_user` to set `must_change_password=true` for new users
- Generate secure random temporary password
- Send temporary password via email (use existing email service)
- Add migration for schema changes

**Technical Notes:**
- Use `secrets.token_urlsafe(12)` for temporary password generation
- Leverage existing `generate_new_account_email` and `send_email` utilities
- Consider users without email (set `must_change_password=true`, admin must communicate password manually)

---

### Story 11.2: Backend - Password Reset Endpoint

**Description:** Add endpoint for admin/publisher to reset user password, generating new temporary password sent via email.

**Acceptance Criteria:**
- New endpoint `POST /api/v1/users/{user_id}/reset-password`
- Permission check: Admin can reset any user; Publisher can reset their teachers/students
- Generate new temporary password
- Set `must_change_password=true`
- Send new password via email
- Return success message (not the password)

**Technical Notes:**
- Reuse temporary password generation logic from 11.1
- Add appropriate permission decorators

---

### Story 11.3: Backend - First Login Password Change

**Description:** Modify login flow to check `must_change_password` flag and require password change.

**Acceptance Criteria:**
- Login endpoint returns `must_change_password` status in response
- Add endpoint `POST /api/v1/users/me/change-initial-password`
- Endpoint requires current (temporary) password and new password
- On success, set `must_change_password=false`
- Existing `update_password_me` endpoint should also clear the flag

**Technical Notes:**
- Consider token-based approach vs session-based
- Ensure user cannot access other endpoints until password changed (optional, can be frontend-only enforcement)

---

### Story 11.4: Frontend - Remove Password Display & Add Reset Button

**Description:** Update admin/publisher user management UIs to remove password display and add reset password functionality.

**Acceptance Criteria:**
- Remove password column/field from all user tables/forms
- Add "Reset Password" button for each user row
- Confirmation dialog before reset
- Success toast: "Password reset email sent to {email}"
- Handle users without email: Warning that password must be communicated manually
- Publisher UI has same functionality for their teachers/students

**Technical Notes:**
- Update admin pages: publishers.tsx, teachers.tsx, students.tsx, schools.tsx
- Update publisher pages similarly

---

### Story 11.5: Frontend - First Login Password Change Flow

**Description:** Implement frontend flow that forces password change on first login.

**Acceptance Criteria:**
- After login, check `must_change_password` from response
- If true, redirect to password change page (not dashboard)
- Password change form: Current password, New password, Confirm password
- Validation: Password strength requirements
- On success, redirect to appropriate dashboard
- Cannot navigate away until password changed

**Technical Notes:**
- Create new route `/change-password` or modal overlay
- Store `must_change_password` in auth context
- Protected route wrapper checks flag

---

## Compatibility Requirements

- [x] Existing users unaffected (no forced password change for existing accounts)
- [x] Existing APIs remain backward compatible
- [x] Database migration is non-destructive
- [x] Email service configuration unchanged

---

## Risk Mitigation

- **Primary Risk:** Users without email addresses won't receive credentials
- **Mitigation:**
  - UI shows warning when creating user without email
  - Admin can still see generated password in API response (one-time display)
  - Consider "copy to clipboard" button shown once during creation

- **Rollback Plan:**
  - Keep `initial_password` column nullable during transition
  - Feature flag to toggle between old/new behavior if needed

---

## Definition of Done

- [ ] All 5 stories completed with acceptance criteria met
- [ ] Existing user creation flows work with new security model
- [ ] Email delivery confirmed working
- [ ] No regression in existing authentication
- [ ] Migration tested on staging data
- [ ] Documentation updated (API docs if applicable)

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running FastAPI + React/TanStack Router
- Integration points: User model, create_user endpoint, login flow, admin/publisher UIs
- Existing patterns to follow: Current CRUD patterns, email service usage, permission decorators
- Critical compatibility requirements: Existing users must not be affected, APIs backward compatible
- Each story must include verification that existing functionality remains intact

The epic should maintain system integrity while delivering secure password management."
