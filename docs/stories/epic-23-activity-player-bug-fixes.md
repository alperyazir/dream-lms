# Epic 23: Activity Player Bug Fixes

**Status:** Stories Created
**Type:** Brownfield Enhancement (Bug Fixes)
**Created:** 2025-12-19
**Author:** John (PM Agent)

---

## Epic Goal

Fix critical bugs in activity players (drag-and-drop, match, and result display) that affect student experience and accurate progress tracking.

---

## Epic Description

### Existing System Context

- **Current functionality:** Multiple activity player types for interactive learning (drag-drop, match, fill-in-blank, etc.)
- **Technology stack:** React/TypeScript with activity player framework (Epic 4)
- **Integration points:**
  - Activity player components
  - Progress persistence system (save/resume)
  - Result display screen

### Bug Details

1. **Drag-and-Drop - Duplicate Items Bug:**
   - When there are multiple draggable items with the same text/name
   - Once one is dragged and placed, other items with the same name become deactivated
   - Expected: Each item should be independently draggable

2. **Match Activity - Image Size Bug:**
   - Image areas appear small even when more space is available
   - Should expand to use available screen space

3. **Match Activity - Arrow Return Bug:**
   - When arrow is dragged and dropped in an empty area
   - Arrow doesn't return to its original position immediately
   - It waits a few seconds before returning
   - Expected: Immediate return when dropped outside valid target

4. **Result Screen - Stale Progress Bug:**
   - Student saves activity and exits
   - Student returns and completes the activity, then submits
   - Result screen shows the old saved progress instead of the final submitted state
   - Expected: Result screen should show final submitted answers only

**Success criteria:**
- All duplicate items in drag-drop are independently functional
- Match activity images use available space appropriately
- Arrows return immediately when dropped outside targets
- Result screen always shows final submitted state

---

## Stories

### Story 23.1: Fix Drag-and-Drop Duplicate Items

**Story File:** [23.1.fix-drag-drop-duplicate-items.md](./23.1.fix-drag-drop-duplicate-items.md)

**Description:** Fix the bug where dragging one item deactivates other items with the same name.

**Root Cause Analysis:**
- Likely using item text/name as unique identifier instead of unique ID
- When one item is placed, state update affects all items with same name

**Key deliverables:**
- Identify where items are tracked by name instead of ID
- Ensure each draggable item has unique identifier
- Update state management to track by unique ID
- Test with multiple identical items

**Acceptance Criteria:**
- [ ] Multiple items with same text can all be dragged
- [ ] Dragging one doesn't affect others
- [ ] Correct item is placed in each drop zone
- [ ] Works for all drag-drop activity configurations

---

### Story 23.2: Fix Match Activity Image Sizing

**Story File:** [23.2.fix-match-activity-image-sizing.md](./23.2.fix-match-activity-image-sizing.md)

**Description:** Make match activity images expand to use available space.

**Root Cause Analysis:**
- Image containers likely have fixed max dimensions
- Not responding to available viewport/container space

**Key deliverables:**
- Review image container CSS/styling
- Implement responsive sizing based on available space
- Maintain aspect ratio of images
- Test across different screen sizes
- Ensure images don't overflow on small screens

**Acceptance Criteria:**
- [ ] Images expand when more space available
- [ ] Aspect ratio maintained
- [ ] No overflow on small screens
- [ ] Works in both standalone and assignment contexts

---

### Story 23.3: Fix Match Activity Arrow Return

**Story File:** [23.3.fix-match-activity-arrow-return.md](./23.3.fix-match-activity-arrow-return.md)

**Description:** Make arrow return immediately when dropped outside valid target.

**Root Cause Analysis:**
- Likely animation or timeout before resetting arrow position
- May be waiting for drop validation timeout

**Key deliverables:**
- Remove or reduce timeout for invalid drop return
- Implement immediate position reset on invalid drop
- Ensure smooth animation (but fast)
- Test drop in various empty areas

**Acceptance Criteria:**
- [ ] Arrow returns immediately when dropped outside target
- [ ] No multi-second delay
- [ ] Animation is smooth but fast (< 300ms)
- [ ] Works for all match configurations

---

### Story 23.4: Fix Result Screen Stale Progress

**Story File:** [23.4.fix-result-screen-stale-progress.md](./23.4.fix-result-screen-stale-progress.md)

**Description:** Ensure result screen shows final submitted state, not saved progress.

**Root Cause Analysis:**
- Result screen may be reading from saved progress state
- Not updating to use final submission data
- Or submission doesn't clear/override saved progress before displaying

**Key deliverables:**
- Debug data flow from submission to result screen
- Ensure submission data overrides saved progress for display
- Clear intermediate saved state on submission
- Verify correct answers shown on result

**Acceptance Criteria:**
- [ ] Result screen shows final submitted answers
- [ ] No residual saved progress displayed
- [ ] Correct/incorrect marking accurate
- [ ] Works for save→exit→return→submit flow
- [ ] Works for direct submit flow

---

## Technical Specifications

### Drag-and-Drop Fix

```typescript
// Problem: Using item.text as key
items.filter(item => item.text !== draggedItem.text) // Wrong!

// Solution: Use unique ID for each item instance
interface DraggableItem {
  id: string; // Unique instance ID
  text: string; // Display text (can be duplicate)
  // ...
}

// Track by ID, not text
items.filter(item => item.id !== draggedItem.id) // Correct!
```

### Match Image Sizing

```css
/* Before: Fixed size */
.match-image-container {
  width: 150px;
  height: 100px;
}

/* After: Responsive sizing */
.match-image-container {
  width: 100%;
  max-width: 200px; /* Reasonable max */
  aspect-ratio: 3/2; /* Maintain aspect */
}

/* Or use CSS Grid for dynamic sizing */
.match-images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.match-image {
  width: 100%;
  height: auto;
  object-fit: contain;
}
```

### Arrow Return Animation

```typescript
// Before: Timeout delay
const handleInvalidDrop = () => {
  setTimeout(() => {
    resetArrowPosition();
  }, 2000); // 2 second delay - bad UX!
};

// After: Immediate return with fast animation
const handleInvalidDrop = () => {
  // Immediate reset with CSS transition for smoothness
  resetArrowPosition(); // Triggers CSS transition
};

// CSS
.match-arrow {
  transition: transform 0.2s ease-out; /* Fast, smooth return */
}
```

### Result Screen Data Flow

```typescript
// Ensure result uses submission data, not progress
const handleSubmit = async () => {
  const submissionData = collectFinalAnswers();

  // Submit to backend
  const result = await submitActivity(submissionData);

  // Clear saved progress
  clearSavedProgress(activityId);

  // Navigate to result with SUBMISSION data, not progress
  navigate('/result', {
    state: {
      submission: submissionData,
      result: result.score,
      // NOT progress: savedProgress
    }
  });
};

// ResultScreen component
function ResultScreen() {
  const { submission, result } = useLocation().state;

  // Use submission data for display
  return (
    <ResultDisplay
      answers={submission.answers} // Final answers
      score={result}
    />
  );
}
```

---

## Compatibility Requirements

- [x] Activity configuration format unchanged
- [x] Save/resume API unchanged
- [x] Submission API unchanged
- [x] Other activity types unaffected
- [x] Teacher preview still works

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Fix breaks other activity features | Medium | High | Thorough testing of all activity types |
| Performance impact from sizing changes | Low | Low | Test with image-heavy activities |
| State management changes cause regressions | Medium | High | Comprehensive unit tests |

**Rollback Plan:**
- Each fix is isolated to specific activity type
- Can be reverted individually
- Feature flags can disable specific fixes

---

## Definition of Done

- [ ] Duplicate drag-drop items work independently
- [ ] Match images expand appropriately
- [ ] Match arrows return immediately on invalid drop
- [ ] Result screen shows final submitted state
- [ ] All activity types tested
- [ ] No regression in save/resume functionality
- [ ] No regression in submission flow
- [ ] Unit tests for each fix
- [ ] Manual QA verification

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- These are critical bug fixes for Student activity experience
- Integration points:
  - Drag-and-drop activity player component
  - Match activity player component
  - Activity result display component
  - Progress persistence system
- Existing patterns to follow:
  - Activity player architecture from Epic 4
  - State management patterns in existing players
- Critical compatibility requirements:
  - All existing activities must continue working
  - Save/resume must not be affected
  - Submission flow must remain intact
- Prioritize Story 23.4 (result screen) as it affects grading accuracy

The epic should fix fundamental activity issues affecting student experience and data accuracy."

---

## Testing Scenarios

### Drag-and-Drop Test Cases
1. Activity with 3 items named "A", "A", "B"
2. Drag first "A" to zone 1
3. Verify second "A" is still draggable
4. Drag second "A" to zone 2
5. Verify both placed correctly

### Match Activity Test Cases
1. Activity with 4 images on wide screen
2. Verify images expand to fill space
3. Resize to narrow screen
4. Verify images scale down appropriately

### Arrow Return Test Cases
1. Start match activity
2. Drag arrow partway
3. Drop in empty area (not on any target)
4. Verify arrow returns within 0.5 seconds

### Result Screen Test Cases
1. Start activity
2. Answer 2 of 5 questions
3. Save and exit
4. Return to activity
5. Answer remaining questions (different answers)
6. Submit
7. Verify result screen shows all 5 final answers, not saved progress

---

## Related Documentation

- [Story 4.1: Activity Player Framework Layout](./4.1.activity-player-framework-layout.md)
- [Story 4.2: Fix Activity Players Real Config](./4.2.fix-activity-players-real-config.md)
- [Story 4.8: Activity Progress Persistence Save Resume](./4.8.activity-progress-persistence-save-resume.md)
