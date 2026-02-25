/**
 * Assignment Success Screen
 * Story 4.7: Assignment Submission & Result Storage
 *
 * Displays success message with confetti animation after assignment submission
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import Confetti from "react-confetti"
import { useWindowSize } from "@/hooks/useWindowSize"
import {
  parseAIQuizResult,
  parseListeningFillBlankResult,
  parseMixModeResult,
  parseSentenceCorrectorResult,
  parseVocabularyMatchingResult,
  parseVocabularyQuizResult,
  parseReadingComprehensionResult,
  parseSentenceBuilderResult,
  parseWordBuilderResult,
  parseWritingFillBlankResult,
} from "@/lib/resultParsers"
import { getAssignmentResult } from "@/services/assignmentsApi"

export const Route = createFileRoute(
  "/_layout/student/assignments/$assignmentId/success",
)({
  component: AssignmentSuccessScreen,
  validateSearch: (search: Record<string, unknown>) => ({
    score: (search.score as number) ?? 0,
    completedAt: (search.completedAt as string) ?? new Date().toISOString(),
  }),
})

function AssignmentSuccessScreen() {
  const { assignmentId } = Route.useParams()
  const navigate = useNavigate()
  const { score: urlScore, completedAt } = Route.useSearch()
  const { width, height } = useWindowSize()
  const [showConfetti, setShowConfetti] = useState(true)

  // Fetch actual result to recalculate score server-side
  const { data: resultData } = useQuery({
    queryKey: ["assignments", assignmentId, "result"],
    queryFn: () => getAssignmentResult(assignmentId),
  })

  const MANUALLY_GRADED_TYPES = ["writing_free_response", "speaking_open_response"]
  const isManuallyGraded = MANUALLY_GRADED_TYPES.includes(resultData?.activity_type || "")
  const isLoadingResult = !resultData

  // Recalculate score from result data if available
  const score = useMemo(() => {
    if (!resultData?.config_json || !resultData?.answers_json) return urlScore

    const { activity_type, config_json, answers_json, score: storedScore } = resultData
    let parsedResult: any = null

    switch (activity_type) {
      case "ai_quiz":
      case "listening_quiz":
        parsedResult = parseAIQuizResult(config_json, answers_json, storedScore)
        break
      case "vocabulary_quiz":
        parsedResult = parseVocabularyQuizResult(config_json, answers_json, storedScore)
        break
      case "reading_comprehension":
        parsedResult = parseReadingComprehensionResult(config_json, answers_json, storedScore)
        break
      case "sentence_builder":
      case "listening_sentence_builder":
        parsedResult = parseSentenceBuilderResult(config_json, answers_json, storedScore)
        break
      case "word_builder":
      case "listening_word_builder":
        parsedResult = parseWordBuilderResult(config_json, answers_json, storedScore)
        break
      case "listening_fill_blank":
        parsedResult = parseListeningFillBlankResult(config_json, answers_json, storedScore)
        break
      case "writing_sentence_corrector":
        parsedResult = parseSentenceCorrectorResult(config_json, answers_json, storedScore)
        break
      case "writing_fill_blank":
      case "grammar_fill_blank":
        parsedResult = parseWritingFillBlankResult(config_json, answers_json, storedScore)
        break
      case "vocabulary_matching":
        parsedResult = parseVocabularyMatchingResult(config_json, answers_json, storedScore)
        break
      case "mix_mode":
        parsedResult = parseMixModeResult(config_json, answers_json, storedScore)
        break
    }

    if (!parsedResult) return urlScore

    // Mix mode: use auto_scored counts
    if ("auto_scored" in parsedResult && "auto_correct" in parsedResult) {
      const mix = parsedResult as { auto_scored: number; auto_correct: number }
      return mix.auto_scored > 0 ? Math.round((mix.auto_correct / mix.auto_scored) * 100) : urlScore
    }

    let correct = 0
    let total = 0
    if ("question_results" in parsedResult) {
      correct = parsedResult.question_results.filter((r: any) => r.is_correct).length
      total = parsedResult.total
    } else if ("results" in parsedResult) {
      correct = parsedResult.results.filter((r: any) => r.is_correct).length
      total = parsedResult.total
    } else if ("sentence_results" in parsedResult) {
      correct = parsedResult.sentence_results.filter((r: any) => r.is_correct).length
      total = parsedResult.total
    } else if ("word_results" in parsedResult) {
      correct = parsedResult.correct_count
      total = parsedResult.total
    } else if ("item_results" in parsedResult) {
      correct = parsedResult.item_results.filter((r: any) => r.is_correct).length
      total = parsedResult.total
    }

    return total > 0 ? Math.round((correct / total) * 100) : urlScore
  }, [resultData, urlScore])

  // Stop confetti after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  // Score color and message based on performance
  const getScoreStyle = (score: number) => {
    if (score >= 90)
      return {
        color: "text-green-600 dark:text-green-400",
        message: "Excellent!",
      }
    if (score >= 70)
      return { color: "text-blue-600 dark:text-blue-400", message: "Good Job!" }
    if (score >= 50)
      return {
        color: "text-yellow-600 dark:text-yellow-400",
        message: "Keep Practicing!",
      }
    return { color: "text-red-600 dark:text-red-400", message: "Nice Try!" }
  }

  const scoreStyle = getScoreStyle(score)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 dark:from-neutral-900 dark:to-neutral-800">
      {showConfetti && (
        <Confetti width={width} height={height} recycle={false} />
      )}

      <div className="mx-4 max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-neutral-800">
        {/* Success Icon */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            className="h-12 w-12 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          Assignment Completed!
        </h1>

        {/* Score Display */}
        {isLoadingResult ? (
          <div className="my-6">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent" />
          </div>
        ) : isManuallyGraded ? (
          <div className="my-6">
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                Pending Teacher Review
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Your teacher will review and score your responses.
            </p>
          </div>
        ) : (
          <div className="my-6">
            <p className="mb-2 text-lg text-gray-600 dark:text-gray-300">
              Your Score:
            </p>
            <p className={`text-6xl font-bold ${scoreStyle.color}`}>{score}%</p>
            <p className={`mt-2 text-xl font-semibold ${scoreStyle.color}`}>
              {scoreStyle.message}
            </p>
          </div>
        )}

        {/* Completion Time */}
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
          Completed on {new Date(completedAt).toLocaleString()}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/student/assignments/$assignmentId/result",
                params: { assignmentId },
              })
            }
            className="rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
          >
            Review Answers
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/student/assignments" })}
            className="rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
