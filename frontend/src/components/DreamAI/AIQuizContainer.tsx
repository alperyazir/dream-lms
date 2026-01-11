/**
 * AIQuizContainer - Full AI quiz experience
 * Story 27.9: AI Quiz Generation (MCQ)
 *
 * Manages the complete quiz lifecycle:
 * - Generation form for teachers
 * - Quiz player for taking the quiz
 * - Results display after submission
 */

import { useCallback, useState } from "react"
import { AIQuizPlayer } from "@/components/ActivityPlayers/AIQuizPlayer"
import { AIQuizResults } from "@/components/ActivityPlayers/AIQuizResults"
import { aiQuizApi } from "@/services/aiQuizApi"
import type {
  AIQuiz,
  AIQuizContainerState,
  AIQuizGenerationRequest,
  AIQuizPublic,
  AIQuizResult,
} from "@/types/ai-quiz"
import { AIQuizForm } from "./AIQuizForm"

interface AIQuizContainerProps {
  /** Initial quiz ID to load (for students accessing shared quiz) */
  initialQuizId?: string
  /** Whether to show the generation form (for teachers) */
  showForm?: boolean
  /** Callback when quiz is completed */
  onComplete?: (result: AIQuizResult) => void
}

export function AIQuizContainer({
  initialQuizId,
  showForm = true,
  onComplete,
}: AIQuizContainerProps) {
  const [phase, setPhase] = useState<AIQuizContainerState>(
    initialQuizId ? "playing" : "form",
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Quiz data
  const [_generatedQuiz, setGeneratedQuiz] = useState<AIQuiz | null>(null)
  const [publicQuiz, setPublicQuiz] = useState<AIQuizPublic | null>(null)
  const [result, setResult] = useState<AIQuizResult | null>(null)

  // Generate a new quiz
  const handleGenerate = useCallback(
    async (request: AIQuizGenerationRequest) => {
      try {
        setIsLoading(true)
        setPhase("generating")
        setError(null)
        const quiz = await aiQuizApi.generateAIQuiz(request)
        setGeneratedQuiz(quiz)
        // Also create public version for the player
        setPublicQuiz({
          quiz_id: quiz.quiz_id,
          book_id: quiz.book_id,
          module_ids: quiz.module_ids,
          difficulty: quiz.difficulty,
          language: quiz.language,
          created_at: quiz.created_at,
          question_count: quiz.questions.length,
          questions: quiz.questions.map((q) => ({
            question_id: q.question_id,
            question_text: q.question_text,
            options: q.options,
            source_module_id: q.source_module_id,
            difficulty: q.difficulty,
          })),
        })
        setPhase("playing")
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to generate quiz. Please try again."
        setError(message)
        setPhase("form")
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
      const quiz = await aiQuizApi.getAIQuiz(quizId)
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

  // Submit quiz answers
  const handleSubmit = useCallback(
    async (answers: Record<string, number>) => {
      if (!publicQuiz) return

      try {
        setIsLoading(true)
        setError(null)
        const quizResult = await aiQuizApi.submitAIQuiz(
          publicQuiz.quiz_id,
          answers,
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
      <AIQuizForm
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
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
              Generating Quiz...
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              This may take a few seconds
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "playing" && publicQuiz) {
    return (
      <AIQuizPlayer
        quiz={publicQuiz}
        onSubmit={handleSubmit}
        isSubmitting={isLoading}
      />
    )
  }

  if (phase === "results" && result) {
    return (
      <AIQuizResults
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

export default AIQuizContainer
