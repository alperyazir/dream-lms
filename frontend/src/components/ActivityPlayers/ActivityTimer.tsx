/**
 * Activity Timer Component
 * Story 4.1: Activity Player Framework & Layout
 *
 * Displays countdown timer with color-coded warnings
 */

import { AlertCircle, Clock } from "lucide-react"
import { useActivityTimer } from "../../hooks/useActivityTimer"
import { Badge } from "../ui/badge"

interface ActivityTimerProps {
  timeLimitMinutes: number
  timeSpentMinutes: number
  onTimeExpired: () => void
}

export function ActivityTimer({
  timeLimitMinutes,
  timeSpentMinutes,
  onTimeExpired,
}: ActivityTimerProps) {
  const { formattedTime, warningLevel, isExpired } = useActivityTimer({
    timeLimitMinutes,
    timeSpentMinutes,
    onTimeExpired,
  })

  // Color coding based on warning level
  const getColorClasses = () => {
    if (isExpired) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    }

    switch (warningLevel) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "low":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    }
  }

  return (
    <Badge
      variant="outline"
      className={`text-sm font-mono ${getColorClasses()}`}
    >
      <div className="flex items-center gap-1.5">
        {warningLevel !== "none" ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
        <span>{isExpired ? "Time's Up!" : formattedTime}</span>
      </div>
    </Badge>
  )
}
