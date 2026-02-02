/**
 * Admin Library Viewer Route
 * Story 29.2: Create DCS Library Browser Page
 */

import { createFileRoute } from "@tanstack/react-router"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { LibraryViewer } from "@/pages/LibraryViewer"

export const Route = createFileRoute("/_layout/admin/library-viewer")({
  component: () => (
    <ErrorBoundary>
      <LibraryViewer
        showPublisherFilter={true}
        title="Library Viewer"
        description="Browse and preview all books from the DCS library"
      />
    </ErrorBoundary>
  ),
})
