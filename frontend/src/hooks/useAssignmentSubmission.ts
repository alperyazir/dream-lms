/**
 * Custom hook for assignment submission
 * Story 4.7: Assignment Submission & Result Storage
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { submitAssignment } from "@/services/assignmentsApi"
import type { AssignmentSubmitRequest } from "@/types/assignment"
import useCustomToast from "./useCustomToast"

export interface UseAssignmentSubmissionOptions {
  assignmentId: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useAssignmentSubmission({
  assignmentId,
  onSuccess,
  onError,
}: UseAssignmentSubmissionOptions) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const submitMutation = useMutation({
    mutationFn: (data: AssignmentSubmitRequest) =>
      submitAssignment(assignmentId, data),
    onSuccess: (response) => {
      // Invalidate queries to refresh assignment lists
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["assignment", assignmentId] })
      queryClient.invalidateQueries({ queryKey: ["student", "assignments"] })

      // Show success toast (skip score for manually graded activities where score=0)
      showSuccessToast(
        response.score > 0
          ? `Your score: ${response.score}%`
          : "Assignment submitted successfully!",
      )

      // Call optional success callback
      onSuccess?.()

      // Navigate to success screen with search params
      navigate({
        to: "/student/assignments/$assignmentId/success",
        params: { assignmentId },
        search: {
          score: response.score,
          completedAt: response.completed_at,
        },
      })
    },
    onError: (error) => {
      console.error("Submission error:", error)

      // Show error toast
      showErrorToast("Failed to submit assignment. Please try again.")

      // Call optional error callback
      onError?.(error as Error)
    },
  })

  return {
    submit: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
    error: submitMutation.error,
    reset: submitMutation.reset,
  }
}
