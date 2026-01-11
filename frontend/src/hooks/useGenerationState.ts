/**
 * useGenerationState - Manage generation workflow state
 * Story 27.17: Question Generator UI - Task 8
 *
 * Manages form state, generation loading, results, and errors
 * for the unified AI content generator.
 */

import { useCallback, useEffect, useState } from "react"
import type { AIQuiz } from "@/types/ai-quiz"
import type { ReadingComprehensionActivity } from "@/types/reading-comprehension"
import type { SentenceBuilderActivity } from "@/types/sentence-builder"
import type { VocabularyQuiz } from "@/types/vocabulary-quiz"
import type { WordBuilderActivity } from "@/types/word-builder"

export type ActivityType =
  | "vocabulary_quiz"
  | "ai_quiz"
  | "reading_comprehension"
  | "sentence_builder"
  | "word_builder"

export type GeneratedActivity =
  | AIQuiz
  | VocabularyQuiz
  | ReadingComprehensionActivity
  | SentenceBuilderActivity
  | WordBuilderActivity

export interface GeneratorFormState {
  // Source (books only)
  bookId: number | null
  moduleIds: number[]

  // Activity
  activityType: ActivityType | null

  // Options (dynamic based on activity type)
  options: Record<string, any>
}

export interface GenerationState {
  isLoading: boolean
  error: string | null
  result: GeneratedActivity | null
}

const DEFAULT_FORM_STATE: GeneratorFormState = {
  bookId: null,
  moduleIds: [],
  activityType: null,
  options: {},
}

const DEFAULT_GENERATION_STATE: GenerationState = {
  isLoading: false,
  error: null,
  result: null,
}

const STORAGE_KEY = "dreamai-generator-form-state"

/**
 * Hook to manage AI content generator state
 */
export function useGenerationState() {
  // Form state
  const [formState, setFormState] = useState<GeneratorFormState>(() => {
    // Try to restore from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Validate parsed data has expected structure
        if (parsed && typeof parsed === "object" && "activityType" in parsed) {
          return { ...DEFAULT_FORM_STATE, ...parsed }
        }
      }
    } catch (error) {
      console.error("Failed to restore generator state:", error)
    }
    return DEFAULT_FORM_STATE
  })

  // Generation state
  const [generationState, setGenerationState] = useState<GenerationState>(
    DEFAULT_GENERATION_STATE,
  )

  // Persist form state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formState))
    } catch (error) {
      console.error("Failed to save generator state:", error)
    }
  }, [formState])

  // Update book selection
  const setBookId = useCallback((bookId: number | null) => {
    setFormState((prev) => ({
      ...prev,
      bookId,
      // Reset modules when book changes
      moduleIds: [],
    }))
  }, [])

  // Update module selection
  const setModuleIds = useCallback((moduleIds: number[]) => {
    setFormState((prev) => ({ ...prev, moduleIds }))
  }, [])

  // Update activity type
  const setActivityType = useCallback((activityType: ActivityType | null) => {
    setFormState((prev) => ({
      ...prev,
      activityType,
      // Reset options when activity type changes
      options: {},
    }))
  }, [])

  // Update options
  const setOptions = useCallback((options: Record<string, any>) => {
    setFormState((prev) => ({ ...prev, options }))
  }, [])

  // Update a single option
  const setOption = useCallback((key: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        [key]: value,
      },
    }))
  }, [])

  // Start generation
  const startGeneration = useCallback(() => {
    setGenerationState({
      isLoading: true,
      error: null,
      result: null,
    })
  }, [])

  // Set generation result
  const setGenerationResult = useCallback((result: GeneratedActivity) => {
    setGenerationState({
      isLoading: false,
      error: null,
      result,
    })
  }, [])

  // Set generation error
  const setGenerationError = useCallback((error: string) => {
    setGenerationState((prev) => ({
      ...prev,
      isLoading: false,
      error,
    }))
  }, [])

  // Clear generation state
  const clearGeneration = useCallback(() => {
    setGenerationState(DEFAULT_GENERATION_STATE)
  }, [])

  // Reset form to defaults
  const resetForm = useCallback(() => {
    setFormState(DEFAULT_FORM_STATE)
    setGenerationState(DEFAULT_GENERATION_STATE)
  }, [])

  // Validate form is ready to generate
  const isFormValid = useCallback(() => {
    const { bookId, moduleIds, activityType } = formState

    // Must have activity type
    if (!activityType) return false

    // Must have book and at least one module
    return bookId !== null && moduleIds.length > 0
  }, [formState])

  return {
    // Form state
    formState,
    setBookId,
    setModuleIds,
    setActivityType,
    setOptions,
    setOption,

    // Generation state
    generationState,
    startGeneration,
    setGenerationResult,
    setGenerationError,
    clearGeneration,

    // Utilities
    isFormValid: isFormValid(),
    resetForm,
  }
}
