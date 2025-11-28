/**
 * Custom hook for activity timer countdown
 * Story 4.1: Activity Player Framework & Layout
 */

import { useEffect, useState } from "react"

export type TimerWarningLevel = "none" | "low" | "critical"

interface UseActivityTimerOptions {
  timeLimitMinutes: number | null
  timeSpentMinutes: number
  onTimeExpired?: () => void
}

interface UseActivityTimerReturn {
  remainingSeconds: number
  isExpired: boolean
  warningLevel: TimerWarningLevel
  formattedTime: string
}

/**
 * Hook to manage activity timer countdown
 *
 * @param options - Timer configuration
 * @returns Timer state and formatted time
 */
export function useActivityTimer({
  timeLimitMinutes,
  timeSpentMinutes,
  onTimeExpired,
}: UseActivityTimerOptions): UseActivityTimerReturn {
  // Calculate initial remaining time
  const initialRemainingSeconds =
    timeLimitMinutes !== null
      ? timeLimitMinutes * 60 - timeSpentMinutes * 60
      : 0

  const [remainingSeconds, setRemainingSeconds] = useState(
    initialRemainingSeconds,
  )
  const [isExpired, setIsExpired] = useState(initialRemainingSeconds <= 0)

  useEffect(() => {
    // No timer if no time limit
    if (timeLimitMinutes === null) {
      return
    }

    // Don't start timer if already expired
    if (remainingSeconds <= 0) {
      setIsExpired(true)
      if (onTimeExpired && !isExpired) {
        onTimeExpired()
      }
      return
    }

    // Countdown interval
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1

        // Time expired
        if (next <= 0) {
          setIsExpired(true)
          if (onTimeExpired) {
            onTimeExpired()
          }
          return 0
        }

        return next
      })
    }, 1000)

    // Cleanup
    return () => clearInterval(interval)
  }, [timeLimitMinutes, remainingSeconds, onTimeExpired, isExpired])

  // Calculate warning level
  const getWarningLevel = (): TimerWarningLevel => {
    if (timeLimitMinutes === null || remainingSeconds <= 0) {
      return "none"
    }

    const totalSeconds = timeLimitMinutes * 60
    const percentRemaining = (remainingSeconds / totalSeconds) * 100

    // Critical: < 2 minutes or < 10% remaining
    if (remainingSeconds < 120 || percentRemaining < 10) {
      return "critical"
    }

    // Low: 2-5 minutes remaining
    if (remainingSeconds < 300) {
      return "low"
    }

    return "none"
  }

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return {
    remainingSeconds,
    isExpired,
    warningLevel: getWarningLevel(),
    formattedTime: formatTime(remainingSeconds),
  }
}
