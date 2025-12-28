# Epic 17: User Creation Email & Validation Fixes

**Status:** Stories Created
**Type:** Brownfield Enhancement (Bug Fix)
**Created:** 2025-12-19
**Author:** John (PM Agent)

---

## Epic Goal

Fix the user creation dialogs for Publishers and Teachers to correctly validate email addresses, display proper success messages, and send welcome emails with initial passwords to newly created users.

---

## Epic Description

### Existing System Context

- **Current functionality:** Admins can create Publishers and Teachers via dialogs
- **Current bugs:**
  1. Dialog shows "password provided and no email address" error even when email is entered
  2. No email is sent to new users with their initial password
- **Technology stack:** FastAPI backend, React/TypeScript frontend, existing email infrastructure (from password reset Epic 11)
- **Integration points:**
  - Publisher creation dialog and API
  - Teacher creation dialog and API
  - Email service (already exists for password reset)

### Problem Statement

**Current behavior:**
1. Admin fills in email address for new Publisher/Teacher
2. Dialog incorrectly shows validation error about missing email
3. If creation succeeds, no email is sent to the user
4. User has no way to know their initial password

**Expected behavior:**
1. Admin fills in email address
2. Form validates correctly (no false errors)
3. User is created successfully
4. Welcome email is sent with initial password and login instructions

### Enhancement Details

**What's being fixed:**
1. Fix email validation logic in create user dialogs
2. Fix success message to not show contradictory information
3. Implement welcome email sending with initial password
4. Use existing email infrastructure from Epic 11

**How it integrates:**
- Fix frontend form validation
- Add email sending to user creation endpoints
- Create welcome email template
- Reuse email service from password reset feature

**Success criteria:**
- No false validation errors when creating users with valid email
- Clear, accurate success messages after user creation
- Welcome email sent to new Publishers and Teachers
- Email contains initial password and login instructions

---

## Stories

### Story 17.1: Fix User Creation Form Validation

**Story File:** [17.1.fix-user-creation-form-validation.md](./17.1.fix-user-creation-form-validation.md)

**Description:** Fix the validation logic in Publisher and Teacher creation dialogs that incorrectly reports email errors.

**Key deliverables:**
- Debug and fix email field validation in Publisher create dialog
- Debug and fix email field validation in Teacher create dialog
- Fix success/error message logic to show accurate information
- Ensure Zod schema matches form requirements
- Add unit tests for form validation

**Acceptance Criteria:**
- [ ] Valid email addresses pass validation without false errors
- [ ] Invalid emails correctly show validation error
- [ ] Success message does not mention "no email" when email is provided
- [ ] Form behaves consistently for both Publisher and Teacher creation
- [ ] Password field validation works correctly

---

### Story 17.2: Implement Welcome Email for New Users

**Story File:** [17.2.implement-welcome-email-new-users.md](./17.2.implement-welcome-email-new-users.md)

**Description:** Send a welcome email with initial password when creating Publishers, Teachers, or Supervisors.

**Key deliverables:**
- Create welcome email template (HTML + plain text)
- Update user creation endpoints to send welcome email
- Include initial password in email
- Include login URL and basic instructions
- Handle email send failures gracefully (log error, don't fail user creation)
- Apply to Publisher, Teacher, and Supervisor creation

**Email Content:**
- Subject: "Welcome to Dream LMS - Your Account Details"
- Body:
  - Greeting with user's name
  - Their username/email for login
  - Initial password
  - Login URL
  - Instruction to change password on first login
  - Contact info for support

**Acceptance Criteria:**
- [ ] Welcome email sent when Publisher is created
- [ ] Welcome email sent when Teacher is created
- [ ] Welcome email sent when Supervisor is created (Epic 14)
- [ ] Email contains correct initial password
- [ ] Email contains login URL
- [ ] Email failure doesn't prevent user creation
- [ ] Email logged for troubleshooting

---

## Technical Specifications

### Email Template

```html
<!-- templates/welcome_email.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .credentials { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .password { font-family: monospace; font-size: 18px; background-color: #FEF3C7; padding: 10px; border-radius: 4px; }
    .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Dream LMS!</h1>
    </div>
    <div class="content">
      <p>Hello {{ user_name }},</p>
      <p>Your Dream LMS account has been created. Here are your login credentials:</p>

      <div class="credentials">
        <p><strong>Login Email/Username:</strong> {{ username }}</p>
        <p><strong>Initial Password:</strong></p>
        <p class="password">{{ initial_password }}</p>
      </div>

      <p><strong>Important:</strong> For security, you will be required to change your password when you first log in.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{ login_url }}" class="button">Log In to Dream LMS</a>
      </p>

      <p>If you have any questions, please contact your administrator.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Dream LMS. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
```

### Backend Implementation

```python
# backend/app/services/email_service.py (extend existing)

async def send_welcome_email(
    email_to: str,
    user_name: str,
    username: str,
    initial_password: str
) -> None:
    """Send welcome email with initial password to new user."""
    settings = get_settings()

    subject = "Welcome to Dream LMS - Your Account Details"

    context = {
        "user_name": user_name,
        "username": username,
        "initial_password": initial_password,
        "login_url": f"{settings.FRONTEND_URL}/login"
    }

    html_content = render_template("welcome_email.html", context)
    plain_content = f"""
Welcome to Dream LMS!

Hello {user_name},

Your Dream LMS account has been created.

Login Email/Username: {username}
Initial Password: {initial_password}

Important: You will be required to change your password when you first log in.

Login URL: {settings.FRONTEND_URL}/login

If you have any questions, please contact your administrator.
"""

    await send_email(
        email_to=email_to,
        subject=subject,
        html_content=html_content,
        plain_content=plain_content
    )
```

### User Creation Endpoint Update

```python
# In user creation endpoint
@router.post("/publishers")
async def create_publisher(
    publisher_data: PublisherCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    # ... existing creation logic ...

    # Generate password
    initial_password = generate_secure_password()
    hashed_password = hash_password(initial_password)

    # Create user
    new_user = await create_user(session, publisher_data, hashed_password)

    # Send welcome email (fire-and-forget, don't fail on email error)
    try:
        await send_welcome_email(
            email_to=publisher_data.email,
            user_name=publisher_data.full_name,
            username=publisher_data.email,  # or username if using username auth
            initial_password=initial_password
        )
    except Exception as e:
        logger.error(f"Failed to send welcome email to {publisher_data.email}: {e}")
        # Don't raise - user creation succeeded

    return new_user
```

---

## Compatibility Requirements

- [x] Existing user creation APIs maintain same response format
- [x] Existing email infrastructure reused
- [x] Password hashing unchanged
- [x] First-login password change flow (Epic 11) continues to work
- [x] No changes to login flow

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Email delivery failures | Medium | Low | Fire-and-forget pattern; log failures; user still created |
| Password visible in email | Low | Medium | Email is standard practice; enforce password change on first login |
| Validation fix breaks other forms | Low | Medium | Thorough testing of all user creation forms |

**Rollback Plan:**
- Disable welcome email sending via environment flag
- Revert validation fix if issues found
- Users can still use password reset flow

---

## Definition of Done

- [ ] Email validation works correctly in Publisher creation dialog
- [ ] Email validation works correctly in Teacher creation dialog
- [ ] Success messages are accurate and clear
- [ ] Welcome email template created
- [ ] Welcome email sent for Publisher creation
- [ ] Welcome email sent for Teacher creation
- [ ] Welcome email sent for Supervisor creation
- [ ] Email contains correct password and login URL
- [ ] Email failure doesn't block user creation
- [ ] Unit tests for validation fixes
- [ ] Integration tests for email sending

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is a bug fix + enhancement for Dream LMS
- Integration points:
  - Publisher creation dialog (frontend)
  - Teacher creation dialog (frontend)
  - User creation API endpoints (backend)
  - Email service (existing from Epic 11)
- Existing patterns to follow:
  - Email templates from password reset feature
  - Form validation patterns from existing dialogs
- Critical compatibility requirements:
  - User creation API responses unchanged
  - First-login password change flow must work with emailed passwords
- Each story must verify the fix doesn't regress other functionality

The fix should resolve the validation bug and add welcome email functionality."

---

## Related Documentation

- [Story 11.1: Backend Secure Password Infrastructure](./11.1.backend-secure-password-infrastructure.md)
- [Story 11.2: Backend Password Reset Endpoint](./11.2.backend-password-reset-endpoint.md)
- [Story 7.7: Update User Creation Forms with Username](./7.7.update-user-creation-forms-with-username.md)
