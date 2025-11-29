/**
 * Study Time Card Component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 *
 * Displays study time statistics
 */

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Calendar, Timer } from "lucide-react"
import type { StudyTimeStats } from "@/types/analytics"

export interface StudyTimeCardProps {
  stats: StudyTimeStats
}

const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}m`
}

export const StudyTimeCard = React.memo(({ stats }: StudyTimeCardProps) => {
  return (
    <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-500" />
          Study Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* This Week */}
          <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <Calendar className="w-5 h-5 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-foreground">
              {formatTime(stats.this_week_minutes)}
            </p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>

          {/* This Month */}
          <div className="text-center p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <Calendar className="w-5 h-5 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-foreground">
              {formatTime(stats.this_month_minutes)}
            </p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </div>

          {/* Average per Assignment */}
          <div className="text-center p-3 rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
            <Timer className="w-5 h-5 mx-auto mb-2 text-teal-500" />
            <p className="text-2xl font-bold text-foreground">
              {formatTime(Math.round(stats.avg_per_assignment))}
            </p>
            <p className="text-xs text-muted-foreground">Per Assignment</p>
          </div>
        </div>

        {/* Encouragement message */}
        {stats.this_week_minutes > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground">
              {stats.this_week_minutes >= 60
                ? "Great job staying consistent this week!"
                : "Keep up the practice - every minute counts!"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

StudyTimeCard.displayName = "StudyTimeCard"
