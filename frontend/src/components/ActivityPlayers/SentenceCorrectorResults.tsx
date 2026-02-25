/**
 * SentenceCorrectorResults - Display sentence corrector results after submission
 *
 * Shows each item with the incorrect sentence, student's correction,
 * and the correct answer when wrong.
 */

import { CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { SentenceCorrectorResult } from "@/lib/resultParsers"

interface SentenceCorrectorResultsProps {
  result: SentenceCorrectorResult
  hideSummary?: boolean
}

export function SentenceCorrectorResults({
  result,
  hideSummary = false,
}: SentenceCorrectorResultsProps) {
  const correctCount = result.item_results.filter((r) => r.is_correct).length
  const actualPercentage = result.total > 0
    ? Math.round((correctCount / result.total) * 100)
    : result.percentage

  return (
    <div className={cn("mx-auto flex max-w-2xl flex-col gap-4", !hideSummary && "p-4")}>
      {hideSummary && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {correctCount}/{result.total} items correct
          </span>
          <span
            className={cn(
              "font-semibold",
              actualPercentage >= 80
                ? "text-green-600"
                : actualPercentage >= 60
                  ? "text-yellow-600"
                  : "text-red-600",
            )}
          >
            {actualPercentage}%
          </span>
        </div>
      )}

      <div className="space-y-3">
        {result.item_results.map((item, index) => (
          <Card
            key={item.item_id}
            className={cn(
              "border-l-4 transition-all",
              item.is_correct
                ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
                : "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  {item.is_correct ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Item #{index + 1}
                  </span>

                  {/* Original incorrect sentence */}
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Original sentence:
                    </span>
                    <div className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {item.incorrect_sentence}
                    </div>
                  </div>

                  {/* Student's answer */}
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Your correction:
                    </span>
                    <div
                      className={cn(
                        "rounded-md px-3 py-2 text-sm",
                        item.is_correct
                          ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
                      )}
                    >
                      {item.submitted_sentence || (
                        <span className="italic">No answer submitted</span>
                      )}
                    </div>
                  </div>

                  {/* Correct answer (only shown if incorrect) */}
                  {!item.is_correct && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Correct sentence:
                      </span>
                      <div className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-900/50 dark:text-green-200">
                        {item.correct_sentence}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default SentenceCorrectorResults
