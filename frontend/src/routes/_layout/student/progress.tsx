/**
 * Student Progress Page
 * Story 5.5: Student Progress Tracking & Personal Analytics
 *
 * Comprehensive student-facing progress dashboard
 */

import { createFileRoute } from "@tanstack/react-router"
import { BarChart3 } from "lucide-react"
import { useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import {
  AchievementBadges,
  ActivityBreakdown,
  ImprovementTips,
  ProgressScoreChart,
  ProgressStatsCard,
  RecentAssignments,
  StudyTimeCard,
} from "@/components/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useStudentProgress } from "@/hooks/useStudentProgress"
import type { StudentProgressPeriod } from "@/types/analytics"

export const Route = createFileRoute("/_layout/student/progress")({
  component: () => (
    <ErrorBoundary>
      <StudentProgressPage />
    </ErrorBoundary>
  ),
})

function StudentProgressPage() {
  const [period, setPeriod] = useState<StudentProgressPeriod>("this_month")
  const { progress, isLoading, error } = useStudentProgress({ period })

  if (error) {
    return (
      <div className="max-w-full p-6">
        <div className="text-center py-12">
          <p className="text-lg text-red-500">
            Failed to load your progress data. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-teal-500" />
            My Progress
          </h1>
          <p className="text-muted-foreground">
            Track your learning journey and achievements
          </p>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as StudentProgressPeriod)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <ProgressSkeleton />
      ) : progress ? (
        <>
          {/* Stats Card */}
          <ProgressStatsCard stats={progress.stats} />

          {/* Improvement Tips */}
          <ImprovementTips tips={progress.improvement_tips} />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProgressScoreChart
              data={progress.score_trend}
              avgScore={progress.stats.avg_score}
            />
            <ActivityBreakdown data={progress.activity_breakdown} />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentAssignments assignments={progress.recent_assignments} />
            </div>
            <StudyTimeCard stats={progress.study_time} />
          </div>

          {/* Achievements */}
          <AchievementBadges achievements={progress.achievements} />
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            No progress data available yet. Start completing assignments!
          </p>
        </div>
      )}
    </div>
  )
}

function ProgressSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <Skeleton className="h-40 w-full rounded-lg" />

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>

      {/* Bottom row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64 w-full rounded-lg lg:col-span-2" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>

      {/* Achievements skeleton */}
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}
