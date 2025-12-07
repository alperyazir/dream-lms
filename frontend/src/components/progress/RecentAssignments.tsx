/**
 * Recent Assignments Component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 *
 * Displays recent completed assignments with scores
 */

import { BookOpen, CheckCircle, Clock, Star } from "lucide-react"
import React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProgressRecentAssignment } from "@/types/analytics"

export interface RecentAssignmentsProps {
  assignments: ProgressRecentAssignment[]
}

const getScoreColor = (score: number): string => {
  if (score >= 90) return "text-green-500"
  if (score >= 80) return "text-teal-500"
  if (score >= 70) return "text-amber-500"
  return "text-red-500"
}

export const RecentAssignments = React.memo(
  ({ assignments }: RecentAssignmentsProps) => {
    if (assignments.length === 0) {
      return (
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-500" />
              Recent Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground text-center">
              No completed assignments yet. Start practicing!
            </p>
          </CardContent>
        </Card>
      )
    }

    const formatDate = (dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }

    return (
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-500" />
            Recent Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {assignment.score >= 100 ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {assignment.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="w-3 h-3" />
                    <span className="truncate">{assignment.book_title}</span>
                    <span className="text-muted-foreground/50">|</span>
                    <span>{formatDate(assignment.completed_at)}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <p
                    className={`text-xl font-bold ${getScoreColor(assignment.score)}`}
                  >
                    {assignment.score}%
                  </p>
                  {assignment.score === 100 && (
                    <Badge
                      variant="default"
                      className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs"
                    >
                      Perfect!
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  },
)

RecentAssignments.displayName = "RecentAssignments"
