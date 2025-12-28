# Epic 22: Student Dashboard Refactor

**Status:** Stories Created
**Type:** Brownfield Enhancement
**Created:** 2025-12-19
**Author:** John (PM Agent)

---

## Epic Goal

Reorganize the Student Dashboard layout for a cleaner, more focused experience by consolidating progress-related sections, removing unused features, and adding proper page titles.

---

## Epic Description

### Existing System Context

- **Current functionality:** Student Dashboard displays multiple sections: Your Progress, Recent Feedback, Achievements, Reports, Tips, Upcoming Assignments
- **Technology stack:** React/TypeScript frontend with Shadcn UI
- **Integration points:**
  - Student Dashboard page
  - My Progress page (separate route)
  - Activity Resources section

### Enhancement Details

**Dashboard Reorganization:**
1. Add page title "Student Dashboard"
2. Keep on Dashboard:
   - Your Progress (summary widget)
   - Upcoming Assignments
3. Move to "My Progress" page:
   - Detailed Your Progress
   - Recent Feedback
   - Achievements
4. Remove from Dashboard:
   - Reports section
   - Tips section

**Bug Fixes:**
1. Activities Resources section doesn't fully expand (right side cut off)

**Success criteria:**
- Cleaner, focused Dashboard
- Progress details consolidated in My Progress page
- No Reports or Tips clutter
- Resources section displays correctly
- Page title visible

---

## Stories

### Story 22.1: Dashboard Layout Refactor

**Story File:** [22.1.dashboard-layout-refactor.md](./22.1.dashboard-layout-refactor.md)

**Description:** Reorganize Student Dashboard sections for cleaner layout.

**Key deliverables:**
- Add "Student Dashboard" title at top
- Keep Your Progress widget (simplified summary)
- Keep Upcoming Assignments section
- Remove Reports section entirely
- Remove Tips section entirely
- Ensure responsive layout
- Update any dashboard-related documentation

**Current Layout:**
```
┌─────────────────────────────────────────────┐
│ [No title]                                  │
├─────────────────────────────────────────────┤
│ Your Progress    │ Recent Feedback          │
│ Achievements     │ Reports                  │
│ Upcoming Assignments │ Tips                 │
└─────────────────────────────────────────────┘
```

**New Layout:**
```
┌─────────────────────────────────────────────┐
│ Student Dashboard                           │
├─────────────────────────────────────────────┤
│ Your Progress (Summary)                     │
├─────────────────────────────────────────────┤
│ Upcoming Assignments                        │
└─────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] "Student Dashboard" title visible
- [ ] Your Progress summary displayed
- [ ] Upcoming Assignments section present
- [ ] Reports section removed
- [ ] Tips section removed
- [ ] Layout is clean and focused
- [ ] Responsive on mobile

---

### Story 22.2: My Progress Page Enhancement

**Story File:** [22.2.my-progress-page-enhancement.md](./22.2.my-progress-page-enhancement.md)

**Description:** Consolidate detailed progress content in My Progress page.

**Key deliverables:**
- Move detailed Your Progress to My Progress page
- Move Recent Feedback to My Progress page
- Move Achievements to My Progress page
- Add clear navigation from Dashboard to My Progress
- Ensure sections are well-organized
- Add "My Progress" page title

**My Progress Layout:**
```
┌─────────────────────────────────────────────┐
│ My Progress                                 │
├─────────────────────────────────────────────┤
│ Your Progress (Detailed Charts/Stats)       │
├─────────────────────────────────────────────┤
│ Recent Feedback                             │
├─────────────────────────────────────────────┤
│ Achievements                                │
└─────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Your Progress detailed view in My Progress
- [ ] Recent Feedback section in My Progress
- [ ] Achievements section in My Progress
- [ ] Clear link from Dashboard to My Progress
- [ ] Page has proper title
- [ ] All data loads correctly

---

### Story 22.3: Fix Activities Resources Layout

**Story File:** [22.3.fix-activities-resources-layout.md](./22.3.fix-activities-resources-layout.md)

**Description:** Fix the Resources section that doesn't fully expand in Activities view.

**Key deliverables:**
- Debug layout issue (likely overflow or width constraint)
- Fix CSS/container to allow full expansion
- Test across different screen sizes
- Verify all resource items are fully visible

**Acceptance Criteria:**
- [ ] Resources section expands fully
- [ ] No content cut off on right side
- [ ] Works on different screen widths
- [ ] Scroll appears if needed (not clipped)

---

## Technical Specifications

### Dashboard Component Structure

```typescript
// frontend/src/routes/student/dashboard.tsx

export function StudentDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Student Dashboard</h1>

      {/* Progress Summary Card */}
      <ProgressSummaryCard />

      {/* Upcoming Assignments */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Upcoming Assignments</h2>
        <UpcomingAssignmentsList />
      </section>
    </div>
  );
}

// ProgressSummaryCard links to /student/my-progress
function ProgressSummaryCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Your Progress</CardTitle>
          <Button variant="link" asChild>
            <Link to="/student/my-progress">View Details →</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary stats: completion %, recent activity */}
        <ProgressSummaryStats />
      </CardContent>
    </Card>
  );
}
```

### My Progress Page Structure

```typescript
// frontend/src/routes/student/my-progress.tsx

export function MyProgressPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Progress</h1>

      {/* Detailed Progress */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Your Progress</h2>
        <DetailedProgressCharts />
      </section>

      {/* Recent Feedback */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Feedback</h2>
        <RecentFeedbackList />
      </section>

      {/* Achievements */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Achievements</h2>
        <AchievementsGrid />
      </section>
    </div>
  );
}
```

### Resources Layout Fix

```css
/* Potential fix - check container constraints */
.resources-section {
  width: 100%;
  overflow-x: auto; /* Allow scroll if needed */
}

.resources-content {
  min-width: min-content; /* Ensure content determines width */
  padding-right: 1rem; /* Prevent content touching edge */
}
```

---

## Compatibility Requirements

- [x] Student API endpoints unchanged
- [x] Progress tracking unchanged
- [x] Assignment data unchanged
- [x] Routes can be adjusted (My Progress may need route)
- [x] Existing progress/feedback/achievement data intact

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Losing important info by removing sections | Low | Medium | Reports/Tips identified as unused by stakeholder |
| My Progress route doesn't exist | Low | Low | Create route if needed |
| Layout changes break on mobile | Medium | Low | Test responsive behavior |

**Rollback Plan:**
- Dashboard layout changes can be reverted
- Sections can be restored if needed
- Layout fix is isolated

---

## Definition of Done

- [ ] "Student Dashboard" title added
- [ ] Your Progress summary on Dashboard
- [ ] Upcoming Assignments on Dashboard
- [ ] Reports section removed from Dashboard
- [ ] Tips section removed from Dashboard
- [ ] My Progress page contains detailed progress
- [ ] My Progress page contains Recent Feedback
- [ ] My Progress page contains Achievements
- [ ] Link from Dashboard to My Progress works
- [ ] Resources section expands fully (no cutoff)
- [ ] Responsive layout works
- [ ] No regression in student functionality

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is a UI reorganization for the Student views
- Integration points:
  - Student Dashboard page
  - My Progress page (create or enhance)
  - Activities Resources section
- Existing patterns to follow:
  - Page title patterns from other dashboards
  - Card/section patterns from existing UI
- Critical compatibility requirements:
  - All student data must remain accessible
  - Progress tracking must continue working
- Changes are primarily layout/navigation, not data

The epic should create a cleaner, more focused Student experience."

---

## Appendix: Wireframes

### Student Dashboard (After)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Student Dashboard                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌─ Your Progress ─────────────────────────────────────────────────────┐ │
│ │                                                          View Details→││
│ │  📊 Overall: 78%        📚 Assignments: 12/15       ⭐ Streak: 5 days ││
│ │                                                                       ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│ ┌─ Upcoming Assignments ────────────────────────────────────────────────┐│
│ │                                                                       ││
│ │  📝 Math Chapter 5 Review           Due: Tomorrow, 3:00 PM            ││
│ │  📝 Science Lab Report              Due: Dec 22, 5:00 PM              ││
│ │  📝 Reading Comprehension Test      Due: Dec 23, 9:00 AM              ││
│ │                                                                       ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### My Progress Page (After)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ My Progress                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌─ Your Progress ───────────────────────────────────────────────────────┐│
│ │                                                                       ││
│ │  [Detailed charts, subject breakdown, time graphs]                    ││
│ │                                                                       ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│ ┌─ Recent Feedback ─────────────────────────────────────────────────────┐│
│ │                                                                       ││
│ │  💬 Great work on Chapter 4! - Mrs. Smith, Dec 18                     ││
│ │  💬 Keep practicing fractions - Mr. Johnson, Dec 16                   ││
│ │                                                                       ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│ ┌─ Achievements ────────────────────────────────────────────────────────┐│
│ │                                                                       ││
│ │  🏆 First Assignment    🌟 5-Day Streak    📖 Bookworm               ││
│ │                                                                       ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Story 2.3: Build 4 Role-Specific Dashboards](./2.3.build-4-role-specific-dashboards.md)
- [Story 5.5: Student Progress Tracking Personal Analytics](./5.5.student-progress-tracking-personal-analytics.md)
