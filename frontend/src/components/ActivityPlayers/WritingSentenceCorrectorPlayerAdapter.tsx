/**
 * WritingSentenceCorrectorPlayerAdapter - Player for Sentence Corrector
 *
 * Shows an incorrect sentence. Student types the corrected version.
 * Fuzzy-matched against the correct sentence.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { ActivityConfig } from "@/lib/mockData"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"

interface SentenceCorrectorItem {
  item_id: string
  context: string
  incorrect_sentence: string
  correct_sentence?: string
  error_type: string
  difficulty?: string
}

interface SentenceCorrectorContent {
  activity_id: string
  items: SentenceCorrectorItem[]
  total_items: number
  difficulty: string
}

interface WritingSentenceCorrectorPlayerAdapterProps {
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

const ERROR_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  word_order: { label: "Word Order", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  grammar: { label: "Grammar", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  spelling: { label: "Spelling", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
  mixed: { label: "Mixed", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
}

export function WritingSentenceCorrectorPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  initialAnswers,
  showCorrectAnswers,
  currentQuestionIndex,
  onQuestionIndexChange: _onQuestionIndexChange,
  onNavigationStateChange,
}: WritingSentenceCorrectorPlayerAdapterProps) {
  const content = (activity as any).content as SentenceCorrectorContent
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
    const total = items.length
    const correct = items.filter((item) =>
      correctAnswers.has(item.item_id),
    ).length
    const score = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">
          Sentence Corrector Complete!
        </h2>
        <p className="text-lg">Score: {score}%</p>
        <p className="text-sm text-gray-600">
          {correct} out of {total} correct
        </p>
      </div>
    )
  }

  const userAnswer = answers.get(currentItem.item_id) || ""
  const errorTypeInfo = ERROR_TYPE_LABELS[currentItem.error_type] || ERROR_TYPE_LABELS.mixed

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-4 p-4 sm:p-6">
      <Card className="w-full shadow-lg">
        <CardContent className="p-6">
          {/* Header */}
          <p className="text-lg font-semibold text-center mb-6">
            Fix the sentence below
          </p>

          {/* Incorrect sentence */}
          <div className="w-full px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 select-none mb-6">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">
              Incorrect Sentence
            </p>
            <p className="text-lg font-medium text-red-800 dark:text-red-200" onCopy={(e) => e.preventDefault()}>
              {currentItem.incorrect_sentence}
            </p>
          </div>

          {/* Input for corrected sentence */}
          <div className="w-full space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Type the corrected sentence:
            </label>
            <textarea
              value={userAnswer}
              onChange={(e) =>
                handleInputChange(currentItem.item_id, e.target.value)
              }
              disabled={showResults}
              className={cn(
                "w-full px-4 py-3 border rounded-lg text-base bg-background resize-none outline-none transition-colors min-h-[80px]",
                "border-gray-300 dark:border-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500",
                showCorrectAnswers &&
                  correctAnswers.has(currentItem.item_id) &&
                  "border-green-500 bg-green-50 dark:bg-green-900/20",
              )}
              placeholder="Write the corrected sentence here..."
              autoFocus
            />
          </div>

          {/* Show correct answer when reviewing */}
          {showCorrectAnswers && currentItem.correct_sentence && (
            <div className="w-full mt-6 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                Correct Answer
              </p>
              <p className="text-base text-green-800 dark:text-green-200">
                {currentItem.correct_sentence}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
