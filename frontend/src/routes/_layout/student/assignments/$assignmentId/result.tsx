/**
 * Assignment Result Detail Screen
 * Story 23.4: Fix Result Screen Stale Progress
 * Task 5: Detailed Answer Review for All Activity Types
 *
 * Displays submitted answers with correct/incorrect marking for review.
 * Fetches submission data from backend to ensure fresh, accurate answers.
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react"
import { useMemo } from "react"
import { AIQuizResults } from "@/components/ActivityPlayers/AIQuizResults"
import { ListeningFillBlankResults } from "@/components/ActivityPlayers/ListeningFillBlankResults"
import { ReadingComprehensionResults } from "@/components/ActivityPlayers/ReadingComprehensionResults"
import { SentenceCorrectorResults } from "@/components/ActivityPlayers/SentenceCorrectorResults"
import { SentenceBuilderResults } from "@/components/ActivityPlayers/SentenceBuilderResults"
import { VocabularyQuizResults } from "@/components/ActivityPlayers/VocabularyQuizResults"
import { WordBuilderResults } from "@/components/ActivityPlayers/WordBuilderResults"
import { WritingFillBlankResults } from "@/components/ActivityPlayers/WritingFillBlankResults"
import { SpeakingOpenResponseResults } from "@/components/ActivityPlayers/SpeakingOpenResponseResults"
import { VocabularyMatchingResults } from "@/components/ActivityPlayers/VocabularyMatchingResults"
import { WritingFreeResponseResults } from "@/components/ActivityPlayers/WritingFreeResponseResults"
import { MixModeResults } from "@/components/ActivityPlayers/MixModeResults"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  parseAIQuizResult,
  parseFreeResponseResult,
  parseListeningFillBlankResult,
  parseMixModeResult,
  parseReadingComprehensionResult,
  parseSentenceBuilderResult,
  parseSentenceCorrectorResult,
  parseVocabularyMatchingResult,
  parseVocabularyQuizResult,
  parseWordBuilderResult,
  parseWritingFillBlankResult,
  supportsDetailedReview,
} from "@/lib/resultParsers"
import { getAssignmentResult } from "@/services/assignmentsApi"

export const Route = createFileRoute(
  "/_layout/student/assignments/$assignmentId/result",
)({
  component: AssignmentResultDetailPage,
})

function AssignmentResultDetailPage() {
  const { assignmentId } = Route.useParams()
  const navigate = useNavigate()

  // Fetch assignment result with submitted answers
  const {
    data: result,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["assignments", assignmentId, "result"],
    queryFn: () => getAssignmentResult(assignmentId),
    retry: false,
    staleTime: 0, // Always fetch fresh data
  })

  // Parse result data based on activity type for detailed review
  const parsedResult = useMemo(() => {
    if (!result || !result.config_json || !result.answers_json) return null

    const { activity_type, config_json, answers_json, score } = result

    // Debug logging to understand data structure
    console.log("[Result] activity_type:", activity_type)
    console.log("[Result] config_json:", JSON.stringify(config_json, null, 2))
    console.log("[Result] answers_json:", JSON.stringify(answers_json, null, 2))

    switch (activity_type) {
      case "ai_quiz":
      case "listening_quiz":
        return parseAIQuizResult(config_json, answers_json, score)
      case "vocabulary_quiz":
        return parseVocabularyQuizResult(config_json, answers_json, score)
      case "reading_comprehension":
        return parseReadingComprehensionResult(config_json, answers_json, score)
      case "sentence_builder":
      case "listening_sentence_builder":
        return parseSentenceBuilderResult(config_json, answers_json, score)
      case "word_builder":
      case "listening_word_builder":
        return parseWordBuilderResult(config_json, answers_json, score)
      case "listening_fill_blank":
        return parseListeningFillBlankResult(config_json, answers_json, score)
      case "writing_sentence_corrector":
        return parseSentenceCorrectorResult(config_json, answers_json, score)
      case "writing_fill_blank":
      case "grammar_fill_blank":
        return parseWritingFillBlankResult(config_json, answers_json, score)
      case "writing_free_response":
        return parseFreeResponseResult(config_json, answers_json)
      case "vocabulary_matching":
        return parseVocabularyMatchingResult(config_json, answers_json, score)
      case "speaking_open_response":
        return parseFreeResponseResult(config_json, answers_json)
      case "mix_mode":
        return parseMixModeResult(config_json, answers_json, score)
      default:
        return null
    }
  }, [result])

  // Calculate correct/incorrect count from parsed result or estimation
  const answerStats = useMemo(() => {
    if (!result) return null

    // If we have parsed result, use actual counts
    if (parsedResult) {
      if ("auto_scored" in parsedResult && "auto_correct" in parsedResult) {
        // Mix Mode — use auto-scored counts only
        const mixResult = parsedResult as { auto_scored: number; auto_correct: number; pending_review: number }
        return {
          correct: mixResult.auto_correct,
          incorrect: mixResult.auto_scored - mixResult.auto_correct,
          total: mixResult.auto_scored,
          pendingReview: mixResult.pending_review,
        }
      }
      if ("question_results" in parsedResult) {
        // AI Quiz or Reading Comprehension
        const correct = parsedResult.question_results.filter(
          (r) => r.is_correct,
        ).length
        return {
          correct,
          incorrect: parsedResult.total - correct,
          total: parsedResult.total,
        }
      }
      if ("results" in parsedResult) {
        // Vocabulary Quiz
        const correct = parsedResult.results.filter((r) => r.is_correct).length
        return {
          correct,
          incorrect: parsedResult.total - correct,
          total: parsedResult.total,
        }
      }
      if ("sentence_results" in parsedResult) {
        // Sentence Builder
        const correct = parsedResult.sentence_results.filter(
          (r) => r.is_correct,
        ).length
        return {
          correct,
          incorrect: parsedResult.total - correct,
          total: parsedResult.total,
        }
      }
      if ("word_results" in parsedResult) {
        // Word Builder
        return {
          correct: parsedResult.correct_count,
          incorrect: parsedResult.total - parsedResult.correct_count,
          total: parsedResult.total,
        }
      }
      if ("item_results" in parsedResult) {
        // Listening Fill-in-the-Blank
        const correct = parsedResult.item_results.filter(
          (r) => r.is_correct,
        ).length
        return {
          correct,
          incorrect: parsedResult.total - correct,
          total: parsedResult.total,
        }
      }
    }

    // Fallback: estimate from score percentage
    const total = result.total_points
    const score = result.score
    const estimatedTotal = Math.round(total / 100) || 10
    const correct = Math.round((score / 100) * estimatedTotal)
    const incorrect = estimatedTotal - correct

    return {
      correct,
      incorrect,
      total: estimatedTotal,
    }
  }, [result, parsedResult])

  // Handle navigation back
  const handleBack = () => {
    navigate({
      to: "/student/assignments/$assignmentId",
      params: { assignmentId },
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading results...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !result) {
    const errorResponse = (error as any)?.response
    const status = errorResponse?.status
    const detail = errorResponse?.data?.detail || "An error occurred"

    let errorTitle = "Error Loading Results"
    let errorMessage = detail

    if (status === 404) {
      errorTitle = "Results Not Found"
      errorMessage =
        "This assignment hasn't been completed yet or results are not available."
    } else if (status === 403) {
      errorTitle = "Access Denied"
      errorMessage = "You don't have permission to view these results."
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{errorTitle}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate({ to: "/student/assignments" })}>
              Back to Assignments
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Check if this is a manually-graded activity (no auto-scoring)
  const isManuallyGraded = result.activity_type === "writing_free_response" || result.activity_type === "speaking_open_response"

  // Score color based on performance
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400"
    if (score >= 70) return "text-blue-600 dark:text-blue-400"
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assignment
        </Button>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              {result.assignment_name}
            </h1>
            <p className="text-muted-foreground">
              {result.book_name} • {result.activity_title || "Activity Review"}
            </p>
          </div>

          {/* Score Badge - Use calculated score from answerStats when available */}
          <div className="text-right">
            {isManuallyGraded ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                  Pending Teacher Review
                </span>
              </div>
            ) : (
              (() => {
                const calculatedScore =
                  answerStats && answerStats.total > 0
                    ? Math.round((answerStats.correct / answerStats.total) * 100)
                    : Math.round(result.score)
                return (
                  <>
                    <div
                      className={`text-5xl font-bold ${getScoreColor(calculatedScore)}`}
                    >
                      {calculatedScore}%
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your final score
                    </p>
                  </>
                )
              })()
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {isManuallyGraded ? (
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {/* Items Submitted */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                Responses Submitted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {parsedResult && "item_results" in parsedResult
                  ? (parsedResult as any).item_results.filter((r: any) => r.submitted_text).length
                  : "—"}/{parsedResult && "total" in parsedResult ? (parsedResult as any).total : "—"}
              </div>
            </CardContent>
          </Card>

          {/* Time Spent */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Time Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const totalSeconds =
                    result.time_spent_seconds ||
                    result.time_spent_minutes * 60 ||
                    0
                  if (totalSeconds === 0) return "< 1 sec"
                  const minutes = Math.floor(totalSeconds / 60)
                  const seconds = totalSeconds % 60
                  if (minutes === 0) return `${seconds} sec`
                  return `${minutes} min ${seconds} sec`
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {/* Correct Answers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Correct Answers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {answerStats?.correct || 0}
              </div>
            </CardContent>
          </Card>

          {/* Incorrect Answers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Incorrect Answers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {answerStats?.incorrect || 0}
              </div>
            </CardContent>
          </Card>

          {/* Time Spent */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Time Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const totalSeconds =
                    result.time_spent_seconds ||
                    result.time_spent_minutes * 60 ||
                    0

                  if (totalSeconds === 0) {
                    return "< 1 sec"
                  }

                  const minutes = Math.floor(totalSeconds / 60)
                  const seconds = totalSeconds % 60

                  if (minutes === 0) {
                    return `${seconds} sec`
                  }

                  return `${minutes} min ${seconds} sec`
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Answer Review Section */}
      {parsedResult && supportsDetailedReview(result.activity_type) && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Detailed Answer Review</h2>
          {(result.activity_type === "ai_quiz" || result.activity_type === "listening_quiz") &&
            "question_results" in parsedResult && (
              <AIQuizResults
                result={
                  parsedResult as ReturnType<typeof parseAIQuizResult> & object
                }
                hideSummary
              />
            )}
          {result.activity_type === "vocabulary_quiz" &&
            "results" in parsedResult && (
              <VocabularyQuizResults
                result={
                  parsedResult as ReturnType<typeof parseVocabularyQuizResult> &
                    object
                }
                hideSummary
              />
            )}
          {result.activity_type === "reading_comprehension" &&
            "question_results" in parsedResult && (
              <ReadingComprehensionResults
                result={
                  parsedResult as ReturnType<
                    typeof parseReadingComprehensionResult
                  > &
                    object
                }
                hideSummary
              />
            )}
          {(result.activity_type === "sentence_builder" || result.activity_type === "listening_sentence_builder") &&
            "sentence_results" in parsedResult && (
              <SentenceBuilderResults
                result={
                  parsedResult as ReturnType<
                    typeof parseSentenceBuilderResult
                  > &
                    object
                }
                hideSummary
              />
            )}
          {(result.activity_type === "word_builder" || result.activity_type === "listening_word_builder") &&
            "word_results" in parsedResult && (
              <WordBuilderResults
                result={
                  parsedResult as ReturnType<typeof parseWordBuilderResult> &
                    object
                }
              />
            )}
          {result.activity_type === "listening_fill_blank" &&
            "item_results" in parsedResult && (
              <ListeningFillBlankResults
                result={
                  parsedResult as ReturnType<
                    typeof parseListeningFillBlankResult
                  > &
                    object
                }
                hideSummary
              />
            )}
          {result.activity_type === "writing_sentence_corrector" &&
            "item_results" in parsedResult && (
              <SentenceCorrectorResults
                result={
                  parsedResult as ReturnType<
                    typeof parseSentenceCorrectorResult
                  > &
                    object
                }
                hideSummary
              />
            )}
          {(result.activity_type === "writing_fill_blank" || result.activity_type === "grammar_fill_blank") &&
            "item_results" in parsedResult && (
              <WritingFillBlankResults
                result={
                  parsedResult as ReturnType<
                    typeof parseWritingFillBlankResult
                  > &
                    object
                }
                hideSummary
              />
            )}
          {result.activity_type === "writing_free_response" &&
            "item_results" in parsedResult && (
              <WritingFreeResponseResults
                result={
                  parsedResult as ReturnType<typeof parseFreeResponseResult> &
                    object
                }
                hideSummary
              />
            )}
          {result.activity_type === "vocabulary_matching" &&
            "item_results" in parsedResult && (
              <VocabularyMatchingResults
                result={
                  parsedResult as ReturnType<
                    typeof parseVocabularyMatchingResult
                  > &
                    object
                }
                hideSummary
              />
            )}
          {result.activity_type === "speaking_open_response" &&
            "item_results" in parsedResult && (
              <SpeakingOpenResponseResults
                result={
                  parsedResult as ReturnType<typeof parseFreeResponseResult> &
                    object
                }
                hideSummary
              />
            )}
          {result.activity_type === "mix_mode" &&
            "question_results" in parsedResult && (
              <MixModeResults
                result={
                  parsedResult as ReturnType<typeof parseMixModeResult> &
                    object
                }
                hideSummary
              />
            )}
        </div>
      )}

      {/* Note for unsupported activity types */}
      {(!parsedResult || !supportsDetailedReview(result.activity_type)) && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Detailed answer review is not available
                for this activity type. Your submission has been recorded and
                graded.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3 justify-end">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assignment
        </Button>
        <Button onClick={() => navigate({ to: "/student/assignments" })}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
