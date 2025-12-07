/**
 * Step Select Activities Component - Story 9.5 (Updated)
 *
 * Tabbed activity selection UI with three selection methods:
 * - Individual: Click activities one at a time (page viewer)
 * - By Page: Click pages to select all activities on that page
 * - By Module: Click modules to select all activities in that module
 *
 * This component is a wrapper around ActivitySelectionTabs that provides
 * the same interface as before for backward compatibility.
 *
 * Story 9.x: Added Time Planning mode support
 */

import type { DateActivityGroup } from "@/types/assignment"
import type { Book } from "@/types/book"
import { ActivitySelectionTabs } from "./ActivitySelectionTabs"

interface StepSelectActivitiesProps {
  bookId: string
  book: Book
  selectedActivityIds: string[]
  onActivityIdsChange: (activityIds: string[]) => void
  // Time Planning mode props
  timePlanningEnabled?: boolean
  onTimePlanningChange?: (enabled: boolean) => void
  dateGroups?: DateActivityGroup[]
  onDateGroupsChange?: (groups: DateActivityGroup[]) => void
  // Story 9.7: Activity preview callback
  onPreviewActivity?: (activityId: string) => void
}

export function StepSelectActivities({
  bookId,
  book,
  selectedActivityIds,
  onActivityIdsChange,
  timePlanningEnabled = false,
  onTimePlanningChange,
  dateGroups = [],
  onDateGroupsChange,
  onPreviewActivity,
}: StepSelectActivitiesProps) {
  return (
    <ActivitySelectionTabs
      bookId={bookId}
      book={book}
      selectedActivityIds={selectedActivityIds}
      onActivityIdsChange={onActivityIdsChange}
      timePlanningEnabled={timePlanningEnabled}
      onTimePlanningChange={onTimePlanningChange}
      dateGroups={dateGroups}
      onDateGroupsChange={onDateGroupsChange}
      onPreviewActivity={onPreviewActivity}
    />
  )
}
