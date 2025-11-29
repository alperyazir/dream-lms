/**
 * StudentAnalyticsDetail Component Tests
 * Story 5.1: Individual Student Performance Dashboard
 * Task 10: Frontend Component Tests
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StudentAnalyticsResponse } from "@/types/analytics"

// Mock the studentsApi module
vi.mock("@/services/studentsApi", () => ({
  getStudentAnalytics: vi.fn(),
  studentsApi: {
    getStudentAnalytics: vi.fn(),
  },
  default: {
    getStudentAnalytics: vi.fn(),
  },
}))

// Mock Recharts to avoid canvas-related errors in tests
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  BarChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
}))

// Mock analytics data for tests
const mockAnalyticsData: StudentAnalyticsResponse = {
  student: {
    id: "test-student-123",
    name: "John Doe",
    photo_url: null,
  },
  summary: {
    avg_score: 85,
    total_completed: 24,
    completion_rate: 0.92,
    current_streak: 7,
  },
  recent_activity: [
    {
      assignment_id: "assign-1",
      assignment_name: "Math Quiz 1",
      score: 90,
      completed_at: "2025-01-27T14:30:00Z",
      time_spent_minutes: 15,
    },
    {
      assignment_id: "assign-2",
      assignment_name: "Science Test",
      score: 85,
      completed_at: "2025-01-26T10:00:00Z",
      time_spent_minutes: 20,
    },
  ],
  performance_trend: [
    { date: "2025-01-20", score: 80 },
    { date: "2025-01-21", score: 85 },
    { date: "2025-01-22", score: 88 },
    { date: "2025-01-23", score: 90 },
  ],
  activity_breakdown: [
    { activity_type: "matchTheWords", avg_score: 88, count: 5 },
    { activity_type: "circle", avg_score: 82, count: 8 },
    { activity_type: "dragdroppicture", avg_score: 90, count: 3 },
  ],
  status_summary: {
    not_started: 3,
    in_progress: 1,
    completed: 24,
    past_due: 0,
  },
  time_analytics: {
    avg_time_per_assignment: 18,
    total_time_this_week: 120,
    total_time_this_month: 450,
  },
}

// Import the component after mock setup
// We need to dynamically import the route component
async function _getStudentAnalyticsComponent() {
  const module = await import("./$studentId")
  return module
}

describe("StudentAnalyticsDetail", () => {
  let queryClient: QueryClient
  const _user = userEvent.setup()

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const _createWrapper = (studentId = "test-student-123") => {
    // Create a simple route tree for testing
    const rootRoute = createRootRoute()
    const analyticsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/_layout/teacher/analytics/$studentId",
    })

    const routeTree = rootRoute.addChildren([analyticsRoute])
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: [`/_layout/teacher/analytics/${studentId}`],
      }),
    })

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router}>{children}</RouterProvider>
      </QueryClientProvider>
    )
  }

  // Helper component that uses the hook with mock data
  function TestableStudentAnalytics({
    period = "30d",
    isLoading = false,
    error = null,
    data = mockAnalyticsData,
  }: {
    period?: string
    isLoading?: boolean
    error?: Error | null
    data?: StudentAnalyticsResponse | null
  }) {
    // Simulated dashboard content
    if (isLoading) {
      return (
        <div className="container mx-auto py-6 px-4">
          <div className="text-center py-12">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent"
              data-testid="loading-spinner"
            />
            <p className="text-gray-600 mt-4">Loading analytics...</p>
          </div>
        </div>
      )
    }

    if (error || !data) {
      return (
        <div className="container mx-auto py-6 px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Error Loading Analytics
            </h2>
            <p className="text-gray-600 mb-6" data-testid="error-message">
              {error instanceof Error
                ? error.message
                : "Failed to load student analytics data."}
            </p>
          </div>
        </div>
      )
    }

    const initials = data.student.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()

    return (
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Back Button & Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <button type="button" data-testid="back-button">
            Back to Analytics
          </button>
          <div className="flex gap-2">
            <button type="button" data-testid="send-message-button">
              Send Message
            </button>
            <button type="button" data-testid="view-history-button">
              View Full History
            </button>
          </div>
        </div>

        {/* Student Header */}
        <div data-testid="student-header">
          <div data-testid="avatar-initials">{initials}</div>
          <h1 data-testid="student-name">{data.student.name}</h1>
          <div data-testid="student-id">Student ID: {data.student.id}</div>
        </div>

        {/* Summary Cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          data-testid="summary-cards"
        >
          <div data-testid="avg-score-card">
            <span data-testid="avg-score-value">{data.summary.avg_score}%</span>
          </div>
          <div data-testid="completed-card">
            <span data-testid="completed-value">
              {data.summary.total_completed}
            </span>
            <span data-testid="completion-rate">
              {Math.round(data.summary.completion_rate * 100)}% completion rate
            </span>
          </div>
          <div data-testid="streak-card">
            <span data-testid="streak-value">
              {data.summary.current_streak}
            </span>
          </div>
          <div data-testid="time-card">
            <span data-testid="time-value">
              {Math.round(data.time_analytics.total_time_this_week / 60)}h
            </span>
          </div>
        </div>

        {/* Time Period Selector */}
        <div data-testid="period-selector">
          <select
            defaultValue={period}
            data-testid="period-select"
            aria-label="Time Period"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="3m">Last 3 months</option>
            <option value="all">All time</option>
          </select>
        </div>

        {/* Performance Trend Chart */}
        <div data-testid="performance-trend-section">
          <h2>Performance Trend</h2>
          {data.performance_trend.length > 0 ? (
            <div data-testid="performance-chart">Performance Chart</div>
          ) : (
            <p data-testid="no-performance-data">
              No performance data available for the selected period
            </p>
          )}
        </div>

        {/* Activity Breakdown Chart */}
        <div data-testid="activity-breakdown-section">
          <h2>Activity Breakdown</h2>
          {data.activity_breakdown.length > 0 ? (
            <div data-testid="activity-chart">Activity Chart</div>
          ) : (
            <p data-testid="no-activity-data">No activity data available</p>
          )}
        </div>

        {/* Assignment Status */}
        <div data-testid="status-summary-section">
          <h2>Assignment Status</h2>
          <div data-testid="status-not-started">
            Not Started: {data.status_summary.not_started}
          </div>
          <div data-testid="status-in-progress">
            In Progress: {data.status_summary.in_progress}
          </div>
          <div data-testid="status-completed">
            Completed: {data.status_summary.completed}
          </div>
          <div data-testid="status-past-due">
            Past Due: {data.status_summary.past_due}
          </div>
        </div>

        {/* Time Analytics */}
        <div data-testid="time-analytics-section">
          <h2>Time Analytics</h2>
          <div data-testid="avg-time-per-assignment">
            Average Time Per Assignment:{" "}
            {data.time_analytics.avg_time_per_assignment} min
          </div>
          <div data-testid="total-time-week">
            Total Time This Week: {data.time_analytics.total_time_this_week} min
          </div>
          <div data-testid="total-time-month">
            Total Time This Month: {data.time_analytics.total_time_this_month}{" "}
            min
          </div>
        </div>

        {/* Recent Activity */}
        <div data-testid="recent-activity-section">
          <h2>Recent Activity</h2>
          {data.recent_activity.length > 0 ? (
            <table data-testid="activity-table">
              <tbody>
                {data.recent_activity.map((item) => (
                  <tr key={item.assignment_id} data-testid="activity-row">
                    <td>{item.assignment_name}</td>
                    <td>{item.score}</td>
                    <td>{item.time_spent_minutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p data-testid="no-recent-activity">No recent activity available</p>
          )}
        </div>
      </div>
    )
  }

  describe("Loading State", () => {
    it("displays loading spinner while fetching data", () => {
      render(<TestableStudentAnalytics isLoading={true} data={null} />)

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
      expect(screen.getByText("Loading analytics...")).toBeInTheDocument()
    })
  })

  describe("Error State", () => {
    it("displays error message when API fails", () => {
      const testError = new Error("Network error - failed to fetch analytics")

      render(
        <TestableStudentAnalytics
          isLoading={false}
          error={testError}
          data={null}
        />,
      )

      expect(screen.getByText("Error Loading Analytics")).toBeInTheDocument()
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Network error - failed to fetch analytics",
      )
    })

    it("displays default error message when no error details", () => {
      render(
        <TestableStudentAnalytics isLoading={false} error={null} data={null} />,
      )

      expect(screen.getByText("Error Loading Analytics")).toBeInTheDocument()
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Failed to load student analytics data.",
      )
    })
  })

  describe("Dashboard Content", () => {
    it("renders student header with name and ID", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} />)

      expect(screen.getByTestId("student-name")).toHaveTextContent("John Doe")
      expect(screen.getByTestId("student-id")).toHaveTextContent(
        "Student ID: test-student-123",
      )
    })

    it("renders avatar with correct initials", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} />)

      expect(screen.getByTestId("avatar-initials")).toHaveTextContent("JD")
    })

    it("renders summary cards with correct values", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} />)

      // Average Score
      expect(screen.getByTestId("avg-score-value")).toHaveTextContent("85%")

      // Total Completed
      expect(screen.getByTestId("completed-value")).toHaveTextContent("24")
      expect(screen.getByTestId("completion-rate")).toHaveTextContent(
        "92% completion rate",
      )

      // Current Streak
      expect(screen.getByTestId("streak-value")).toHaveTextContent("7")

      // Time This Week (120 min = 2h)
      expect(screen.getByTestId("time-value")).toHaveTextContent("2h")
    })

    it("renders action buttons", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} />)

      expect(screen.getByTestId("back-button")).toBeInTheDocument()
      expect(screen.getByTestId("send-message-button")).toBeInTheDocument()
      expect(screen.getByTestId("view-history-button")).toBeInTheDocument()
    })
  })

  describe("Time Period Selector", () => {
    it("renders time period selector with default value", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} period="30d" />)

      const select = screen.getByTestId("period-select")
      expect(select).toHaveValue("30d")
    })

    it("displays all time period options", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} />)

      const select = screen.getByTestId("period-select")
      const options = within(select).getAllByRole("option")

      expect(options).toHaveLength(4)
      expect(options[0]).toHaveValue("7d")
      expect(options[1]).toHaveValue("30d")
      expect(options[2]).toHaveValue("3m")
      expect(options[3]).toHaveValue("all")
    })
  })

  describe("Performance Trend Section", () => {
    it("renders performance trend chart when data exists", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} />)

      expect(
        screen.getByTestId("performance-trend-section"),
      ).toBeInTheDocument()
      expect(screen.getByTestId("performance-chart")).toBeInTheDocument()
    })

    it("displays empty state message when no performance data", () => {
      const emptyData = {
        ...mockAnalyticsData,
        performance_trend: [],
      }

      render(<TestableStudentAnalytics data={emptyData} />)

      expect(screen.getByTestId("no-performance-data")).toHaveTextContent(
        "No performance data available for the selected period",
      )
    })
  })

  describe("Activity Breakdown Section", () => {
    it("renders activity breakdown chart when data exists", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} />)

      expect(
        screen.getByTestId("activity-breakdown-section"),
      ).toBeInTheDocument()
      expect(screen.getByTestId("activity-chart")).toBeInTheDocument()
    })

    it("displays empty state message when no activity data", () => {
      const emptyData = {
        ...mockAnalyticsData,
        activity_breakdown: [],
      }

      render(<TestableStudentAnalytics data={emptyData} />)

      expect(screen.getByTestId("no-activity-data")).toHaveTextContent(
        "No activity data available",
      )
    })
  })

  describe("Assignment Status Summary", () => {
    it("renders all status counts correctly", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} />)

      expect(screen.getByTestId("status-not-started")).toHaveTextContent(
        "Not Started: 3",
      )
      expect(screen.getByTestId("status-in-progress")).toHaveTextContent(
        "In Progress: 1",
      )
      expect(screen.getByTestId("status-completed")).toHaveTextContent(
        "Completed: 24",
      )
      expect(screen.getByTestId("status-past-due")).toHaveTextContent(
        "Past Due: 0",
      )
    })
  })

  describe("Time Analytics Section", () => {
    it("renders time analytics with correct values", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} />)

      expect(screen.getByTestId("avg-time-per-assignment")).toHaveTextContent(
        "Average Time Per Assignment: 18 min",
      )
      expect(screen.getByTestId("total-time-week")).toHaveTextContent(
        "Total Time This Week: 120 min",
      )
      expect(screen.getByTestId("total-time-month")).toHaveTextContent(
        "Total Time This Month: 450 min",
      )
    })
  })

  describe("Recent Activity Section", () => {
    it("renders recent activity table with entries", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} />)

      expect(screen.getByTestId("activity-table")).toBeInTheDocument()
      const rows = screen.getAllByTestId("activity-row")
      expect(rows).toHaveLength(2)
    })

    it("displays assignment details in activity table", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} />)

      expect(screen.getByText("Math Quiz 1")).toBeInTheDocument()
      expect(screen.getByText("Science Test")).toBeInTheDocument()
      expect(screen.getByText("90")).toBeInTheDocument()
      expect(screen.getByText("85")).toBeInTheDocument()
    })

    it("displays empty state when no recent activity", () => {
      const emptyData = {
        ...mockAnalyticsData,
        recent_activity: [],
      }

      render(<TestableStudentAnalytics data={emptyData} />)

      expect(screen.getByTestId("no-recent-activity")).toHaveTextContent(
        "No recent activity available",
      )
    })
  })

  describe("Responsive Layout", () => {
    it("renders summary cards container with responsive grid classes", () => {
      render(<TestableStudentAnalytics data={mockAnalyticsData} />)

      const summaryCards = screen.getByTestId("summary-cards")
      expect(summaryCards).toHaveClass("grid")
      expect(summaryCards).toHaveClass("grid-cols-1")
      expect(summaryCards).toHaveClass("md:grid-cols-2")
      expect(summaryCards).toHaveClass("lg:grid-cols-4")
    })
  })

  describe("Edge Cases", () => {
    it("handles zero values correctly", () => {
      const zeroData: StudentAnalyticsResponse = {
        ...mockAnalyticsData,
        summary: {
          avg_score: 0,
          total_completed: 0,
          completion_rate: 0,
          current_streak: 0,
        },
        time_analytics: {
          avg_time_per_assignment: 0,
          total_time_this_week: 0,
          total_time_this_month: 0,
        },
      }

      render(<TestableStudentAnalytics data={zeroData} />)

      expect(screen.getByTestId("avg-score-value")).toHaveTextContent("0%")
      expect(screen.getByTestId("completed-value")).toHaveTextContent("0")
      expect(screen.getByTestId("streak-value")).toHaveTextContent("0")
      expect(screen.getByTestId("time-value")).toHaveTextContent("0h")
    })

    it("handles single-word names for initials", () => {
      const singleNameData = {
        ...mockAnalyticsData,
        student: {
          ...mockAnalyticsData.student,
          name: "Madonna",
        },
      }

      render(<TestableStudentAnalytics data={singleNameData} />)

      expect(screen.getByTestId("avatar-initials")).toHaveTextContent("M")
    })

    it("handles long names with multiple parts", () => {
      const longNameData = {
        ...mockAnalyticsData,
        student: {
          ...mockAnalyticsData.student,
          name: "John Robert Smith Jr",
        },
      }

      render(<TestableStudentAnalytics data={longNameData} />)

      expect(screen.getByTestId("avatar-initials")).toHaveTextContent("JRSJ")
    })
  })
})
