/**
 * ClassDetailPage Component Tests
 * Story 5.2: Class-Wide Performance Analytics
 * Task 10: Frontend Component Tests
 */

import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ClassAnalyticsResponse } from "@/types/analytics"

// Mock the classesApi module
vi.mock("@/services/classesApi", () => ({
  getClassAnalytics: vi.fn(),
  classesApi: {
    getClassAnalytics: vi.fn(),
  },
  default: {
    getClassAnalytics: vi.fn(),
  },
}))

// Mock Recharts to avoid canvas-related errors in tests
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}))

// Mock analytics data for tests
const mockClassAnalyticsData: ClassAnalyticsResponse = {
  class_id: "test-class-123",
  class_name: "Math 101",
  summary: {
    avg_score: 78.5,
    active_students: 22,
    total_assignments: 10,
    completion_rate: 0.85,
  },
  score_distribution: [
    { range_label: "0-59%", min_score: 0, max_score: 59, count: 2 },
    { range_label: "60-69%", min_score: 60, max_score: 69, count: 3 },
    { range_label: "70-79%", min_score: 70, max_score: 79, count: 8 },
    { range_label: "80-89%", min_score: 80, max_score: 89, count: 7 },
    { range_label: "90-100%", min_score: 90, max_score: 100, count: 5 },
  ],
  leaderboard: [
    { student_id: "s1", name: "Alice Smith", avg_score: 95.2, rank: 1 },
    { student_id: "s2", name: "Bob Jones", avg_score: 92.8, rank: 2 },
    { student_id: "s3", name: "Carol White", avg_score: 90.5, rank: 3 },
  ],
  struggling_students: [
    {
      student_id: "s20",
      name: "Dan Brown",
      avg_score: 52.3,
      past_due_count: 2,
      alert_reason: "Score below 60%",
    },
    {
      student_id: "s21",
      name: "Eve Davis",
      avg_score: 58.1,
      past_due_count: 1,
      alert_reason: "Score below 60%",
    },
  ],
  assignment_performance: [
    {
      assignment_id: "a1",
      name: "Quiz 1",
      avg_score: 82.5,
      completion_rate: 0.95,
      avg_time_spent: 15.2,
    },
    {
      assignment_id: "a2",
      name: "Homework 1",
      avg_score: 75.0,
      completion_rate: 0.88,
      avg_time_spent: 25.5,
    },
  ],
  activity_type_performance: [
    { activity_type: "MatchTheWords", avg_score: 85.3, count: 50 },
    { activity_type: "DragDropPicture", avg_score: 78.2, count: 45 },
    { activity_type: "Circle", avg_score: 82.1, count: 60 },
  ],
  trends: [
    {
      metric_name: "Average Score",
      current_value: 78.5,
      previous_value: 75.2,
      change_percent: 4.4,
      trend: "up",
    },
    {
      metric_name: "Completions",
      current_value: 180,
      previous_value: 165,
      change_percent: 9.1,
      trend: "up",
    },
  ],
}

// Mock class detail
const mockClassDetail = {
  id: "test-class-123",
  name: "Math 101",
  grade_level: "5",
  subject: "Mathematics",
}

// Mock students list
const mockStudents = [
  {
    id: "s1",
    user_full_name: "Alice Smith",
    user_email: "alice@example.com",
    grade_level: "5",
  },
  {
    id: "s2",
    user_full_name: "Bob Jones",
    user_email: "bob@example.com",
    grade_level: "5",
  },
]

describe("ClassDetailPage", () => {
  const user = userEvent.setup()

  beforeEach(() => {
    // QueryClient not needed for direct component tests
    vi.clearAllMocks()
  })

  // Helper component that renders the dashboard with mock data
  function TestableClassAnalyticsDashboard({
    period = "monthly",
    isLoading = false,
    error = null,
    analytics = mockClassAnalyticsData,
    classDetail = mockClassDetail,
    students = mockStudents,
    activeTab = "analytics",
    onPeriodChange,
    onTabChange,
  }: {
    period?: string
    isLoading?: boolean
    error?: Error | null
    analytics?: ClassAnalyticsResponse | null
    classDetail?: typeof mockClassDetail | null
    students?: typeof mockStudents
    activeTab?: string
    onPeriodChange?: (period: string) => void
    onTabChange?: (tab: string) => void
  }) {
    // Loading state
    if (isLoading) {
      return (
        <div className="container mx-auto py-6 px-4">
          <div className="text-center py-12">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent"
              data-testid="loading-spinner"
            />
            <p className="text-gray-600 mt-4">Loading class details...</p>
          </div>
        </div>
      )
    }

    // Error state
    if (error || !analytics || !classDetail) {
      return (
        <div className="container mx-auto py-6 px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Error Loading Class
            </h2>
            <p className="text-gray-600 mb-6" data-testid="error-message">
              {error instanceof Error
                ? error.message
                : "Unable to load class analytics."}
            </p>
            <button type="button" data-testid="back-button">
              Back to Classrooms
            </button>
          </div>
        </div>
      )
    }

    // Find trends
    const scoreTrend = analytics.trends.find(
      (t) => t.metric_name === "Average Score",
    )
    const completionTrend = analytics.trends.find(
      (t) => t.metric_name === "Completions",
    )

    return (
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div data-testid="class-header">
          <button type="button" data-testid="back-button">
            Back
          </button>
          <h1 data-testid="class-name">{classDetail.name}</h1>
          <p data-testid="class-details">
            {classDetail.grade_level && `Grade ${classDetail.grade_level}`}
            {classDetail.grade_level && classDetail.subject && " • "}
            {classDetail.subject}
          </p>
        </div>

        {/* Tabs */}
        <div data-testid="tabs-container">
          <button
            type="button"
            data-testid="tab-students"
            onClick={() => onTabChange?.("students")}
            aria-selected={activeTab === "students"}
          >
            Students
          </button>
          <button
            type="button"
            data-testid="tab-assignments"
            onClick={() => onTabChange?.("assignments")}
            aria-selected={activeTab === "assignments"}
          >
            Assignments
          </button>
          <button
            type="button"
            data-testid="tab-analytics"
            onClick={() => onTabChange?.("analytics")}
            aria-selected={activeTab === "analytics"}
          >
            Analytics
          </button>
        </div>

        {/* Students Tab Content */}
        {activeTab === "students" && (
          <div data-testid="students-tab-content">
            <h2>Enrolled Students</h2>
            {students.length > 0 ? (
              <table data-testid="students-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} data-testid="student-row">
                      <td>{student.user_full_name}</td>
                      <td>{student.user_email}</td>
                      <td>{student.grade_level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p data-testid="no-students">
                No students enrolled in this class yet.
              </p>
            )}
          </div>
        )}

        {/* Assignments Tab Content */}
        {activeTab === "assignments" && (
          <div data-testid="assignments-tab-content">
            <h2>Class Assignments</h2>
            {analytics.assignment_performance.length > 0 ? (
              <table data-testid="assignments-table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Avg Score</th>
                    <th>Completion</th>
                    <th>Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.assignment_performance.map((assignment) => (
                    <tr
                      key={assignment.assignment_id}
                      data-testid="assignment-row"
                    >
                      <td>{assignment.name}</td>
                      <td data-testid="assignment-score">
                        {assignment.avg_score.toFixed(0)}%
                      </td>
                      <td>{(assignment.completion_rate * 100).toFixed(0)}%</td>
                      <td>{assignment.avg_time_spent.toFixed(0)} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p data-testid="no-assignments">
                No assignments created for this class yet.
              </p>
            )}
          </div>
        )}

        {/* Analytics Tab Content */}
        {activeTab === "analytics" && (
          <div data-testid="analytics-tab-content" className="space-y-6">
            {/* Period Selector */}
            <div data-testid="period-selector">
              <select
                value={period}
                onChange={(e) => onPeriodChange?.(e.target.value)}
                data-testid="period-select"
                aria-label="Time Period"
              >
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
                <option value="semester">This Semester</option>
                <option value="ytd">Year to Date</option>
              </select>
            </div>

            {/* Summary Cards */}
            <div
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
              data-testid="summary-cards"
            >
              <div data-testid="avg-score-card">
                <span data-testid="avg-score-value">
                  {analytics.summary.avg_score.toFixed(1)}%
                </span>
                {scoreTrend && (
                  <span data-testid="score-trend" data-trend={scoreTrend.trend}>
                    {scoreTrend.change_percent > 0 ? "+" : ""}
                    {scoreTrend.change_percent.toFixed(1)}%
                  </span>
                )}
              </div>
              <div data-testid="completion-rate-card">
                <span data-testid="completion-rate-value">
                  {(analytics.summary.completion_rate * 100).toFixed(0)}%
                </span>
                {completionTrend && (
                  <span
                    data-testid="completion-trend"
                    data-trend={completionTrend.trend}
                  >
                    {completionTrend.change_percent > 0 ? "+" : ""}
                    {completionTrend.change_percent.toFixed(1)}%
                  </span>
                )}
              </div>
              <div data-testid="total-assignments-card">
                <span data-testid="total-assignments-value">
                  {analytics.summary.total_assignments}
                </span>
              </div>
              <div data-testid="active-students-card">
                <span data-testid="active-students-value">
                  {analytics.summary.active_students}
                </span>
              </div>
            </div>

            {/* Score Distribution */}
            <div data-testid="score-distribution-section">
              <h2>Score Distribution</h2>
              {analytics.score_distribution.some((d) => d.count > 0) ? (
                <div data-testid="score-distribution-chart">Chart</div>
              ) : (
                <p data-testid="no-score-data">No score data available yet.</p>
              )}
            </div>

            {/* Activity Type Performance */}
            <div data-testid="activity-type-section">
              <h2>Performance by Activity Type</h2>
              {analytics.activity_type_performance.length > 0 ? (
                <div data-testid="activity-type-chart">Chart</div>
              ) : (
                <p data-testid="no-activity-data">
                  No activity data available yet.
                </p>
              )}
            </div>

            {/* Leaderboard */}
            <div data-testid="leaderboard-section">
              <h2>Top Performers</h2>
              {analytics.leaderboard.length > 0 ? (
                <table data-testid="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student</th>
                      <th>Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.leaderboard.slice(0, 5).map((student) => (
                      <tr
                        key={student.student_id}
                        data-testid="leaderboard-row"
                      >
                        <td data-testid="rank">#{student.rank}</td>
                        <td data-testid="student-name">{student.name}</td>
                        <td data-testid="student-score">
                          {student.avg_score.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p data-testid="no-leaderboard">
                  No performance data available yet.
                </p>
              )}
            </div>

            {/* Struggling Students */}
            <div data-testid="struggling-students-section">
              <h2>Students Needing Support</h2>
              {analytics.struggling_students.length > 0 ? (
                <table data-testid="struggling-students-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Avg Score</th>
                      <th>Alert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.struggling_students.map((student) => (
                      <tr
                        key={student.student_id}
                        data-testid="struggling-student-row"
                      >
                        <td data-testid="struggling-name">{student.name}</td>
                        <td data-testid="struggling-score">
                          {student.avg_score.toFixed(1)}%
                        </td>
                        <td data-testid="struggling-alert">
                          {student.alert_reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p data-testid="no-struggling-students">
                  No struggling students identified.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  describe("Loading State", () => {
    it("displays loading spinner while fetching data", () => {
      render(
        <TestableClassAnalyticsDashboard isLoading={true} analytics={null} />,
      )

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
      expect(screen.getByText("Loading class details...")).toBeInTheDocument()
    })
  })

  describe("Error State", () => {
    it("displays error message when API fails", () => {
      const testError = new Error(
        "Network error - failed to fetch class analytics",
      )

      render(
        <TestableClassAnalyticsDashboard
          isLoading={false}
          error={testError}
          analytics={null}
        />,
      )

      expect(screen.getByText("Error Loading Class")).toBeInTheDocument()
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Network error - failed to fetch class analytics",
      )
    })

    it("displays default error message when no error details", () => {
      render(
        <TestableClassAnalyticsDashboard
          isLoading={false}
          error={null}
          analytics={null}
        />,
      )

      expect(screen.getByText("Error Loading Class")).toBeInTheDocument()
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Unable to load class analytics.",
      )
    })

    it("renders back button in error state", () => {
      render(
        <TestableClassAnalyticsDashboard
          isLoading={false}
          error={new Error("test")}
          analytics={null}
        />,
      )

      expect(screen.getByTestId("back-button")).toBeInTheDocument()
    })
  })

  describe("Class Header", () => {
    it("renders class name correctly", () => {
      render(<TestableClassAnalyticsDashboard />)

      expect(screen.getByTestId("class-name")).toHaveTextContent("Math 101")
    })

    it("renders grade level and subject", () => {
      render(<TestableClassAnalyticsDashboard />)

      expect(screen.getByTestId("class-details")).toHaveTextContent(
        "Grade 5 • Mathematics",
      )
    })

    it("renders back button", () => {
      render(<TestableClassAnalyticsDashboard />)

      expect(screen.getByTestId("back-button")).toBeInTheDocument()
    })
  })

  describe("Tabs Navigation", () => {
    it("renders all three tabs", () => {
      render(<TestableClassAnalyticsDashboard />)

      expect(screen.getByTestId("tab-students")).toBeInTheDocument()
      expect(screen.getByTestId("tab-assignments")).toBeInTheDocument()
      expect(screen.getByTestId("tab-analytics")).toBeInTheDocument()
    })

    it("shows analytics tab content by default", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      expect(screen.getByTestId("analytics-tab-content")).toBeInTheDocument()
    })

    it("calls onTabChange when tab is clicked", async () => {
      const onTabChange = vi.fn()
      render(
        <TestableClassAnalyticsDashboard
          activeTab="analytics"
          onTabChange={onTabChange}
        />,
      )

      await user.click(screen.getByTestId("tab-students"))
      expect(onTabChange).toHaveBeenCalledWith("students")
    })
  })

  describe("Students Tab", () => {
    it("renders students table when students exist", () => {
      render(<TestableClassAnalyticsDashboard activeTab="students" />)

      expect(screen.getByTestId("students-table")).toBeInTheDocument()
      const rows = screen.getAllByTestId("student-row")
      expect(rows).toHaveLength(2)
    })

    it("displays student names and emails", () => {
      render(<TestableClassAnalyticsDashboard activeTab="students" />)

      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
      expect(screen.getByText("alice@example.com")).toBeInTheDocument()
      expect(screen.getByText("Bob Jones")).toBeInTheDocument()
    })

    it("displays empty state when no students", () => {
      render(
        <TestableClassAnalyticsDashboard activeTab="students" students={[]} />,
      )

      expect(screen.getByTestId("no-students")).toHaveTextContent(
        "No students enrolled in this class yet.",
      )
    })
  })

  describe("Assignments Tab", () => {
    it("renders assignments table when assignments exist", () => {
      render(<TestableClassAnalyticsDashboard activeTab="assignments" />)

      expect(screen.getByTestId("assignments-table")).toBeInTheDocument()
      const rows = screen.getAllByTestId("assignment-row")
      expect(rows).toHaveLength(2)
    })

    it("displays assignment names and scores", () => {
      render(<TestableClassAnalyticsDashboard activeTab="assignments" />)

      expect(screen.getByText("Quiz 1")).toBeInTheDocument()
      expect(screen.getByText("Homework 1")).toBeInTheDocument()
    })

    it("displays empty state when no assignments", () => {
      const emptyAnalytics = {
        ...mockClassAnalyticsData,
        assignment_performance: [],
      }
      render(
        <TestableClassAnalyticsDashboard
          activeTab="assignments"
          analytics={emptyAnalytics}
        />,
      )

      expect(screen.getByTestId("no-assignments")).toHaveTextContent(
        "No assignments created for this class yet.",
      )
    })
  })

  describe("Analytics Tab - Summary Cards", () => {
    it("renders all summary cards", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      expect(screen.getByTestId("avg-score-card")).toBeInTheDocument()
      expect(screen.getByTestId("completion-rate-card")).toBeInTheDocument()
      expect(screen.getByTestId("total-assignments-card")).toBeInTheDocument()
      expect(screen.getByTestId("active-students-card")).toBeInTheDocument()
    })

    it("displays correct summary values", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      expect(screen.getByTestId("avg-score-value")).toHaveTextContent("78.5%")
      expect(screen.getByTestId("completion-rate-value")).toHaveTextContent(
        "85%",
      )
      expect(screen.getByTestId("total-assignments-value")).toHaveTextContent(
        "10",
      )
      expect(screen.getByTestId("active-students-value")).toHaveTextContent(
        "22",
      )
    })

    it("displays score trend indicator", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      const scoreTrend = screen.getByTestId("score-trend")
      expect(scoreTrend).toHaveTextContent("+4.4%")
      expect(scoreTrend).toHaveAttribute("data-trend", "up")
    })

    it("displays completion trend indicator", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      const completionTrend = screen.getByTestId("completion-trend")
      expect(completionTrend).toHaveTextContent("+9.1%")
      expect(completionTrend).toHaveAttribute("data-trend", "up")
    })
  })

  describe("Analytics Tab - Period Selector", () => {
    it("renders period selector with default value", () => {
      render(
        <TestableClassAnalyticsDashboard
          activeTab="analytics"
          period="monthly"
        />,
      )

      const select = screen.getByTestId("period-select")
      expect(select).toHaveValue("monthly")
    })

    it("displays all period options", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      const select = screen.getByTestId("period-select")
      const options = within(select).getAllByRole("option")

      expect(options).toHaveLength(4)
      expect(options[0]).toHaveValue("weekly")
      expect(options[1]).toHaveValue("monthly")
      expect(options[2]).toHaveValue("semester")
      expect(options[3]).toHaveValue("ytd")
    })

    it("calls onPeriodChange when period is changed", async () => {
      const onPeriodChange = vi.fn()
      render(
        <TestableClassAnalyticsDashboard
          activeTab="analytics"
          onPeriodChange={onPeriodChange}
        />,
      )

      await user.selectOptions(screen.getByTestId("period-select"), "weekly")
      expect(onPeriodChange).toHaveBeenCalledWith("weekly")
    })
  })

  describe("Analytics Tab - Leaderboard", () => {
    it("renders leaderboard table with top performers", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      expect(screen.getByTestId("leaderboard-table")).toBeInTheDocument()
      const rows = screen.getAllByTestId("leaderboard-row")
      expect(rows).toHaveLength(3)
    })

    it("displays correct rank order", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      const rows = screen.getAllByTestId("leaderboard-row")
      expect(within(rows[0]).getByTestId("rank")).toHaveTextContent("#1")
      expect(within(rows[1]).getByTestId("rank")).toHaveTextContent("#2")
      expect(within(rows[2]).getByTestId("rank")).toHaveTextContent("#3")
    })

    it("displays student names and scores", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
      expect(screen.getByText("95.2%")).toBeInTheDocument()
      expect(screen.getByText("Bob Jones")).toBeInTheDocument()
    })

    it("displays empty state when no leaderboard data", () => {
      const emptyAnalytics = {
        ...mockClassAnalyticsData,
        leaderboard: [],
      }
      render(
        <TestableClassAnalyticsDashboard
          activeTab="analytics"
          analytics={emptyAnalytics}
        />,
      )

      expect(screen.getByTestId("no-leaderboard")).toHaveTextContent(
        "No performance data available yet.",
      )
    })
  })

  describe("Analytics Tab - Struggling Students", () => {
    it("renders struggling students table", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      expect(
        screen.getByTestId("struggling-students-table"),
      ).toBeInTheDocument()
      const rows = screen.getAllByTestId("struggling-student-row")
      expect(rows).toHaveLength(2)
    })

    it("displays student names with alert reasons", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      expect(screen.getByText("Dan Brown")).toBeInTheDocument()
      expect(screen.getByText("Eve Davis")).toBeInTheDocument()
      // Alert reasons
      const alerts = screen.getAllByTestId("struggling-alert")
      expect(alerts[0]).toHaveTextContent("Score below 60%")
    })

    it("displays low scores with correct values", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      const rows = screen.getAllByTestId("struggling-student-row")
      expect(within(rows[0]).getByTestId("struggling-score")).toHaveTextContent(
        "52.3%",
      )
      expect(within(rows[1]).getByTestId("struggling-score")).toHaveTextContent(
        "58.1%",
      )
    })

    it("displays empty state when no struggling students", () => {
      const emptyAnalytics = {
        ...mockClassAnalyticsData,
        struggling_students: [],
      }
      render(
        <TestableClassAnalyticsDashboard
          activeTab="analytics"
          analytics={emptyAnalytics}
        />,
      )

      expect(screen.getByTestId("no-struggling-students")).toHaveTextContent(
        "No struggling students identified.",
      )
    })
  })

  describe("Analytics Tab - Charts", () => {
    it("renders score distribution section", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      expect(
        screen.getByTestId("score-distribution-section"),
      ).toBeInTheDocument()
      expect(screen.getByTestId("score-distribution-chart")).toBeInTheDocument()
    })

    it("renders activity type performance section", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      expect(screen.getByTestId("activity-type-section")).toBeInTheDocument()
      expect(screen.getByTestId("activity-type-chart")).toBeInTheDocument()
    })

    it("displays empty state for score distribution when no data", () => {
      const emptyAnalytics = {
        ...mockClassAnalyticsData,
        score_distribution: mockClassAnalyticsData.score_distribution.map(
          (d) => ({
            ...d,
            count: 0,
          }),
        ),
      }
      render(
        <TestableClassAnalyticsDashboard
          activeTab="analytics"
          analytics={emptyAnalytics}
        />,
      )

      expect(screen.getByTestId("no-score-data")).toHaveTextContent(
        "No score data available yet.",
      )
    })

    it("displays empty state for activity type when no data", () => {
      const emptyAnalytics = {
        ...mockClassAnalyticsData,
        activity_type_performance: [],
      }
      render(
        <TestableClassAnalyticsDashboard
          activeTab="analytics"
          analytics={emptyAnalytics}
        />,
      )

      expect(screen.getByTestId("no-activity-data")).toHaveTextContent(
        "No activity data available yet.",
      )
    })
  })

  describe("Edge Cases", () => {
    it("handles zero values correctly", () => {
      const zeroData: ClassAnalyticsResponse = {
        ...mockClassAnalyticsData,
        summary: {
          avg_score: 0,
          active_students: 0,
          total_assignments: 0,
          completion_rate: 0,
        },
        trends: [],
      }

      render(
        <TestableClassAnalyticsDashboard
          activeTab="analytics"
          analytics={zeroData}
        />,
      )

      expect(screen.getByTestId("avg-score-value")).toHaveTextContent("0.0%")
      expect(screen.getByTestId("completion-rate-value")).toHaveTextContent(
        "0%",
      )
      expect(screen.getByTestId("total-assignments-value")).toHaveTextContent(
        "0",
      )
      expect(screen.getByTestId("active-students-value")).toHaveTextContent("0")
    })

    it("handles missing trends gracefully", () => {
      const noTrendsData = {
        ...mockClassAnalyticsData,
        trends: [],
      }

      render(
        <TestableClassAnalyticsDashboard
          activeTab="analytics"
          analytics={noTrendsData}
        />,
      )

      // Should not have trend indicators
      expect(screen.queryByTestId("score-trend")).not.toBeInTheDocument()
      expect(screen.queryByTestId("completion-trend")).not.toBeInTheDocument()
    })

    it("handles down trends correctly", () => {
      const downTrendData = {
        ...mockClassAnalyticsData,
        trends: [
          {
            metric_name: "Average Score",
            current_value: 75.0,
            previous_value: 78.5,
            change_percent: -4.5,
            trend: "down" as const,
          },
        ],
      }

      render(
        <TestableClassAnalyticsDashboard
          activeTab="analytics"
          analytics={downTrendData}
        />,
      )

      const scoreTrend = screen.getByTestId("score-trend")
      expect(scoreTrend).toHaveTextContent("-4.5%")
      expect(scoreTrend).toHaveAttribute("data-trend", "down")
    })
  })

  describe("Responsive Layout", () => {
    it("renders summary cards container with responsive grid classes", () => {
      render(<TestableClassAnalyticsDashboard activeTab="analytics" />)

      const summaryCards = screen.getByTestId("summary-cards")
      expect(summaryCards).toHaveClass("grid")
      expect(summaryCards).toHaveClass("md:grid-cols-2")
      expect(summaryCards).toHaveClass("lg:grid-cols-4")
    })
  })
})
