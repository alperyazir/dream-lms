/**
 * VocabularyQuizContainer - Full vocabulary quiz experience
 * Story 27.8: Vocabulary Quiz Generation (Definition-Based)
 *
 * Manages the complete quiz lifecycle:
 * - Generation form for teachers
 * - Quiz player for taking the quiz
 * - Results display after submission
 */

import { useCallback, useState } from "react"
import { VocabularyQuizPlayer } from "@/components/ActivityPlayers/VocabularyQuizPlayer"
import { VocabularyQuizResults } from "@/components/ActivityPlayers/VocabularyQuizResults"
import { vocabularyQuizApi } from "@/services/vocabularyQuizApi"
import type {
  VocabularyQuiz,
  VocabularyQuizGenerationRequest,
  VocabularyQuizPublic,
  VocabularyQuizResult,
} from "@/types/vocabulary-quiz"
import { VocabularyQuizForm } from "./VocabularyQuizForm"

type QuizPhase = "form" | "preview" | "playing" | "results"

interface VocabularyQuizContainerProps {
  /** Initial quiz ID to load (for students accessing shared quiz) */
  initialQuizId?: string
  /** Whether to show the generation form (for teachers) */
  showForm?: boolean
  /** Callback when quiz is completed */
  onComplete?: (result: VocabularyQuizResult) => void
}

export function VocabularyQuizContainer({
  initialQuizId,
  showForm = true,
  onComplete,
}: VocabularyQuizContainerProps) {
  const [phase, setPhase] = useState<QuizPhase>(
    initialQuizId ? "playing" : "form",
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Quiz data
  const [generatedQuiz, setGeneratedQuiz] = useState<VocabularyQuiz | null>(
    null,
  )
  const [publicQuiz, setPublicQuiz] = useState<VocabularyQuizPublic | null>(
    null,
  )
  const [result, setResult] = useState<VocabularyQuizResult | null>(null)

  // Generate a new quiz
  const handleGenerate = useCallback(
    async (request: VocabularyQuizGenerationRequest) => {
      try {
        setIsLoading(true)
        setError(null)
        const quiz = await vocabularyQuizApi.generateQuiz(request)
        setGeneratedQuiz(quiz)
        // Also create public version for the player
        setPublicQuiz({
          quiz_id: quiz.quiz_id,
          book_id: quiz.book_id,
          quiz_length: quiz.quiz_length,
          quiz_mode: quiz.quiz_mode,
          questions: quiz.questions.map((q) => ({
            question_id: q.question_id,
            definition: q.definition,
            options: q.options,
            audio_url: q.audio_url,
            cefr_level: q.cefr_level,
            question_type: q.question_type,
          })),
        })
        setPhase("preview")
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to generate quiz. Please try again."
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  // Load existing quiz by ID
  const loadQuiz = useCallback(async (quizId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const quiz = await vocabularyQuizApi.getQuiz(quizId)
      setPublicQuiz(quiz)
      setPhase("playing")
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to load quiz. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Start the quiz (from preview)
  const handleStartQuiz = useCallback(() => {
    setPhase("playing")
  }, [])

  // Submit quiz answers
  const handleSubmit = useCallback(
    async (answers: Record<string, string>) => {
      if (!publicQuiz) return

      try {
        setIsLoading(true)
        setError(null)
        const quizResult = await vocabularyQuizApi.submitQuiz(
          publicQuiz.quiz_id,
          {
            answers,
          },
        )
        setResult(quizResult)
        setPhase("results")
        onComplete?.(quizResult)
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to submit quiz. Please try again."
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [publicQuiz, onComplete],
  )

  // Retry the quiz
  const handleRetry = useCallback(() => {
    setResult(null)
    setPhase("playing")
  }, [])

  // Go back to form
  const handleBackToForm = useCallback(() => {
    setGeneratedQuiz(null)
    setPublicQuiz(null)
    setResult(null)
    setError(null)
    setPhase("form")
  }, [])

  // Load initial quiz if provided
  if (initialQuizId && !publicQuiz && !isLoading && !error) {
    loadQuiz(initialQuizId)
  }

  // Render based on current phase
  if (phase === "form" && showForm) {
    return (
      <VocabularyQuizForm
        onGenerate={handleGenerate}
        isGenerating={isLoading}
        error={error}
      />
    )
  }

  if (phase === "preview" && generatedQuiz && publicQuiz) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <div className="rounded-lg bg-green-50 p-6 text-center dark:bg-green-950/50">
          <h2 className="mb-2 text-xl font-semibold text-green-800 dark:text-green-200">
            Quiz Generated Successfully!
          </h2>
          <p className="mb-4 text-sm text-green-700 dark:text-green-300">
            Your quiz has {generatedQuiz.questions.length} questions ready.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleStartQuiz}
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700"
            >
              Take Quiz
            </button>
            <button
              onClick={handleBackToForm}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Generate Another
            </button>
          </div>
        </div>

        {/* Quiz info */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-medium">Quiz Details</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>Questions: {generatedQuiz.questions.length}</li>
            <li>Book ID: {generatedQuiz.book_id}</li>
            <li>Quiz ID: {generatedQuiz.quiz_id}</li>
          </ul>
        </div>
      </div>
    )
  }

  if (phase === "playing" && publicQuiz) {
    return (
      <VocabularyQuizPlayer
        quiz={publicQuiz}
        onSubmit={handleSubmit}
        isSubmitting={isLoading}
      />
    )
  }

  if (phase === "results" && result) {
    return (
      <VocabularyQuizResults
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-muted-foreground">Loading quiz...</p>
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

export default VocabularyQuizContainer
