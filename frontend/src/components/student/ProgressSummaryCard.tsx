/**
 * Progress Summary Card Component
 * Story 22.1: Dashboard Layout Refactor
 * Displays key student progress metrics with link to detailed progress page
 */

import { Link } from "@tanstack/react-router"
import { ArrowRight, BookOpen, CheckCircle, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { StudentProgressStats } from "@/types/analytics"

export interface ProgressSummaryCardProps {
  stats: StudentProgressStats
}

export function ProgressSummaryCard({ stats }: ProgressSummaryCardProps) {
  // Calculate overall completion percentage (use avg_score as proxy)
  const overallCompletion = Math.round(stats.avg_score)
  const totalAssignments = stats.total_completed // We'll show completed count only

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Progress</CardTitle>
          <Button variant="link" size="sm" asChild className="text-primary">
            <Link to="/student/progress">
              View Details
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Overall Completion */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>Overall Progress</span>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={overallCompletion} className="flex-1" />
              <span className="text-lg font-semibold">
                {overallCompletion}%
              </span>
            </div>
          </div>

          {/* Assignments Completed */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>Assignments</span>
            </div>
            <p className="text-lg font-semibold">
              {totalAssignments}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                completed
              </span>
            </p>
          </div>

          {/* Learning Streak */}
          {stats.current_streak > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>Learning Streak</span>
              </div>
              <p className="text-lg font-semibold">
                {stats.current_streak} day
                {stats.current_streak !== 1 ? "s" : ""}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  🔥
                </span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
