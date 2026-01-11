/**
 * WordBuilderContainer - Full word builder experience
 * Story 27.14: Word Builder (Spelling Activity)
 *
 * Manages the complete word builder activity lifecycle:
 * - Generation form for teachers
 * - Activity player for spelling words
 * - Results display after submission
 */

import { useCallback, useState } from "react"
import { WordBuilderPlayer } from "@/components/ActivityPlayers/WordBuilderPlayer"
import { WordBuilderResults } from "@/components/ActivityPlayers/WordBuilderResults"
import { wordBuilderApi } from "@/services/wordBuilderApi"
import type {
  WordBuilderActivity,
  WordBuilderActivityPublic,
  WordBuilderRequest,
  WordBuilderResult,
  WordBuilderSubmission,
} from "@/types/word-builder"
import { HINT_TYPE_LABELS } from "@/types/word-builder"
import { WordBuilderForm } from "./WordBuilderForm"

type ActivityPhase = "form" | "preview" | "playing" | "results"

interface WordBuilderContainerProps {
  /** Initial activity ID to load (for students accessing shared activity) */
  initialActivityId?: string
  /** Whether to show the generation form (for teachers) */
  showForm?: boolean
  /** Callback when activity is completed */
  onComplete?: (result: WordBuilderResult) => void
}

export function WordBuilderContainer({
  initialActivityId,
  showForm = true,
  onComplete,
}: WordBuilderContainerProps) {
  const [phase, setPhase] = useState<ActivityPhase>(
    initialActivityId ? "playing" : "form",
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Activity data
  const [generatedActivity, setGeneratedActivity] =
    useState<WordBuilderActivity | null>(null)
  const [publicActivity, setPublicActivity] =
    useState<WordBuilderActivityPublic | null>(null)
  const [result, setResult] = useState<WordBuilderResult | null>(null)

  // Generate a new activity
  const handleGenerate = useCallback(async (request: WordBuilderRequest) => {
    try {
      setIsLoading(true)
      setError(null)
      const activity = await wordBuilderApi.generateActivity(request)
      setGeneratedActivity(activity)
      // Also create public version for the player (without correct words)
      setPublicActivity({
        activity_id: activity.activity_id,
        book_id: activity.book_id,
        module_ids: activity.module_ids,
        words: activity.words.map((w) => ({
          item_id: w.item_id,
          letters: w.letters,
          letter_count: w.correct_word.length,
          definition: w.definition,
          audio_url: w.audio_url,
          vocabulary_id: w.vocabulary_id,
          cefr_level: w.cefr_level,
        })),
        hint_type: activity.hint_type,
        created_at: activity.created_at,
        word_count: activity.words.length,
      })
      setPhase("preview")
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to generate activity. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load existing activity by ID
  const loadActivity = useCallback(async (activityId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const activity = await wordBuilderApi.getActivity(activityId)
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

  // Start the activity (from preview)
  const handleStartActivity = useCallback(() => {
    setPhase("playing")
  }, [])

  // Submit word spellings
  const handleSubmit = useCallback(
    async (submission: WordBuilderSubmission) => {
      if (!publicActivity) return

      try {
        setIsLoading(true)
        setError(null)
        const activityResult = await wordBuilderApi.submitWords(
          publicActivity.activity_id,
          submission,
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
      <WordBuilderForm
        onGenerate={handleGenerate}
        isGenerating={isLoading}
        error={error}
      />
    )
  }

  if (phase === "preview" && generatedActivity && publicActivity) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <div className="rounded-lg bg-amber-50 p-6 text-center dark:bg-amber-950/50">
          <h2 className="mb-2 text-xl font-semibold text-amber-800 dark:text-amber-200">
            Word Builder Generated!
          </h2>
          <p className="mb-4 text-sm text-amber-700 dark:text-amber-300">
            Your activity has {generatedActivity.words.length} words ready for
            spelling practice.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleStartActivity}
              className="inline-flex items-center justify-center rounded-md bg-amber-600 px-6 py-2 font-medium text-white hover:bg-amber-700"
            >
              Start Activity
            </button>
            <button
              onClick={handleBackToForm}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Generate Another
            </button>
          </div>
        </div>

        {/* Activity info */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-medium">Activity Details</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              Hint Type:{" "}
              {HINT_TYPE_LABELS[
                generatedActivity.hint_type as keyof typeof HINT_TYPE_LABELS
              ] || generatedActivity.hint_type}
            </li>
            <li>Words: {generatedActivity.words.length}</li>
            <li>Book ID: {generatedActivity.book_id}</li>
            <li>Activity ID: {generatedActivity.activity_id}</li>
          </ul>
        </div>

        {/* Preview words */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 font-medium">Word Preview</h3>
          <div className="space-y-2">
            {generatedActivity.words.slice(0, 3).map((word, index) => (
              <div
                key={word.item_id}
                className="rounded bg-muted/50 p-2 text-sm"
              >
                <span className="font-medium text-muted-foreground">
                  #{index + 1}:
                </span>{" "}
                <span className="font-mono uppercase tracking-wider">
                  {word.correct_word}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  — {word.definition}
                </span>
              </div>
            ))}
            {generatedActivity.words.length > 3 && (
              <p className="text-xs text-muted-foreground">
                ...and {generatedActivity.words.length - 3} more words
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (phase === "playing" && publicActivity) {
    return (
      <WordBuilderPlayer
        activity={publicActivity}
        onSubmit={handleSubmit}
        isSubmitting={isLoading}
      />
    )
  }

  if (phase === "results" && result) {
    return (
      <WordBuilderResults
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
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

export default WordBuilderContainer
