/**
 * AIQuizResults - Display AI quiz results after submission
 * Story 27.9: AI Quiz Generation (MCQ)
 *
 * Shows the overall score and detailed breakdown of each question,
 * highlighting correct and incorrect answers with explanations.
 */

import {
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { AIQuizQuestionResult, AIQuizResult } from "@/types/ai-quiz"
import { getDifficultyLabel } from "@/types/ai-quiz"

interface AIQuizResultsProps {
  /** The quiz result data */
  result: AIQuizResult
  /** Callback to retry the quiz */
  onRetry?: () => void
  /** Callback to go back to generator */
  onBack?: () => void
  /** Hide summary card when embedded in result page (to avoid duplication) */
  hideSummary?: boolean
}

export function AIQuizResults({ result, onRetry, onBack, hideSummary = false }: AIQuizResultsProps) {
  const correctCount = result.question_results.filter(
    (r) => r.is_correct,
  ).length
  const totalCount = result.total
  const percentage = result.percentage

  // Determine score color
  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-green-600 dark:text-green-400"
    if (pct >= 60) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  // Determine progress color
  const getProgressClass = (pct: number) => {
    if (pct >= 80) return "[&>div]:bg-green-500"
    if (pct >= 60) return "[&>div]:bg-yellow-500"
    return "[&>div]:bg-red-500"
  }

  return (
    <div className={cn("mx-auto flex max-w-2xl flex-col gap-6", !hideSummary && "p-4")}>
      {/* Score summary card - hidden when embedded in result page */}
      {!hideSummary && (
        <Card className="overflow-hidden shadow-lg">
          <div
            className={cn(
              "p-6 text-center",
              percentage >= 80
                ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50"
                : percentage >= 60
                  ? "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/50 dark:to-amber-950/50"
                  : "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50",
            )}
          >
            <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Quiz Complete!
            </h2>
            <div className={cn("text-5xl font-bold", getScoreColor(percentage))}>
              {correctCount}/{totalCount}
            </div>
            <p
              className={cn(
                "mt-1 text-2xl font-medium",
                getScoreColor(percentage),
              )}
            >
              {percentage}%
            </p>
            <Progress
              value={percentage}
              className={cn(
                "mx-auto mt-4 h-3 max-w-[200px]",
                getProgressClass(percentage),
              )}
            />
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Difficulty:{" "}
                {getDifficultyLabel(
                  result.difficulty as "easy" | "medium" | "hard",
                )}
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {percentage >= 80
                ? "Excellent work! You've demonstrated great comprehension."
                : percentage >= 60
                  ? "Good effort! Review the explanations to improve."
                  : "Keep studying! Read the explanations carefully."}
            </p>
          </div>
        </Card>
      )}

      {/* Detailed results */}
      <div className="space-y-3">
        {!hideSummary && (
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Question Breakdown
          </h3>
        )}
        {hideSummary && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {correctCount}/{totalCount} questions correct
            </span>
            <span className={cn("font-semibold", getScoreColor(percentage))}>
              {percentage}%
            </span>
          </div>
        )}
        {result.question_results.map((questionResult, index) => (
          <QuestionResultCard
            key={questionResult.question_id}
            result={questionResult}
            index={index}
          />
        ))}
      </div>

      {/* Action buttons - hidden when embedded */}
      {!hideSummary && (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {onRetry && (
            <Button onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          {onBack && (
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Generator
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface QuestionResultCardProps {
  result: AIQuizQuestionResult
  index: number
}

function QuestionResultCard({ result, index }: QuestionResultCardProps) {
  return (
    <Card
      className={cn(
        "border-l-4 transition-all",
        result.is_correct
          ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
          : "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div className="flex-shrink-0 pt-0.5">
            {result.is_correct ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Question text */}
            <div>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  Q{index + 1}:
                </span>{" "}
                {result.question_text}
              </p>
            </div>

            {/* Options with highlighting */}
            <div className="space-y-1.5">
              {result.options.map((option, optionIndex) => {
                const isCorrectOption = optionIndex === result.correct_index
                const isStudentAnswer =
                  optionIndex === result.student_answer_index
                const showAsIncorrect = isStudentAnswer && !result.is_correct

                return (
                  <div
                    key={optionIndex}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      isCorrectOption &&
                        "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
                      showAsIncorrect &&
                        "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
                      !isCorrectOption &&
                        !showAsIncorrect &&
                        "bg-gray-50 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium",
                        isCorrectOption
                          ? "bg-green-500 text-white"
                          : showAsIncorrect
                            ? "bg-red-500 text-white"
                            : "bg-gray-300 dark:bg-gray-600",
                      )}
                    >
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {isCorrectOption && (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                    )}
                    {showAsIncorrect && (
                      <XCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Explanation */}
            {result.explanation && (
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                <div className="flex items-start gap-2">
                  <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
                      Explanation
                    </p>
                    <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                      {result.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AIQuizResults
