/**
 * Tests for useTeacherInsights hook
 * Story 5.4: Error Pattern Detection & Insights
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  InsightCard,
  InsightDetail,
  TeacherInsightsResponse,
} from "@/types/analytics"
import {
  useDismissInsight,
  useInsightDetail,
  useTeacherInsights,
} from "./useTeacherInsights"

// Mock the API functions
vi.mock("@/services/teachersApi", () => ({
  getMyInsights: vi.fn(),
  getInsightDetail: vi.fn(),
  dismissInsight: vi.fn(),
}))

import {
  dismissInsight,
  getInsightDetail,
  getMyInsights,
} from "@/services/teachersApi"

const mockInsight: InsightCard = {
  id: "insight-1",
  type: "common_misconception",
  severity: "critical",
  title: "Common Misconception Detected",
  description: "80% of students answered 'orange' instead of 'apple'",
  affected_count: 4,
  recommended_action: "Review this topic in class",
  created_at: "2025-11-28T12:00:00Z",
}

const mockInsightsResponse: TeacherInsightsResponse = {
  insights: [mockInsight],
  last_refreshed: "2025-11-28T12:00:00Z",
}

const mockInsightDetail: InsightDetail = {
  insight: mockInsight,
  affected_students: [
    { student_id: "student-1", name: "Alice", relevant_metric: "Score: 60%" },
    { student_id: "student-2", name: "Bob", relevant_metric: "Score: 55%" },
  ],
  related_assignments: [
    {
      assignment_id: "assign-1",
      name: "Quiz 1",
      avg_score: 58,
      completion_rate: 100,
    },
  ],
  related_questions: [
    {
      question_id: "q-1",
      question_text: "What fruit is red?",
      correct_answer: "apple",
      common_wrong_answer: "orange",
      wrong_count: 4,
    },
  ],
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("useTeacherInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch insights successfully", async () => {
    vi.mocked(getMyInsights).mockResolvedValueOnce(mockInsightsResponse)

    const { result } = renderHook(() => useTeacherInsights(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.insights).toHaveLength(1)
    expect(result.current.insights[0].id).toBe("insight-1")
    expect(result.current.lastRefreshed).toBe("2025-11-28T12:00:00Z")
  })

  it("should return empty array when no insights", async () => {
    vi.mocked(getMyInsights).mockResolvedValueOnce({
      insights: [],
      last_refreshed: "2025-11-28T12:00:00Z",
    })

    const { result } = renderHook(() => useTeacherInsights(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.insights).toHaveLength(0)
  })

  it("should handle errors gracefully", async () => {
    vi.mocked(getMyInsights).mockRejectedValueOnce(new Error("Network error"))

    const { result } = renderHook(() => useTeacherInsights(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })

    expect(result.current.insights).toHaveLength(0)
  })

  it("should not fetch when disabled", async () => {
    const { result } = renderHook(() => useTeacherInsights(false), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(getMyInsights).not.toHaveBeenCalled()
  })
})

describe("useInsightDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch insight details successfully", async () => {
    vi.mocked(getInsightDetail).mockResolvedValueOnce(mockInsightDetail)

    const { result } = renderHook(() => useInsightDetail("insight-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.detail).toBeDefined()
    expect(result.current.detail?.insight.id).toBe("insight-1")
    expect(result.current.detail?.affected_students).toHaveLength(2)
    expect(result.current.detail?.related_questions).toHaveLength(1)
  })

  it("should not fetch when insightId is null", async () => {
    const { result } = renderHook(() => useInsightDetail(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.detail).toBeNull()
    expect(getInsightDetail).not.toHaveBeenCalled()
  })

  it("should handle 404 errors", async () => {
    vi.mocked(getInsightDetail).mockRejectedValueOnce({
      response: { status: 404 },
    })

    const { result } = renderHook(() => useInsightDetail("nonexistent"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })

    expect(result.current.detail).toBeNull()
  })
})

describe("useDismissInsight", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should dismiss insight successfully", async () => {
    vi.mocked(dismissInsight).mockResolvedValueOnce(undefined)
    vi.mocked(getMyInsights).mockResolvedValueOnce(mockInsightsResponse)

    const wrapper = createWrapper()
    const { result: insightsResult } = renderHook(() => useTeacherInsights(), {
      wrapper,
    })

    // Wait for initial load
    await waitFor(() => {
      expect(insightsResult.current.isLoading).toBe(false)
    })

    // Now render the dismiss hook
    const { result: dismissResult } = renderHook(() => useDismissInsight(), {
      wrapper,
    })

    // Dismiss the insight
    dismissResult.current.dismissInsight("insight-1")

    await waitFor(() => {
      expect(dismissInsight).toHaveBeenCalledWith("insight-1")
    })
  })

  it("should update cache after dismissal", async () => {
    vi.mocked(dismissInsight).mockResolvedValueOnce(undefined)
    vi.mocked(getMyInsights).mockResolvedValueOnce({
      insights: [mockInsight, { ...mockInsight, id: "insight-2" }],
      last_refreshed: "2025-11-28T12:00:00Z",
    })

    const wrapper = createWrapper()
    const { result: insightsResult } = renderHook(() => useTeacherInsights(), {
      wrapper,
    })

    await waitFor(() => {
      expect(insightsResult.current.insights).toHaveLength(2)
    })

    const { result: dismissResult } = renderHook(() => useDismissInsight(), {
      wrapper,
    })

    dismissResult.current.dismissInsight("insight-1")

    await waitFor(() => {
      // After dismissal, cache should be updated to remove the dismissed insight
      expect(insightsResult.current.insights).toHaveLength(1)
      expect(insightsResult.current.insights[0].id).toBe("insight-2")
    })
  })

  it("should handle dismiss errors", async () => {
    vi.mocked(dismissInsight).mockRejectedValueOnce(new Error("Failed"))

    const { result } = renderHook(() => useDismissInsight(), {
      wrapper: createWrapper(),
    })

    result.current.dismissInsight("insight-1")

    await waitFor(() => {
      expect(result.current.dismissError).toBeDefined()
    })
  })
})
