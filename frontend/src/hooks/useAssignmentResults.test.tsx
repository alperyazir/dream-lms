/**
 * useAssignmentResults Hook Tests
 * Story 5.3: Assignment-Specific Analytics & Common Mistakes
 * Task 8: Frontend Hook Tests
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as assignmentsApi from "@/services/assignmentsApi"
import type {
  AssignmentDetailedResultsResponse,
  StudentAnswersResponse,
} from "@/types/analytics"
import { useAssignmentResults, useStudentAnswers } from "./useAssignmentResults"

// Mock the API module
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
      time_spent_seconds: 720,
      started_at: "2025-02-10T10:18:00Z",
      completed_at: "2025-02-10T10:30:00Z",
      has_feedback: true,
    },
    {
      student_id: "s2",
      name: "Bob Jones",
      status: "completed",
      score: 80,
      time_spent_minutes: 18,
      time_spent_seconds: 1080,
      started_at: "2025-02-11T14:02:00Z",
      completed_at: "2025-02-11T14:20:00Z",
      has_feedback: false,
    },
    {
      student_id: "s3",
      name: "Carol White",
      status: "in_progress",
      score: null,
      time_spent_minutes: 5,
      time_spent_seconds: 300,
      started_at: "2025-02-12T09:00:00Z",
      completed_at: null,
      has_feedback: false,
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
  time_spent_seconds: 720,
  started_at: "2025-02-10T10:15:00Z",
  completed_at: "2025-02-10T10:30:00Z",
  answers_json: {
    zone1: "correct_answer",
    zone2: "correct_answer",
    zone3: "wrong_answer",
  },
  activity_type: "dragdroppicture",
  config_json: null,
}

describe("useAssignmentResults", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  it("returns correct properties", async () => {
    vi.mocked(assignmentsApi.getAssignmentDetailedResults).mockResolvedValue(
      mockDetailedResultsResponse,
    )

    const { result } = renderHook(
      () =>
        useAssignmentResults({
          assignmentId: "test-assignment-123",
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current).toHaveProperty("results")
    expect(result.current).toHaveProperty("isLoading")
    expect(result.current).toHaveProperty("error")
    expect(result.current).toHaveProperty("refetch")
  })

  it("starts with isLoading true and null results", () => {
    vi.mocked(assignmentsApi.getAssignmentDetailedResults).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockDetailedResultsResponse), 1000),
        ),
    )

    const { result } = renderHook(
      () =>
        useAssignmentResults({
          assignmentId: "test-assignment-123",
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.results).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("calls getAssignmentDetailedResults with correct assignmentId", async () => {
    vi.mocked(assignmentsApi.getAssignmentDetailedResults).mockResolvedValue(
      mockDetailedResultsResponse,
    )

    const { result } = renderHook(
      () =>
        useAssignmentResults({
          assignmentId: "test-assignment-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(assignmentsApi.getAssignmentDetailedResults).toHaveBeenCalledWith(
      "test-assignment-123",
    )
  })

  it("returns results data on successful fetch", async () => {
    vi.mocked(assignmentsApi.getAssignmentDetailedResults).mockResolvedValue(
      mockDetailedResultsResponse,
    )

    const { result } = renderHook(
      () =>
        useAssignmentResults({
          assignmentId: "test-assignment-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.results).not.toBeNull()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.results?.assignment_name).toBe("Math Quiz 1")
    expect(result.current.results?.completion_overview.completed).toBe(18)
    expect(result.current.results?.score_statistics?.avg_score).toBe(78.5)
  })

  it("sets error state on failed fetch", async () => {
    const mockError = new Error("Network error - failed to fetch results")
    vi.mocked(assignmentsApi.getAssignmentDetailedResults).mockRejectedValue(
      mockError,
    )

    const { result } = renderHook(
      () =>
        useAssignmentResults({
          assignmentId: "test-assignment-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.results).toBeNull()
  })

  it("does not fetch when assignmentId is empty", async () => {
    vi.mocked(assignmentsApi.getAssignmentDetailedResults).mockResolvedValue(
      mockDetailedResultsResponse,
    )

    renderHook(
      () =>
        useAssignmentResults({
          assignmentId: "",
        }),
      { wrapper: createWrapper() },
    )

    // Wait a bit to ensure no fetch happens
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(assignmentsApi.getAssignmentDetailedResults).not.toHaveBeenCalled()
  })

  it("refetches data when assignmentId changes", async () => {
    vi.mocked(assignmentsApi.getAssignmentDetailedResults).mockResolvedValue(
      mockDetailedResultsResponse,
    )

    const { result, rerender } = renderHook(
      ({ assignmentId }) =>
        useAssignmentResults({
          assignmentId,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { assignmentId: "assignment-1" },
      },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(assignmentsApi.getAssignmentDetailedResults).toHaveBeenCalledWith(
      "assignment-1",
    )

    // Change assignmentId
    rerender({ assignmentId: "assignment-2" })

    await waitFor(() => {
      expect(assignmentsApi.getAssignmentDetailedResults).toHaveBeenCalledWith(
        "assignment-2",
      )
    })
  })

  it("provides refetch function that works correctly", async () => {
    vi.mocked(assignmentsApi.getAssignmentDetailedResults).mockResolvedValue(
      mockDetailedResultsResponse,
    )

    const { result } = renderHook(
      () =>
        useAssignmentResults({
          assignmentId: "test-assignment-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(assignmentsApi.getAssignmentDetailedResults).toHaveBeenCalledTimes(1)

    // Call refetch
    await result.current.refetch()

    expect(assignmentsApi.getAssignmentDetailedResults).toHaveBeenCalledTimes(2)
  })

  it("returns correct completion overview data", async () => {
    vi.mocked(assignmentsApi.getAssignmentDetailedResults).mockResolvedValue(
      mockDetailedResultsResponse,
    )

    const { result } = renderHook(
      () =>
        useAssignmentResults({
          assignmentId: "test-assignment-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.results).not.toBeNull()
    })

    expect(result.current.results?.completion_overview.completed).toBe(18)
    expect(result.current.results?.completion_overview.in_progress).toBe(3)
    expect(result.current.results?.completion_overview.not_started).toBe(2)
    expect(result.current.results?.completion_overview.past_due).toBe(1)
    expect(result.current.results?.completion_overview.total).toBe(24)
  })

  it("returns correct student results list", async () => {
    vi.mocked(assignmentsApi.getAssignmentDetailedResults).mockResolvedValue(
      mockDetailedResultsResponse,
    )

    const { result } = renderHook(
      () =>
        useAssignmentResults({
          assignmentId: "test-assignment-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.results).not.toBeNull()
    })

    expect(result.current.results?.student_results).toHaveLength(3)
    expect(result.current.results?.student_results[0].name).toBe("Alice Smith")
    expect(result.current.results?.student_results[0].score).toBe(95)
    expect(result.current.results?.student_results[2].status).toBe(
      "in_progress",
    )
    expect(result.current.results?.student_results[2].score).toBeNull()
  })

  it("returns correct question analysis data", async () => {
    vi.mocked(assignmentsApi.getAssignmentDetailedResults).mockResolvedValue(
      mockDetailedResultsResponse,
    )

    const { result } = renderHook(
      () =>
        useAssignmentResults({
          assignmentId: "test-assignment-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.results).not.toBeNull()
    })

    expect(result.current.results?.question_analysis?.questions).toHaveLength(2)
    expect(
      result.current.results?.question_analysis?.questions?.[0]
        .correct_percentage,
    ).toBe(85.0)
    expect(result.current.results?.question_analysis?.most_missed).toHaveLength(
      1,
    )
    expect(
      result.current.results?.question_analysis?.most_missed?.[0].question_id,
    ).toBe("zone2")
  })
})

describe("useStudentAnswers", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  it("returns correct properties", async () => {
    vi.mocked(assignmentsApi.getStudentAnswers).mockResolvedValue(
      mockStudentAnswersResponse,
    )

    const { result } = renderHook(
      () =>
        useStudentAnswers({
          assignmentId: "test-assignment-123",
          studentId: "s1",
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current).toHaveProperty("answers")
    expect(result.current).toHaveProperty("isLoading")
    expect(result.current).toHaveProperty("error")
    expect(result.current).toHaveProperty("refetch")
  })

  it("starts with isLoading true and null answers", () => {
    vi.mocked(assignmentsApi.getStudentAnswers).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockStudentAnswersResponse), 1000),
        ),
    )

    const { result } = renderHook(
      () =>
        useStudentAnswers({
          assignmentId: "test-assignment-123",
          studentId: "s1",
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.answers).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("calls getStudentAnswers with correct parameters", async () => {
    vi.mocked(assignmentsApi.getStudentAnswers).mockResolvedValue(
      mockStudentAnswersResponse,
    )

    const { result } = renderHook(
      () =>
        useStudentAnswers({
          assignmentId: "test-assignment-123",
          studentId: "s1",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(assignmentsApi.getStudentAnswers).toHaveBeenCalledWith(
      "test-assignment-123",
      "s1",
    )
  })

  it("returns answers data on successful fetch", async () => {
    vi.mocked(assignmentsApi.getStudentAnswers).mockResolvedValue(
      mockStudentAnswersResponse,
    )

    const { result } = renderHook(
      () =>
        useStudentAnswers({
          assignmentId: "test-assignment-123",
          studentId: "s1",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.answers).not.toBeNull()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.answers?.name).toBe("Alice Smith")
    expect(result.current.answers?.score).toBe(95)
    expect(result.current.answers?.answers_json).toHaveProperty("zone1")
  })

  it("sets error state on failed fetch", async () => {
    const mockError = new Error("Network error - failed to fetch answers")
    vi.mocked(assignmentsApi.getStudentAnswers).mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useStudentAnswers({
          assignmentId: "test-assignment-123",
          studentId: "s1",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.answers).toBeNull()
  })

  it("does not fetch when assignmentId is empty", async () => {
    vi.mocked(assignmentsApi.getStudentAnswers).mockResolvedValue(
      mockStudentAnswersResponse,
    )

    renderHook(
      () =>
        useStudentAnswers({
          assignmentId: "",
          studentId: "s1",
        }),
      { wrapper: createWrapper() },
    )

    // Wait a bit to ensure no fetch happens
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(assignmentsApi.getStudentAnswers).not.toHaveBeenCalled()
  })

  it("does not fetch when studentId is empty", async () => {
    vi.mocked(assignmentsApi.getStudentAnswers).mockResolvedValue(
      mockStudentAnswersResponse,
    )

    renderHook(
      () =>
        useStudentAnswers({
          assignmentId: "test-assignment-123",
          studentId: "",
        }),
      { wrapper: createWrapper() },
    )

    // Wait a bit to ensure no fetch happens
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(assignmentsApi.getStudentAnswers).not.toHaveBeenCalled()
  })

  it("refetches data when studentId changes", async () => {
    vi.mocked(assignmentsApi.getStudentAnswers).mockResolvedValue(
      mockStudentAnswersResponse,
    )

    const { result, rerender } = renderHook(
      ({ studentId }) =>
        useStudentAnswers({
          assignmentId: "test-assignment-123",
          studentId,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { studentId: "s1" },
      },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(assignmentsApi.getStudentAnswers).toHaveBeenCalledWith(
      "test-assignment-123",
      "s1",
    )

    // Change studentId
    rerender({ studentId: "s2" })

    await waitFor(() => {
      expect(assignmentsApi.getStudentAnswers).toHaveBeenCalledWith(
        "test-assignment-123",
        "s2",
      )
    })
  })

  it("provides refetch function that works correctly", async () => {
    vi.mocked(assignmentsApi.getStudentAnswers).mockResolvedValue(
      mockStudentAnswersResponse,
    )

    const { result } = renderHook(
      () =>
        useStudentAnswers({
          assignmentId: "test-assignment-123",
          studentId: "s1",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(assignmentsApi.getStudentAnswers).toHaveBeenCalledTimes(1)

    // Call refetch
    await result.current.refetch()

    expect(assignmentsApi.getStudentAnswers).toHaveBeenCalledTimes(2)
  })
})
