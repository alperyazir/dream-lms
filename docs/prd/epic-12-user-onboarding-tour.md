# Epic 12: User Onboarding Tour

**Estimated Effort:** 1 week | **Status:** Planning

## Brownfield Enhancement

This is a focused enhancement to improve new user experience by providing an interactive guided tour of the application UI on first login.

---

## Epic Goal

Introduce an interactive onboarding tour that guides new users (Teachers, Students, Publishers) through key UI elements on their first login, with the ability to skip and never show again.

---

## Existing System Context

- **Current Functionality:** Users log in and land directly on their role-specific dashboard with no guidance
- **Technology Stack:** React 18, TanStack Router, Shadcn UI, Tailwind CSS
- **Integration Points:**
  - Login flow and authentication context
  - Role-specific dashboard routes
  - User model (backend) for persistence

---

## Enhancement Details

### What's Being Added

1. **Tour library integration** - Add React Joyride or similar for guided tours
2. **Role-specific tour steps** - Different tours for Teacher, Student, Publisher roles
3. **Tour completion tracking** - Backend flag to track if user has completed/skipped tour
4. **Skip functionality** - Users can skip tour at any time and dismiss permanently
5. **Admin exclusion** - Admins do not see onboarding tour (power users)

### How It Integrates

- New `has_completed_tour` field on User model
- Tour component wraps main layout after login
- Checks tour status on dashboard mount
- API endpoint to mark tour as completed

### Success Criteria

- [ ] New users see tour on first login
- [ ] Tour highlights key UI elements for each role
- [ ] Skip button dismisses tour permanently
- [ ] Completing tour marks it as done
- [ ] Returning users don't see tour again
- [ ] Admin users never see tour
- [ ] Tour is accessible and doesn't break navigation

---

## Stories

### Story 12.1: Backend - Tour Completion Tracking

**Description:** Add database field and API endpoint to track tour completion status.

**Acceptance Criteria:**
- Add `has_completed_tour` boolean field to User model (default: false)
- Migration script for new field
- Login response includes `has_completed_tour` status
- New endpoint `POST /api/v1/users/me/complete-tour` to mark tour as done
- Endpoint sets `has_completed_tour=true`

**Technical Notes:**
- Simple boolean flag, no complex tour progress tracking needed
- Consider adding `tour_completed_at` timestamp for analytics (optional)

---

### Story 12.2: Frontend - Tour Library Integration & Infrastructure

**Description:** Set up tour library and create reusable tour infrastructure.

**Acceptance Criteria:**
- Install and configure React Joyride (or alternative: Shepherd.js, Intro.js)
- Create `TourProvider` component to wrap application
- Create `useTour` hook for tour control
- Tour state management (active, step index, completed)
- Skip functionality that calls API and dismisses tour
- Styling matches Shadcn UI / neumorphic design system

**Technical Notes:**
- React Joyride recommended for React ecosystem compatibility
- Custom tooltip styling to match existing UI
- Consider accessibility (keyboard navigation, screen readers)

---

### Story 12.3: Frontend - Role-Specific Tour Content

**Description:** Create tour step definitions for each user role highlighting their key UI elements.

**Acceptance Criteria:**

**Teacher Tour Steps:**
1. Welcome message introducing Dream LMS
2. Dashboard overview (assignments, classes)
3. Books section - browse and preview books
4. Create Assignment button/flow
5. Analytics section - view student progress
6. Messages - communicate with students
7. Settings/Profile

**Student Tour Steps:**
1. Welcome message
2. Dashboard - your assignments
3. Assignment card - how to start activities
4. Progress tracking
5. Messages from teacher

**Publisher Tour Steps:**
1. Welcome message
2. Dashboard overview
3. Books management
4. Schools/Teachers assignment
5. Analytics overview

**Technical Notes:**
- Tour steps target existing UI elements by CSS selectors or refs
- Steps should be resilient to minor UI changes
- Consider lazy loading tour definitions per role

---

### Story 12.4: Frontend - Tour Trigger & Flow Integration

**Description:** Integrate tour into login flow, triggering automatically for new users.

**Acceptance Criteria:**
- After successful login, check `has_completed_tour` from auth context
- If false and user is not admin, start tour automatically
- Tour overlays on top of dashboard
- Clicking outside or pressing Escape offers "Skip tour?" confirmation
- Completing all steps calls API to mark complete
- Skip button calls API to mark complete (won't show again)
- Tour doesn't show for admin role

**Technical Notes:**
- Integrate with existing auth context
- Consider small delay before starting tour (let UI render)
- Handle edge case: user refreshes mid-tour (restart or skip)

---

## Compatibility Requirements

- [x] Existing login flow unchanged
- [x] Dashboard functionality unaffected when tour is active
- [x] Tour doesn't interfere with navigation
- [x] Mobile responsive (tour works on smaller screens)

---

## Risk Mitigation

- **Primary Risk:** Tour selectors break if UI elements change
- **Mitigation:**
  - Use stable data-testid attributes for tour targets
  - Tour gracefully skips missing elements
  - Add tour step validation in development mode

- **Rollback Plan:**
  - Tour component can be disabled via environment variable
  - Setting `has_completed_tour=true` for all users skips tour

---

## Definition of Done

- [ ] All 4 stories completed with acceptance criteria met
- [ ] Tour works for Teacher, Student, and Publisher roles
- [ ] Admin users excluded from tour
- [ ] Skip and complete functionality working
- [ ] Tour completion persisted to database
- [ ] No regression in existing login/dashboard functionality
- [ ] Responsive design verified

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running React + TanStack Router + Shadcn UI
- Integration points: Login flow, auth context, User model, role-specific dashboards
- Existing patterns to follow: Shadcn UI components, existing context patterns, API service patterns
- Critical compatibility requirements: Tour must not break existing navigation or dashboard functionality
- Each story must include verification that existing functionality remains intact

The epic should maintain system integrity while delivering an engaging onboarding experience for new users."
