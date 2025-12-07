/**
 * Progress Stats Card Component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 *
 * Displays summary statistics for student progress
 */

import {
  CheckCircle2,
  Flame,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ImprovementTrend, StudentProgressStats } from "@/types/analytics"

export interface ProgressStatsCardProps {
  stats: StudentProgressStats
}

const getTrendInfo = (trend: ImprovementTrend) => {
  switch (trend) {
    case "improving":
      return {
        icon: TrendingUp,
        color: "text-green-500",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        label: "Improving",
      }
    case "declining":
      return {
        icon: TrendingDown,
        color: "text-red-500",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        label: "Needs Attention",
      }
    default:
      return {
        icon: Minus,
        color: "text-amber-500",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
        label: "Steady",
      }
  }
}

export const ProgressStatsCard = React.memo(
  ({ stats }: ProgressStatsCardProps) => {
    const trendInfo = getTrendInfo(stats.improvement_trend)
    const TrendIcon = trendInfo.icon

    return (
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-500" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Completed */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
              <div className="flex justify-center mb-2">
                <CheckCircle2 className="w-6 h-6 text-teal-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {stats.total_completed}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>

            {/* Average Score */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <div className="flex justify-center mb-2">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {Math.round(stats.avg_score)}%
              </p>
              <p className="text-sm text-muted-foreground">Avg Score</p>
            </div>

            {/* Current Streak */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
              <div className="flex justify-center mb-2">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {stats.current_streak}
              </p>
              <p className="text-sm text-muted-foreground">
                {stats.current_streak === 1 ? "Day Streak" : "Days Streak"}
              </p>
            </div>

            {/* Improvement Trend */}
            <div className={`text-center p-4 rounded-lg ${trendInfo.bgColor}`}>
              <div className="flex justify-center mb-2">
                <TrendIcon className={`w-6 h-6 ${trendInfo.color}`} />
              </div>
              <p className={`text-lg font-bold ${trendInfo.color}`}>
                {trendInfo.label}
              </p>
              <p className="text-sm text-muted-foreground">Trend</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
)

ProgressStatsCard.displayName = "ProgressStatsCard"
