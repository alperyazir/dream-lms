/**
 * Preview Results Summary - Story 9.7
 *
 * Displays results after completing an assignment in preview mode.
 * Shows per-activity scores without saving to backend.
 */

import { CheckCircle, Clock, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import type { PreviewResults } from "../ActivityPlayers/MultiActivityPlayer"

interface TestModeResultsSummaryProps {
  isOpen: boolean
  onClose: () => void
  results: PreviewResults | null
  onRetry?: () => void
}

export function TestModeResultsSummary({
  isOpen,
  onClose,
  results,
  onRetry,
}: TestModeResultsSummaryProps) {
  if (!results) {
    return null
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400"
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">Preview Complete</span>
            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
              Not Saved
            </span>
          </DialogTitle>
          <DialogDescription>
            Here's how you did on this preview run. These results are not saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Score */}
          <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div
              className={`text-4xl font-bold ${getScoreColor(results.totalScore)}`}
            >
              {Math.round(results.totalScore)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Overall Score
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>
                {results.activitiesCompleted} / {results.totalActivities}{" "}
                completed
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>
                {results.timeSpentMinutes > 0
                  ? `${results.timeSpentMinutes} min`
                  : "< 1 min"}
              </span>
            </div>
          </div>

          {/* Per-Activity Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Activity Breakdown
            </h4>
            {results.perActivityScores.map((activity, index) => (
              <div key={activity.activityId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                    {activity.activityTitle || `Activity ${index + 1}`}
                  </span>
                  <div className="flex items-center gap-2">
                    {activity.status === "completed" ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-gray-400" />
                    )}
                    <span
                      className={
                        activity.score !== null
                          ? getScoreColor(activity.score)
                          : "text-gray-400"
                      }
                    >
                      {activity.score !== null
                        ? `${Math.round(activity.score)}%`
                        : "-"}
                    </span>
                  </div>
                </div>
                {activity.score !== null && (
                  <Progress
                    value={activity.score}
                    className={`h-1.5 ${getProgressColor(activity.score)}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Try Again
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
