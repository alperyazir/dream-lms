/**
 * Custom hook for fetching student progress data
 * Story 5.5: Student Progress Tracking & Personal Analytics
 */

import { useQuery } from "@tanstack/react-query"
import { getStudentProgress } from "@/services/studentsApi"
import type { StudentProgressPeriod } from "@/types/analytics"

export interface UseStudentProgressOptions {
  period?: StudentProgressPeriod
  enabled?: boolean
}

export function useStudentProgress({
  period = "this_month",
  enabled = true,
}: UseStudentProgressOptions = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["student-progress", period],
    queryFn: () => getStudentProgress(period),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    enabled,
  })

  return {
    progress: data ?? null,
    isLoading,
    error,
    refetch,
  }
}
