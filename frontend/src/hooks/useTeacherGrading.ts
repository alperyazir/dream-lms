/**
 * Custom hook for teacher grading of writing/speaking submissions
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { gradeActivity, getPendingReviews } from "@/services/assignmentsApi"
import type { TeacherGradeRequest } from "@/types/analytics"

interface UseTeacherGradingOptions {
  assignmentId: string
  studentId: string
}

/**
 * Mutation hook for grading a student submission.
 * Invalidates assignment-results, student-answers, and pending-reviews on success.
 */
export function useTeacherGrading({
  assignmentId,
  studentId,
}: UseTeacherGradingOptions) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: TeacherGradeRequest) =>
      gradeActivity(assignmentId, studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["assignment-results", assignmentId],
      })
      queryClient.invalidateQueries({
        queryKey: ["student-answers", assignmentId, studentId],
      })
      queryClient.invalidateQueries({
        queryKey: ["pending-reviews"],
      })
    },
  })

  return {
    gradeSubmission: mutation.mutateAsync,
    isGrading: mutation.isPending,
    gradeError: mutation.error,
  }
}

/**
 * Query hook for fetching pending reviews list.
 */
export function usePendingReviews() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["pending-reviews"],
    queryFn: () => getPendingReviews(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  return {
    pendingReviews: data ?? null,
    isLoading,
    error,
    refetch,
  }
}
