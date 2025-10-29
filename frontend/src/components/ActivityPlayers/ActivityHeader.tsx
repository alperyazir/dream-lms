/**
 * Activity Header - Timer, title, activity type badge
 * Story 2.5 - Phase 1, Task 1.2
 */

import { useEffect, useState, memo } from "react"
import { Badge } from "@/components/ui/badge"

interface ActivityHeaderProps {
  bookTitle: string
  activityType:
    | "dragdroppicture"
    | "dragdroppicturegroup"
    | "matchTheWords"
    | "circle"
    | "markwithx"
    | "puzzleFindWords"
  timeLimit?: number // in minutes
  onTimeExpired?: () => void
}

export const ActivityHeader = memo(function ActivityHeader({
  bookTitle,
  activityType,
  timeLimit,
  onTimeExpired,
}: ActivityHeaderProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    timeLimit ? timeLimit * 60 : null,
  ) // Convert to seconds

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null) return

    if (timeRemaining <= 0) {
      onTimeExpired?.()
      return
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, onTimeExpired])

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Activity type labels
  const activityTypeLabels: Record<string, string> = {
    dragdroppicture: "Drag & Drop",
    dragdroppicturegroup: "Drag & Drop Group",
    matchTheWords: "Match the Words",
    circle: "Circle Activity",
    markwithx: "Mark with X",
    puzzleFindWords: "Word Search",
  }

  // Time warning colors
  const getTimeColor = () => {
    if (timeRemaining === null) return ""
    if (timeRemaining < 60) return "text-red-600 dark:text-red-400" // < 1 minute
    if (timeRemaining < 300) return "text-orange-600 dark:text-orange-400" // < 5 minutes
    return "text-teal-600 dark:text-teal-400"
  }

  return (
    <header className="border-b bg-gradient-to-r from-teal-500 to-cyan-500 p-4 shadow-md dark:border-gray-700">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Left: Book title and activity type */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white sm:text-xl">
            {bookTitle}
          </h1>
          <Badge
            variant="secondary"
            className="hidden bg-white/20 text-white backdrop-blur-sm sm:inline-flex"
          >
            {activityTypeLabels[activityType]}
          </Badge>
        </div>

        {/* Right: Timer (if time limit exists) */}
        {timeRemaining !== null && (
          <div
            className={`flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm dark:bg-gray-800 ${getTimeColor()}`}
            role="timer"
            aria-label={`Time remaining: ${formatTime(timeRemaining)}`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-lg font-bold tabular-nums">
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* Mobile: Activity type badge */}
      <div className="mt-2 sm:hidden">
        <Badge
          variant="secondary"
          className="bg-white/20 text-white backdrop-blur-sm"
        >
          {activityTypeLabels[activityType]}
        </Badge>
      </div>
    </header>
  )
})
