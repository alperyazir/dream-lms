/**
 * Custom hooks for teacher feedback on student assignments
 * Story 6.4: Teacher Feedback on Assignments
 *
 * Uses TanStack Query for data fetching and mutations.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createOrUpdateFeedback,
  getFeedback,
  updateFeedback,
} from "@/services/feedbackApi"
import type {
  FeedbackCreate,
  FeedbackPublic,
  FeedbackUpdate,
} from "@/types/feedback"

/**
 * Query key factory for feedback
 */
export const feedbackQueryKey = (assignmentId: string, studentId: string) =>
  ["feedback", assignmentId, studentId] as const

/**
 * Hook for fetching feedback for a student's assignment
 *
 * @param assignmentId - UUID of the assignment
 * @param studentId - UUID of the student (students.id)
 * @param options - Optional query options
 */
export function useFeedbackQuery(
  assignmentId: string | null,
  studentId: string | null,
  options: {
    enabled?: boolean
  } = {},
) {
  const { enabled = true } = options

  const query = useQuery({
    queryKey:
      assignmentId && studentId
        ? feedbackQueryKey(assignmentId, studentId)
        : ["feedback", "none"],
    queryFn: () => getFeedback(assignmentId!, studentId!),
    enabled: enabled && !!assignmentId && !!studentId,
    staleTime: 60000, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on 404 (no feedback exists yet)
      if ((error as { status?: number }).status === 404) return false
      return failureCount < 3
    },
  })

  return {
    feedback: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    isNotFound: (query.error as { status?: number })?.status === 404,
  }
}

/**
 * Hook for creating or updating feedback
 */
export function useCreateOrUpdateFeedback() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      assignmentId,
      studentId,
      data,
    }: {
      assignmentId: string
      studentId: string
      data: FeedbackCreate
    }) => createOrUpdateFeedback(assignmentId, studentId, data),
    onSuccess: (newFeedback, { assignmentId, studentId }) => {
      // Update the feedback cache
      queryClient.setQueryData(
        feedbackQueryKey(assignmentId, studentId),
        newFeedback,
      )
      // Invalidate assignment results to update has_feedback flag
      queryClient.invalidateQueries({
        queryKey: ["assignment-results", assignmentId],
      })
    },
  })

  return {
    createOrUpdate: mutation.mutate,
    createOrUpdateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
    data: mutation.data,
  }
}

/**
 * Hook for updating existing feedback by ID
 */
export function useUpdateFeedback() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      feedbackId,
      data,
    }: {
      feedbackId: string
      data: FeedbackUpdate
      assignmentId: string
      studentId: string
    }) => updateFeedback(feedbackId, data),
    onSuccess: (updatedFeedback, { assignmentId, studentId }) => {
      // Update the feedback cache
      queryClient.setQueryData(
        feedbackQueryKey(assignmentId, studentId),
        updatedFeedback,
      )
    },
  })

  return {
    update: mutation.mutate,
    updateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
    data: mutation.data,
  }
}

/**
 * Options for saving feedback (Story 6.5)
 */
interface SaveFeedbackOptions {
  badges?: string[]
  emoji_reaction?: string | null
}

/**
 * Combined hook for feedback modal functionality
 * Provides all feedback operations in one hook
 */
export function useFeedbackModal(
  assignmentId: string | null,
  studentId: string | null,
) {
  const feedback = useFeedbackQuery(assignmentId, studentId)
  const createOrUpdate = useCreateOrUpdateFeedback()
  const update = useUpdateFeedback()

  const handleSaveFeedback = async (
    feedbackText: string,
    isDraft: boolean = false,
    options?: SaveFeedbackOptions,
  ) => {
    if (!assignmentId || !studentId) return null

    const existingFeedback = feedback.feedback as FeedbackPublic | null

    if (existingFeedback?.id) {
      // Update existing feedback
      const result = await update.updateAsync({
        feedbackId: existingFeedback.id,
        data: {
          feedback_text: feedbackText,
          is_draft: isDraft,
          badges: options?.badges,
          emoji_reaction: options?.emoji_reaction,
        },
        assignmentId,
        studentId,
      })
      return result
    }
    // Create new feedback
    const result = await createOrUpdate.createOrUpdateAsync({
      assignmentId,
      studentId,
      data: {
        feedback_text: feedbackText,
        is_draft: isDraft,
        badges: options?.badges,
        emoji_reaction: options?.emoji_reaction,
      },
    })
    return result
  }

  const handleSaveDraft = async (
    feedbackText: string,
    options?: SaveFeedbackOptions,
  ) => {
    return handleSaveFeedback(feedbackText, true, options)
  }

  const handlePublish = async (
    feedbackText: string,
    options?: SaveFeedbackOptions,
  ) => {
    return handleSaveFeedback(feedbackText, false, options)
  }

  return {
    // Feedback data
    feedback: feedback.feedback,
    isLoading: feedback.isLoading,
    isNotFound: feedback.isNotFound,
    fetchError: feedback.error,

    // Actions
    saveDraft: handleSaveDraft,
    publish: handlePublish,
    saveFeedback: handleSaveFeedback,

    // Mutation states
    isSaving: createOrUpdate.isPending || update.isPending,
    saveError: createOrUpdate.error || update.error,
    reset: () => {
      createOrUpdate.reset()
      update.reset()
    },

    // Refetch
    refetch: feedback.refetch,
  }
}

/**
 * Hook for student to view their feedback (read-only)
 * @deprecated Use useMyFeedback instead for students - it doesn't require studentId
 */
export function useStudentFeedback(
  assignmentId: string | null,
  studentId: string | null,
) {
  const feedback = useFeedbackQuery(assignmentId, studentId)

  return {
    feedback: feedback.feedback,
    isLoading: feedback.isLoading,
    hasFeedback: !!feedback.feedback && !feedback.isNotFound,
    error: feedback.error,
    refetch: feedback.refetch,
  }
}

/**
 * Hook for the current student to view their own feedback
 * Uses the /my-feedback endpoint - no studentId needed
 *
 * @param assignmentId - UUID of the assignment
 */
export function useMyFeedback(assignmentId: string | null) {
  const query = useQuery({
    queryKey: ["my-feedback", assignmentId],
    queryFn: async () => {
      const { getMyFeedback } = await import("@/services/feedbackApi")
      return getMyFeedback(assignmentId!)
    },
    enabled: !!assignmentId,
    staleTime: 60000, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on 404
      if ((error as { status?: number }).status === 404) return false
      return failureCount < 3
    },
  })

  return {
    feedback: query.data ?? null,
    isLoading: query.isLoading,
    hasFeedback: !!query.data,
    error: query.error,
    refetch: query.refetch,
  }
}
