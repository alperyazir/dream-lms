# Epic 19: Library View Enhancements

**Status:** Stories Created
**Type:** Brownfield Enhancement
**Created:** 2025-12-19
**Author:** John (PM Agent)

---

## Epic Goal

Enhance the library/book browsing experience across all user roles with consistent naming ("Library"), view mode toggles (grid/table), predefined filters, book cover displays, and quick action buttons for improved workflow efficiency.

---

## Epic Description

### Existing System Context

- **Current functionality:** Books displayed in various views across Admin, Publisher, Teacher roles
- **Technology stack:** React/TypeScript with Shadcn UI, TanStack Query for data fetching
- **Integration points:**
  - Admin Books section
  - Publisher Library section
  - Teacher Book Catalog section
  - Book cover images from DCS

### Enhancement Details

**What's being added/changed:**

1. **Naming Consistency:**
   - Rename "Books" to "Library" in Admin left panel
   - Rename "Book Catalog" to "Library" in Teacher view

2. **View Mode Toggle:**
   - Add grid/table view toggle for Library in Publisher view
   - Add grid/table view toggle for Library in Teacher view
   - Persist user's view preference

3. **Filtering:**
   - Add predefined filters for books (by level, subject, status, etc.)
   - Consistent filter UI across all views

4. **Book Covers:**
   - Display book covers in Admin Books/Library section
   - Book covers already come from DCS

5. **Quick Actions:**
   - Add "Assign" button next to "Details" on book cards (Publisher)
   - Enable Admin to assign books to teachers (matching Publisher capability)

6. **Card Enhancements:**
   - School cards: more detailed, optional list view
   - Teacher cards: more detailed, optional list view with filters

**Success criteria:**
- Consistent "Library" naming across app
- Users can toggle between grid and table views
- Filters work efficiently across large book lists
- Book covers display correctly
- Quick assign workflow reduces clicks
- Card/list toggle works for Schools and Teachers

---

## Stories

### Story 19.1: Navigation Renaming - Books to Library

**Story File:** [19.1.navigation-renaming-books-to-library.md](./19.1.navigation-renaming-books-to-library.md)

**Description:** Rename "Books" to "Library" across all navigation and page titles.

**Key deliverables:**
- Update Admin sidebar: "Books" → "Library"
- Update Teacher sidebar: "Book Catalog" → "Library"
- Update page titles and breadcrumbs
- Update any references in code (routes, components)
- Verify no broken links or references

**Acceptance Criteria:**
- [ ] Admin sees "Library" in left navigation
- [ ] Teacher sees "Library" in left navigation
- [ ] Page titles updated
- [ ] Routes work correctly (can keep `/books` route, just change display name)
- [ ] No broken navigation

---

### Story 19.2: Grid/Table View Toggle Component

**Story File:** [19.2.grid-table-view-toggle-component.md](./19.2.grid-table-view-toggle-component.md)

**Description:** Create reusable view toggle component and implement for Library views.

**Key deliverables:**
- Create `ViewModeToggle` component (grid/table icons)
- Persist view preference per user (localStorage or user preferences API)
- Implement grid view for Publisher Library
- Implement table view for Publisher Library
- Implement grid view for Teacher Library
- Implement table view for Teacher Library
- Smooth transition between views

**Acceptance Criteria:**
- [ ] Toggle button switches between grid and table views
- [ ] Grid view shows book cards with covers
- [ ] Table view shows compact rows with key info
- [ ] Preference persists across sessions
- [ ] Works in both Publisher and Teacher views

---

### Story 19.3: Library Filtering System

**Story File:** [19.3.library-filtering-system.md](./19.3.library-filtering-system.md)

**Description:** Add predefined filter options for browsing books in Library.

**Key deliverables:**
- Filter dropdown component with predefined options
- Filter by: Level, Subject/Category, Status (active/inactive), Publisher (for Admin)
- Search field for title/ISBN search
- Combine filters with search
- Clear all filters button
- URL query params for shareable filtered views

**Filter Options:**
| Filter | Options |
|--------|---------|
| Level | All, Beginner, Intermediate, Advanced, etc. |
| Subject | All, Math, Science, Language, etc. |
| Status | All, Active, Inactive |
| Publisher | (Admin only) All publishers list |

**Acceptance Criteria:**
- [ ] Filter dropdowns functional
- [ ] Filters combine correctly (AND logic)
- [ ] Search works with filters
- [ ] Clear filters resets view
- [ ] Filters work in both grid and table views
- [ ] No performance issues with large book lists

---

### Story 19.4: Book Covers in Admin Library

**Story File:** [19.4.book-covers-admin-library.md](./19.4.book-covers-admin-library.md)

**Description:** Display book cover images in Admin Library section.

**Key deliverables:**
- Fetch book covers from DCS
- Display covers in grid view cards
- Display thumbnail covers in table view
- Loading state for cover images
- Fallback placeholder for missing covers

**Acceptance Criteria:**
- [ ] Book covers display in Admin Library grid view
- [ ] Thumbnail covers in Admin Library table view
- [ ] Placeholder shown for books without covers
- [ ] Loading state while covers fetch
- [ ] No layout shift when covers load

---

### Story 19.5: Quick Assign Button

**Story File:** [19.5.quick-assign-button.md](./19.5.quick-assign-button.md)

**Description:** Add "Assign" button for quicker teacher assignment workflow.

**Key deliverables:**
- Add "Assign" button next to "Details" on Publisher book cards
- Opens simplified assign dialog (teacher selection only)
- Admin can assign books to teachers (new capability)
- Confirmation and success feedback

**Acceptance Criteria:**
- [ ] "Assign" button visible on Publisher book cards
- [ ] Button opens quick assign dialog
- [ ] Can select teachers and assign
- [ ] Success confirmation shown
- [ ] Admin has same capability in Admin Library

---

### Story 19.6: Enhanced Cards with List View Option

**Story File:** [19.6.enhanced-cards-list-view-option.md](./19.6.enhanced-cards-list-view-option.md)

**Description:** Enhance School and Teacher cards with more details and add list view toggle.

**Key deliverables:**
- **Schools (Publisher view):**
  - Add more details to school cards (teacher count, student count)
  - Add grid/list view toggle
  - List view shows compact rows
- **Teachers (Publisher view):**
  - Add more details to teacher cards (books assigned, classes)
  - Add grid/list view toggle
  - Add predefined filters (by school, by status)

**Acceptance Criteria:**
- [ ] School cards show additional relevant info
- [ ] School list view available
- [ ] Teacher cards show additional relevant info
- [ ] Teacher list view available
- [ ] Teacher filters work correctly

---

## Technical Specifications

### ViewModeToggle Component

```typescript
// frontend/src/components/ui/view-mode-toggle.tsx
import { LayoutGrid, List } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface ViewModeToggleProps {
  value: 'grid' | 'table';
  onChange: (value: 'grid' | 'table') => void;
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as 'grid' | 'table')}>
      <ToggleGroupItem value="grid" aria-label="Grid view">
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="Table view">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
```

### View Preference Hook

```typescript
// frontend/src/hooks/useViewPreference.ts
import { useState, useEffect } from 'react';

export function useViewPreference(key: string, defaultValue: 'grid' | 'table' = 'grid') {
  const storageKey = `viewPref_${key}`;

  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    const stored = localStorage.getItem(storageKey);
    return (stored as 'grid' | 'table') || defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, viewMode);
  }, [viewMode, storageKey]);

  return [viewMode, setViewMode] as const;
}
```

### Filter Component Pattern

```typescript
// frontend/src/components/library/library-filters.tsx
interface LibraryFiltersProps {
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
  showPublisherFilter?: boolean; // Admin only
}

interface LibraryFilters {
  level?: string;
  subject?: string;
  status?: 'active' | 'inactive';
  publisher?: string;
  search?: string;
}

export function LibraryFilters({ filters, onChange, showPublisherFilter }: LibraryFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Select value={filters.level} onValueChange={(v) => onChange({ ...filters, level: v })}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Levels</SelectItem>
          <SelectItem value="beginner">Beginner</SelectItem>
          <SelectItem value="intermediate">Intermediate</SelectItem>
          <SelectItem value="advanced">Advanced</SelectItem>
        </SelectContent>
      </Select>

      {/* Similar for subject, status, publisher */}

      <Input
        placeholder="Search books..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-48"
      />

      <Button variant="ghost" onClick={() => onChange({})}>
        Clear
      </Button>
    </div>
  );
}
```

---

## Compatibility Requirements

- [x] Existing book/library functionality unchanged
- [x] API endpoints unchanged (filtering is client-side or existing)
- [x] Book cover fetching uses existing DCS patterns
- [x] No data model changes required
- [x] Routes can maintain existing paths (display name change only)

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance with large book lists | Medium | Medium | Pagination, virtual scrolling if needed |
| View preference not persisting | Low | Low | Fallback to grid default |
| Filter complexity | Low | Low | Start with simple filters, expand as needed |

**Rollback Plan:**
- UI changes can be reverted independently
- View toggle can be feature-flagged
- Filters can be disabled if issues arise

---

## Definition of Done

- [ ] "Books" renamed to "Library" in Admin nav
- [ ] "Book Catalog" renamed to "Library" in Teacher nav
- [ ] Grid/table toggle works in Publisher Library
- [ ] Grid/table toggle works in Teacher Library
- [ ] View preference persists
- [ ] Filters work in Library views
- [ ] Book covers display in Admin Library
- [ ] Quick Assign button works for Publishers
- [ ] Admin can assign books to teachers
- [ ] School cards enhanced with list option
- [ ] Teacher cards enhanced with list option and filters
- [ ] All views responsive and performant
- [ ] No regression in existing functionality

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is a UI enhancement across multiple views in Dream LMS
- Integration points:
  - Admin sidebar and Library page
  - Publisher Library, Schools, Teachers pages
  - Teacher Library page
  - Existing book/DCS cover image integration
- Existing patterns to follow:
  - Table components from existing admin tables
  - Card components from existing UI
  - DCS image loading patterns
- Critical compatibility requirements:
  - No API changes required
  - Book functionality must continue working
- Consider implementing stories in order for incremental delivery

The epic should provide a more flexible and user-friendly library browsing experience."

---

## Related Documentation

- [Story 3.6: Book Catalog Browsing for Teachers](./3.6.book-catalog-browsing-for-teachers.md)
- [Story 9.4: Book Assignment System](./9.4.book-assignment-system.md)
