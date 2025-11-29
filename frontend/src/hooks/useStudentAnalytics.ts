/**
 * Custom hook for fetching student analytics data
 * Story 5.1: Individual Student Performance Dashboard
 */

import { useQuery } from "@tanstack/react-query"
import { getStudentAnalytics } from "@/services/studentsApi"
import type { PeriodType } from "@/types/analytics"

export interface UseStudentAnalyticsOptions {
  studentId: string
  period?: PeriodType
}

export function useStudentAnalytics({
  studentId,
  period = "30d",
}: UseStudentAnalyticsOptions) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["student-analytics", studentId, period],
    queryFn: () => getStudentAnalytics(studentId, period),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !!studentId, // Only fetch if studentId is provided
  })

  return {
    analytics: data ?? null,
    isLoading,
    error,
    refetch,
  }
}
