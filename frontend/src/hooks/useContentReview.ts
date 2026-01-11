/**
 * Content Review Hook (Story 27.19)
 *
 * Manages state for content review operations including:
 * - Editing questions/items
 * - Deleting questions/items
 * - Regenerating single questions or all content
 * - Tracking dirty state (unsaved changes)
 */

import { useMutation } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import { toast } from "sonner"

import {
  type AIQuizQuestion,
  contentReviewApi,
  type RegenerateQuestionRequest,
} from "@/services/contentReviewApi"

export interface GeneratedActivity {
  id: string
  activity_type: string
  questions?: any[]
  pairs?: any[]
  sentences?: any[]
  words?: any[]
  [key: string]: any
}

interface ContentReviewState {
  original: GeneratedActivity
  edited: GeneratedActivity
  isDirty: boolean
  isSaving: boolean
  isRegenerating: boolean
  regeneratingIndex: number | null
}

export function useContentReview(initialContent: GeneratedActivity) {
  const [state, setState] = useState<ContentReviewState>({
    original: initialContent,
    edited: JSON.parse(JSON.stringify(initialContent)), // Deep copy
    isDirty: false,
    isSaving: false,
    isRegenerating: false,
    regeneratingIndex: null,
  })

  // Update a question by index
  const updateQuestion = useCallback((index: number, updates: Partial<any>) => {
    setState((prev) => {
      if (!prev.edited.questions) return prev

      const newQuestions = [...prev.edited.questions]
      newQuestions[index] = { ...newQuestions[index], ...updates }

      return {
        ...prev,
        edited: { ...prev.edited, questions: newQuestions },
        isDirty: true,
      }
    })
  }, [])

  // Delete a question by index
  const deleteQuestion = useCallback((index: number) => {
    setState((prev) => {
      if (!prev.edited.questions) return prev

      const newQuestions = prev.edited.questions.filter((_, i) => i !== index)

      return {
        ...prev,
        edited: { ...prev.edited, questions: newQuestions },
        isDirty: true,
      }
    })
  }, [])

  // Regenerate single question mutation
  const regenerateQuestionMutation = useMutation({
    mutationFn: (request: RegenerateQuestionRequest) =>
      contentReviewApi.regenerateQuestion(request),
    onSuccess: (newQuestion: AIQuizQuestion, variables) => {
      updateQuestion(variables.question_index, newQuestion)
      toast.success("Question regenerated successfully")
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail || "Failed to regenerate question",
      )
    },
    onSettled: () => {
      setState((prev) => ({
        ...prev,
        isRegenerating: false,
        regeneratingIndex: null,
      }))
    },
  })

  // Regenerate a single question
  const regenerateQuestion = useCallback(
    async (index: number) => {
      setState((prev) => ({
        ...prev,
        isRegenerating: true,
        regeneratingIndex: index,
      }))

      const context = {
        difficulty: state.edited.difficulty,
        language: state.edited.language,
      }

      regenerateQuestionMutation.mutate({
        quiz_id: state.edited.id,
        question_index: index,
        context,
      })
    },
    [state.edited, regenerateQuestionMutation],
  )

  // Regenerate all content
  const regenerateAll = useCallback(async () => {
    setState((prev) => ({ ...prev, isRegenerating: true }))

    try {
      // TODO: Implement regenerate all API call
      // For now, just show a toast
      toast.info("Regenerate all functionality will be implemented")

      setState((prev) => ({ ...prev, isRegenerating: false }))
    } catch (_error) {
      toast.error("Failed to regenerate content")
      setState((prev) => ({ ...prev, isRegenerating: false }))
    }
  }, [])

  // Reset to original content
  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      edited: JSON.parse(JSON.stringify(prev.original)),
      isDirty: false,
    }))
  }, [])

  // Mark as saved (clears dirty state)
  const markAsSaved = useCallback(() => {
    setState((prev) => ({
      ...prev,
      original: JSON.parse(JSON.stringify(prev.edited)),
      isDirty: false,
    }))
  }, [])

  return {
    content: state.edited,
    originalContent: state.original,
    isDirty: state.isDirty,
    isSaving: state.isSaving,
    isRegenerating: state.isRegenerating,
    regeneratingIndex: state.regeneratingIndex,
    updateQuestion,
    deleteQuestion,
    regenerateQuestion,
    regenerateAll,
    reset,
    markAsSaved,
  }
}
