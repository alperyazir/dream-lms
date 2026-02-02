/**
 * Shared Assignment Timer Component
 * Story 8.3: Student Multi-Activity Assignment Player
 *
 * Displays either:
 * - Countdown timer for timed assignments (time limit set)
 * - Elapsed time for untimed assignments (no time limit)
 *
 * Warning states for countdown: yellow when < 5 minutes, red when < 1 minute.
 */

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export interface SharedAssignmentTimerProps {
  /** Total time limit in minutes (null/undefined for elapsed mode) */
  totalTimeLimit?: number | null
  /** Time already elapsed in minutes (for resume) */
  elapsedMinutes: number
  /** Callback when time expires (only for countdown mode) */
  onTimeExpired?: () => void
  /** Callback to report current elapsed seconds (for saving) */
  onElapsedChange?: (elapsedSeconds: number) => void
}

/**
 * Format seconds to MM:SS or HH:MM:SS display
 */
function formatTime(totalSeconds: number, includeHours = false): string {
  if (totalSeconds < 0) totalSeconds = 0

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (includeHours || hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function SharedAssignmentTimer({
  totalTimeLimit,
  elapsedMinutes,
  onTimeExpired,
  onElapsedChange,
}: SharedAssignmentTimerProps) {
  const isCountdownMode = totalTimeLimit != null && totalTimeLimit > 0

  // For countdown: track remaining seconds
  // For elapsed: track elapsed seconds
  const [seconds, setSeconds] = useState(() => {
    if (isCountdownMode) {
      const totalSeconds = totalTimeLimit * 60
      const elapsedSeconds = elapsedMinutes * 60
      return Math.max(0, totalSeconds - elapsedSeconds)
    }
    // Elapsed mode: start from previously elapsed time
    return Math.floor(elapsedMinutes * 60)
  })

  // Track if we've already fired the expiry callback
  const [hasExpired, setHasExpired] = useState(false)

  // Track elapsed time for both modes (for saving progress)
  const [_elapsedTime, setElapsedTime] = useState(
    Math.floor(elapsedMinutes * 60),
  )

  // Timer tick
  useEffect(() => {
    if (isCountdownMode) {
      // Countdown mode
      if (seconds <= 0) {
        if (!hasExpired) {
          setHasExpired(true)
          onTimeExpired?.()
        }
        return
      }

      const intervalId = setInterval(() => {
        setSeconds((prev) => {
          const newValue = prev - 1
          if (newValue <= 0) {
            clearInterval(intervalId)
          }
          return newValue
        })
        // Track elapsed time in countdown mode too
        setElapsedTime((prev) => {
          const newElapsed = prev + 1
          onElapsedChange?.(newElapsed)
          return newElapsed
        })
      }, 1000)

      return () => clearInterval(intervalId)
    }
    // Elapsed mode - count up
    const intervalId = setInterval(() => {
      setSeconds((prev) => {
        const newValue = prev + 1
        onElapsedChange?.(newValue)
        return newValue
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [isCountdownMode, seconds, hasExpired, onTimeExpired, onElapsedChange])

  // Report initial elapsed time on mount
  useEffect(() => {
    const initialElapsed = Math.floor(elapsedMinutes * 60)
    onElapsedChange?.(initialElapsed)
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMinutes, onElapsedChange])

  // Determine state based on time (only for countdown)
  const remainingMinutes = isCountdownMode ? Math.floor(seconds / 60) : 0
  const isCritical = isCountdownMode && remainingMinutes < 1 && seconds > 0
  const isWarning =
    isCountdownMode && remainingMinutes < 5 && remainingMinutes >= 1
  const isExpired = isCountdownMode && seconds <= 0

  // Accessibility announcement for screen readers
  const handleAnnounce = useCallback(() => {
    if (!isCountdownMode) return null
    if (remainingMinutes === 5) {
      return "5 minutes remaining"
    }
    if (remainingMinutes === 1) {
      return "1 minute remaining"
    }
    return null
  }, [isCountdownMode, remainingMinutes])

  useEffect(() => {
    const announcement = handleAnnounce()
    if (announcement) {
      const announcer = document.getElementById("timer-announcer")
      if (announcer) {
        announcer.textContent = announcement
      }
    }
  }, [handleAnnounce])

  // Show hours if elapsed time is > 1 hour
  const showHours = !isCountdownMode && seconds >= 3600

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
          "flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-sm font-semibold",
          isExpired &&
            "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
          isCritical &&
            !isExpired &&
            "animate-pulse bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
          isWarning &&
            "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
          !isCritical &&
            !isWarning &&
            !isExpired &&
            "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
        )}
        role="timer"
        aria-label={
          isCountdownMode
            ? `Time remaining: ${formatTime(seconds)}`
            : `Time elapsed: ${formatTime(seconds, showHours)}`
        }
      >
        {/* Clock icon */}
        <svg
          className={cn("h-4 w-4", isCritical && "animate-pulse")}
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
          {isExpired ? "Time's up!" : formatTime(seconds, showHours)}
        </span>
      </div>
    </>
  )
}
