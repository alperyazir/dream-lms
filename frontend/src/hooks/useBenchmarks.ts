/**
 * Custom hooks for fetching benchmark data
 * Story 5.7: Performance Comparison & Benchmarking
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getClassBenchmarks,
  getAdminBenchmarkOverview,
  updateSchoolBenchmarkSettings,
  updatePublisherBenchmarkSettings,
  isBenchmarkDisabledError,
  type BenchmarkDisabledError,
} from "@/services/benchmarksApi"
import type {
  BenchmarkPeriod,
  BenchmarkSettingsUpdate,
  ClassBenchmarkResponse,
  AdminBenchmarkOverview,
} from "@/types/benchmarks"

// Query keys for cache management
export const benchmarkKeys = {
  all: ["benchmarks"] as const,
  class: (classId: string, period: BenchmarkPeriod) =>
    ["benchmarks", "class", classId, period] as const,
  admin: () => ["benchmarks", "admin", "overview"] as const,
}

export interface UseClassBenchmarksOptions {
  classId: string
  period?: BenchmarkPeriod
  enabled?: boolean
}

export interface UseClassBenchmarksResult {
  benchmarks: ClassBenchmarkResponse | null
  isLoading: boolean
  error: Error | null
  isDisabled: boolean
  disabledMessage: string | null
  refetch: () => void
}

/**
 * Hook to fetch benchmark data for a specific class
 *
 * Handles the special case when benchmarking is disabled (403 response)
 * by returning isDisabled=true instead of throwing an error.
 */
export function useClassBenchmarks({
  classId,
  period = "monthly",
  enabled = true,
}: UseClassBenchmarksOptions): UseClassBenchmarksResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: benchmarkKeys.class(classId, period),
    queryFn: () => getClassBenchmarks(classId, period),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !!classId && enabled,
    retry: (failureCount, error) => {
      // Don't retry on 403 (disabled) or 404 (not found)
      if (isBenchmarkDisabledError(error)) {
        return false
      }
      return failureCount < 3
    },
  })

  // Check if error is a disabled benchmark error
  const isDisabled = error ? isBenchmarkDisabledError(error) : false
  const disabledMessage = isDisabled
    ? (error as unknown as BenchmarkDisabledError).message
    : null

  return {
    benchmarks: data ?? null,
    isLoading,
    error: isDisabled ? null : (error as Error | null),
    isDisabled,
    disabledMessage,
    refetch,
  }
}

export interface UseAdminBenchmarksResult {
  overview: AdminBenchmarkOverview | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch admin benchmark overview (admin only)
 */
export function useAdminBenchmarks(): UseAdminBenchmarksResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: benchmarkKeys.admin(),
    queryFn: () => getAdminBenchmarkOverview(),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })

  return {
    overview: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}

/**
 * Hook to update school benchmark settings (admin only)
 */
export function useUpdateSchoolBenchmarkSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      schoolId,
      settings,
    }: {
      schoolId: string
      settings: BenchmarkSettingsUpdate
    }) => updateSchoolBenchmarkSettings(schoolId, settings),
    onSuccess: () => {
      // Invalidate admin overview to reflect changes
      queryClient.invalidateQueries({ queryKey: benchmarkKeys.admin() })
    },
  })
}

/**
 * Hook to update publisher benchmark settings (admin only)
 */
export function useUpdatePublisherBenchmarkSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      publisherId,
      settings,
    }: {
      publisherId: string
      settings: BenchmarkSettingsUpdate
    }) => updatePublisherBenchmarkSettings(publisherId, settings),
    onSuccess: () => {
      // Invalidate admin overview to reflect changes
      queryClient.invalidateQueries({ queryKey: benchmarkKeys.admin() })
    },
  })
}
