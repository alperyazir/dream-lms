/**
 * SentenceBuilderContainer - Full sentence builder experience
 * Story 27.13: Sentence Builder Activity (Duolingo-Style)
 *
 * Manages the complete sentence builder activity lifecycle:
 * - Generation form for teachers
 * - Activity player for building sentences
 * - Results display after submission
 */

import { useCallback, useState } from "react"
import { SentenceBuilderPlayer } from "@/components/ActivityPlayers/SentenceBuilderPlayer"
import { SentenceBuilderResults } from "@/components/ActivityPlayers/SentenceBuilderResults"
import { sentenceBuilderApi } from "@/services/sentenceBuilderApi"
import type {
  SentenceBuilderActivity,
  SentenceBuilderActivityPublic,
  SentenceBuilderRequest,
  SentenceBuilderResult,
  SentenceBuilderSubmission,
} from "@/types/sentence-builder"
import { DIFFICULTY_LABELS } from "@/types/sentence-builder"
import { SentenceBuilderForm } from "./SentenceBuilderForm"

type ActivityPhase = "form" | "preview" | "playing" | "results"

interface SentenceBuilderContainerProps {
  /** Initial activity ID to load (for students accessing shared activity) */
  initialActivityId?: string
  /** Whether to show the generation form (for teachers) */
  showForm?: boolean
  /** Callback when activity is completed */
  onComplete?: (result: SentenceBuilderResult) => void
}

export function SentenceBuilderContainer({
  initialActivityId,
  showForm = true,
  onComplete,
}: SentenceBuilderContainerProps) {
  const [phase, setPhase] = useState<ActivityPhase>(
    initialActivityId ? "playing" : "form",
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Activity data
  const [generatedActivity, setGeneratedActivity] =
    useState<SentenceBuilderActivity | null>(null)
  const [publicActivity, setPublicActivity] =
    useState<SentenceBuilderActivityPublic | null>(null)
  const [result, setResult] = useState<SentenceBuilderResult | null>(null)

  // Generate a new activity
  const handleGenerate = useCallback(
    async (request: SentenceBuilderRequest) => {
      try {
        setIsLoading(true)
        setError(null)
        const activity = await sentenceBuilderApi.generateActivity(request)
        setGeneratedActivity(activity)
        // Also create public version for the player
        setPublicActivity({
          activity_id: activity.activity_id,
          book_id: activity.book_id,
          module_ids: activity.module_ids,
          sentences: activity.sentences.map((s) => ({
            item_id: s.item_id,
            words: s.words,
            word_count: s.word_count,
            difficulty: s.difficulty,
          })),
          difficulty: activity.difficulty,
          include_audio: activity.include_audio,
          created_at: activity.created_at,
          sentence_count: activity.sentences.length,
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
    },
    [],
  )

  // Load existing activity by ID
  const loadActivity = useCallback(async (activityId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const activity = await sentenceBuilderApi.getActivity(activityId)
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

  // Submit sentence answers
  const handleSubmit = useCallback(
    async (submission: SentenceBuilderSubmission) => {
      if (!publicActivity) return

      try {
        setIsLoading(true)
        setError(null)
        const activityResult = await sentenceBuilderApi.submitSentences(
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
      <SentenceBuilderForm
        onGenerate={handleGenerate}
        isGenerating={isLoading}
        error={error}
      />
    )
  }

  if (phase === "preview" && generatedActivity && publicActivity) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <div className="rounded-lg bg-purple-50 p-6 text-center dark:bg-purple-950/50">
          <h2 className="mb-2 text-xl font-semibold text-purple-800 dark:text-purple-200">
            Sentence Builder Generated!
          </h2>
          <p className="mb-4 text-sm text-purple-700 dark:text-purple-300">
            Your activity has {generatedActivity.sentences.length} sentences
            ready.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleStartActivity}
              className="inline-flex items-center justify-center rounded-md bg-purple-600 px-6 py-2 font-medium text-white hover:bg-purple-700"
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
              Difficulty:{" "}
              {DIFFICULTY_LABELS[
                generatedActivity.difficulty as keyof typeof DIFFICULTY_LABELS
              ] || generatedActivity.difficulty}
            </li>
            <li>Sentences: {generatedActivity.sentences.length}</li>
            <li>Book ID: {generatedActivity.book_id}</li>
            <li>
              Audio: {generatedActivity.include_audio ? "Enabled" : "Disabled"}
            </li>
            <li>Activity ID: {generatedActivity.activity_id}</li>
          </ul>
        </div>

        {/* Preview sentences */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 font-medium">Sentence Preview</h3>
          <div className="space-y-2">
            {generatedActivity.sentences.slice(0, 3).map((sentence, index) => (
              <div
                key={sentence.item_id}
                className="rounded bg-muted/50 p-2 text-sm"
              >
                <span className="font-medium text-muted-foreground">
                  #{index + 1}:
                </span>{" "}
                <span className="italic">{sentence.correct_sentence}</span>
              </div>
            ))}
            {generatedActivity.sentences.length > 3 && (
              <p className="text-xs text-muted-foreground">
                ...and {generatedActivity.sentences.length - 3} more sentences
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (phase === "playing" && publicActivity) {
    return (
      <SentenceBuilderPlayer
        activity={publicActivity}
        onSubmit={handleSubmit}
        isSubmitting={isLoading}
      />
    )
  }

  if (phase === "results" && result) {
    return (
      <SentenceBuilderResults
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
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

export default SentenceBuilderContainer
