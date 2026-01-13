/**
 * Activity Side Panel Component - Story 8.2
 *
 * Displays activities for selected pages with:
 * - Activities grouped by page
 * - Checkbox per activity for fine-tuning selection
 * - "Select All on Page" convenience option
 * - Activity count badge
 * - Empty state handling
 */

import { useQueries } from "@tanstack/react-query"
import { CheckSquare, Square } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { booksApi } from "@/services/booksApi"
import type { PageActivity, PageInfo } from "@/types/book"
import { ACTIVITY_TYPE_CONFIG, type ActivityType } from "@/types/book"
import { getPageKey } from "./PageBrowser"

interface ActivitySidePanelProps {
  bookId: string
  selectedPages: Map<string, PageInfo> // Key: "moduleName:pageNumber"
  selectedActivityIds: Set<string>
  onActivityToggle: (activityId: string, activity: PageActivity) => void
  onSelectAllOnPage: (
    moduleName: string,
    pageNumber: number,
    activities: PageActivity[],
  ) => void
  onDeselectAllOnPage: (
    moduleName: string,
    pageNumber: number,
    activities: PageActivity[],
  ) => void
}

interface PageActivitiesGroup {
  moduleName: string
  pageNumber: number
  activities: PageActivity[]
  isLoading: boolean
  error: Error | null
}

export function ActivitySidePanel({
  bookId,
  selectedPages,
  selectedActivityIds,
  onActivityToggle,
  onSelectAllOnPage,
  onDeselectAllOnPage,
}: ActivitySidePanelProps) {
  // Get list of selected pages for querying
  const selectedPagesList = Array.from(selectedPages.entries()).map(
    ([key, page]) => {
      const [moduleName] = key.split(":")
      return { moduleName, pageNumber: page.page_number }
    },
  )

  // Fetch activities for each selected page
  const activitiesQueries = useQueries({
    queries: selectedPagesList.map(({ moduleName, pageNumber }) => ({
      queryKey: ["page-activities", bookId, moduleName, pageNumber],
      queryFn: () => booksApi.getPageActivities(bookId, pageNumber, moduleName),
      enabled: !!bookId,
      staleTime: 5 * 60 * 1000,
    })),
  })

  // Combine query results with page info
  const pageGroups: PageActivitiesGroup[] = selectedPagesList.map(
    ({ moduleName, pageNumber }, index) => ({
      moduleName,
      pageNumber,
      activities: activitiesQueries[index]?.data || [],
      isLoading: activitiesQueries[index]?.isLoading || false,
      error: activitiesQueries[index]?.error as Error | null,
    }),
  )

  // Sort by page number within each module
  pageGroups.sort((a, b) => {
    if (a.moduleName !== b.moduleName) {
      return a.moduleName.localeCompare(b.moduleName)
    }
    return a.pageNumber - b.pageNumber
  })

  // Total selected activities count
  const totalSelected = selectedActivityIds.size

  if (selectedPages.size === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <p className="text-center">
          Select pages from the left to see activities
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Total Count */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-foreground">Activities</h3>
        <Badge
          variant="secondary"
          className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
        >
          {totalSelected} selected
        </Badge>
      </div>

      {/* Activities List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {pageGroups.map((group) => (
          <PageActivityGroup
            key={getPageKey(group.moduleName, group.pageNumber)}
            moduleName={group.moduleName}
            pageNumber={group.pageNumber}
            activities={group.activities}
            isLoading={group.isLoading}
            error={group.error}
            selectedActivityIds={selectedActivityIds}
            onActivityToggle={onActivityToggle}
            onSelectAll={() =>
              onSelectAllOnPage(
                group.moduleName,
                group.pageNumber,
                group.activities,
              )
            }
            onDeselectAll={() =>
              onDeselectAllOnPage(
                group.moduleName,
                group.pageNumber,
                group.activities,
              )
            }
          />
        ))}
      </div>
    </div>
  )
}

interface PageActivityGroupProps {
  moduleName: string
  pageNumber: number
  activities: PageActivity[]
  isLoading: boolean
  error: Error | null
  selectedActivityIds: Set<string>
  onActivityToggle: (activityId: string, activity: PageActivity) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

function PageActivityGroup({
  moduleName,
  pageNumber,
  activities,
  isLoading,
  error,
  selectedActivityIds,
  onActivityToggle,
  onSelectAll,
  onDeselectAll,
}: PageActivityGroupProps) {
  // Calculate selection state for this page
  const selectedCount = activities.filter((a) =>
    selectedActivityIds.has(a.id),
  ).length
  const allSelected =
    activities.length > 0 && selectedCount === activities.length

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        Failed to load activities for page {pageNumber}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm text-foreground">
            {moduleName} - Page {pageNumber}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          No interactive activities on this page
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-sm text-foreground">
          {moduleName} - Page {pageNumber}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="h-7 text-xs"
        >
          {allSelected ? (
            <>
              <Square className="w-3 h-3 mr-1" />
              Deselect All
            </>
          ) : (
            <>
              <CheckSquare className="w-3 h-3 mr-1" />
              Select All
            </>
          )}
        </Button>
      </div>

      {/* Activities List */}
      <div className="space-y-2">
        {activities.map((activity) => {
          const isSelected = selectedActivityIds.has(activity.id)
          const typeConfig =
            ACTIVITY_TYPE_CONFIG[activity.activity_type as ActivityType]

          return (
            <label
              key={activity.id}
              className={`
                flex items-center gap-3 p-2 rounded-md cursor-pointer
                transition-colors
                ${
                  isSelected
                    ? "bg-purple-50 dark:bg-purple-950/50"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }
              `}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onActivityToggle(activity.id, activity)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {activity.title || `Activity ${activity.section_index + 1}`}
                </p>
                <Badge
                  variant={typeConfig?.badgeVariant || "secondary"}
                  className="text-xs mt-1"
                >
                  {typeConfig?.label || activity.activity_type}
                </Badge>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
