/**
 * Publisher Library Viewer Route
 * Story 29.2: Create DCS Library Browser Page
 */

import { createFileRoute } from "@tanstack/react-router"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { LibraryViewer } from "@/pages/LibraryViewer"

export const Route = createFileRoute("/_layout/publisher/library-viewer")({
  component: () => (
    <ErrorBoundary>
      <LibraryViewer
        showPublisherFilter={false}
        title="My Library"
        description="Browse and preview your published books"
      />
    </ErrorBoundary>
  ),
})
