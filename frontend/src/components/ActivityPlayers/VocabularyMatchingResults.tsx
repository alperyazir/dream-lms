/**
 * VocabularyMatchingResults - Display word-definition matching results
 *
 * Shows each word with the student's matched definition and the correct one when wrong.
 */

import { ArrowRight, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { VocabularyMatchingResult } from "@/lib/resultParsers"

interface VocabularyMatchingResultsProps {
  result: VocabularyMatchingResult
  hideSummary?: boolean
}

export function VocabularyMatchingResults({
  result,
  hideSummary = false,
}: VocabularyMatchingResultsProps) {
  const correctCount = result.item_results.filter((r) => r.is_correct).length
  const actualPercentage = result.total > 0
    ? Math.round((correctCount / result.total) * 100)
    : result.percentage

  return (
    <div className={cn("mx-auto flex max-w-2xl flex-col gap-4", !hideSummary && "p-4")}>
      {hideSummary && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {correctCount}/{result.total} matches correct
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
            key={item.pair_id}
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
                    Pair #{index + 1}
                  </span>

                  {/* Student's match */}
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Your match:
                    </span>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                        item.is_correct
                          ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
                      )}
                    >
                      <span className="font-semibold">{item.word}</span>
                      <ArrowRight className="h-4 w-4 flex-shrink-0 opacity-60" />
                      <span>{item.matched_definition || <em>No match</em>}</span>
                    </div>
                  </div>

                  {/* Correct match (only shown if incorrect) */}
                  {!item.is_correct && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Correct match:
                      </span>
                      <div className="flex items-center gap-2 rounded-md bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-900/50 dark:text-green-200">
                        <span className="font-semibold">{item.word}</span>
                        <ArrowRight className="h-4 w-4 flex-shrink-0 opacity-60" />
                        <span>{item.correct_definition}</span>
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

export default VocabularyMatchingResults
