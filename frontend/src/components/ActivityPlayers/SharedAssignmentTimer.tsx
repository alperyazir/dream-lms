/**
 * Shared Assignment Timer Component
 * Story 8.3: Student Multi-Activity Assignment Player
 *
 * Displays countdown timer for timed assignments.
 * Shared across all activities in a multi-activity assignment.
 * Warning states: yellow when < 5 minutes, red when < 1 minute.
 */

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export interface SharedAssignmentTimerProps {
  /** Total time limit in minutes */
  totalTimeLimit: number
  /** Time already elapsed in minutes (for resume) */
  elapsedMinutes: number
  /** Callback when time expires */
  onTimeExpired: () => void
}

/**
 * Format seconds to MM:SS display
 */
function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00"

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function SharedAssignmentTimer({
  totalTimeLimit,
  elapsedMinutes,
  onTimeExpired,
}: SharedAssignmentTimerProps) {
  // Calculate remaining time in seconds
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const totalSeconds = totalTimeLimit * 60
    const elapsedSeconds = elapsedMinutes * 60
    return Math.max(0, totalSeconds - elapsedSeconds)
  })

  // Track if we've already fired the expiry callback
  const [hasExpired, setHasExpired] = useState(false)

  // Timer tick
  useEffect(() => {
    if (remainingSeconds <= 0) {
      if (!hasExpired) {
        setHasExpired(true)
        onTimeExpired()
      }
      return
    }

    const intervalId = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newValue = prev - 1
        if (newValue <= 0) {
          clearInterval(intervalId)
        }
        return newValue
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [remainingSeconds, hasExpired, onTimeExpired])

  // Determine state based on remaining time
  const remainingMinutes = Math.floor(remainingSeconds / 60)
  const isCritical = remainingMinutes < 1 && remainingSeconds > 0
  const isWarning = remainingMinutes < 5 && remainingMinutes >= 1
  const isExpired = remainingSeconds <= 0

  // Accessibility announcement for screen readers
  const handleAnnounce = useCallback(() => {
    if (remainingMinutes === 5) {
      return "5 minutes remaining"
    }
    if (remainingMinutes === 1) {
      return "1 minute remaining"
    }
    return null
  }, [remainingMinutes])

  useEffect(() => {
    const announcement = handleAnnounce()
    if (announcement) {
      // Create an aria-live announcement
      const announcer = document.getElementById("timer-announcer")
      if (announcer) {
        announcer.textContent = announcement
      }
    }
  }, [handleAnnounce])

  return (
    <>
      {/* Hidden announcer for screen readers */}
      <div
        id="timer-announcer"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Timer display */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg font-bold",
          isExpired && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
          isCritical && !isExpired && "animate-pulse bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
          isWarning && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
          !isCritical && !isWarning && !isExpired && "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
        )}
        role="timer"
        aria-label={`Time remaining: ${formatTime(remainingSeconds)}`}
      >
        {/* Clock icon */}
        <svg
          className={cn(
            "h-5 w-5",
            isCritical && "animate-pulse",
          )}
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

        {/* Time display */}
        <span className="tabular-nums">
          {isExpired ? "Time's up!" : formatTime(remainingSeconds)}
        </span>
      </div>
    </>
  )
}
