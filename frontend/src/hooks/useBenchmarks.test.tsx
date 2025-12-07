/**
 * useBenchmarks Hook Tests
 * Story 5.7: Performance Comparison & Benchmarking
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as benchmarksApi from "@/services/benchmarksApi"
import type {
  AdminBenchmarkOverview,
  ClassBenchmarkResponse,
} from "@/types/benchmarks"
import {
  benchmarkKeys,
  useAdminBenchmarks,
  useClassBenchmarks,
} from "./useBenchmarks"

// Mock the API
vi.mock("@/services/benchmarksApi", () => ({
  getClassBenchmarks: vi.fn(),
  getAdminBenchmarkOverview: vi.fn(),
  updateSchoolBenchmarkSettings: vi.fn(),
  updatePublisherBenchmarkSettings: vi.fn(),
  isBenchmarkDisabledError: vi.fn(),
}))

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock data
const mockClassBenchmarks: ClassBenchmarkResponse = {
  class_metrics: {
    class_id: "class-1",
    class_name: "Math 101",
    average_score: 78.5,
    completion_rate: 85,
    total_assignments: 12,
    active_students: 25,
  },
  school_benchmark: {
    level: "school",
    average_score: 75.2,
    completion_rate: 80,
    sample_size: 8,
    period: "monthly",
    is_available: true,
  },
  publisher_benchmark: {
    level: "publisher",
    average_score: 72.8,
    completion_rate: 78,
    sample_size: 45,
    period: "monthly",
    is_available: true,
  },
  activity_benchmarks: [],
  comparison_over_time: [],
  message: null,
  benchmarking_enabled: true,
  disabled_reason: null,
}

const mockAdminOverview: AdminBenchmarkOverview = {
  total_schools: 10,
  schools_with_benchmarking: 8,
  schools_above_average: 4,
  schools_at_average: 3,
  schools_below_average: 1,
  system_average_score: 75.5,
  activity_type_stats: [],
  school_summaries: [],
  last_calculated: "2024-01-15T12:00:00Z",
}

describe("benchmarkKeys", () => {
  it("generates correct keys", () => {
    expect(benchmarkKeys.all).toEqual(["benchmarks"])
    expect(benchmarkKeys.class("class-1", "monthly")).toEqual([
      "benchmarks",
      "class",
      "class-1",
      "monthly",
    ])
    expect(benchmarkKeys.admin()).toEqual(["benchmarks", "admin", "overview"])
  })
})

describe("useClassBenchmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches class benchmarks successfully", async () => {
    vi.mocked(benchmarksApi.getClassBenchmarks).mockResolvedValue(
      mockClassBenchmarks,
    )

    const { result } = renderHook(
      () => useClassBenchmarks({ classId: "class-1", period: "monthly" }),
      { wrapper: createWrapper() },
    )

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    // Wait for data
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.benchmarks).toEqual(mockClassBenchmarks)
    expect(result.current.error).toBeNull()
    expect(result.current.isDisabled).toBe(false)
  })

  it("handles disabled benchmark error gracefully", async () => {
    const disabledError = {
      message: "Benchmarking is disabled for this school",
      isDisabled: true,
    }

    vi.mocked(benchmarksApi.getClassBenchmarks).mockRejectedValue(disabledError)
    vi.mocked(benchmarksApi.isBenchmarkDisabledError).mockReturnValue(true)

    const { result } = renderHook(
      () => useClassBenchmarks({ classId: "class-1" }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isDisabled).toBe(true)
    expect(result.current.disabledMessage).toBe(
      "Benchmarking is disabled for this school",
    )
    expect(result.current.error).toBeNull() // Error should be null for disabled
  })

  it("does not fetch when disabled", async () => {
    vi.mocked(benchmarksApi.getClassBenchmarks).mockResolvedValue(
      mockClassBenchmarks,
    )

    const { result } = renderHook(
      () => useClassBenchmarks({ classId: "class-1", enabled: false }),
      { wrapper: createWrapper() },
    )

    // Should not be loading since query is disabled
    expect(result.current.isLoading).toBe(false)
    expect(result.current.benchmarks).toBeNull()
    expect(benchmarksApi.getClassBenchmarks).not.toHaveBeenCalled()
  })

  it("uses default period of monthly", async () => {
    vi.mocked(benchmarksApi.getClassBenchmarks).mockResolvedValue(
      mockClassBenchmarks,
    )

    renderHook(() => useClassBenchmarks({ classId: "class-1" }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(benchmarksApi.getClassBenchmarks).toHaveBeenCalledWith(
        "class-1",
        "monthly",
      )
    })
  })
})

describe("useAdminBenchmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches admin overview successfully", async () => {
    vi.mocked(benchmarksApi.getAdminBenchmarkOverview).mockResolvedValue(
      mockAdminOverview,
    )

    const { result } = renderHook(() => useAdminBenchmarks(), {
      wrapper: createWrapper(),
    })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    // Wait for data
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.overview).toEqual(mockAdminOverview)
    expect(result.current.error).toBeNull()
  })

  it("handles error correctly", async () => {
    const error = new Error("Failed to fetch")
    vi.mocked(benchmarksApi.getAdminBenchmarkOverview).mockRejectedValue(error)

    const { result } = renderHook(() => useAdminBenchmarks(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toEqual(error)
    expect(result.current.overview).toBeNull()
  })
})
