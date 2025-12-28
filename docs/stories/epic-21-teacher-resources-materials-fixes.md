# Epic 21: Teacher Resources & Materials Fixes

**Status:** Stories Created
**Type:** Brownfield Enhancement (Bug Fixes + Features)
**Created:** 2025-12-19
**Author:** John (PM Agent)

---

## Epic Goal

Fix issues with Teacher's My Materials functionality, improve Resources section behavior, and enhance report viewing experience.

---

## Epic Description

### Existing System Context

- **Current functionality:** Teachers have My Materials section (Epic 13), Resources sections in assignments, analytics with report generation
- **Technology stack:** React/TypeScript frontend, FastAPI backend, DCS for file storage
- **Integration points:**
  - My Materials management (Teacher profile)
  - Resources/Videos section in assignment context
  - Report generation and download

### Enhancement Details

**Bug Fixes:**
1. My Materials download button not working - fix to allow re-downloading materials
2. Remove Insights section (no longer needed)

**Feature Enhancements:**
1. Hide Resources section if book has no videos
2. In Resources section, allow teachers to upload new materials (integrate with My Materials)
3. After generating a report, display it on screen (not just download button)

**Success criteria:**
- Download button works for all material types
- Resources section hidden when no content available
- Teachers can upload materials within Resources context
- Reports viewable in-browser before download
- Insights section removed

---

## Stories

### Story 21.1: Fix My Materials Download

**Story File:** [21.1.fix-my-materials-download.md](./21.1.fix-my-materials-download.md)

**Description:** Fix the download button functionality in My Materials section.

**Key deliverables:**
- Debug why download button isn't working
- Implement proper file download via DCS
- Handle different file types (PDF, images, audio, video)
- Show download progress for large files
- Test all material types

**Acceptance Criteria:**
- [ ] Download button triggers file download
- [ ] All file types download correctly
- [ ] Progress indicator for large files
- [ ] Proper error handling if download fails
- [ ] Works across browsers

---

### Story 21.2: Conditional Resources Section

**Story File:** [21.2.conditional-resources-section.md](./21.2.conditional-resources-section.md)

**Description:** Hide Resources section when book has no videos or content.

**Key deliverables:**
- Check if book has videos/resources before rendering section
- Hide entire Resources section if empty
- Apply to assignment view and book detail view
- Graceful handling of loading state

**Acceptance Criteria:**
- [ ] Resources section hidden when book has no videos
- [ ] Resources section shown when book has videos
- [ ] No layout issues when section hidden
- [ ] Works in all contexts (assignment, book detail)

---

### Story 21.3: Upload Materials in Resources Context

**Story File:** [21.3.upload-materials-in-resources-context.md](./21.3.upload-materials-in-resources-context.md)

**Description:** Allow teachers to upload materials directly from the Resources section.

**Key deliverables:**
- Add "Add Material" button in Resources section
- Opens upload dialog (reuse from My Materials)
- Uploaded material saves to teacher's My Materials storage
- Material can then be attached to assignment
- Quick workflow without leaving context

**Acceptance Criteria:**
- [ ] "Add Material" button in Resources section
- [ ] Upload dialog opens
- [ ] Material saved to My Materials
- [ ] Can immediately attach to current assignment
- [ ] Quota limits still enforced

---

### Story 21.4: Remove Insights Section

**Story File:** [21.4.remove-insights-section.md](./21.4.remove-insights-section.md)

**Description:** Remove the Insights section from Teacher view as it's no longer needed.

**Key deliverables:**
- Remove Insights component/page
- Remove navigation link to Insights
- Clean up any related unused code
- Verify no broken references

**Acceptance Criteria:**
- [ ] Insights section no longer accessible
- [ ] No Insights link in navigation
- [ ] No console errors or broken routes
- [ ] Related analytics pages still work

---

### Story 21.5: In-Browser Report Viewing

**Story File:** [21.5.in-browser-report-viewing.md](./21.5.in-browser-report-viewing.md)

**Description:** Display generated reports on screen for viewing before download.

**Key deliverables:**
- After report generation, display PDF in viewer
- PDF viewer component (embed or library)
- Download button available below/beside viewer
- Print option
- Handle large reports gracefully

**Acceptance Criteria:**
- [ ] Generated report displays in browser
- [ ] PDF is viewable and scrollable
- [ ] Download button works
- [ ] Print option available
- [ ] Fallback for unsupported browsers
- [ ] Report shows immediately after generation (no reload required)

---

## Technical Specifications

### Download Fix

```typescript
// frontend/src/hooks/useMaterialDownload.ts

export function useMaterialDownload() {
  const downloadMaterial = async (materialId: string, filename: string) => {
    try {
      const response = await fetch(`/api/v1/teachers/materials/${materialId}/download`);

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  return { downloadMaterial };
}
```

### Conditional Resources

```typescript
// frontend/src/components/resources/ResourcesSection.tsx

export function ResourcesSection({ bookId }: { bookId: string }) {
  const { data: resources, isLoading } = useBookResources(bookId);

  // Don't render if no resources
  if (!isLoading && (!resources || resources.length === 0)) {
    return null;
  }

  if (isLoading) {
    return <ResourcesSkeleton />;
  }

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Resources</h3>
        <AddMaterialButton /> {/* New: upload in context */}
      </div>
      <ResourcesList resources={resources} />
    </section>
  );
}
```

### PDF Viewer Component

```typescript
// frontend/src/components/reports/ReportViewer.tsx
import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportViewerProps {
  reportUrl: string;
  filename: string;
}

export function ReportViewer({ reportUrl, filename }: ReportViewerProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end gap-2 p-2 border-b">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={reportUrl} download={filename}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </a>
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <iframe
          src={`${reportUrl}#toolbar=0`}
          className="w-full h-full border-0"
          title="Report Preview"
        />
        {/* Or use react-pdf library for more control */}
      </div>
    </div>
  );
}
```

---

## Compatibility Requirements

- [x] My Materials API unchanged (just fix frontend)
- [x] DCS integration patterns reused
- [x] Report generation API unchanged (just add viewing)
- [x] Existing Resources functionality preserved

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PDF viewer browser compatibility | Medium | Medium | Fallback to download link; test major browsers |
| Download fix doesn't address all cases | Medium | Low | Thorough testing of all material types |
| Upload in Resources confuses users | Low | Low | Clear UI labeling; link to My Materials |

**Rollback Plan:**
- Download fix is isolated
- Resources hiding can be reverted
- Report viewer can fallback to download-only

---

## Definition of Done

- [ ] My Materials download works for all file types
- [ ] Resources section hidden when no videos
- [ ] "Add Material" button in Resources context
- [ ] Materials upload from Resources works
- [ ] Insights section removed
- [ ] Reports display in browser after generation
- [ ] Download and print options available for reports
- [ ] No regression in existing functionality
- [ ] Unit tests for download functionality

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is a mix of bug fixes and minor enhancements for Teacher views
- Integration points:
  - My Materials section (from Epic 13)
  - Resources section in various views
  - Report generation and viewing
- Existing patterns to follow:
  - DCS download patterns
  - Upload dialog from My Materials
  - PDF viewing patterns (or introduce new)
- Critical compatibility requirements:
  - Must not break My Materials functionality
  - Must not break report generation
- Stories are independent and can be implemented in any order

The epic should fix existing issues and provide quality-of-life improvements for Teachers."

---

## Related Documentation

- [Epic 13: Teacher Supplementary Materials](./epic-13-teacher-supplementary-materials.md)
- [Story 13.2: Frontend My Materials Management](./13.2.frontend-my-materials-management.md)
