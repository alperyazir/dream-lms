/**
 * ReadingComprehensionContainer - Full reading comprehension experience
 * Story 27.10: Reading Comprehension Generation
 *
 * Manages the complete activity lifecycle:
 * - Generation form for teachers
 * - Activity player with passage and questions
 * - Results display after submission
 */

import { useCallback, useState } from "react"
import { ReadingComprehensionPlayer } from "@/components/ActivityPlayers/ReadingComprehensionPlayer"
import { ReadingComprehensionResults } from "@/components/ActivityPlayers/ReadingComprehensionResults"
import { readingComprehensionApi } from "@/services/readingComprehensionApi"
import type {
  ReadingComprehensionActivity,
  ReadingComprehensionActivityPublic,
  ReadingComprehensionAnswer,
  ReadingComprehensionContainerState,
  ReadingComprehensionRequest,
  ReadingComprehensionResult,
} from "@/types/reading-comprehension"
import { ReadingComprehensionForm } from "./ReadingComprehensionForm"

interface ReadingComprehensionContainerProps {
  /** Initial activity ID to load (for students accessing shared activity) */
  initialActivityId?: string
  /** Whether to show the generation form (for teachers) */
  showForm?: boolean
  /** Callback when activity is completed */
  onComplete?: (result: ReadingComprehensionResult) => void
}

export function ReadingComprehensionContainer({
  initialActivityId,
  showForm = true,
  onComplete,
}: ReadingComprehensionContainerProps) {
  const [phase, setPhase] = useState<ReadingComprehensionContainerState>(
    initialActivityId ? "playing" : "form",
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Activity data
  const [_generatedActivity, setGeneratedActivity] =
    useState<ReadingComprehensionActivity | null>(null)
  const [publicActivity, setPublicActivity] =
    useState<ReadingComprehensionActivityPublic | null>(null)
  const [result, setResult] = useState<ReadingComprehensionResult | null>(null)

  // Generate a new activity
  const handleGenerate = useCallback(
    async (request: ReadingComprehensionRequest) => {
      try {
        setIsLoading(true)
        setPhase("generating")
        setError(null)
        const activity =
          await readingComprehensionApi.generateReadingActivity(request)
        setGeneratedActivity(activity)
        // Also create public version for the player
        setPublicActivity({
          activity_id: activity.activity_id,
          book_id: activity.book_id,
          module_id: activity.module_id,
          module_title: activity.module_title,
          passage: activity.passage,
          passage_pages: activity.passage_pages,
          difficulty: activity.difficulty,
          language: activity.language,
          created_at: activity.created_at,
          question_count: activity.questions.length,
          questions: activity.questions.map((q) => ({
            question_id: q.question_id,
            question_type: q.question_type,
            question_text: q.question_text,
            options: q.options,
          })),
        })
        setPhase("playing")
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to generate activity. Please try again."
        setError(message)
        setPhase("form")
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  // Load existing activity by ID
  const loadActivity = useCallback(async (activityId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const activity =
        await readingComprehensionApi.getReadingActivity(activityId)
      setPublicActivity(activity)
      setPhase("playing")
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to load activity. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Submit activity answers
  const handleSubmit = useCallback(
    async (answers: ReadingComprehensionAnswer[]) => {
      if (!publicActivity) return

      try {
        setIsLoading(true)
        setError(null)
        const activityResult =
          await readingComprehensionApi.submitReadingActivity(
            publicActivity.activity_id,
            answers,
          )
        setResult(activityResult)
        setPhase("results")
        onComplete?.(activityResult)
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to submit activity. Please try again."
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [publicActivity, onComplete],
  )

  // Retry the activity
  const handleRetry = useCallback(() => {
    setResult(null)
    setPhase("playing")
  }, [])

  // Go back to form
  const handleBackToForm = useCallback(() => {
    setGeneratedActivity(null)
    setPublicActivity(null)
    setResult(null)
    setError(null)
    setPhase("form")
  }, [])

  // Load initial activity if provided
  if (initialActivityId && !publicActivity && !isLoading && !error) {
    loadActivity(initialActivityId)
  }

  // Render based on current phase
  if (phase === "form" && showForm) {
    return (
      <ReadingComprehensionForm
        onGenerate={handleGenerate}
        isGenerating={isLoading}
        error={error}
      />
    )
  }

  if (phase === "generating") {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
              Generating Reading Activity...
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Creating comprehension questions from the passage
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "playing" && publicActivity) {
    return (
      <ReadingComprehensionPlayer
        activity={publicActivity}
        onSubmit={handleSubmit}
        isSubmitting={isLoading}
      />
    )
  }

  if (phase === "results" && result) {
    return (
      <ReadingComprehensionResults
        result={result}
        onRetry={handleRetry}
        onBack={showForm ? handleBackToForm : undefined}
      />
    )
  }

  // Loading or error state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <div className="rounded-lg bg-red-50 p-6 text-center dark:bg-red-950/50">
          <h2 className="mb-2 text-xl font-semibold text-red-800 dark:text-red-200">
            Error
          </h2>
          <p className="mb-4 text-sm text-red-700 dark:text-red-300">{error}</p>
          {showForm && (
            <button
              onClick={handleBackToForm}
              className="inline-flex items-center justify-center rounded-md border border-red-300 px-6 py-2 font-medium text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}

export default ReadingComprehensionContainer
