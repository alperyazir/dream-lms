# Epic 20: Assignment Management Enhancements

**Status:** Stories Created
**Type:** Brownfield Enhancement
**Created:** 2025-12-19
**Author:** John (PM Agent)

---

## Epic Goal

Enhance assignment management capabilities across Admin and Teacher roles with improved viewing, editing, and creation workflows, along with bug fixes for existing assignment-related functionality.

---

## Epic Description

### Existing System Context

- **Current functionality:** Teachers can create, view, and manage assignments
- **Technology stack:** React/TypeScript frontend, FastAPI backend, multi-activity assignment system (Epic 8)
- **Integration points:**
  - Assignment creation dialog
  - Assignment list/dashboard views
  - Activity selection UI
  - Student/Class assignment

### Enhancement Details

**Admin Enhancements:**
1. View assignment details
2. Delete assignments (with confirmation)
3. Edit assignments if needed

**Teacher Enhancements:**
1. Edit Assignment opens Create Assignment dialog with pre-filled data
2. Remove "Edit Activities" separate flow (use unified dialog)
3. Assignments displayed in card/table view with toggle
4. Predefined filters for assignments
5. Fix inactive preview/eye icon in activity selection (remove it)
6. Time Planning warning when activities already selected
7. Show student count per class in recipient selection
8. Show selected class students on right side (like activities)
9. Assign to individual students not in a class (fix error)

**Bug Fixes:**
1. Preview Assignment: Fix "Maximum update depth exceeded" error on Show Answer
2. Preview Assignment: Fix Reset button not working
3. Remove dummy `/teacher/analytics` page but keep student analytics access
4. Report names should include student info, not just UUID
5. Message recipients should show publisher info

**Success criteria:**
- Admin can manage all assignments
- Teachers have unified editing via dialog
- All bugs fixed
- Improved UX for assignment creation

---

## Stories

### Story 20.1: Admin Assignment Management

**Story File:** [20.1.admin-assignment-management.md](./20.1.admin-assignment-management.md)

**Description:** Enable Admin users to view, edit, and delete assignments.

**Key deliverables:**
- Assignment list view in Admin panel
- View assignment details (read-only or full detail view)
- Delete assignment with confirmation dialog
- Optional: Edit assignment (opens same dialog as Teacher)
- Filter assignments by teacher, date, status

**Acceptance Criteria:**
- [ ] Admin can see list of all assignments
- [ ] Admin can view assignment details
- [ ] Admin can delete assignment with confirmation
- [ ] Admin can filter/search assignments
- [ ] Proper permissions enforced

---

### Story 20.2: Unified Edit Assignment Dialog

**Story File:** [20.2.unified-edit-assignment-dialog.md](./20.2.unified-edit-assignment-dialog.md)

**Description:** Refactor Edit Assignment to use Create Assignment dialog with pre-filled data.

**Key deliverables:**
- Open Create Assignment dialog in "edit mode" when clicking Edit
- Pre-fill all fields: title, book, activities, recipients, time planning, resources
- Remove separate "Edit Activities" button/flow
- Handle edit vs create state in dialog
- Update API to support assignment updates
- Verify all fields are editable

**Acceptance Criteria:**
- [ ] Edit Assignment opens Create Assignment dialog
- [ ] All fields pre-populated correctly
- [ ] "Edit Activities" button removed
- [ ] Save updates assignment (doesn't create new)
- [ ] Cancel returns to previous state
- [ ] Works for all assignment types (single, multi-activity, time-planned)

---

### Story 20.3: Assignment List View Enhancements

**Story File:** [20.3.assignment-list-view-enhancements.md](./20.3.assignment-list-view-enhancements.md)

**Description:** Add card/table toggle and predefined filters to Teacher's assignment view.

**Key deliverables:**
- View mode toggle (card/table) for Assignments
- Card view shows: title, due date, recipient count, status
- Table view shows compact rows with same info
- Predefined filters: By class, By status (draft, active, past due, completed)
- Search by assignment title
- Persist view preference

**Acceptance Criteria:**
- [ ] Toggle between card and table views
- [ ] Filters work correctly
- [ ] Search works
- [ ] View preference persists
- [ ] Performance acceptable with many assignments

---

### Story 20.4: Activity Selection UI Fixes

**Story File:** [20.4.activity-selection-ui-fixes.md](./20.4.activity-selection-ui-fixes.md)

**Description:** Fix activity selection issues in Create Assignment dialog.

**Key deliverables:**
- Remove inactive eye/preview icon on selected activities
- Add warning when enabling Time Planning with activities already selected
  - Dialog: "Enabling Time Planning will remove your selected activities. Continue?"
  - If user cancels, don't enable Time Planning
  - If user confirms, clear activities and enable Time Planning

**Acceptance Criteria:**
- [ ] No inactive eye icon on selected activities
- [ ] Warning shown when enabling Time Planning with activities
- [ ] User can cancel or confirm the warning
- [ ] Activities cleared if user confirms

---

### Story 20.5: Recipient Selection Enhancements

**Story File:** [20.5.recipient-selection-enhancements.md](./20.5.recipient-selection-enhancements.md)

**Description:** Improve class/student selection in Create Assignment dialog.

**Key deliverables:**
- Show student count for each class in selection list
- When class is selected, show students of that class on right panel
- Similar UI pattern to activity selection (selected items on right)
- Allow selecting individual students not in any class
- Fix error when assigning to students without class

**Acceptance Criteria:**
- [ ] Class list shows "(N students)" count
- [ ] Selected class shows its students on right
- [ ] Can assign to students not in a class
- [ ] No errors when saving assignment to classless students

---

### Story 20.6: Preview Assignment Bug Fixes

**Story File:** [20.6.preview-assignment-bug-fixes.md](./20.6.preview-assignment-bug-fixes.md)

**Description:** Fix bugs in Preview Assignment / Test Mode.

**Key deliverables:**
- Fix "Maximum update depth exceeded" error on Show Answer
- Fix Reset button functionality
- Ensure preview works for all activity types
- Add error boundary for graceful error handling

**Acceptance Criteria:**
- [ ] Show Answer works without errors
- [ ] Reset button returns activity to initial state
- [ ] All activity types work in preview
- [ ] Errors caught and displayed gracefully

---

### Story 20.7: Analytics & Reporting Fixes

**Story File:** [20.7.analytics-reporting-fixes.md](./20.7.analytics-reporting-fixes.md)

**Description:** Fix analytics page routing and report naming.

**Key deliverables:**
- Remove dummy `/teacher/analytics` page with fake data
- Keep path to student analytics functional
- Update routing to go directly to student analytics when needed
- Fix report filenames to include student name instead of just UUID
  - Format: `{student_name}_{assignment_title}_{date}.pdf`

**Acceptance Criteria:**
- [ ] Dummy analytics page removed
- [ ] Can still access individual student analytics
- [ ] Report filenames include student name
- [ ] No broken navigation paths

---

### Story 20.8: Messaging Recipient Enhancements

**Story File:** [20.8.messaging-recipient-enhancements.md](./20.8.messaging-recipient-enhancements.md)

**Description:** Add publisher info to message recipients for Teachers.

**Key deliverables:**
- When Teachers send messages, publisher recipients show:
  - Publisher name
  - Publisher organization name (if applicable)
- Update recipient list UI to show this info
- Apply to both new message and reply flows

**Acceptance Criteria:**
- [ ] Publisher recipients show identifying info
- [ ] Clear which publisher is which
- [ ] Works in compose and reply

---

## Technical Specifications

### Edit Mode for Create Assignment Dialog

```typescript
// frontend/src/components/assignments/CreateAssignmentDialog.tsx

interface CreateAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  existingAssignment?: Assignment; // Populated in edit mode
}

export function CreateAssignmentDialog({ open, onClose, mode, existingAssignment }: Props) {
  const form = useForm<AssignmentFormData>({
    defaultValues: mode === 'edit' && existingAssignment
      ? mapAssignmentToFormData(existingAssignment)
      : getDefaultFormData()
  });

  const onSubmit = async (data: AssignmentFormData) => {
    if (mode === 'edit') {
      await updateAssignment(existingAssignment!.id, data);
    } else {
      await createAssignment(data);
    }
    onClose();
  };

  // ... rest of dialog
}
```

### Time Planning Warning

```typescript
// In Time Planning toggle handler
const handleTimePlanningToggle = (enabled: boolean) => {
  if (enabled && selectedActivities.length > 0) {
    // Show confirmation dialog
    showConfirmDialog({
      title: "Enable Time Planning?",
      description: "Enabling Time Planning will remove your currently selected activities. Do you want to continue?",
      confirmLabel: "Enable & Clear Activities",
      cancelLabel: "Keep Activities",
      onConfirm: () => {
        setSelectedActivities([]);
        setTimePlanningEnabled(true);
      },
      onCancel: () => {
        // Do nothing, keep current state
      }
    });
  } else {
    setTimePlanningEnabled(enabled);
  }
};
```

### Report Filename Format

```python
# backend/app/services/report_service.py

def generate_report_filename(student: User, assignment: Assignment) -> str:
    """Generate human-readable report filename."""
    # Sanitize names for filename
    student_name = sanitize_filename(student.full_name)
    assignment_title = sanitize_filename(assignment.title)[:30]
    date_str = datetime.now().strftime("%Y%m%d")

    return f"{student_name}_{assignment_title}_{date_str}.pdf"

def sanitize_filename(name: str) -> str:
    """Remove/replace characters not safe for filenames."""
    return re.sub(r'[^\w\-_]', '_', name).strip('_')
```

---

## Compatibility Requirements

- [x] Assignment creation flow backward compatible
- [x] Existing assignments remain accessible
- [x] API endpoints extended, not replaced
- [x] Activity players unchanged
- [x] Notification system unchanged

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Edit mode breaks create flow | Medium | High | Thorough testing of both modes |
| Analytics routing issues | Low | Medium | Test all navigation paths |
| Preview bugs complex to fix | Medium | Medium | Add error boundaries; log errors for debugging |

**Rollback Plan:**
- Feature flag for edit mode
- Keep separate flows as fallback
- Preview fixes are isolated

---

## Definition of Done

- [ ] Admin can view, edit, delete assignments
- [ ] Edit Assignment uses unified Create dialog
- [ ] Edit Activities button removed
- [ ] Assignment list has card/table toggle
- [ ] Assignment filters work
- [ ] Eye icon removed from activity selection
- [ ] Time Planning shows warning when activities exist
- [ ] Class student count shown
- [ ] Class students shown on right when selected
- [ ] Classless students can be assigned
- [ ] Preview Show Answer works
- [ ] Preview Reset works
- [ ] Dummy analytics page removed
- [ ] Report filenames include student info
- [ ] Message recipients show publisher info
- [ ] All existing functionality preserved

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is a significant enhancement to Dream LMS assignment management
- Integration points:
  - Create Assignment Dialog (major changes)
  - Assignment List views (Teacher and Admin)
  - Activity Player Preview mode
  - Report generation service
  - Messaging system
- Existing patterns to follow:
  - Dialog form patterns
  - View toggle patterns (from Epic 19)
  - Filter patterns (from Epic 19)
- Critical compatibility requirements:
  - Must not break existing assignment creation
  - Must not break student assignment access
  - Edit mode must handle all existing assignment variations
- Stories can be implemented incrementally; prioritize bug fixes

The epic should significantly improve assignment management UX while fixing existing issues."

---

## Related Documentation

- [Story 3.7: Assignment Creation Dialog Configuration](./3.7.assignment-creation-dialog-configuration.md)
- [Story 8.2: Page-Based Activity Selection UI](./8.2.page-based-activity-selection-ui.md)
- [Story 9.7: Teacher Assignment Preview Test Mode](./9.7.teacher-assignment-preview-test-mode.md)
