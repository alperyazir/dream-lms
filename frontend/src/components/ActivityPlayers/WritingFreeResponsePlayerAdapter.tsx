/**
 * WritingFreeResponsePlayerAdapter - Player for Free Response Writing
 *
 * Open-ended writing prompts. Student writes a response.
 * No auto-scoring — teacher reviews manually.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { ActivityConfig } from "@/lib/mockData"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"

interface FreeResponseItem {
  item_id: string
  prompt: string
  context: string
  min_words: number
  max_words: number
  difficulty?: string
}

interface FreeResponseContent {
  activity_id: string
  items: FreeResponseItem[]
  total_items: number
  difficulty: string
  requires_manual_grading?: boolean
}

interface WritingFreeResponsePlayerAdapterProps {
  activity: ActivityConfig
  onAnswersChange: (answers: Map<string, string>) => void
  showResults: boolean
  correctAnswers: Set<string>
  initialAnswers?: Map<string, string>
  showCorrectAnswers?: boolean
  currentQuestionIndex?: number
  onQuestionIndexChange?: (index: number) => void
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function WritingFreeResponsePlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers: _correctAnswers,
  initialAnswers,
  showCorrectAnswers: _showCorrectAnswers,
  currentQuestionIndex,
  onQuestionIndexChange: _onQuestionIndexChange,
  onNavigationStateChange,
}: WritingFreeResponsePlayerAdapterProps) {
  const content = (activity as any).content as FreeResponseContent
  const items = content?.items || []

  const [answers, setAnswers] = useState<Map<string, string>>(
    () => initialAnswers || new Map(),
  )

  const qIndex = currentQuestionIndex ?? 0
  const currentItem = items[qIndex]

  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange

  useEffect(() => {
    onAnswersChangeRef.current(new Map(answers))
  }, [answers])

  useEffect(() => {
    if (onNavigationStateChange) {
      const answeredIndices = items
        .map((item, i) => {
          const answer = answers.get(item.item_id)
          return answer && answer.trim().length > 0 ? i : -1
        })
        .filter((i) => i >= 0)
      onNavigationStateChange({
        currentIndex: qIndex,
        totalItems: items.length,
        answeredItemIds: items
          .filter((item) => {
            const a = answers.get(item.item_id)
            return a && a.trim().length > 0
          })
          .map((item) => item.item_id),
        answeredIndices,
      })
    }
  }, [answers, items, qIndex, onNavigationStateChange])

  const handleInputChange = useCallback(
    (itemId: string, value: string) => {
      setAnswers((prev) => {
        const next = new Map(prev)
        next.set(itemId, value)
        return next
      })
    },
    [],
  )

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No items available.
      </div>
    )
  }

  if (showResults) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">
          Writing Submitted
        </h2>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
            Pending Teacher Review
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Your responses have been saved. Your teacher will review and score them.
        </p>
      </div>
    )
  }

  const userAnswer = answers.get(currentItem.item_id) || ""
  const wordCount = countWords(userAnswer)
  const isUnderMin = wordCount > 0 && wordCount < currentItem.min_words
  const isOverMax = wordCount > currentItem.max_words

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-4 p-4 sm:p-6">
      <Card className="w-full shadow-lg">
        <CardContent className="p-6">
          {/* Prompt */}
          <div className="w-full text-center mb-6">
            <p className="text-lg font-medium">
              {currentItem.prompt}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Write {currentItem.min_words}–{currentItem.max_words} words
            </p>
          </div>

          {/* Textarea */}
          <div className="w-full space-y-2">
            <textarea
              value={userAnswer}
              onChange={(e) =>
                handleInputChange(currentItem.item_id, e.target.value)
              }
              disabled={showResults}
              className={cn(
                "w-full px-4 py-3 border rounded-lg text-base bg-background resize-none outline-none transition-colors min-h-[160px]",
                "border-gray-300 dark:border-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500",
              )}
              placeholder="Write your response here..."
              autoFocus
            />

            {/* Word counter */}
            <div className="flex justify-between text-xs">
              <span
                className={cn(
                  "font-medium",
                  isUnderMin && "text-amber-600",
                  isOverMax && "text-red-600",
                  !isUnderMin && !isOverMax && wordCount > 0 && "text-green-600",
                  wordCount === 0 && "text-muted-foreground",
                )}
              >
                {wordCount} word{wordCount !== 1 ? "s" : ""}
              </span>
              <span className="text-muted-foreground">
                {currentItem.min_words}–{currentItem.max_words} words
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
