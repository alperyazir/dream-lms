/**
 * useStudentAnalytics Hook Tests
 * Story 5.1: Individual Student Performance Dashboard
 * Task 10: Frontend Component Tests
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as studentsApi from "@/services/studentsApi"
import type { StudentAnalyticsResponse } from "@/types/analytics"
import { useStudentAnalytics } from "./useStudentAnalytics"

// Mock the API module
vi.mock("@/services/studentsApi", () => ({
  getStudentAnalytics: vi.fn(),
  studentsApi: {
    getStudentAnalytics: vi.fn(),
  },
  default: {
    getStudentAnalytics: vi.fn(),
  },
}))

// Mock analytics response
const mockAnalyticsResponse: StudentAnalyticsResponse = {
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
  ],
  performance_trend: [
    { date: "2025-01-20", score: 80 },
    { date: "2025-01-21", score: 85 },
  ],
  activity_breakdown: [
    { activity_type: "matchTheWords", avg_score: 88, count: 5 },
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

describe("useStudentAnalytics", () => {
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
    vi.mocked(studentsApi.getStudentAnalytics).mockResolvedValue(
      mockAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useStudentAnalytics({
          studentId: "test-student-123",
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current).toHaveProperty("analytics")
    expect(result.current).toHaveProperty("isLoading")
    expect(result.current).toHaveProperty("error")
    expect(result.current).toHaveProperty("refetch")
  })

  it("starts with isLoading true and null analytics", () => {
    vi.mocked(studentsApi.getStudentAnalytics).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockAnalyticsResponse), 1000),
        ),
    )

    const { result } = renderHook(
      () =>
        useStudentAnalytics({
          studentId: "test-student-123",
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.analytics).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("calls getStudentAnalytics with correct parameters", async () => {
    vi.mocked(studentsApi.getStudentAnalytics).mockResolvedValue(
      mockAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useStudentAnalytics({
          studentId: "test-student-123",
          period: "7d",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(studentsApi.getStudentAnalytics).toHaveBeenCalledWith(
      "test-student-123",
      "7d",
    )
  })

  it("uses default period of 30d when not specified", async () => {
    vi.mocked(studentsApi.getStudentAnalytics).mockResolvedValue(
      mockAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useStudentAnalytics({
          studentId: "test-student-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(studentsApi.getStudentAnalytics).toHaveBeenCalledWith(
      "test-student-123",
      "30d",
    )
  })

  it("returns analytics data on successful fetch", async () => {
    vi.mocked(studentsApi.getStudentAnalytics).mockResolvedValue(
      mockAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useStudentAnalytics({
          studentId: "test-student-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.analytics).not.toBeNull()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.analytics?.student.name).toBe("John Doe")
    expect(result.current.analytics?.summary.avg_score).toBe(85)
    expect(result.current.analytics?.summary.total_completed).toBe(24)
  })

  it("sets error state on failed fetch", async () => {
    const mockError = new Error("Network error - failed to fetch analytics")
    vi.mocked(studentsApi.getStudentAnalytics).mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useStudentAnalytics({
          studentId: "test-student-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.analytics).toBeNull()
  })

  it("does not fetch when studentId is empty", async () => {
    vi.mocked(studentsApi.getStudentAnalytics).mockResolvedValue(
      mockAnalyticsResponse,
    )

    renderHook(
      () =>
        useStudentAnalytics({
          studentId: "",
        }),
      { wrapper: createWrapper() },
    )

    // Wait a bit to ensure no fetch happens
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(studentsApi.getStudentAnalytics).not.toHaveBeenCalled()
  })

  it("refetches data when studentId changes", async () => {
    vi.mocked(studentsApi.getStudentAnalytics).mockResolvedValue(
      mockAnalyticsResponse,
    )

    const { result, rerender } = renderHook(
      ({ studentId }) =>
        useStudentAnalytics({
          studentId,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { studentId: "student-1" },
      },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(studentsApi.getStudentAnalytics).toHaveBeenCalledWith(
      "student-1",
      "30d",
    )

    // Change studentId
    rerender({ studentId: "student-2" })

    await waitFor(() => {
      expect(studentsApi.getStudentAnalytics).toHaveBeenCalledWith(
        "student-2",
        "30d",
      )
    })
  })

  it("refetches data when period changes", async () => {
    vi.mocked(studentsApi.getStudentAnalytics).mockResolvedValue(
      mockAnalyticsResponse,
    )

    const { result, rerender } = renderHook(
      ({ period }) =>
        useStudentAnalytics({
          studentId: "test-student-123",
          period,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { period: "30d" as const },
      },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(studentsApi.getStudentAnalytics).toHaveBeenCalledWith(
      "test-student-123",
      "30d",
    )

    // Change period
    rerender({ period: "7d" as const })

    await waitFor(() => {
      expect(studentsApi.getStudentAnalytics).toHaveBeenCalledWith(
        "test-student-123",
        "7d",
      )
    })
  })

  it("provides refetch function that works correctly", async () => {
    vi.mocked(studentsApi.getStudentAnalytics).mockResolvedValue(
      mockAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useStudentAnalytics({
          studentId: "test-student-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(studentsApi.getStudentAnalytics).toHaveBeenCalledTimes(1)

    // Call refetch
    await result.current.refetch()

    expect(studentsApi.getStudentAnalytics).toHaveBeenCalledTimes(2)
  })

  it("caches data with 5 minute stale time", async () => {
    vi.mocked(studentsApi.getStudentAnalytics).mockResolvedValue(
      mockAnalyticsResponse,
    )

    // First render
    const { result: result1 } = renderHook(
      () =>
        useStudentAnalytics({
          studentId: "test-student-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false)
    })

    expect(studentsApi.getStudentAnalytics).toHaveBeenCalledTimes(1)

    // Second render with same params should use cache
    const { result: result2 } = renderHook(
      () =>
        useStudentAnalytics({
          studentId: "test-student-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false)
    })

    // Should still be 1 call due to caching
    expect(studentsApi.getStudentAnalytics).toHaveBeenCalledTimes(1)
  })
})
