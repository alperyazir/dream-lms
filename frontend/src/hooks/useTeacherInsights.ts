/**
 * Custom hook for fetching and managing teacher insights
 * Story 5.4: Error Pattern Detection & Insights
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  dismissInsight,
  getInsightDetail,
  getMyInsights,
} from "@/services/teachersApi"
import type { TeacherInsightsResponse } from "@/types/analytics"

/**
 * Query key for teacher insights
 */
export const TEACHER_INSIGHTS_QUERY_KEY = ["teacher-insights"] as const

/**
 * Query key factory for insight details
 */
export const insightDetailQueryKey = (insightId: string) =>
  ["insight-detail", insightId] as const

/**
 * Hook for fetching all teacher insights
 */
export function useTeacherInsights(enabled: boolean = true) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: TEACHER_INSIGHTS_QUERY_KEY,
    queryFn: () => getMyInsights(false),
    staleTime: 5 * 60 * 1000, // 5 minutes (server caches for 24 hours)
    enabled,
  })

  const refreshInsights = async () => {
    const data = await getMyInsights(true) // Force refresh
    queryClient.setQueryData(TEACHER_INSIGHTS_QUERY_KEY, data)
    return data
  }

  return {
    insights: query.data?.insights ?? [],
    lastRefreshed: query.data?.last_refreshed ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    refreshInsights,
  }
}

/**
 * Hook for fetching a single insight's details
 */
export function useInsightDetail(insightId: string | null) {
  const query = useQuery({
    queryKey: insightDetailQueryKey(insightId ?? ""),
    queryFn: () => getInsightDetail(insightId!),
    staleTime: 5 * 60 * 1000,
    enabled: !!insightId,
  })

  return {
    detail: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook for dismissing an insight
 */
export function useDismissInsight() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (insightId: string) => dismissInsight(insightId),
    onSuccess: (_, dismissedInsightId) => {
      // Update the cached insights list to remove the dismissed insight
      queryClient.setQueryData<TeacherInsightsResponse>(
        TEACHER_INSIGHTS_QUERY_KEY,
        (old) => {
          if (!old) return old
          return {
            ...old,
            insights: old.insights.filter(
              (insight) => insight.id !== dismissedInsightId,
            ),
          }
        },
      )
      // Invalidate detail query for this insight
      queryClient.invalidateQueries({
        queryKey: insightDetailQueryKey(dismissedInsightId),
      })
    },
  })

  return {
    dismissInsight: mutation.mutate,
    dismissInsightAsync: mutation.mutateAsync,
    isDismissing: mutation.isPending,
    dismissError: mutation.error,
  }
}
