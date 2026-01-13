/**
 * ReadingComprehensionResults - Display reading comprehension results after submission
 * Story 27.10: Reading Comprehension Generation
 *
 * Shows the overall score, score by question type, and detailed breakdown
 * of each question with passage references and explanations.
 */

import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Quote,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type {
  ReadingComprehensionQuestionResult,
  ReadingComprehensionResult,
} from "@/types/reading-comprehension"
import {
  getDifficultyLabel,
  getQuestionTypeLabel,
} from "@/types/reading-comprehension"

interface ReadingComprehensionResultsProps {
  /** The activity result data */
  result: ReadingComprehensionResult
  /** Callback to retry the activity */
  onRetry?: () => void
  /** Callback to go back to generator */
  onBack?: () => void
  /** Hide summary card when embedded in result page (to avoid duplication) */
  hideSummary?: boolean
}

export function ReadingComprehensionResults({
  result,
  onRetry,
  onBack,
  hideSummary = false,
}: ReadingComprehensionResultsProps) {
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
    <div className={cn("mx-auto flex max-w-3xl flex-col gap-6", !hideSummary && "p-4")}>
      {/* Score summary card - hidden when embedded */}
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
              Activity Complete!
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
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-neutral-800 dark:text-gray-400">
                {result.module_title}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-neutral-800 dark:text-gray-400">
                Difficulty: {getDifficultyLabel(result.difficulty)}
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {percentage >= 80
                ? "Excellent work! You've demonstrated great reading comprehension."
                : percentage >= 60
                  ? "Good effort! Review the passage references to improve."
                  : "Keep reading! Study the explanations and passage references."}
            </p>
          </div>
        </Card>
      )}

      {/* Score by question type - hidden when embedded */}
      {!hideSummary && (
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
              Score by Question Type
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(result.score_by_type).map(([type, scores]) => (
                <div
                  key={type}
                  className="rounded-lg bg-gray-50 p-3 text-center dark:bg-neutral-800/50"
                >
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    {getQuestionTypeLabel(type as any)}
                  </span>
                  <span
                    className={cn(
                      "text-lg font-bold",
                      scores.correct === scores.total
                        ? "text-green-600"
                        : scores.correct >= scores.total / 2
                          ? "text-yellow-600"
                          : "text-red-600",
                    )}
                  >
                    {scores.correct}/{scores.total}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passage reference - hidden when embedded */}
      {!hideSummary && (
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Original Passage
              </h3>
            </div>
            <ScrollArea className="h-[150px]">
              <p className="whitespace-pre-wrap pr-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {result.passage}
              </p>
            </ScrollArea>
          </CardContent>
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
  result: ReadingComprehensionQuestionResult
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
            {/* Question header */}
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-500 dark:text-gray-400">
                Q{index + 1}:
              </span>{" "}
              {result.question_text}
            </p>

            {/* Answer display based on question type */}
            {result.question_type === "short_answer" ? (
              <ShortAnswerDisplay result={result} />
            ) : (
              <OptionsDisplay result={result} />
            )}

            {/* Passage reference */}
            {result.passage_reference && (
              <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-950/30">
                <div className="flex items-start gap-2">
                  <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                      Passage Reference
                    </p>
                    <p className="mt-1 text-sm italic text-indigo-800 dark:text-indigo-200">
                      "{result.passage_reference}"
                    </p>
                  </div>
                </div>
              </div>
            )}

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

function OptionsDisplay({
  result,
}: {
  result: ReadingComprehensionQuestionResult
}) {
  return (
    <div className="space-y-1.5">
      {result.options?.map((option, optionIndex) => {
        const isCorrectOption = optionIndex === result.correct_index
        const isStudentAnswer = optionIndex === result.student_answer_index
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
                "bg-gray-50 text-gray-600 dark:bg-neutral-800/50 dark:text-gray-400",
            )}
          >
            {result.question_type !== "true_false" && (
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
            )}
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
  )
}

function ShortAnswerDisplay({
  result,
}: {
  result: ReadingComprehensionQuestionResult
}) {
  return (
    <div className="space-y-2">
      {/* Student's answer */}
      <div
        className={cn(
          "rounded-md px-3 py-2 text-sm",
          result.is_correct
            ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
            : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
        )}
      >
        <span className="font-medium">Your answer: </span>
        <span>{result.student_answer_text || "(No answer)"}</span>
        {result.similarity_score !== null && (
          <span className="ml-2 text-xs opacity-75">
            ({Math.round(result.similarity_score * 100)}% match)
          </span>
        )}
      </div>

      {/* Correct answer (if different) */}
      {!result.is_correct && (
        <div className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-900/50 dark:text-green-200">
          <span className="font-medium">Correct answer: </span>
          <span>{result.correct_answer}</span>
        </div>
      )}
    </div>
  )
}

export default ReadingComprehensionResults
