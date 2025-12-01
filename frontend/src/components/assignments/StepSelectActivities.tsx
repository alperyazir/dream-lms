/**
 * Step Select Activities Component - Story 8.2 Enhanced
 *
 * Page-based activity selection UI with:
 * - Selected book display at top
 * - Full-page viewer with activity markers
 * - Click diamonds to select/deselect activities
 * - Selected activities summary panel
 */

import { useCallback, useState } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ActivityMarker, Book } from "@/types/book"
import { ACTIVITY_TYPE_CONFIG } from "@/types/book"
import { PageViewer } from "./PageViewer"

interface StepSelectActivitiesProps {
  bookId: string
  book: Book
  selectedActivityIds: string[]
  onActivityIdsChange: (activityIds: string[]) => void
}

// Store activity data for selected activities
interface SelectedActivityData {
  id: string
  title: string | null
  activityType: string
  sectionIndex: number
}

export function StepSelectActivities({
  bookId,
  book,
  selectedActivityIds,
  onActivityIdsChange,
}: StepSelectActivitiesProps) {
  // Track selected activities with their data
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set(selectedActivityIds)
  )
  const [activityDataMap, setActivityDataMap] = useState<
    Map<string, SelectedActivityData>
  >(new Map())

  // Handle activity toggle from PageViewer
  const handleActivityToggle = useCallback(
    (activityId: string, activity: ActivityMarker) => {
      setSelectedActivities((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(activityId)) {
          newSet.delete(activityId)
        } else {
          newSet.add(activityId)
        }

        // Update parent with new array
        onActivityIdsChange(Array.from(newSet))

        return newSet
      })

      // Store activity data
      setActivityDataMap((prev) => {
        const newMap = new Map(prev)
        if (!newMap.has(activityId)) {
          newMap.set(activityId, {
            id: activityId,
            title: activity.title,
            activityType: activity.activity_type,
            sectionIndex: activity.section_index,
          })
        }
        return newMap
      })
    },
    [onActivityIdsChange]
  )

  // Handle remove activity from summary panel
  const handleRemoveActivity = useCallback(
    (activityId: string) => {
      setSelectedActivities((prev) => {
        const newSet = new Set(prev)
        newSet.delete(activityId)
        onActivityIdsChange(Array.from(newSet))
        return newSet
      })
    },
    [onActivityIdsChange]
  )

  // Handle clear all
  const handleClearAll = useCallback(() => {
    setSelectedActivities(new Set())
    onActivityIdsChange([])
  }, [onActivityIdsChange])

  // Get selected activities as array with data
  const selectedActivitiesList = Array.from(selectedActivities)
    .map((id) => activityDataMap.get(id))
    .filter((a): a is SelectedActivityData => a !== undefined)

  return (
    <div className="flex flex-col h-[550px] overflow-hidden w-full max-w-full">
      {/* Selected Book Info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-200 dark:border-gray-700 shrink-0 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-sm text-foreground">{book.title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px]">
                {book.publisher_name}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {book.activity_count} activities
              </span>
            </div>
          </div>
          {/* Selected Count */}
          {selectedActivities.size > 0 && (
            <Badge className="bg-purple-600 text-white text-xs">
              {selectedActivities.size} selected
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content - Page Viewer and Selected Activities */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">
        {/* Page Viewer - Main Area */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <PageViewer
            bookId={bookId}
            selectedActivityIds={selectedActivities}
            onActivityToggle={handleActivityToggle}
          />
        </div>

        {/* Selected Activities Panel - Right Side */}
        <div className="w-40 shrink-0 border-l border-gray-200 dark:border-gray-700 pl-2 flex flex-col">
          <div className="flex items-center justify-between mb-1 shrink-0">
            <h4 className="font-medium text-[10px] text-foreground">
              Selected ({selectedActivities.size})
            </h4>
            {selectedActivities.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-4 text-[9px] px-1 text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>

          {selectedActivities.size === 0 ? (
            <div className="text-[10px] text-muted-foreground py-2 text-center">
              Click activities to select
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="space-y-1 pr-1">
                {selectedActivitiesList.map((activity) => {
                  const config =
                    ACTIVITY_TYPE_CONFIG[
                      activity.activityType as keyof typeof ACTIVITY_TYPE_CONFIG
                    ]
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-1 p-1 bg-gray-50 dark:bg-gray-800 rounded group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-medium text-foreground truncate">
                          {activity.title || `Activity ${activity.sectionIndex + 1}`}
                        </div>
                        <Badge
                          variant={config?.badgeVariant || "outline"}
                          className="text-[8px] px-1 py-0"
                        >
                          {config?.label || activity.activityType}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveActivity(activity.id)}
                        className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
