/**
 * Activity Player Header Component
 * Story 4.1: Activity Player Framework & Layout
 *
 * Displays assignment info, timer, and progress indicator
 */

import { Badge } from "../ui/badge"
import { Separator } from "../ui/separator"
import { ActivityTimer } from "./ActivityTimer"
import type { ActivityStartResponse } from "../../types/assignment"

interface ActivityPlayerHeaderProps {
  activity: ActivityStartResponse
  onTimeExpired: () => void
}

export function ActivityPlayerHeader({
  activity,
  onTimeExpired,
}: ActivityPlayerHeaderProps) {
  // Format activity type for display
  const formatActivityType = (type: string): string => {
    const typeMap: Record<string, string> = {
      circle: "Multiple Choice",
      markwithx: "True/False",
      matchTheWords: "Word Matching",
      dragdroppicture: "Fill in the Blank",
      dragdroppicturegroup: "Drag and Drop Grouping",
      puzzleFindWords: "Word Search",
      fillSentencesWithDots: "Fill Sentences",
      fillpicture: "Fill Picture",
    }
    return typeMap[type] || type
  }

  return (
    <div className="border-b bg-background p-4">
      <div className="mx-auto max-w-7xl">
        {/* Assignment Name & Book Title */}
        <div className="mb-3">
          <h1 className="text-2xl font-bold">{activity.assignment_name}</h1>
          <p className="text-sm text-muted-foreground">{activity.book_title}</p>
        </div>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Activity Type Badge */}
          <Badge variant="secondary">
            {formatActivityType(activity.activity_type)}
          </Badge>

          <Separator orientation="vertical" className="h-6" />

          {/* Timer (if time limit set) */}
          {activity.time_limit_minutes !== null && (
            <>
              <ActivityTimer
                timeLimitMinutes={activity.time_limit_minutes}
                timeSpentMinutes={activity.time_spent_minutes}
                onTimeExpired={onTimeExpired}
              />
              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          {/* Progress Indicator - placeholder for multi-part activities */}
          <span className="text-sm text-muted-foreground">
            Question 1 of 1
          </span>
        </div>
      </div>
    </div>
  )
}
