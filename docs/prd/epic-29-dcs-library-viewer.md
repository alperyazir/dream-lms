# Epic 29: DCS Library Viewer Integration

**Type:** Brownfield Enhancement
**Status:** Draft
**Created:** 2026-01-26

---

## Epic Goal

Enable admin, supervisor, publisher, and teacher users to browse DCS book libraries and preview books using an embedded flowbook-online viewer, with the ability to download book bundles.

---

## Epic Description

### Existing System Context

| Aspect | Details |
|--------|---------|
| **Current Functionality** | LMS has book catalog browsing (`/teacher/books`, `/admin/books`) with activity selection, but no full book preview capability |
| **Technology Stack** | React 19, TanStack Router, TanStack Query, Zustand, Tailwind, Axios |
| **Integration Points** | `booksApi.ts` for DCS communication, role-based route guards in layout files |

### Enhancement Details

**What's being added:**
1. Embed flowbook-online viewer as internal package/components
2. New "Library Viewer" page accessible by privileged roles
3. Preview action on book cards to open full book in viewer
4. Download bundle action for books

**How it integrates:**
- Flowbook-online components imported into LMS frontend
- New route under each role layout (`/admin/library-viewer`, `/teacher/library-viewer`, etc.)
- Reuse existing DCS authentication proxy pattern
- Leverage existing book list APIs, add viewer-specific endpoints

**Success Criteria:**
- Users can browse their authorized DCS libraries
- Users can open any book in the embedded viewer
- Users can navigate pages, view activities, play media
- Users can download book bundles
- No impact on existing book catalog or assignment features

---

## Stories

### Story 29.1: Integrate Flowbook-Online Viewer Components

**Description:**
Import flowbook-online core components (BookViewer, PageViewer, activity players) into LMS. Adapt Zustand stores to coexist with LMS state management. Configure shared Tailwind styles. Create reusable `<FlowbookViewer bookConfig={...} />` wrapper component.

**Key Tasks:**
- Copy/import core viewer components from flowbook-online
- Import activity player components (7 types)
- Adapt Zustand stores for LMS context
- Create FlowbookViewer wrapper component with props interface
- Configure lazy loading for bundle optimization
- Ensure Tailwind styles don't conflict

**Acceptance Criteria:**
- [ ] FlowbookViewer component renders when given a BookConfig
- [ ] All 7 activity types work within embedded viewer
- [ ] Media playback (audio/video) functions correctly
- [ ] Page navigation and zoom/pan work
- [ ] Bundle size increase is acceptable (lazy loaded)

---

### Story 29.2: Create DCS Library Browser Page

**Description:**
Add new route `/[role]/library-viewer` for admin, supervisor, publisher, teacher. Implement library browsing UI showing books with covers, titles, activity counts. Add role-based filtering (users see only their authorized libraries). Include search and filter capabilities.

**Key Tasks:**
- Create route files for each role layout
- Build LibraryViewer page component
- Implement book grid/list view with covers
- Add search by title functionality
- Add filter by publisher (where applicable)
- Implement role-based library filtering via API
- Add sidebar navigation item for each role

**Acceptance Criteria:**
- [ ] Admin can access `/admin/library-viewer`
- [ ] Supervisor can access `/supervisor/library-viewer`
- [ ] Publisher can access `/publisher/library-viewer`
- [ ] Teacher can access `/teacher/library-viewer`
- [ ] Each role sees only their authorized libraries
- [ ] Search filters books by title
- [ ] Books display cover, title, publisher, activity count

---

### Story 29.3: Book Preview and Download Actions

**Description:**
Add "Preview" action on book cards that opens embedded viewer in modal/full-screen. Implement book bundle download via DCS API. Add "Download" action button on book cards. Handle loading states and error feedback.

**Key Tasks:**
- Add Preview button/action to book cards
- Implement full-screen modal for book preview
- Fetch book config from DCS when opening preview
- Add Download button to book cards
- Implement bundle download endpoint in backend
- Add download progress indicator
- Handle errors gracefully with user feedback

**Acceptance Criteria:**
- [ ] Clicking Preview opens book in full-screen viewer
- [ ] Book loads with all pages and activities
- [ ] User can close preview and return to library
- [ ] Clicking Download initiates bundle download
- [ ] Download shows progress feedback
- [ ] Errors display user-friendly messages

---

## Technical Notes

### Flowbook-Online Integration

**Source Project:** `/Users/alperyazir/Dev/flowbook-online`

**Key Components to Import:**
- `src/pages/BookViewer.tsx` - Main viewer orchestrator
- `src/components/layout/PageViewer.tsx` - Core page rendering
- `src/components/layout/ThumbnailStrip.tsx` - Page navigation
- `src/activities/` - All activity player components
- `src/stores/` - Zustand stores (bookStore, uiStore, annotationStore)
- `src/types/book.ts` - TypeScript interfaces

**Data Format:**
```typescript
interface BookConfig {
  title: string
  cover: string
  version?: string
  modules: Module[]
  pages: Page[]
}
```

### API Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/library/books` | GET | List books user can access |
| `/api/v1/library/books/{id}/config` | GET | Get book config for viewer |
| `/api/v1/library/books/{id}/download` | GET | Download book bundle |

---

## Compatibility Requirements

- [x] Existing APIs remain unchanged (additive endpoints only)
- [x] Database schema changes are backward compatible (none required)
- [x] UI changes follow existing patterns (Radix + Tailwind + existing components)
- [x] Performance impact is minimal (lazy-load viewer components)

---

## Risk Mitigation

| Risk | Mitigation | Rollback Plan |
|------|------------|---------------|
| Bundle size increase from viewer components | Code-split viewer, lazy-load on demand | Remove viewer import, disable routes |
| Style conflicts with LMS | Scope Tailwind classes, test thoroughly | Revert style changes |
| DCS API compatibility | Reuse existing proxy pattern | Use existing book endpoints |

---

## Definition of Done

- [ ] All stories completed with acceptance criteria met
- [ ] Existing functionality verified through testing (book catalog, assignments unaffected)
- [ ] Integration points working correctly (DCS auth, media streaming)
- [ ] Documentation updated appropriately
- [ ] No regression in existing features

---

## Dependencies

- Flowbook-online codebase (same parent directory)
- DCS API access for book configs and bundles
- Existing LMS authentication system

---

## Affected Roles

| Role | Access |
|------|--------|
| Admin | Full library access |
| Supervisor | Scoped library access |
| Publisher | Own publisher's libraries |
| Teacher | Assigned libraries |
| Student | No access (not included) |
