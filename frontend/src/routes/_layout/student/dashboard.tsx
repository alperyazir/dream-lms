/**
 * Student Dashboard - Refactored
 * Story 22.1: Dashboard Layout Refactor
 * Clean, focused dashboard with essential information only
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FiHome } from "react-icons/fi"
import { SkillTrendChart } from "@/components/analytics/SkillTrendChart"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { ProgressSummaryCard } from "@/components/student/ProgressSummaryCard"
import { StudentSkillSummaryGrid } from "@/components/student/StudentSkillSummaryGrid"
import { UpcomingAssignmentsList } from "@/components/student/UpcomingAssignmentsList"
import { Skeleton } from "@/components/ui/skeleton"
import useAuth from "@/hooks/useAuth"
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
  const { user } = useAuth()

  // Get first name from full name
  const firstName = user?.full_name?.split(" ")[0] || "Student"

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
    <PageContainer>
      <PageHeader
        icon={FiHome}
        title={`${firstName}'s Dashboard 👋`}
        description="Welcome back! Here's your learning overview."
      />

      {/* Cards stack vertically, full width */}
      <div className="space-y-4 md:space-y-6">
        {/* Progress Summary */}
        {isLoadingProgress ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : progress?.stats ? (
          <ProgressSummaryCard stats={progress.stats} />
        ) : null}

        {/* Student Skill Summary (Story 30.17) */}
        <StudentSkillSummaryGrid />

        {/* Skill Trends (Story 30.16) */}
        <SkillTrendChart />

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
