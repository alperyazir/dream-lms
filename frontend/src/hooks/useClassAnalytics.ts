/**
 * Custom hook for fetching class analytics data
 * Story 5.2: Class-Wide Performance Analytics
 */

import { useQuery } from "@tanstack/react-query"
import { getClassAnalytics } from "@/services/classesApi"
import type { ClassPeriodType } from "@/types/analytics"

export interface UseClassAnalyticsOptions {
  classId: string
  period?: ClassPeriodType
}

export function useClassAnalytics({
  classId,
  period = "monthly",
}: UseClassAnalyticsOptions) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["class-analytics", classId, period],
    queryFn: () => getClassAnalytics(classId, period),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !!classId, // Only fetch if classId is provided
  })

  return {
    analytics: data ?? null,
    isLoading,
    error,
    refetch,
  }
}
