/**
 * Student Dashboard - Refactored
 * Story 22.1: Dashboard Layout Refactor
 * Clean, focused dashboard with essential information only
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FiHome } from "react-icons/fi"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { ProgressSummaryCard } from "@/components/student/ProgressSummaryCard"
import { UpcomingAssignmentsList } from "@/components/student/UpcomingAssignmentsList"
import { Skeleton } from "@/components/ui/skeleton"
import useAuth from "@/hooks/useAuth"
import { getStudentAssignments } from "@/services/assignmentsApi"

export const Route = createFileRoute("/_layout/student/dashboard")({
  component: () => (
    <ErrorBoundary>
      <StudentDashboard />
    </ErrorBoundary>
  ),
})

function StudentDashboard() {
  const { user } = useAuth()

  // Get first name from full name
  const firstName = user?.full_name?.split(" ")[0] || "Student"

  // Fetch real assignments from API
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["studentAssignments"],
    queryFn: () => getStudentAssignments(),
  })


  return (
    <PageContainer>
      <PageHeader
        icon={FiHome}
        title={`${firstName}'s Dashboard 👋`}
        description="Welcome back! Here's your learning overview."
      />

      {/* Cards stack vertically, full width */}
      <div className="space-y-4 md:space-y-6">
        {/* Progress Summary */}
        {isLoadingAssignments ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : (
          <ProgressSummaryCard
            completed={assignments.filter((a) => a.status === "completed").length}
            inProgress={assignments.filter((a) => a.status === "in_progress").length}
            pastDue={assignments.filter((a) => a.is_past_due && a.status !== "completed").length}
            avgScore={(() => {
              const scored = assignments.filter((a) => a.status === "completed" && a.score != null)
              if (scored.length === 0) return 0
              return Math.round(scored.reduce((sum, a) => sum + (a.score ?? 0), 0) / scored.length)
            })()}
          />
        )}

        {/* Upcoming Assignments */}
        {isLoadingAssignments ? (
          <Skeleton className="h-60 w-full rounded-lg" />
        ) : (
          <UpcomingAssignmentsList assignments={assignments} />
        )}
      </div>
    </PageContainer>
  )
}
