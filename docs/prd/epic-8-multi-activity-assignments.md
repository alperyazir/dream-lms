# Epic 8: Multi-Activity Assignments & Page-Based Selection

**Estimated Effort:** 2-3 weeks | **Status:** 📋 PLANNING

## Epic Goal

Enable teachers to assign multiple activities from a book as a single assignment, with an intuitive page-based selection UI that mirrors how teachers think about lesson coverage. Students can navigate between activities within an assignment, save progress, and submit when all activities are complete.

---

## Existing System Context

- **Current Functionality:** Teachers create assignments with a single activity (1:1 relationship between Assignment and Activity)
- **Technology Stack:** FastAPI backend, SQLModel ORM, React/TypeScript frontend with Shadcn UI, TanStack Router
- **Integration Points:**
  - `Assignment` model (backend/app/models.py)
  - `AssignmentStudent` model for tracking student progress
  - Assignment creation dialog (frontend)
  - Student assignment player (frontend)
  - Activity player components (6 types implemented)

---

## Enhancement Details

### What's Being Changed

1. **Data Model:** Assignment changes from 1:1 to 1:N relationship with activities via junction table
2. **Assignment Creation UI:** Replace flat activity list with visual page browser + multi-select
3. **Student Assignment Flow:** Add activity navigation within assignment, shared timer, combined scoring
4. **Analytics:** Per-activity score breakdown within assignment results

### Database Schema Changes

```
Assignment (modify)
  └── Remove: activity_id (FK) - replaced by junction table

AssignmentActivity (NEW)
  ├── id (PK)
  ├── assignment_id (FK → Assignment)
  ├── activity_id (FK → Activity)
  ├── order_index (int) - sequence within assignment
  └── Unique: (assignment_id, activity_id)

AssignmentStudentActivity (NEW)
  ├── id (PK)
  ├── assignment_student_id (FK → AssignmentStudent)
  ├── activity_id (FK → Activity)
  ├── status (enum: not_started/in_progress/completed)
  ├── score (float, nullable)
  ├── max_score (float)
  ├── response_data (JSONB - student answers)
  ├── started_at (timestamp, nullable)
  └── completed_at (timestamp, nullable)

AssignmentStudent (modify)
  ├── Keep: assignment_id, student_id, status, started_at, completed_at
  ├── Keep: score (now represents total combined score)
  └── Keep: time_spent_minutes (total across all activities)
```

---

## Stories

### Story 8.1: Multi-Activity Assignment Data Model

**As a** developer,
**I want** to update the assignment data model to support multiple activities per assignment,
**so that** teachers can create bundled assignments and students can track progress per activity.

**Acceptance Criteria:**

1. Create `AssignmentActivity` junction table with fields: id, assignment_id, activity_id, order_index
2. Create `AssignmentStudentActivity` table for per-activity progress tracking
3. Modify `Assignment` model to remove direct `activity_id` foreign key
4. Add relationship `Assignment.activities` via junction table with ordering
5. Database migration handles existing assignments (create AssignmentActivity records for existing 1:1 relationships)
6. Update `AssignmentStudent` to calculate combined score from child `AssignmentStudentActivity` records
7. API schemas updated: `AssignmentCreate` accepts list of activity_ids, `AssignmentResponse` includes activities list
8. Existing assignment APIs remain backward compatible (single activity still works)
9. Unit tests verify migration preserves existing assignment data
10. Unit tests verify multi-activity assignment creation and retrieval

---

### Story 8.2: Page-Based Activity Selection UI

**As a** teacher,
**I want** to select activities by browsing book pages visually,
**so that** I can quickly assign activities from the pages I taught in class.

**Acceptance Criteria:**

1. Assignment creation dialog Step 1 redesigned with page-based browser
2. Page thumbnails displayed in grid (loaded from `/api/v1/books/{book_id}/assets/images/{module}/{page}.png`)
3. Module filter/tabs allow switching between book modules
4. Teachers can click pages to select/deselect (multi-select supported)
5. Selected pages highlighted with visual indicator (checkmark, border)
6. Side panel shows activities on currently selected page(s)
7. Activity checkboxes allow fine-tuning selection (uncheck specific activities)
8. "Select All Activities on Page" convenience option
9. Activity count badge shows total selected activities
10. Selected activities ordered by page number, then section index
11. Empty state when no activities on selected page: "No interactive activities on this page"
12. Mobile responsive: page grid collapses to scrollable row on small screens
13. Performance: Page thumbnails lazy-loaded with placeholder skeleton
14. Integration tests verify page selection → activity list updates correctly

---

### Story 8.3: Student Multi-Activity Assignment Player

**As a** student,
**I want** to navigate between activities within an assignment and save my progress,
**so that** I can complete all assigned activities at my own pace before submitting.

**Acceptance Criteria:**

1. Assignment detail page shows list of activities with status indicators (not started/in progress/completed)
2. Activity navigation bar shows progress: "Activity 1 of 3" with prev/next buttons
3. Students can jump to any activity (not forced linear progression)
4. Activity status icon: ○ (not started), ◐ (in progress), ✓ (completed)
5. Timer displays total time remaining for entire assignment (shared across activities)
6. "Save & Exit" button saves current activity progress without submitting
7. Progress auto-saved when navigating between activities
8. "Submit Assignment" button enabled only when all activities completed
9. Submit confirmation shows summary: activities completed, estimated score
10. After submission: combined score calculated and stored in AssignmentStudent
11. Backend API `PATCH /api/assignments/{id}/students/me/activities/{activity_id}` saves per-activity progress
12. Backend API `POST /api/assignments/{id}/students/me/submit` validates all activities complete, calculates total score
13. Resume flow: returning student sees previous progress, can continue any activity
14. Time limit enforcement: when timer expires, auto-submit with current progress
15. Unit tests verify progress persistence across activities
16. Integration tests verify submit calculates correct combined score

---

### Story 8.4: Multi-Activity Assignment Analytics

**As a** teacher,
**I want** to see per-activity score breakdowns for multi-activity assignments,
**so that** I can identify which specific activities students struggled with.

**Acceptance Criteria:**

1. Assignment detail page (teacher view) shows activity-by-activity breakdown
2. Table columns: Activity Title, Page, Type, Class Average Score, Completion Rate
3. Click activity row to expand and see individual student scores for that activity
4. Student assignment result shows: Total Score + per-activity scores
5. Student view (completed assignment) shows score breakdown by activity
6. Export includes per-activity columns (CSV/Excel)
7. API endpoint `GET /api/assignments/{id}/analytics` returns per-activity aggregations
8. Handles mixed completion: shows partial scores if assignment submitted incomplete (timeout)
9. Integration tests verify analytics calculations with multi-activity data

---

## Compatibility Requirements

- [x] Existing single-activity assignments continue to work (backward compatible)
- [x] Database migration preserves existing assignment data
- [x] Existing APIs remain functional (create assignment with single activity still works)
- [x] Student assignment list UI handles both single and multi-activity assignments
- [x] Activity player components unchanged (reused within new navigation wrapper)

---

## Risk Mitigation

| Risk | Mitigation | Rollback Plan |
|------|------------|---------------|
| Migration breaks existing assignments | Create AssignmentActivity records for all existing assignments before removing activity_id | Restore from database backup |
| Timer sync issues across activities | Single timer state managed at assignment level, passed to activity players | Revert to single-activity mode |
| Page thumbnail loading performance | Lazy loading, skeleton placeholders, image optimization | Fall back to text-based page list |

---

## Definition of Done

- [ ] All 4 stories completed with acceptance criteria met
- [ ] Existing single-activity assignments still function correctly
- [ ] Database migration tested on production-like data
- [ ] Multi-activity assignment creation flow tested end-to-end
- [ ] Student completion flow tested with save/resume/submit
- [ ] Analytics show per-activity breakdowns
- [ ] Performance acceptable (page thumbnails load <2s)
- [ ] Mobile responsive design verified

---

## Technical Notes

**Page Image Path Pattern:**

```
/api/v1/books/{book_id}/assets/images/{module}/{page_number}.png
```

**Config.json Structure for Page→Activity Mapping:**

```json
{
  "books": [{
    "modules": [{
      "name": "Module 1",
      "pages": [{
        "page_number": 7,
        "sections": [{
          "activity": { "type": "matchTheWords", ... }
        }]
      }]
    }]
  }]
}
```

**API Changes Summary:**

| Endpoint | Change |
|----------|--------|
| `POST /api/assignments` | Accept `activity_ids: UUID[]` instead of `activity_id: UUID` |
| `GET /api/assignments/{id}` | Return `activities: Activity[]` with order |
| `PATCH /api/assignments/{id}/students/me/activities/{activity_id}` | NEW - save per-activity progress |
| `POST /api/assignments/{id}/students/me/submit` | Validate all activities, calculate combined score |
| `GET /api/assignments/{id}/analytics` | Return per-activity aggregations |
