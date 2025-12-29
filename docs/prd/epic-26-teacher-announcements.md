# Epic 26: Teacher Announcements - Brownfield Enhancement

**Status:** Draft
**Epic Owner:** Product Management
**Target Release:** TBD
**Story Count:** 2 stories

---

## Epic Goal

Enable teachers to broadcast important information to students through a rich-text announcement system that integrates with existing notifications, allowing targeted communication to individual students or entire classrooms while maintaining a persistent announcement history.

---

## Epic Description

### Existing System Context

**Current Relevant Functionality:**
- Notification system with `NotificationType` enum and notification service
- Direct messaging between teachers and students
- Student dashboard with cards for various features
- Teacher dashboard and class management
- RBAC system with teacher and student roles

**Technology Stack:**
- Backend: FastAPI, SQLModel, PostgreSQL, Alembic migrations
- Frontend: React 18, TypeScript, TanStack Query, Shadcn UI
- Notifications: Existing notification service and display system
- Rich text: Will integrate rich text editor (Tiptap or similar)

**Integration Points:**
- Existing notification service (`backend/app/services/notification_service.py`)
- Student dashboard (`frontend/src/routes/_layout/student/dashboard.tsx`)
- Teacher routes (`backend/app/api/routes/teachers.py`)
- Navbar notification bell and badge

### Enhancement Details

**What's Being Added:**
- New `Announcement` database model with rich text content storage
- Teacher UI for creating/editing/deleting announcements with rich text editor
- Recipient selection: target individual students OR select entire classroom(s)
- Student dashboard widget showing recent unread announcements
- Integration with existing notification system for announcement delivery
- Mark-as-read functionality for students
- Announcement history view for both teachers (sent) and students (received)

**How It Integrates:**
- Extends existing notification system with new `NotificationType.announcement`
- Follows existing API route patterns (`/api/v1/announcements`)
- Uses existing RBAC with `require_role(UserRole.teacher)` for creation endpoints
- Reuses existing dashboard card patterns on student side
- Follows existing data fetching patterns with TanStack Query hooks
- Follows existing HTML sanitization patterns (like messaging system)

**Success Criteria:**
1. Teachers can create announcements with rich text formatting targeting students/classrooms
2. Students receive notifications for new announcements immediately
3. Announcements display prominently on student dashboard with unread count
4. Teachers can view, edit, and delete their announcement history
5. Students can mark announcements as read and view announcement history
6. Existing notification functionality remains completely unchanged
7. No performance degradation on student dashboard or notification loading

---

## Stories

### Story 1: Teacher Announcement Creation & Management

**Scope:**
- Backend: Create `Announcement` database model with fields (id, teacher_id, title, content, created_at, updated_at)
- Backend: Create `AnnouncementRecipient` junction table for tracking recipients
- Backend: Implement recipient selection logic (individual students + classrooms expansion)
- Backend: API endpoints - POST, GET, PUT, DELETE `/api/v1/announcements`
- Backend: Integration with notification service to create notifications for recipients
- Backend: HTML sanitization for rich text content (XSS prevention)
- Frontend: Teacher announcement creation page with rich text editor (Tiptap)
- Frontend: Recipient selector component (student picker + classroom multi-select)
- Frontend: Announcement history page for teachers (list view with edit/delete actions)
- Frontend: Announcement edit modal/page
- Database: Alembic migration for `announcements` and `announcement_recipients` tables

**Acceptance Criteria:**
1. Teachers can create announcements with formatted text (bold, italic, lists, etc.)
2. Teachers can select individual students from their classes
3. Teachers can select entire classrooms (all students in classroom receive it)
4. Rich text content is properly sanitized to prevent XSS
5. Notifications are created for all recipients when announcement is posted
6. Teachers can view list of all their announcements
7. Teachers can edit announcement title and content
8. Teachers can delete announcements (soft delete recommended)
9. API endpoints follow existing patterns and have proper error handling
10. Tests cover CRUD operations and recipient selection logic

### Story 2: Student Announcement Display & Read Tracking

**Scope:**
- Backend: Add `AnnouncementRead` tracking table (announcement_id, student_id, read_at)
- Backend: API endpoints - GET unread announcements, PATCH mark as read
- Backend: Query optimization for announcement retrieval with read status
- Frontend: Student dashboard announcement widget (similar to UpcomingAssignmentsList)
- Frontend: Announcement detail view (modal or dedicated page)
- Frontend: Mark-as-read functionality (manual and auto-mark on view)
- Frontend: Announcement history page for students (all received announcements)
- Frontend: Unread announcement count in navbar badge
- Integration: Display announcements in existing notification dropdown
- Integration: Link from notification to announcement detail view

**Acceptance Criteria:**
1. Student dashboard shows unread announcements prominently
2. Students can click announcement to view full content with rich text rendering
3. Students can manually mark announcements as read
4. Announcements auto-mark as read when viewed in detail
5. Unread count displays in navbar notification badge
6. Announcements appear in notification dropdown with proper icon
7. Students can view history of all received announcements
8. Read status persists across sessions
9. Performance: Dashboard loads quickly even with many announcements (pagination)
10. Existing notification functionality unaffected (regression tests pass)

---

## Compatibility Requirements

- [x] **Existing APIs remain unchanged** - New endpoints only, no modifications to existing notification/messaging APIs
- [x] **Database schema changes are additive** - New tables only, no modifications to existing tables
- [x] **UI changes follow existing patterns** - Uses Shadcn UI components, follows dashboard card patterns
- [x] **Performance impact is minimal** - Indexed queries, pagination for lists, lazy loading
- [x] **Existing messaging system unaffected** - Separate announcement system
- [x] **Existing dashboard components continue to work** - New widget added, existing widgets unchanged

---

## Technical Considerations

### Database Schema (Preliminary)

**announcements table:**
```sql
- id: UUID (PK)
- teacher_id: UUID (FK to teachers.id)
- title: VARCHAR(200)
- content: TEXT (sanitized HTML)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- deleted_at: TIMESTAMP (nullable, for soft delete)
```

**announcement_recipients table:**
```sql
- id: UUID (PK)
- announcement_id: UUID (FK to announcements.id)
- student_id: UUID (FK to students.id)
- created_at: TIMESTAMP
- INDEX on (student_id, created_at) for fast student queries
```

**announcement_reads table:**
```sql
- id: UUID (PK)
- announcement_id: UUID (FK to announcements.id)
- student_id: UUID (FK to students.id)
- read_at: TIMESTAMP
- UNIQUE constraint on (announcement_id, student_id)
```

### Rich Text Editor

**Recommended:** Tiptap (React wrapper available)
- Lightweight and extensible
- Good TypeScript support
- Easy to customize toolbar
- Built-in XSS protection with proper configuration

### Notification Integration

Add new notification type:
```python
class NotificationType(str, Enum):
    # ... existing types
    announcement = "announcement"
```

Create notifications on announcement creation:
```python
for student_id in recipient_student_ids:
    await create_notification(
        db=db,
        user_id=student_id,
        notification_type=NotificationType.announcement,
        title=announcement.title,
        message=f"New announcement from {teacher_name}",
        link=f"/student/announcements/{announcement.id}"
    )
```

---

## Risk Mitigation

### Primary Risks

**Risk 1: Notification Spam**
- Teachers sending announcements to multiple large classrooms could flood student notifications
- **Mitigation:**
  - UI warning when selecting multiple classrooms
  - Confirmation dialog showing total recipient count before sending
  - Consider rate limiting (e.g., max 5 announcements per hour per teacher)
  - Backend processing for large recipient lists (background job if >100 recipients)

**Risk 2: Rich Text XSS Vulnerabilities**
- User-generated HTML content poses XSS risk
- **Mitigation:**
  - Use existing sanitization patterns from messaging system
  - Server-side HTML sanitization with `bleach` library
  - Whitelist allowed HTML tags (p, br, strong, em, ul, ol, li, h1-h3)
  - Strip all JavaScript and dangerous attributes
  - Content Security Policy headers

**Risk 3: Performance Impact**
- Loading announcements on every dashboard view could slow page load
- **Mitigation:**
  - Pagination (show only 5 most recent on dashboard)
  - Lazy loading for announcement history
  - Database indexes on student_id and created_at
  - TanStack Query caching (5-minute stale time)

### Rollback Plan

**If issues arise:**
1. **Database:** Alembic migration can be rolled back (all changes are additive)
2. **Feature Flag:** Add `ANNOUNCEMENTS_ENABLED` environment variable
3. **Frontend:** Remove announcement widget from student dashboard via feature flag check
4. **Backend:** Disable API endpoints via feature flag
5. **Notifications:** New notification type won't affect existing types

**Rollback is clean because:**
- No modifications to existing tables
- No changes to existing API endpoints
- New feature is isolated and can be toggled off

---

## Definition of Done

**Epic Completion Criteria:**
- [x] All 2 stories completed with acceptance criteria met
- [x] Teacher can create/edit/delete announcements with rich text
- [x] Teacher can select individual students or classrooms as recipients
- [x] Students receive notifications for new announcements
- [x] Students see announcements on dashboard with unread count
- [x] Students can mark announcements as read
- [x] Both teachers and students can view announcement history
- [x] Rich text content properly sanitized (XSS tests pass)
- [x] Existing notification functionality verified through regression tests
- [x] Integration with notification system working correctly
- [x] Documentation updated:
  - API documentation (OpenAPI/Swagger)
  - User guide for teachers (how to create announcements)
  - Database schema documentation
- [x] No regression in existing features:
  - Notification system continues to work
  - Messaging system unaffected
  - Dashboard loads without performance degradation
- [x] All tests passing:
  - Unit tests for backend services
  - API endpoint tests
  - Frontend component tests
  - E2E test for full announcement flow

---

## Dependencies

### External Libraries
- **Frontend:** Tiptap (or similar rich text editor for React)
  - Need to evaluate: Tiptap vs. Quill vs. Draft.js
  - Recommendation: Tiptap (best TypeScript support, extensible)

### Internal Dependencies
- Existing notification service must remain stable
- Existing student/classroom relationship data (ClassStudent table)
- Existing teacher authentication and RBAC

---

## Future Enhancements (Out of Scope for This Epic)

- Scheduled announcements (publish at future date/time)
- Announcement templates for common messages
- Attachment support (files, images)
- Pinned/urgent announcements
- Announcement analytics (view counts, read rates)
- Email notifications for announcements (in addition to in-app)
- Announcement categories/tags
- Draft announcements (save without publishing)

---

## Success Metrics (Post-Launch)

**Adoption Metrics:**
- % of teachers who create at least one announcement in first month
- Average announcements per teacher per week
- Average time from announcement creation to first student read

**Engagement Metrics:**
- % of announcements marked as read within 24 hours
- Average time to mark announcement as read
- Click-through rate from notification to announcement detail

**Quality Metrics:**
- Number of announcements edited after posting (indicates clarity issues)
- Number of announcements deleted after posting (indicates errors)
- Support tickets related to announcement feature

---

## Notes

- This epic follows existing system patterns and requires no architectural changes
- Total estimated effort: 2 developer weeks (1 week per story)
- Can be implemented incrementally (Story 1 first, Story 2 second)
- Low risk to existing system due to additive-only changes
- Should be scheduled after any major notification system updates to avoid conflicts

---

**Created:** 2025-12-28
**Last Updated:** 2025-12-28
**Version:** 1.0
