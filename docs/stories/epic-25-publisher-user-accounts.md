# Epic 25: Publisher User Account Management

## Status: Draft

## Epic Goal

Enable publishers to log into LMS with user accounts linked to their DCS publisher identity, allowing them to view their books and assign them to teachers while maintaining DCS as the source of truth for publisher catalog data.

## Epic Description

### Existing System Context

**Current relevant functionality:**
- Dream Central Storage (DCS) manages publisher catalog (names, logos, books, content)
- LMS fetches publisher/book data from DCS via REST API with in-memory caching
- User model has `UserRole.publisher` enum value but no DCS link
- All `/publishers/me/*` endpoints return 410 GONE (deprecated)
- Frontend publisher routes exist but call broken endpoints

**Technology stack:**
- Backend: FastAPI, SQLModel, PostgreSQL, Alembic migrations
- Frontend: React, TanStack Query, TypeScript
- Integration: DCS REST API with webhook-based cache invalidation

**Integration points:**
- User authentication (existing JWT flow)
- DCS publisher service (existing `get_publisher_service()`)
- School model (`dcs_publisher_id` field already exists)
- Admin routes for user management

### Enhancement Details

**What's being added/changed:**

1. **User Model Extension** - Add `dcs_publisher_id: int | None` field to link publisher users to DCS publishers

2. **Admin Publisher Account Management** - Enable admins to create/manage publisher user accounts with DCS publisher selection

3. **Publisher API Restoration** - Restore `/publishers/me/*` endpoints to work with new user-DCS link

4. **Frontend Updates** - Fix publisher dashboard and admin UI to work with new model

**How it integrates:**
- Publisher users authenticate via existing JWT flow
- User's `dcs_publisher_id` determines which DCS publisher they represent
- Schools already linked via `dcs_publisher_id` - filter by user's publisher
- Books fetched from DCS filtered by user's publisher ID

**Success criteria:**
- Admin can create publisher user accounts linked to DCS publishers
- Multiple users can share same DCS publisher (team support)
- Publisher users can log in and see their dashboard
- Publisher users can view their books from DCS
- Publisher users can assign books to teachers
- If publisher deleted from DCS, user sees empty books (graceful degradation)

---

## Stories

### Story 25.1: Backend User Model Extension

**Goal:** Add DCS publisher link to User model

**Scope:**
- Add `dcs_publisher_id: int | None` field to User model
- Create Alembic migration
- Update UserPublic schema to include field
- Ensure backward compatibility (existing users unaffected)

**Acceptance Criteria:**
- [ ] User model has `dcs_publisher_id` field (nullable integer)
- [ ] Migration adds column without data loss
- [ ] UserPublic schema exposes field
- [ ] Existing users work without changes

---

### Story 25.2: Admin Publisher Account CRUD

**Goal:** Enable admin to create/manage publisher user accounts

**Scope:**
- New `POST /admin/publisher-accounts` endpoint
- Creates user with `role=publisher` + `dcs_publisher_id`
- Validates DCS publisher exists before creation
- List/update/delete publisher user accounts
- Bulk import support (optional)

**Acceptance Criteria:**
- [ ] Admin can create publisher user account
- [ ] Must select from valid DCS publishers (dropdown)
- [ ] Multiple accounts per DCS publisher allowed
- [ ] Validation error if invalid DCS publisher ID
- [ ] Admin can list all publisher user accounts
- [ ] Admin can update publisher user's DCS link
- [ ] Welcome email sent to new publisher users

---

### Story 25.3: Restore Publisher /me Endpoints

**Goal:** Enable publisher users to access their data

**Scope:**
- Restore `GET /publishers/me/profile` - Fetch publisher from DCS by user's `dcs_publisher_id`
- Restore `GET /publishers/me/stats` - Count schools, books, teachers
- Restore `GET /publishers/me/schools` - Schools with matching `dcs_publisher_id`
- Restore `GET /publishers/me/teachers` - Teachers in publisher's schools
- Restore CRUD for schools/teachers under publisher

**Acceptance Criteria:**
- [ ] `/publishers/me/profile` returns DCS publisher data
- [ ] `/publishers/me/stats` returns correct counts
- [ ] `/publishers/me/schools` returns only publisher's schools
- [ ] `/publishers/me/teachers` returns teachers in publisher's schools
- [ ] Publisher can create schools (auto-sets `dcs_publisher_id`)
- [ ] Publisher can create teachers in their schools
- [ ] 403 if user has no `dcs_publisher_id` set

---

### Story 25.4: Frontend Admin Publisher Account UI

**Goal:** Enable admin to manage publisher accounts in UI

**Scope:**
- Update admin publishers page
- Publisher account creation form with DCS publisher selector
- Show user accounts linked to each DCS publisher
- Edit/delete publisher user accounts

**Acceptance Criteria:**
- [ ] Admin sees list of publisher user accounts
- [ ] "Add Publisher Account" opens creation form
- [ ] Form includes DCS publisher dropdown (from API)
- [ ] Form includes user fields (name, email, username)
- [ ] Can create multiple accounts for same publisher
- [ ] Can edit/delete publisher accounts

---

### Story 25.5: Frontend Publisher Dashboard Restoration

**Goal:** Fix broken publisher dashboard

**Scope:**
- Update API calls to use restored endpoints
- Publisher dashboard shows profile, stats
- Publisher can view their books (from DCS)
- Publisher can navigate to schools, teachers, library
- Book assignment flow works

**Acceptance Criteria:**
- [ ] Publisher dashboard loads without errors
- [ ] Profile shows publisher name/logo from DCS
- [ ] Stats show correct counts
- [ ] Library shows books from DCS
- [ ] Book assignment to teachers works
- [ ] Graceful handling if DCS publisher deleted (empty state)

---

## Compatibility Requirements

- [x] Existing APIs remain unchanged (new endpoints, deprecated ones stay deprecated)
- [x] Database schema changes are backward compatible (nullable field)
- [x] UI changes follow existing patterns (Shadcn, TanStack Query)
- [x] Performance impact is minimal (uses existing DCS cache)

## Risk Mitigation

**Primary Risk:** Publisher users created before DCS link is set may have inconsistent state

**Mitigation:**
- Field is nullable - existing publisher users work but see no data
- Admin must explicitly set DCS publisher ID
- Validation on publisher endpoints checks `dcs_publisher_id` is set

**Rollback Plan:**
- Migration is additive (new nullable column) - safe to reverse
- New endpoints are additions - can be disabled without affecting existing flows
- Frontend changes isolated to publisher routes

## Definition of Done

- [ ] All 5 stories completed with acceptance criteria met
- [ ] Existing functionality verified through testing
- [ ] Publisher users can log in and access dashboard
- [ ] Admin can create/manage publisher accounts
- [ ] Book assignment flow tested end-to-end
- [ ] No regression in existing admin/teacher/student features
- [ ] Documentation updated (API docs, architecture if needed)

---

## Technical Notes

### Data Model

```
User (existing)
├── id: UUID
├── email: str
├── username: str
├── role: UserRole (publisher)
├── dcs_publisher_id: int | None  ← NEW FIELD
└── ...

School (existing)
├── dcs_publisher_id: int  ← Already exists, used for filtering
└── ...
```

### API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/publisher-accounts` | POST | Create publisher user account |
| `/admin/publisher-accounts` | GET | List publisher user accounts |
| `/admin/publisher-accounts/{id}` | PUT | Update publisher user account |
| `/admin/publisher-accounts/{id}` | DELETE | Delete publisher user account |
| `/publishers/me/profile` | GET | Get my publisher profile (from DCS) |
| `/publishers/me/stats` | GET | Get my organization stats |
| `/publishers/me/schools` | GET/POST | Manage my schools |
| `/publishers/me/teachers` | GET/POST | Manage my teachers |

### Dependencies

- DCS must be accessible and returning publisher data
- Existing DCS cache infrastructure (Story 24.x)
- JWT authentication working

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing LMS system running FastAPI + React
- Integration points: User model, DCS publisher service, School model, Admin routes
- Existing patterns to follow: SQLModel schemas, TanStack Query hooks, Shadcn components
- Critical compatibility requirements: Nullable dcs_publisher_id, backward compatible migration
- Each story must include verification that existing functionality remains intact

The epic should maintain system integrity while delivering publisher user account management linked to DCS."

---

**Created:** 2024-12-22
**Author:** John (PM Agent)
**Based on:** Code audit of current publisher implementation
