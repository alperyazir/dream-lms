/**
 * Student Dashboard - Refactored
 * Story 22.1: Dashboard Layout Refactor
 * Clean, focused dashboard with essential information only
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { ProgressSummaryCard } from "@/components/student/ProgressSummaryCard"
import { UpcomingAssignmentsList } from "@/components/student/UpcomingAssignmentsList"
import { Skeleton } from "@/components/ui/skeleton"
import { useStudentProgress } from "@/hooks/useStudentProgress"
import { getStudentAssignments } from "@/services/assignmentsApi"

export const Route = createFileRoute("/_layout/student/dashboard")({
  component: () => (
    <ErrorBoundary>
      <StudentDashboard />
    </ErrorBoundary>
  ),
})

function StudentDashboard() {
  // Fetch real assignments from API
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["studentAssignments"],
    queryFn: () => getStudentAssignments(),
  })

  // Fetch real progress data
  const { progress, isLoading: isLoadingProgress } = useStudentProgress({
    period: "this_month",
  })

  return (
    <div className="container py-4 md:py-6 space-y-4 md:space-y-6">
      {/* Page Title */}
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
          Student Dashboard
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Welcome back! Here's your learning overview.
        </p>
      </div>

      {/* Cards stack vertically, full width */}
      <div className="space-y-4 md:space-y-6">
        {/* Progress Summary */}
        {isLoadingProgress ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : progress?.stats ? (
          <ProgressSummaryCard stats={progress.stats} />
        ) : null}

        {/* Upcoming Assignments */}
        {isLoadingAssignments ? (
          <Skeleton className="h-60 w-full rounded-lg" />
        ) : (
          <UpcomingAssignmentsList assignments={assignments} />
        )}
      </div>
    </div>
  )
}
