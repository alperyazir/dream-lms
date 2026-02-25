/**
 * WritingFillBlankResults - Display fill-in-the-blank results for writing/grammar activities
 *
 * Shows each sentence with the student's typed answer and the correct answer when wrong.
 */

import { CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { WritingFillBlankResult } from "@/lib/resultParsers"

interface WritingFillBlankResultsProps {
  result: WritingFillBlankResult
  hideSummary?: boolean
}

export function WritingFillBlankResults({
  result,
  hideSummary = false,
}: WritingFillBlankResultsProps) {
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
        {result.item_results.map((item, index) => {
          // Split sentence at blank marker to show inline
          const parts = item.display_sentence.split("_______")

          return (
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

                    {/* Student's answer in context */}
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Your answer:
                      </span>
                      <div
                        className={cn(
                          "rounded-md px-3 py-2 text-sm leading-relaxed",
                          item.is_correct
                            ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
                        )}
                      >
                        {parts.length > 1 ? (
                          <>
                            {parts[0]}
                            <span
                              className={cn(
                                "mx-1 inline-block rounded px-2 py-0.5 font-semibold",
                                item.is_correct
                                  ? "bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100"
                                  : "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100",
                              )}
                            >
                              {item.submitted_answer || "___"}
                            </span>
                            {parts[1]}
                          </>
                        ) : (
                          item.submitted_answer || (
                            <span className="italic">No answer submitted</span>
                          )
                        )}
                      </div>
                    </div>

                    {/* Correct answer (only shown if incorrect) */}
                    {!item.is_correct && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Correct answer:
                        </span>
                        <div className="rounded-md bg-green-100 px-3 py-2 text-sm leading-relaxed text-green-800 dark:bg-green-900/50 dark:text-green-200">
                          {parts.length > 1 ? (
                            <>
                              {parts[0]}
                              <span className="mx-1 inline-block rounded bg-green-200 px-2 py-0.5 font-semibold text-green-900 dark:bg-green-800 dark:text-green-100">
                                {item.correct_answer}
                              </span>
                              {parts[1]}
                            </>
                          ) : (
                            item.correct_answer
                          )}
                        </div>
                      </div>
                    )}

                    {/* Acceptable answers (shown for incorrect items when alternatives exist) */}
                    {!item.is_correct && item.acceptable_answers.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Also accepted:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.acceptable_answers.map((answer, i) => (
                            <span
                              key={i}
                              className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                            >
                              {answer}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default WritingFillBlankResults
