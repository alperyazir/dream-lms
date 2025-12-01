/**
 * Student Score Breakdown Component
 * Story 8.4: Multi-Activity Assignment Analytics
 *
 * Displays per-activity score breakdown for students viewing their results.
 */

import { CheckCircle, Clock, FileText, Loader2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useStudentAssignmentResult } from "@/hooks/useAssignmentAnalytics"
import type { ActivityScoreItem } from "@/types/assignment"

interface StudentScoreBreakdownProps {
  assignmentId: string
}

/**
 * Format activity type for display
 */
function formatActivityType(type: string): string {
  const typeMap: Record<string, string> = {
    circle: "Circle",
    drag_drop_picture: "Drag & Drop Picture",
    drag_drop_word: "Drag & Drop Word",
    fill_blank: "Fill in the Blank",
    match_words: "Match the Words",
    multiple_choice: "Multiple Choice",
    coloring: "Coloring",
    drawing: "Drawing",
  }
  return typeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Get status icon and color
 */
function getStatusDisplay(status: string): { icon: React.ReactNode; color: string } {
  switch (status) {
    case "completed":
      return {
        icon: <CheckCircle className="h-5 w-5" />,
        color: "text-green-500",
      }
    case "in_progress":
      return {
        icon: <Clock className="h-5 w-5" />,
        color: "text-yellow-500",
      }
    default:
      return {
        icon: <XCircle className="h-5 w-5" />,
        color: "text-gray-400",
      }
  }
}

/**
 * Get score color based on percentage
 */
function getScoreColor(score: number | null, maxScore: number): string {
  if (score === null) return "text-gray-400"
  const percentage = (score / maxScore) * 100
  if (percentage >= 80) return "text-green-600"
  if (percentage >= 60) return "text-blue-600"
  if (percentage >= 40) return "text-yellow-600"
  return "text-red-600"
}

/**
 * Individual activity score card
 */
function ActivityScoreCard({ activity }: { activity: ActivityScoreItem }) {
  const statusDisplay = getStatusDisplay(activity.status)
  const scorePercentage = activity.score !== null
    ? Math.round((activity.score / activity.max_score) * 100)
    : null

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={statusDisplay.color}>{statusDisplay.icon}</div>
        <div>
          <h4 className="font-medium">
            {activity.activity_title || "Untitled Activity"}
          </h4>
          <Badge variant="outline" className="mt-1">
            {formatActivityType(activity.activity_type)}
          </Badge>
        </div>
      </div>
      <div className="text-right">
        {activity.score !== null ? (
          <>
            <div className={`text-2xl font-bold ${getScoreColor(activity.score, activity.max_score)}`}>
              {scorePercentage}%
            </div>
            <div className="text-sm text-muted-foreground">
              {activity.score} / {activity.max_score}
            </div>
          </>
        ) : (
          <div className="text-lg text-muted-foreground">Not completed</div>
        )}
      </div>
    </div>
  )
}

/**
 * Loading skeleton
 */
function ScoreBreakdownSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

/**
 * Main student score breakdown component
 */
export function StudentScoreBreakdown({ assignmentId }: StudentScoreBreakdownProps) {
  const { data: result, isLoading, error } = useStudentAssignmentResult(assignmentId)

  if (isLoading) {
    return <ScoreBreakdownSkeleton />
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <XCircle className="h-8 w-8 mx-auto mb-2" />
        <p>Failed to load your results. Please try again.</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No results available.</p>
      </div>
    )
  }

  const completionPercent = Math.round(
    (result.completed_activities / result.total_activities) * 100
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{result.assignment_name}</span>
          {result.total_score !== null && (
            <div className={`text-3xl font-bold ${getScoreColor(result.total_score, 100)}`}>
              {Math.round(result.total_score)}%
            </div>
          )}
        </CardTitle>
        {result.completed_at && (
          <p className="text-sm text-muted-foreground">
            Completed on {new Date(result.completed_at).toLocaleDateString()} at{" "}
            {new Date(result.completed_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Summary */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Activities Completed</span>
            <span className="font-medium">
              {result.completed_activities} of {result.total_activities}
            </span>
          </div>
          <Progress value={completionPercent} className="h-3" />
        </div>

        {/* Activity Scores */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Score Breakdown</h3>
          {result.activity_scores.map((activity) => (
            <ActivityScoreCard key={activity.activity_id} activity={activity} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
