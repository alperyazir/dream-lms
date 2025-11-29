/**
 * Tests for useStudentProgress hook
 * Story 5.5: Student Progress Tracking & Personal Analytics
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { useStudentProgress } from "./useStudentProgress"
import * as studentsApi from "@/services/studentsApi"
import type { StudentProgressResponse } from "@/types/analytics"

// Mock the studentsApi
vi.mock("@/services/studentsApi", () => ({
  getStudentProgress: vi.fn(),
}))

const mockProgress: StudentProgressResponse = {
  stats: {
    total_completed: 10,
    avg_score: 85.5,
    current_streak: 3,
    streak_start_date: "2025-01-25",
    improvement_trend: "improving",
  },
  score_trend: [
    { date: "2025-01-20", score: 80, assignment_name: "Assignment 1" },
    { date: "2025-01-22", score: 85, assignment_name: "Assignment 2" },
    { date: "2025-01-25", score: 90, assignment_name: "Assignment 3" },
  ],
  activity_breakdown: [
    {
      activity_type: "matchTheWords",
      avg_score: 88.0,
      total_completed: 5,
      label: "Word Matching",
    },
    {
      activity_type: "circle",
      avg_score: 82.0,
      total_completed: 3,
      label: "Circle the Answer",
    },
  ],
  recent_assignments: [
    {
      id: "1",
      name: "Math Quiz",
      score: 90,
      completed_at: "2025-01-25T10:00:00Z",
      has_feedback: false,
      activity_type: "matchTheWords",
      book_title: "Math Book",
    },
  ],
  achievements: [
    {
      id: "first_complete",
      type: "first_complete",
      title: "First Steps",
      description: "Completed your first assignment!",
      earned_at: "2025-01-20T10:00:00Z",
      icon: "rocket",
    },
  ],
  study_time: {
    this_week_minutes: 120,
    this_month_minutes: 480,
    avg_per_assignment: 12.5,
  },
  improvement_tips: [
    "Keep up the great work!",
    "You're on a 3-day streak!",
  ],
}

describe("useStudentProgress", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it("should fetch progress data with default period", async () => {
    vi.mocked(studentsApi.getStudentProgress).mockResolvedValue(mockProgress)

    const { result } = renderHook(() => useStudentProgress(), { wrapper })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(studentsApi.getStudentProgress).toHaveBeenCalledWith("this_month")
    expect(result.current.progress).toEqual(mockProgress)
    expect(result.current.error).toBeNull()
  })

  it("should fetch progress data with custom period", async () => {
    vi.mocked(studentsApi.getStudentProgress).mockResolvedValue(mockProgress)

    const { result } = renderHook(
      () => useStudentProgress({ period: "all_time" }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(studentsApi.getStudentProgress).toHaveBeenCalledWith("all_time")
    expect(result.current.progress).toEqual(mockProgress)
  })

  it("should handle API errors", async () => {
    const error = new Error("Failed to fetch progress")
    vi.mocked(studentsApi.getStudentProgress).mockRejectedValue(error)

    const { result } = renderHook(() => useStudentProgress(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.progress).toBeNull()
  })

  it("should not fetch when disabled", async () => {
    vi.mocked(studentsApi.getStudentProgress).mockResolvedValue(mockProgress)

    const { result } = renderHook(
      () => useStudentProgress({ enabled: false }),
      { wrapper },
    )

    // Wait a bit to ensure no fetch happens
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(studentsApi.getStudentProgress).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.progress).toBeNull()
  })

  it("should return refetch function", async () => {
    vi.mocked(studentsApi.getStudentProgress).mockResolvedValue(mockProgress)

    const { result } = renderHook(() => useStudentProgress(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(typeof result.current.refetch).toBe("function")

    // Refetch and verify it's called again
    await result.current.refetch()
    expect(studentsApi.getStudentProgress).toHaveBeenCalledTimes(2)
  })
})
