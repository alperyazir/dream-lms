/**
 * WritingFreeResponseResults - Display submitted free writing responses
 *
 * Shows each prompt with the student's submitted text.
 * No scoring — pending teacher review.
 */

import { PenLine } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { FreeResponseResult } from "@/lib/resultParsers"

interface WritingFreeResponseResultsProps {
  result: FreeResponseResult
  hideSummary?: boolean
  score?: number | null
}

export function WritingFreeResponseResults({
  result,
  hideSummary = false,
  score,
}: WritingFreeResponseResultsProps) {
  return (
    <div className={cn("mx-auto flex max-w-2xl flex-col gap-4", !hideSummary && "p-4")}>
      {hideSummary && (
        score != null ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <span className="text-green-600 dark:text-green-400 text-sm font-medium">
              Scored: {score}%
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
              Pending Teacher Review
            </span>
          </div>
        )
      )}

      <div className="space-y-3">
        {result.item_results.map((item, index) => (
          <Card
            key={item.item_id}
            className="border-l-4 border-l-blue-400 bg-blue-50/30 dark:bg-blue-950/10"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  <PenLine className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Prompt #{index + 1}
                  </span>

                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {item.prompt}
                  </p>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Your response:
                    </span>
                    <div className="rounded-md bg-white px-3 py-2 text-sm leading-relaxed text-gray-800 border border-gray-200 dark:bg-gray-800/50 dark:text-gray-200 dark:border-gray-700">
                      {item.submitted_text || (
                        <span className="italic text-muted-foreground">No response submitted</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default WritingFreeResponseResults
