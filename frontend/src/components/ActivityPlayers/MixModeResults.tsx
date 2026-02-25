/**
 * MixModeResults - Per-question review for Mix Mode activities
 *
 * Shows each question with skill/format badge, green/red left border
 * for correct/incorrect, and format-specific display.
 */

import { CheckCircle2, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MixModeQuestionResult, MixModeResult } from "@/lib/resultParsers"

interface MixModeResultsProps {
  result: MixModeResult
  hideSummary?: boolean
}

function formatLabel(skill: string, format: string): string {
  const skillLabel = skill.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const formatLabel = format.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  return `${skillLabel} • ${formatLabel}`
}

export function MixModeResults({ result, hideSummary }: MixModeResultsProps) {
  const { question_results, auto_scored, pending_review } = result

  return (
    <div className="space-y-4">
      {/* Summary */}
      {!hideSummary && (
        <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-neutral-800">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Auto-Scored</p>
              <p className="text-2xl font-bold">
                {result.auto_correct}/{auto_scored}
              </p>
            </div>
            {pending_review > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {pending_review}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-2xl font-bold">{result.percentage}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Per-question cards */}
      {question_results.map((qr, idx) => (
        <QuestionResultCard key={qr.question_id} result={qr} index={idx} />
      ))}
    </div>
  )
}

function QuestionResultCard({
  result,
  index,
}: {
  result: MixModeQuestionResult
  index: number
}) {
  const isPending = result.status === "pending_review"
  const isCorrect = result.is_correct
  const borderColor = isPending
    ? "border-l-amber-400"
    : isCorrect
      ? "border-l-green-500"
      : "border-l-red-500"

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 bg-white p-4 dark:bg-neutral-800",
        borderColor,
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Q{index + 1}
          </span>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            {formatLabel(result.skill_slug, result.format_slug)}
          </span>
        </div>
        <div>
          {isPending ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              Pending Review
            </span>
          ) : isCorrect ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
      </div>

      {/* Format-specific content */}
      <FormatResultDisplay result={result} />
    </div>
  )
}

function FormatResultDisplay({ result }: { result: MixModeQuestionResult }) {
  const { format_slug, question_data, student_answer } = result

  switch (format_slug) {
    case "mcq":
    case "multiple_choice":
    case "comprehension": {
      const options: string[] = question_data.options || []
      const correctIdx = question_data.correct_index
      const studentIdx = student_answer !== undefined ? parseInt(student_answer, 10) : null
      return (
        <div className="space-y-2">
          {question_data.passage && (
            <p className="mb-2 text-sm italic text-muted-foreground">
              {(question_data.passage as string).slice(0, 200)}...
            </p>
          )}
          <p className="font-medium text-gray-900 dark:text-white">
            {question_data.question}
          </p>
          <div className="mt-2 space-y-1">
            {options.map((opt, idx) => {
              const isStudentChoice = studentIdx === idx
              const isCorrectChoice = correctIdx === idx
              return (
                <div
                  key={idx}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm",
                    isCorrectChoice && "bg-green-50 font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300",
                    isStudentChoice && !isCorrectChoice && "bg-red-50 text-red-700 line-through dark:bg-red-900/20 dark:text-red-400",
                  )}
                >
                  <span className="mr-2 font-medium">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  {opt}
                  {isCorrectChoice && " ✓"}
                  {isStudentChoice && !isCorrectChoice && " ✗"}
                </div>
              )
            })}
          </div>
          {question_data.explanation && (
            <p className="mt-2 text-sm text-muted-foreground">
              {question_data.explanation}
            </p>
          )}
        </div>
      )
    }

    case "fill_blank": {
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {question_data.sentence}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Your answer:</span>
            <span className={cn(
              "font-medium",
              result.is_correct ? "text-green-600" : "text-red-600",
            )}>
              {student_answer || "(empty)"}
            </span>
          </div>
          {!result.is_correct && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Correct:</span>
              <span className="font-medium text-green-600">{question_data.correct_answer}</span>
            </div>
          )}
        </div>
      )
    }

    case "word_builder": {
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{question_data.definition}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Your word:</span>
            <span className={cn(
              "font-mono font-medium tracking-wider",
              result.is_correct ? "text-green-600" : "text-red-600",
            )}>
              {student_answer || "(empty)"}
            </span>
          </div>
          {!result.is_correct && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Correct:</span>
              <span className="font-mono font-medium text-green-600">{question_data.word}</span>
            </div>
          )}
        </div>
      )
    }

    case "sentence_builder": {
      let placedWords: string[] = []
      try {
        placedWords = student_answer ? JSON.parse(student_answer) : []
      } catch { /* ignore */ }
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Your sentence:</span>
            <span className={cn(
              "font-medium",
              result.is_correct ? "text-green-600" : "text-red-600",
            )}>
              {placedWords.join(" ") || "(empty)"}
            </span>
          </div>
          {!result.is_correct && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Correct:</span>
              <span className="font-medium text-green-600">{question_data.correct_sentence}</span>
            </div>
          )}
        </div>
      )
    }

    case "matching": {
      return (
        <div className="space-y-2">
          <p className="font-medium">{question_data.word}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Your answer:</span>
            <span className={cn(
              "font-medium",
              result.is_correct ? "text-green-600" : "text-red-600",
            )}>
              {student_answer || "(empty)"}
            </span>
          </div>
          {!result.is_correct && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Correct:</span>
              <span className="font-medium text-green-600">{question_data.definition}</span>
            </div>
          )}
        </div>
      )
    }

    case "sentence_corrector": {
      return (
        <div className="space-y-2">
          <p className="text-sm text-red-600 line-through">{question_data.incorrect_sentence}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Your correction:</span>
            <span className={cn(
              "font-medium",
              result.is_correct ? "text-green-600" : "text-red-600",
            )}>
              {student_answer || "(empty)"}
            </span>
          </div>
          {!result.is_correct && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Correct:</span>
              <span className="font-medium text-green-600">{question_data.correct_sentence}</span>
            </div>
          )}
        </div>
      )
    }

    case "free_response":
    case "open_response": {
      return (
        <div className="space-y-2">
          <p className="font-medium">{question_data.prompt}</p>
          <div className="rounded bg-gray-50 p-3 text-sm dark:bg-neutral-700">
            {student_answer === "recorded" ? (
              <span className="text-muted-foreground italic">Audio recording submitted</span>
            ) : (
              student_answer || <span className="text-muted-foreground italic">No response</span>
            )}
          </div>
        </div>
      )
    }

    default:
      return (
        <p className="text-sm text-muted-foreground">
          Format not supported for review: {format_slug}
        </p>
      )
  }
}
