/**
 * Activity Navigation Bar Component
 * Story 8.3: Student Multi-Activity Assignment Player
 *
 * Modern mini-map style stepper showing activity progress.
 * Compact design: numbered dots connected by lines.
 */

import { cn } from "@/lib/utils"
import type { ActivityState, ActivityWithConfig } from "@/types/assignment"

export interface ActivityNavigationBarProps {
  activities: ActivityWithConfig[]
  currentIndex: number
  activityStates: Map<string, ActivityState>
  onNavigate: (index: number) => void
  disabled?: boolean
}

export function ActivityNavigationBar({
  activities,
  currentIndex,
  activityStates,
  onNavigate,
  disabled = false,
}: ActivityNavigationBarProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {activities.map((activity, index) => {
        const state = activityStates.get(activity.id)
        const status = state?.status || "not_started"
        const isCurrent = index === currentIndex
        const isCompleted = status === "completed"
        const isLast = index === activities.length - 1

        return (
          <div key={activity.id} className="flex items-center">
            {/* Step indicator */}
            <button
              type="button"
              onClick={() => onNavigate(index)}
              disabled={disabled}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isCurrent
                  ? "bg-teal-600 text-white shadow-lg ring-2 ring-teal-300 dark:bg-teal-500 dark:ring-teal-400"
                  : isCompleted
                    ? "bg-green-500 text-white dark:bg-green-600"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
              )}
              title={activity.title || `Activity ${index + 1}`}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Activity ${index + 1}: ${activity.title || activity.activity_type} (${status.replace("_", " ")})`}
            >
              {isCompleted && !isCurrent ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </button>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "h-0.5 w-8 transition-colors duration-200",
                  isCompleted
                    ? "bg-green-500 dark:bg-green-600"
                    : "bg-gray-300 dark:bg-gray-600",
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
