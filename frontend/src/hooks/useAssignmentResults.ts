/**
 * Custom hooks for fetching assignment results data
 * Story 5.3: Assignment-Specific Analytics & Common Mistakes
 */

import { useQuery } from "@tanstack/react-query"
import {
  getAssignmentDetailedResults,
  getStudentAnswers,
} from "@/services/assignmentsApi"

export interface UseAssignmentResultsOptions {
  assignmentId: string
}

/**
 * Hook for fetching detailed assignment results
 *
 * @param options - Contains assignmentId
 * @returns { results, isLoading, error, refetch }
 */
export function useAssignmentResults({
  assignmentId,
}: UseAssignmentResultsOptions) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["assignment-results", assignmentId],
    queryFn: () => getAssignmentDetailedResults(assignmentId),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !!assignmentId, // Only fetch if assignmentId is provided
  })

  return {
    results: data ?? null,
    isLoading,
    error,
    refetch,
  }
}

export interface UseStudentAnswersOptions {
  assignmentId: string
  studentId: string
}

/**
 * Hook for fetching individual student's answers for an assignment
 *
 * @param options - Contains assignmentId and studentId
 * @returns { answers, isLoading, error, refetch }
 */
export function useStudentAnswers({
  assignmentId,
  studentId,
}: UseStudentAnswersOptions) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["student-answers", assignmentId, studentId],
    queryFn: () => getStudentAnswers(assignmentId, studentId),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !!assignmentId && !!studentId, // Only fetch if both IDs are provided
  })

  return {
    answers: data ?? null,
    isLoading,
    error,
    refetch,
  }
}
