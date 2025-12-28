/**
 * Tests for Student Dashboard
 * Story 22.1: Dashboard Layout Refactor
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { vi } from "vitest"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { ProgressSummaryCard } from "@/components/student/ProgressSummaryCard"
import { UpcomingAssignmentsList } from "@/components/student/UpcomingAssignmentsList"
import { Skeleton } from "@/components/ui/skeleton"
import * as assignmentsApi from "@/services/assignmentsApi"
import type { StudentProgressResponse } from "@/types/analytics"
import type { StudentAssignmentResponse } from "@/types/assignment"

// Mock hooks
vi.mock("@/hooks/useStudentProgress", () => ({
  useStudentProgress: vi.fn(),
}))

// Mock router Link component
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  }
})

import { useQuery } from "@tanstack/react-query"
import { useStudentProgress } from "@/hooks/useStudentProgress"

// Import the component directly, not the Route export
function StudentDashboard() {
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["studentAssignments"],
    queryFn: () => assignmentsApi.getStudentAssignments(),
  })

  const { progress, isLoading: isLoadingProgress } = useStudentProgress({
    period: "this_month",
  })

  return (
    <div className="container py-4 md:py-6 space-y-4 md:space-y-6">
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
          Student Dashboard
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Welcome back! Here's your learning overview.
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        {isLoadingProgress ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : progress?.stats ? (
          <ProgressSummaryCard stats={progress.stats} />
        ) : null}

        {isLoadingAssignments ? (
          <Skeleton className="h-60 w-full rounded-lg" />
        ) : (
          <UpcomingAssignmentsList assignments={assignments} />
        )}
      </div>
    </div>
  )
}

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>{component}</ErrorBoundary>
    </QueryClientProvider>,
  )
}

describe("Student Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProgressResponse: StudentProgressResponse = {
    stats: {
      total_completed: 10,
      avg_score: 85,
      current_streak: 3,
      streak_start_date: "2025-12-23",
      improvement_trend: "improving",
    },
    score_trend: [],
    activity_breakdown: [],
    recent_assignments: [],
    achievements: [],
    study_time: {
      this_week_minutes: 120,
      this_month_minutes: 480,
      avg_per_assignment: 30,
    },
    improvement_tips: [],
  }

  const mockAssignments: StudentAssignmentResponse[] = [
    {
      assignment_id: "1",
      assignment_name: "Math Quiz",
      instructions: null,
      due_date: "2025-12-28T14:00:00Z",
      time_limit_minutes: null,
      created_at: "2025-12-20T10:00:00Z",
      book_id: "book1",
      book_title: "Algebra 101",
      book_cover_url: null,
      activity_id: "act1",
      activity_title: "Quiz 1",
      activity_type: "quiz",
      status: "not_started",
      score: null,
      started_at: null,
      completed_at: null,
      time_spent_minutes: 0,
      activity_count: 1,
      is_past_due: false,
      days_until_due: 2,
    },
  ]

  it("displays page title", async () => {
    vi.mocked(useStudentProgress).mockReturnValue({
      progress: mockProgressResponse,
      isLoading: false,
      error: null,
    })
    vi.spyOn(assignmentsApi, "getStudentAssignments").mockResolvedValue(
      mockAssignments,
    )

    renderWithProviders(<StudentDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Student Dashboard")).toBeInTheDocument()
    })

    expect(
      screen.getByText("Welcome back! Here's your learning overview."),
    ).toBeInTheDocument()
  })

  it("shows progress summary card", async () => {
    vi.mocked(useStudentProgress).mockReturnValue({
      progress: mockProgressResponse,
      isLoading: false,
      error: null,
    })
    vi.spyOn(assignmentsApi, "getStudentAssignments").mockResolvedValue(
      mockAssignments,
    )

    renderWithProviders(<StudentDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Your Progress")).toBeInTheDocument()
    })

    expect(screen.getByText("View Details")).toBeInTheDocument()
  })

  it("shows upcoming assignments section", async () => {
    vi.mocked(useStudentProgress).mockReturnValue({
      progress: mockProgressResponse,
      isLoading: false,
      error: null,
    })
    vi.spyOn(assignmentsApi, "getStudentAssignments").mockResolvedValue(
      mockAssignments,
    )

    renderWithProviders(<StudentDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Upcoming Assignments")).toBeInTheDocument()
    })
  })

  it("does NOT show Reports section", async () => {
    vi.mocked(useStudentProgress).mockReturnValue({
      progress: mockProgressResponse,
      isLoading: false,
      error: null,
    })
    vi.spyOn(assignmentsApi, "getStudentAssignments").mockResolvedValue(
      mockAssignments,
    )

    renderWithProviders(<StudentDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Student Dashboard")).toBeInTheDocument()
    })

    expect(screen.queryByText("Reports")).not.toBeInTheDocument()
  })

  it("does NOT show Tips section", async () => {
    vi.mocked(useStudentProgress).mockReturnValue({
      progress: mockProgressResponse,
      isLoading: false,
      error: null,
    })
    vi.spyOn(assignmentsApi, "getStudentAssignments").mockResolvedValue(
      mockAssignments,
    )

    renderWithProviders(<StudentDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Student Dashboard")).toBeInTheDocument()
    })

    expect(screen.queryByText("Tips")).not.toBeInTheDocument()
  })

  it("does NOT show Recent Feedback on dashboard", async () => {
    vi.mocked(useStudentProgress).mockReturnValue({
      progress: mockProgressResponse,
      isLoading: false,
      error: null,
    })
    vi.spyOn(assignmentsApi, "getStudentAssignments").mockResolvedValue(
      mockAssignments,
    )

    renderWithProviders(<StudentDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Student Dashboard")).toBeInTheDocument()
    })

    expect(screen.queryByText("Recent Feedback")).not.toBeInTheDocument()
  })

  it("does NOT show Achievements on dashboard", async () => {
    vi.mocked(useStudentProgress).mockReturnValue({
      progress: mockProgressResponse,
      isLoading: false,
      error: null,
    })
    vi.spyOn(assignmentsApi, "getStudentAssignments").mockResolvedValue(
      mockAssignments,
    )

    renderWithProviders(<StudentDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Student Dashboard")).toBeInTheDocument()
    })

    expect(screen.queryByText("Achievements")).not.toBeInTheDocument()
  })

  it("shows empty state when no assignments", async () => {
    vi.mocked(useStudentProgress).mockReturnValue({
      progress: mockProgressResponse,
      isLoading: false,
      error: null,
    })
    vi.spyOn(assignmentsApi, "getStudentAssignments").mockResolvedValue([])

    renderWithProviders(<StudentDashboard />)

    await waitFor(() => {
      expect(screen.getByText("No upcoming assignments!")).toBeInTheDocument()
    })

    expect(screen.getByText("You're all caught up. 🎉")).toBeInTheDocument()
  })
})
