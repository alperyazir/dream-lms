/**
 * useClassAnalytics Hook Tests
 * Story 5.2: Class-Wide Performance Analytics
 * Task 10: Frontend Component Tests
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as classesApi from "@/services/classesApi"
import type { ClassAnalyticsResponse } from "@/types/analytics"
import { useClassAnalytics } from "./useClassAnalytics"

// Mock the API module
vi.mock("@/services/classesApi", () => ({
  getClassAnalytics: vi.fn(),
  classesApi: {
    getClassAnalytics: vi.fn(),
  },
  default: {
    getClassAnalytics: vi.fn(),
  },
}))

// Mock analytics response
const mockClassAnalyticsResponse: ClassAnalyticsResponse = {
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

describe("useClassAnalytics", () => {
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
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current).toHaveProperty("analytics")
    expect(result.current).toHaveProperty("isLoading")
    expect(result.current).toHaveProperty("error")
    expect(result.current).toHaveProperty("refetch")
  })

  it("starts with isLoading true and null analytics", () => {
    vi.mocked(classesApi.getClassAnalytics).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockClassAnalyticsResponse), 1000),
        ),
    )

    const { result } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.analytics).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("calls getClassAnalytics with correct parameters", async () => {
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
          period: "weekly",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(classesApi.getClassAnalytics).toHaveBeenCalledWith(
      "test-class-123",
      "weekly",
    )
  })

  it("uses default period of monthly when not specified", async () => {
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(classesApi.getClassAnalytics).toHaveBeenCalledWith(
      "test-class-123",
      "monthly",
    )
  })

  it("returns analytics data on successful fetch", async () => {
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.analytics).not.toBeNull()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.analytics?.class_name).toBe("Math 101")
    expect(result.current.analytics?.summary.avg_score).toBe(78.5)
    expect(result.current.analytics?.summary.active_students).toBe(22)
  })

  it("sets error state on failed fetch", async () => {
    const mockError = new Error("Network error - failed to fetch class analytics")
    vi.mocked(classesApi.getClassAnalytics).mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.analytics).toBeNull()
  })

  it("does not fetch when classId is empty", async () => {
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    renderHook(
      () =>
        useClassAnalytics({
          classId: "",
        }),
      { wrapper: createWrapper() },
    )

    // Wait a bit to ensure no fetch happens
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(classesApi.getClassAnalytics).not.toHaveBeenCalled()
  })

  it("refetches data when classId changes", async () => {
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    const { result, rerender } = renderHook(
      ({ classId }) =>
        useClassAnalytics({
          classId,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { classId: "class-1" },
      },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(classesApi.getClassAnalytics).toHaveBeenCalledWith(
      "class-1",
      "monthly",
    )

    // Change classId
    rerender({ classId: "class-2" })

    await waitFor(() => {
      expect(classesApi.getClassAnalytics).toHaveBeenCalledWith(
        "class-2",
        "monthly",
      )
    })
  })

  it("refetches data when period changes", async () => {
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    const { result, rerender } = renderHook(
      ({ period }) =>
        useClassAnalytics({
          classId: "test-class-123",
          period,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { period: "monthly" as "monthly" | "weekly" | "semester" | "ytd" },
      },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(classesApi.getClassAnalytics).toHaveBeenCalledWith(
      "test-class-123",
      "monthly",
    )

    // Change period
    rerender({ period: "weekly" as const })

    await waitFor(() => {
      expect(classesApi.getClassAnalytics).toHaveBeenCalledWith(
        "test-class-123",
        "weekly",
      )
    })
  })

  it("provides refetch function that works correctly", async () => {
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(classesApi.getClassAnalytics).toHaveBeenCalledTimes(1)

    // Call refetch
    await result.current.refetch()

    expect(classesApi.getClassAnalytics).toHaveBeenCalledTimes(2)
  })

  it("caches data with 5 minute stale time", async () => {
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    // First render
    const { result: result1 } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false)
    })

    expect(classesApi.getClassAnalytics).toHaveBeenCalledTimes(1)

    // Second render with same params should use cache
    const { result: result2 } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false)
    })

    // Should still be 1 call due to caching
    expect(classesApi.getClassAnalytics).toHaveBeenCalledTimes(1)
  })

  it("returns correct leaderboard data", async () => {
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.analytics).not.toBeNull()
    })

    expect(result.current.analytics?.leaderboard).toHaveLength(3)
    expect(result.current.analytics?.leaderboard[0].name).toBe("Alice Smith")
    expect(result.current.analytics?.leaderboard[0].rank).toBe(1)
  })

  it("returns correct struggling students data", async () => {
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.analytics).not.toBeNull()
    })

    expect(result.current.analytics?.struggling_students).toHaveLength(2)
    expect(result.current.analytics?.struggling_students[0].name).toBe("Dan Brown")
    expect(result.current.analytics?.struggling_students[0].alert_reason).toBe(
      "Score below 60%",
    )
  })

  it("returns correct score distribution data", async () => {
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.analytics).not.toBeNull()
    })

    expect(result.current.analytics?.score_distribution).toHaveLength(5)
    expect(result.current.analytics?.score_distribution[0].range_label).toBe("0-59%")
    expect(result.current.analytics?.score_distribution[4].range_label).toBe(
      "90-100%",
    )
  })

  it("returns correct trend data", async () => {
    vi.mocked(classesApi.getClassAnalytics).mockResolvedValue(
      mockClassAnalyticsResponse,
    )

    const { result } = renderHook(
      () =>
        useClassAnalytics({
          classId: "test-class-123",
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.analytics).not.toBeNull()
    })

    expect(result.current.analytics?.trends).toHaveLength(2)
    expect(result.current.analytics?.trends[0].metric_name).toBe("Average Score")
    expect(result.current.analytics?.trends[0].trend).toBe("up")
    expect(result.current.analytics?.trends[0].change_percent).toBe(4.4)
  })
})
