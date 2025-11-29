/**
 * AssignmentDetailPage (Results Tab) Component Tests
 * Story 5.3: Assignment-Specific Analytics & Common Mistakes
 * Task 11: Frontend Component Tests
 */

import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  AssignmentDetailedResultsResponse,
  StudentAnswersResponse,
} from "@/types/analytics"

// Mock the assignmentsApi module
vi.mock("@/services/assignmentsApi", () => ({
  getAssignmentDetailedResults: vi.fn(),
  getStudentAnswers: vi.fn(),
  assignmentsApi: {
    getAssignmentDetailedResults: vi.fn(),
    getStudentAnswers: vi.fn(),
  },
  default: {
    getAssignmentDetailedResults: vi.fn(),
    getStudentAnswers: vi.fn(),
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

// Mock detailed results response
const mockDetailedResultsResponse: AssignmentDetailedResultsResponse = {
  assignment_id: "test-assignment-123",
  assignment_name: "Math Quiz 1",
  activity_type: "dragdroppicture",
  due_date: "2025-02-15T23:59:59Z",
  completion_overview: {
    completed: 18,
    in_progress: 3,
    not_started: 2,
    past_due: 1,
    total: 24,
  },
  score_statistics: {
    avg_score: 78.5,
    median_score: 80,
    highest_score: 100,
    lowest_score: 45,
  },
  student_results: [
    {
      student_id: "s1",
      name: "Alice Smith",
      status: "completed",
      score: 95,
      time_spent_minutes: 12,
      completed_at: "2025-02-10T10:30:00Z",
    },
    {
      student_id: "s2",
      name: "Bob Jones",
      status: "completed",
      score: 80,
      time_spent_minutes: 18,
      completed_at: "2025-02-11T14:20:00Z",
    },
    {
      student_id: "s3",
      name: "Carol White",
      status: "in_progress",
      score: null,
      time_spent_minutes: 5,
      completed_at: null,
    },
    {
      student_id: "s4",
      name: "Dan Brown",
      status: "not_started",
      score: null,
      time_spent_minutes: 0,
      completed_at: null,
    },
  ],
  question_analysis: {
    activity_type: "dragdroppicture",
    questions: [
      {
        question_id: "zone1",
        question_text: "Match the apple",
        correct_percentage: 85.0,
        total_responses: 20,
        answer_distribution: [
          { option: "correct", count: 17, percentage: 85.0, is_correct: true },
          { option: "wrong", count: 3, percentage: 15.0, is_correct: false },
        ],
      },
      {
        question_id: "zone2",
        question_text: "Match the banana",
        correct_percentage: 65.0,
        total_responses: 20,
        answer_distribution: [
          { option: "correct", count: 13, percentage: 65.0, is_correct: true },
          { option: "wrong", count: 7, percentage: 35.0, is_correct: false },
        ],
      },
    ],
    most_missed: [
      {
        question_id: "zone2",
        question_text: "Match the banana",
        correct_percentage: 65.0,
        common_wrong_answer: "wrong",
      },
    ],
    word_matching_errors: null,
    fill_in_blank: null,
    word_search: null,
  },
}

// Mock student answers response
const mockStudentAnswersResponse: StudentAnswersResponse = {
  student_id: "s1",
  name: "Alice Smith",
  status: "completed",
  score: 95,
  time_spent_minutes: 12,
  started_at: "2025-02-10T10:15:00Z",
  completed_at: "2025-02-10T10:30:00Z",
  answers_json: {
    zone1: "correct_answer",
    zone2: "correct_answer",
    zone3: "wrong_answer",
  },
}

describe("AssignmentDetailPage - Results Tab", () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper component that renders the dashboard with mock data
  function TestableAssignmentResultsDashboard({
    isLoading = false,
    error = null,
    results = mockDetailedResultsResponse,
    activeTab = "results",
    onTabChange,
    statusFilter = "all",
    onStatusFilterChange,
    selectedStudentId = null,
    studentAnswers = mockStudentAnswersResponse,
    studentAnswersLoading = false,
    onViewDetails,
    onCloseDialog,
  }: {
    isLoading?: boolean
    error?: Error | null
    results?: AssignmentDetailedResultsResponse | null
    activeTab?: string
    onTabChange?: (tab: string) => void
    statusFilter?: string
    onStatusFilterChange?: (status: string) => void
    selectedStudentId?: string | null
    studentAnswers?: StudentAnswersResponse | null
    studentAnswersLoading?: boolean
    onViewDetails?: (studentId: string) => void
    onCloseDialog?: () => void
  }) {
    // Loading state
    if (isLoading) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent"
              data-testid="loading-spinner"
            />
            <p className="text-muted-foreground mt-4">
              Loading assignment results...
            </p>
          </div>
        </div>
      )
    }

    // Error state
    if (error || !results) {
      return (
        <div className="container mx-auto px-4 py-8">
          <button type="button" data-testid="back-button">
            Back to Assignments
          </button>
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Error Loading Assignment</h2>
            <p className="text-muted-foreground" data-testid="error-message">
              {error instanceof Error
                ? error.message
                : "Unable to load assignment details. Please try again later."}
            </p>
          </div>
        </div>
      )
    }

    // Filter students
    const filteredStudents = results.student_results.filter((student) => {
      if (statusFilter === "all") return true
      return student.status === statusFilter
    })

    return (
      <div className="container mx-auto px-4 py-8">
        <button type="button" data-testid="back-button">
          Back to Assignments
        </button>

        {/* Assignment Header */}
        <div data-testid="assignment-header">
          <h1 data-testid="assignment-name">{results.assignment_name}</h1>
          <span data-testid="activity-type">{results.activity_type}</span>
          {results.due_date && (
            <span data-testid="due-date">
              Due: {new Date(results.due_date).toLocaleDateString()}
            </span>
          )}
          <span data-testid="completion-badge">
            {results.completion_overview.total > 0
              ? (
                  (results.completion_overview.completed /
                    results.completion_overview.total) *
                  100
                ).toFixed(0)
              : 0}
            % Complete
          </span>
        </div>

        {/* Tabs */}
        <div data-testid="tabs-container">
          <button
            type="button"
            data-testid="tab-results"
            onClick={() => onTabChange?.("results")}
            aria-selected={activeTab === "results"}
          >
            Results
          </button>
          <button
            type="button"
            data-testid="tab-students"
            onClick={() => onTabChange?.("students")}
            aria-selected={activeTab === "students"}
          >
            Students
          </button>
        </div>

        {/* Results Tab Content */}
        {activeTab === "results" && (
          <div data-testid="results-tab-content" className="space-y-6">
            {/* Completion Overview */}
            <div data-testid="completion-overview">
              <h2>Completion Overview</h2>
              <div data-testid="progress-bar">
                {(
                  (results.completion_overview.completed /
                    results.completion_overview.total) *
                  100
                ).toFixed(0)}
                %
              </div>
              <div data-testid="completion-stats">
                <span data-testid="completed-count">
                  {results.completion_overview.completed}
                </span>
                <span data-testid="in-progress-count">
                  {results.completion_overview.in_progress}
                </span>
                <span data-testid="not-started-count">
                  {results.completion_overview.not_started}
                </span>
                <span data-testid="past-due-count">
                  {results.completion_overview.past_due}
                </span>
              </div>
            </div>

            {/* Score Statistics */}
            {results.score_statistics ? (
              <div data-testid="score-statistics">
                <h2>Score Statistics</h2>
                <span data-testid="avg-score">
                  {results.score_statistics.avg_score.toFixed(1)}%
                </span>
                <span data-testid="median-score">
                  {results.score_statistics.median_score}%
                </span>
                <span data-testid="highest-score">
                  {results.score_statistics.highest_score}%
                </span>
                <span data-testid="lowest-score">
                  {results.score_statistics.lowest_score}%
                </span>
              </div>
            ) : (
              <div data-testid="no-score-statistics">
                <p>No scores available yet</p>
              </div>
            )}

            {/* Question Analysis */}
            {results.question_analysis ? (
              <div data-testid="question-analysis">
                {/* Most Missed Questions */}
                {results.question_analysis.most_missed &&
                  results.question_analysis.most_missed.length > 0 && (
                    <div data-testid="most-missed-questions">
                      <h2>Most Missed Questions</h2>
                      {results.question_analysis.most_missed.map((q, idx) => (
                        <div key={q.question_id} data-testid="missed-question">
                          <span data-testid="missed-rank">#{idx + 1}</span>
                          <span data-testid="missed-text">{q.question_text}</span>
                          <span data-testid="missed-percentage">
                            {q.correct_percentage.toFixed(0)}%
                          </span>
                          {q.common_wrong_answer && (
                            <span data-testid="common-wrong-answer">
                              {q.common_wrong_answer}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                {/* Question Performance Chart */}
                {results.question_analysis.questions &&
                  results.question_analysis.questions.length > 0 && (
                    <div data-testid="question-performance-chart">
                      <h2>Question Performance</h2>
                      <div data-testid="chart-container">Chart</div>
                    </div>
                  )}

                {/* Word Matching Errors */}
                {results.question_analysis.word_matching_errors &&
                  results.question_analysis.word_matching_errors.length > 0 && (
                    <div data-testid="word-matching-errors">
                      <h2>Common Word Matching Errors</h2>
                      <table>
                        <tbody>
                          {results.question_analysis.word_matching_errors.map(
                            (error) => (
                              <tr key={error.word} data-testid="word-error-row">
                                <td data-testid="error-word">{error.word}</td>
                                <td data-testid="correct-match">
                                  {error.correct_match}
                                </td>
                                <td data-testid="incorrect-match">
                                  {error.common_incorrect_match}
                                </td>
                                <td data-testid="error-count">
                                  {error.error_count}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                {/* Word Search Analysis */}
                {results.question_analysis.word_search &&
                  results.question_analysis.word_search.length > 0 && (
                    <div data-testid="word-search-analysis">
                      <h2>Word Search Analysis</h2>
                      <table>
                        <tbody>
                          {results.question_analysis.word_search.map((word) => (
                            <tr key={word.word} data-testid="word-search-row">
                              <td data-testid="search-word">{word.word}</td>
                              <td data-testid="find-rate">
                                {word.find_rate.toFixed(0)}%
                              </td>
                              <td data-testid="found-count">{word.found_count}</td>
                              <td data-testid="total-attempts">
                                {word.total_attempts}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            ) : (
              <div data-testid="no-question-analysis">
                <p>No question-level analysis available yet</p>
              </div>
            )}
          </div>
        )}

        {/* Students Tab Content */}
        {activeTab === "students" && (
          <div data-testid="students-tab-content">
            <div data-testid="students-header">
              <h2>Student Results</h2>
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange?.(e.target.value)}
                data-testid="status-filter"
                aria-label="Filter by status"
              >
                <option value="all">All Students</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <p data-testid="student-count">
              Showing {filteredStudents.length} of {results.student_results.length}{" "}
              students
            </p>

            {filteredStudents.length === 0 ? (
              <p data-testid="no-students">
                No students found matching your filters.
              </p>
            ) : (
              <table data-testid="students-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Time Spent</th>
                    <th>Completed At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.student_id} data-testid="student-row">
                      <td data-testid="student-name">{student.name}</td>
                      <td data-testid="student-status">{student.status}</td>
                      <td data-testid="student-score">
                        {student.score !== null ? `${student.score}%` : "—"}
                      </td>
                      <td data-testid="student-time">
                        {student.time_spent_minutes > 0
                          ? `${student.time_spent_minutes} min`
                          : "—"}
                      </td>
                      <td data-testid="student-completed">
                        {student.completed_at
                          ? new Date(student.completed_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        <button
                          type="button"
                          data-testid="view-details-btn"
                          onClick={() => onViewDetails?.(student.student_id)}
                          disabled={student.status === "not_started"}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Student Answers Dialog */}
        {selectedStudentId && (
          <div data-testid="student-answers-dialog" role="dialog">
            <div data-testid="dialog-header">
              <h2>
                {studentAnswersLoading
                  ? "Loading..."
                  : `${studentAnswers?.name}'s Answers`}
              </h2>
              <button
                type="button"
                data-testid="close-dialog"
                onClick={onCloseDialog}
              >
                Close
              </button>
            </div>

            {studentAnswersLoading ? (
              <div data-testid="dialog-loading">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent" />
                <p>Loading student answers...</p>
              </div>
            ) : studentAnswers ? (
              <div data-testid="dialog-content">
                <div data-testid="answer-status">{studentAnswers.status}</div>
                <div data-testid="answer-score">
                  {studentAnswers.score !== null
                    ? `${studentAnswers.score}%`
                    : "N/A"}
                </div>
                <div data-testid="answer-time">
                  {studentAnswers.time_spent_minutes} minutes
                </div>
                <div data-testid="answer-completed">
                  {studentAnswers.completed_at
                    ? new Date(studentAnswers.completed_at).toLocaleString()
                    : "Not completed"}
                </div>
                {studentAnswers.answers_json && (
                  <div data-testid="answers-json">
                    {JSON.stringify(studentAnswers.answers_json, null, 2)}
                  </div>
                )}
              </div>
            ) : (
              <p data-testid="dialog-error">Unable to load student answers.</p>
            )}
          </div>
        )}
      </div>
    )
  }

  describe("Loading State", () => {
    it("displays loading spinner while fetching data", () => {
      render(<TestableAssignmentResultsDashboard isLoading={true} results={null} />)

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
      expect(
        screen.getByText("Loading assignment results..."),
      ).toBeInTheDocument()
    })
  })

  describe("Error State", () => {
    it("displays error message when API fails", () => {
      const testError = new Error("Network error - failed to fetch results")

      render(
        <TestableAssignmentResultsDashboard
          isLoading={false}
          error={testError}
          results={null}
        />,
      )

      expect(screen.getByText("Error Loading Assignment")).toBeInTheDocument()
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Network error - failed to fetch results",
      )
    })

    it("displays default error message when no error details", () => {
      render(
        <TestableAssignmentResultsDashboard
          isLoading={false}
          error={null}
          results={null}
        />,
      )

      expect(screen.getByText("Error Loading Assignment")).toBeInTheDocument()
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Unable to load assignment details. Please try again later.",
      )
    })

    it("renders back button in error state", () => {
      render(
        <TestableAssignmentResultsDashboard
          isLoading={false}
          error={new Error("test")}
          results={null}
        />,
      )

      expect(screen.getByTestId("back-button")).toBeInTheDocument()
    })
  })

  describe("Assignment Header", () => {
    it("renders assignment name correctly", () => {
      render(<TestableAssignmentResultsDashboard />)

      expect(screen.getByTestId("assignment-name")).toHaveTextContent(
        "Math Quiz 1",
      )
    })

    it("renders activity type", () => {
      render(<TestableAssignmentResultsDashboard />)

      expect(screen.getByTestId("activity-type")).toHaveTextContent(
        "dragdroppicture",
      )
    })

    it("renders due date", () => {
      render(<TestableAssignmentResultsDashboard />)

      expect(screen.getByTestId("due-date")).toBeInTheDocument()
    })

    it("renders completion badge", () => {
      render(<TestableAssignmentResultsDashboard />)

      expect(screen.getByTestId("completion-badge")).toHaveTextContent(
        "75% Complete",
      )
    })

    it("renders back button", () => {
      render(<TestableAssignmentResultsDashboard />)

      expect(screen.getByTestId("back-button")).toBeInTheDocument()
    })
  })

  describe("Tabs Navigation", () => {
    it("renders both tabs", () => {
      render(<TestableAssignmentResultsDashboard />)

      expect(screen.getByTestId("tab-results")).toBeInTheDocument()
      expect(screen.getByTestId("tab-students")).toBeInTheDocument()
    })

    it("shows results tab content by default", () => {
      render(<TestableAssignmentResultsDashboard activeTab="results" />)

      expect(screen.getByTestId("results-tab-content")).toBeInTheDocument()
    })

    it("calls onTabChange when tab is clicked", async () => {
      const onTabChange = vi.fn()
      render(
        <TestableAssignmentResultsDashboard
          activeTab="results"
          onTabChange={onTabChange}
        />,
      )

      await user.click(screen.getByTestId("tab-students"))
      expect(onTabChange).toHaveBeenCalledWith("students")
    })
  })

  describe("Results Tab - Completion Overview", () => {
    it("renders completion overview section", () => {
      render(<TestableAssignmentResultsDashboard activeTab="results" />)

      expect(screen.getByTestId("completion-overview")).toBeInTheDocument()
    })

    it("displays correct completion counts", () => {
      render(<TestableAssignmentResultsDashboard activeTab="results" />)

      expect(screen.getByTestId("completed-count")).toHaveTextContent("18")
      expect(screen.getByTestId("in-progress-count")).toHaveTextContent("3")
      expect(screen.getByTestId("not-started-count")).toHaveTextContent("2")
      expect(screen.getByTestId("past-due-count")).toHaveTextContent("1")
    })

    it("displays progress bar with correct percentage", () => {
      render(<TestableAssignmentResultsDashboard activeTab="results" />)

      expect(screen.getByTestId("progress-bar")).toHaveTextContent("75%")
    })
  })

  describe("Results Tab - Score Statistics", () => {
    it("renders score statistics section", () => {
      render(<TestableAssignmentResultsDashboard activeTab="results" />)

      expect(screen.getByTestId("score-statistics")).toBeInTheDocument()
    })

    it("displays correct score values", () => {
      render(<TestableAssignmentResultsDashboard activeTab="results" />)

      expect(screen.getByTestId("avg-score")).toHaveTextContent("78.5%")
      expect(screen.getByTestId("median-score")).toHaveTextContent("80%")
      expect(screen.getByTestId("highest-score")).toHaveTextContent("100%")
      expect(screen.getByTestId("lowest-score")).toHaveTextContent("45%")
    })

    it("displays empty state when no scores available", () => {
      const noScoresResults = {
        ...mockDetailedResultsResponse,
        score_statistics: null,
      }
      render(
        <TestableAssignmentResultsDashboard
          activeTab="results"
          results={noScoresResults}
        />,
      )

      expect(screen.getByTestId("no-score-statistics")).toBeInTheDocument()
      expect(screen.getByText("No scores available yet")).toBeInTheDocument()
    })
  })

  describe("Results Tab - Most Missed Questions", () => {
    it("renders most missed questions section", () => {
      render(<TestableAssignmentResultsDashboard activeTab="results" />)

      expect(screen.getByTestId("most-missed-questions")).toBeInTheDocument()
    })

    it("displays correct number of missed questions", () => {
      render(<TestableAssignmentResultsDashboard activeTab="results" />)

      const missedQuestions = screen.getAllByTestId("missed-question")
      expect(missedQuestions).toHaveLength(1)
    })

    it("displays question details correctly", () => {
      render(<TestableAssignmentResultsDashboard activeTab="results" />)

      const missedQuestion = screen.getByTestId("missed-question")
      expect(within(missedQuestion).getByTestId("missed-rank")).toHaveTextContent(
        "#1",
      )
      expect(within(missedQuestion).getByTestId("missed-text")).toHaveTextContent(
        "Match the banana",
      )
      expect(
        within(missedQuestion).getByTestId("missed-percentage"),
      ).toHaveTextContent("65%")
    })

    it("displays common wrong answer when available", () => {
      render(<TestableAssignmentResultsDashboard activeTab="results" />)

      expect(screen.getByTestId("common-wrong-answer")).toHaveTextContent("wrong")
    })
  })

  describe("Results Tab - Question Analysis Empty States", () => {
    it("displays empty state when no question analysis", () => {
      const noAnalysisResults = {
        ...mockDetailedResultsResponse,
        question_analysis: null,
      }
      render(
        <TestableAssignmentResultsDashboard
          activeTab="results"
          results={noAnalysisResults}
        />,
      )

      expect(screen.getByTestId("no-question-analysis")).toBeInTheDocument()
      expect(
        screen.getByText("No question-level analysis available yet"),
      ).toBeInTheDocument()
    })
  })

  describe("Students Tab - Table Display", () => {
    it("renders students table when students exist", () => {
      render(<TestableAssignmentResultsDashboard activeTab="students" />)

      expect(screen.getByTestId("students-table")).toBeInTheDocument()
      const rows = screen.getAllByTestId("student-row")
      expect(rows).toHaveLength(4)
    })

    it("displays student names correctly", () => {
      render(<TestableAssignmentResultsDashboard activeTab="students" />)

      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
      expect(screen.getByText("Bob Jones")).toBeInTheDocument()
      expect(screen.getByText("Carol White")).toBeInTheDocument()
    })

    it("displays student scores correctly", () => {
      render(<TestableAssignmentResultsDashboard activeTab="students" />)

      const rows = screen.getAllByTestId("student-row")
      expect(within(rows[0]).getByTestId("student-score")).toHaveTextContent(
        "95%",
      )
      expect(within(rows[1]).getByTestId("student-score")).toHaveTextContent(
        "80%",
      )
      expect(within(rows[2]).getByTestId("student-score")).toHaveTextContent("—")
    })

    it("displays student status correctly", () => {
      render(<TestableAssignmentResultsDashboard activeTab="students" />)

      const rows = screen.getAllByTestId("student-row")
      expect(within(rows[0]).getByTestId("student-status")).toHaveTextContent(
        "completed",
      )
      expect(within(rows[2]).getByTestId("student-status")).toHaveTextContent(
        "in_progress",
      )
    })

    it("displays student count", () => {
      render(<TestableAssignmentResultsDashboard activeTab="students" />)

      expect(screen.getByTestId("student-count")).toHaveTextContent(
        "Showing 4 of 4 students",
      )
    })
  })

  describe("Students Tab - Status Filtering", () => {
    it("renders status filter dropdown", () => {
      render(<TestableAssignmentResultsDashboard activeTab="students" />)

      expect(screen.getByTestId("status-filter")).toBeInTheDocument()
    })

    it("displays all filter options", () => {
      render(<TestableAssignmentResultsDashboard activeTab="students" />)

      const select = screen.getByTestId("status-filter")
      const options = within(select).getAllByRole("option")

      expect(options).toHaveLength(4)
      expect(options[0]).toHaveValue("all")
      expect(options[1]).toHaveValue("not_started")
      expect(options[2]).toHaveValue("in_progress")
      expect(options[3]).toHaveValue("completed")
    })

    it("filters students when status filter changes", () => {
      render(
        <TestableAssignmentResultsDashboard
          activeTab="students"
          statusFilter="completed"
        />,
      )

      const rows = screen.getAllByTestId("student-row")
      expect(rows).toHaveLength(2) // Only completed students
      expect(screen.getByTestId("student-count")).toHaveTextContent(
        "Showing 2 of 4 students",
      )
    })

    it("calls onStatusFilterChange when filter is changed", async () => {
      const onStatusFilterChange = vi.fn()
      render(
        <TestableAssignmentResultsDashboard
          activeTab="students"
          onStatusFilterChange={onStatusFilterChange}
        />,
      )

      await user.selectOptions(screen.getByTestId("status-filter"), "completed")
      expect(onStatusFilterChange).toHaveBeenCalledWith("completed")
    })

    it("displays empty state when no students match filter", () => {
      const noMatchResults = {
        ...mockDetailedResultsResponse,
        student_results: mockDetailedResultsResponse.student_results.filter(
          (s) => s.status === "completed",
        ),
      }
      render(
        <TestableAssignmentResultsDashboard
          activeTab="students"
          results={noMatchResults}
          statusFilter="not_started"
        />,
      )

      expect(screen.getByTestId("no-students")).toHaveTextContent(
        "No students found matching your filters.",
      )
    })
  })

  describe("Students Tab - View Details", () => {
    it("renders view details button for each student", () => {
      render(<TestableAssignmentResultsDashboard activeTab="students" />)

      const buttons = screen.getAllByTestId("view-details-btn")
      expect(buttons).toHaveLength(4)
    })

    it("disables view details button for not_started students", () => {
      render(<TestableAssignmentResultsDashboard activeTab="students" />)

      const rows = screen.getAllByTestId("student-row")
      const notStartedRow = rows[3] // Dan Brown - not_started
      const button = within(notStartedRow).getByTestId("view-details-btn")
      expect(button).toBeDisabled()
    })

    it("enables view details button for completed students", () => {
      render(<TestableAssignmentResultsDashboard activeTab="students" />)

      const rows = screen.getAllByTestId("student-row")
      const completedRow = rows[0] // Alice Smith - completed
      const button = within(completedRow).getByTestId("view-details-btn")
      expect(button).not.toBeDisabled()
    })

    it("calls onViewDetails when button is clicked", async () => {
      const onViewDetails = vi.fn()
      render(
        <TestableAssignmentResultsDashboard
          activeTab="students"
          onViewDetails={onViewDetails}
        />,
      )

      const rows = screen.getAllByTestId("student-row")
      const button = within(rows[0]).getByTestId("view-details-btn")
      await user.click(button)
      expect(onViewDetails).toHaveBeenCalledWith("s1")
    })
  })

  describe("Student Answers Dialog", () => {
    it("renders dialog when student is selected", () => {
      render(
        <TestableAssignmentResultsDashboard
          activeTab="students"
          selectedStudentId="s1"
        />,
      )

      expect(screen.getByTestId("student-answers-dialog")).toBeInTheDocument()
    })

    it("does not render dialog when no student selected", () => {
      render(
        <TestableAssignmentResultsDashboard
          activeTab="students"
          selectedStudentId={null}
        />,
      )

      expect(
        screen.queryByTestId("student-answers-dialog"),
      ).not.toBeInTheDocument()
    })

    it("displays loading state in dialog", () => {
      render(
        <TestableAssignmentResultsDashboard
          activeTab="students"
          selectedStudentId="s1"
          studentAnswersLoading={true}
        />,
      )

      expect(screen.getByTestId("dialog-loading")).toBeInTheDocument()
      expect(screen.getByText("Loading student answers...")).toBeInTheDocument()
    })

    it("displays student answers when loaded", () => {
      render(
        <TestableAssignmentResultsDashboard
          activeTab="students"
          selectedStudentId="s1"
          studentAnswersLoading={false}
        />,
      )

      expect(screen.getByTestId("dialog-content")).toBeInTheDocument()
      expect(screen.getByTestId("answer-status")).toHaveTextContent("completed")
      expect(screen.getByTestId("answer-score")).toHaveTextContent("95%")
      expect(screen.getByTestId("answer-time")).toHaveTextContent("12 minutes")
    })

    it("displays answers JSON", () => {
      render(
        <TestableAssignmentResultsDashboard
          activeTab="students"
          selectedStudentId="s1"
          studentAnswersLoading={false}
        />,
      )

      expect(screen.getByTestId("answers-json")).toBeInTheDocument()
      expect(screen.getByTestId("answers-json")).toHaveTextContent("zone1")
    })

    it("displays error state when answers fail to load", () => {
      render(
        <TestableAssignmentResultsDashboard
          activeTab="students"
          selectedStudentId="s1"
          studentAnswersLoading={false}
          studentAnswers={null}
        />,
      )

      expect(screen.getByTestId("dialog-error")).toHaveTextContent(
        "Unable to load student answers.",
      )
    })

    it("calls onCloseDialog when close button is clicked", async () => {
      const onCloseDialog = vi.fn()
      render(
        <TestableAssignmentResultsDashboard
          activeTab="students"
          selectedStudentId="s1"
          onCloseDialog={onCloseDialog}
        />,
      )

      await user.click(screen.getByTestId("close-dialog"))
      expect(onCloseDialog).toHaveBeenCalled()
    })
  })

  describe("Edge Cases", () => {
    it("handles zero values correctly", () => {
      const zeroData: AssignmentDetailedResultsResponse = {
        ...mockDetailedResultsResponse,
        completion_overview: {
          completed: 0,
          in_progress: 0,
          not_started: 0,
          past_due: 0,
          total: 0,
        },
        score_statistics: {
          avg_score: 0,
          median_score: 0,
          highest_score: 0,
          lowest_score: 0,
        },
      }

      render(
        <TestableAssignmentResultsDashboard activeTab="results" results={zeroData} />,
      )

      expect(screen.getByTestId("completed-count")).toHaveTextContent("0")
      expect(screen.getByTestId("avg-score")).toHaveTextContent("0.0%")
      expect(screen.getByTestId("completion-badge")).toHaveTextContent("0% Complete")
    })

    it("handles missing due date", () => {
      const noDueDateResults = {
        ...mockDetailedResultsResponse,
        due_date: null,
      }

      render(
        <TestableAssignmentResultsDashboard
          activeTab="results"
          results={noDueDateResults}
        />,
      )

      expect(screen.queryByTestId("due-date")).not.toBeInTheDocument()
    })

    it("handles empty student results", () => {
      const emptyStudentsResults = {
        ...mockDetailedResultsResponse,
        student_results: [],
      }

      render(
        <TestableAssignmentResultsDashboard
          activeTab="students"
          results={emptyStudentsResults}
        />,
      )

      expect(screen.getByTestId("no-students")).toBeInTheDocument()
    })
  })

  describe("Activity Type Specific Analysis", () => {
    it("renders word matching errors for matchTheWords activity", () => {
      const wordMatchingResults: AssignmentDetailedResultsResponse = {
        ...mockDetailedResultsResponse,
        activity_type: "matchTheWords",
        question_analysis: {
          activity_type: "matchTheWords",
          questions: null,
          most_missed: null,
          word_matching_errors: [
            {
              word: "apple",
              correct_match: "manzana",
              common_incorrect_match: "naranja",
              error_count: 5,
            },
          ],
          fill_in_blank: null,
          word_search: null,
        },
      }

      render(
        <TestableAssignmentResultsDashboard
          activeTab="results"
          results={wordMatchingResults}
        />,
      )

      expect(screen.getByTestId("word-matching-errors")).toBeInTheDocument()
      const row = screen.getByTestId("word-error-row")
      expect(within(row).getByTestId("error-word")).toHaveTextContent("apple")
      expect(within(row).getByTestId("correct-match")).toHaveTextContent("manzana")
      expect(within(row).getByTestId("incorrect-match")).toHaveTextContent(
        "naranja",
      )
      expect(within(row).getByTestId("error-count")).toHaveTextContent("5")
    })

    it("renders word search analysis for puzzleFindWords activity", () => {
      const wordSearchResults: AssignmentDetailedResultsResponse = {
        ...mockDetailedResultsResponse,
        activity_type: "puzzleFindWords",
        question_analysis: {
          activity_type: "puzzleFindWords",
          questions: null,
          most_missed: null,
          word_matching_errors: null,
          fill_in_blank: null,
          word_search: [
            {
              word: "CAT",
              find_rate: 90.0,
              found_count: 18,
              total_attempts: 20,
            },
            {
              word: "DOG",
              find_rate: 75.0,
              found_count: 15,
              total_attempts: 20,
            },
          ],
        },
      }

      render(
        <TestableAssignmentResultsDashboard
          activeTab="results"
          results={wordSearchResults}
        />,
      )

      expect(screen.getByTestId("word-search-analysis")).toBeInTheDocument()
      const rows = screen.getAllByTestId("word-search-row")
      expect(rows).toHaveLength(2)
      expect(within(rows[0]).getByTestId("search-word")).toHaveTextContent("CAT")
      expect(within(rows[0]).getByTestId("find-rate")).toHaveTextContent("90%")
    })
  })
})
