/**
 * Activity Navigation Bar Component
 * Story 8.3: Student Multi-Activity Assignment Player
 *
 * Modern mini-map style stepper showing activity progress.
 * Compact design: numbered dots connected by lines.
 * Supports scrolling for many activities.
 */

import { useEffect, useRef } from "react"
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
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentButtonRef = useRef<HTMLButtonElement>(null)

  // Auto-scroll to keep current activity visible
  useEffect(() => {
    if (currentButtonRef.current && scrollContainerRef.current) {
      currentButtonRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
    }
  }, [currentIndex])

  // Size modes based on activity count
  const sizeMode =
    activities.length > 30
      ? "tiny"
      : activities.length > 15
        ? "compact"
        : "normal"

  // Get size classes based on mode
  const getSizeClasses = () => {
    switch (sizeMode) {
      case "tiny":
        return {
          button: "h-6 w-6 text-[10px]",
          connector: "w-1.5",
          icon: "h-3 w-3",
        }
      case "compact":
        return {
          button: "h-7 w-7 text-xs",
          connector: "w-2",
          icon: "h-3.5 w-3.5",
        }
      default:
        return {
          button: "h-8 w-8 text-sm",
          connector: "w-3",
          icon: "h-4 w-4",
        }
    }
  }

  const sizes = getSizeClasses()

  return (
    <div className="relative w-full max-w-full overflow-hidden py-1">
      <div
        ref={scrollContainerRef}
        className="flex items-center overflow-x-auto scrollbar-none py-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <div className="flex items-center gap-0 mx-auto px-2">
          {activities.map((activity, index) => {
            const state = activityStates.get(activity.id)
            const status = state?.status || "not_started"
            const isCurrent = index === currentIndex
            const isCompleted = status === "completed"
            const isLast = index === activities.length - 1

            return (
              <div key={activity.id} className="flex items-center shrink-0">
                {/* Step indicator */}
                <button
                  ref={isCurrent ? currentButtonRef : null}
                  type="button"
                  onClick={() => onNavigate(index)}
                  disabled={disabled}
                  className={cn(
                    "relative flex items-center justify-center rounded-full font-semibold transition-all duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    sizes.button,
                    isCurrent
                      ? "bg-teal-600 text-white shadow-lg scale-110 dark:bg-teal-500"
                      : isCompleted
                        ? "bg-green-500 text-white dark:bg-green-600"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
                  )}
                  title={activity.title || `Activity ${index + 1}`}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Activity ${index + 1}: ${activity.title || activity.activity_type} (${status.replace("_", " ")})`}
                >
                  {isCompleted && !isCurrent ? (
                    <svg
                      className={sizes.icon}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
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
                      "h-0.5 transition-colors duration-200",
                      sizes.connector,
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
      </div>
    </div>
  )
}
