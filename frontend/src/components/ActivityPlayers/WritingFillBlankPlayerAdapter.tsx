/**
 * WritingFillBlankPlayerAdapter - Player for Writing Fill-in-the-Blank
 * Story 30.11: Activity Player Updates - Task 4
 *
 * Context prompt + sentence with blank. Students type appropriate words.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { ActivityConfig } from "@/lib/mockData"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"

interface WritingFillBlankItem {
  item_id: string
  context: string
  sentence: string
  difficulty?: string
}

interface WritingFillBlankContent {
  activity_id: string
  items: WritingFillBlankItem[]
  total_items: number
  difficulty: string
}

interface WritingFillBlankPlayerAdapterProps {
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

export function WritingFillBlankPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  initialAnswers,
  showCorrectAnswers,
  currentQuestionIndex,
  onQuestionIndexChange: _onQuestionIndexChange,
  onNavigationStateChange,
}: WritingFillBlankPlayerAdapterProps) {
  const content = (activity as any).content as WritingFillBlankContent
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
          Writing Fill-blank Complete!
        </h2>
        <p className="text-lg">Score: {score}%</p>
        <p className="text-sm text-gray-600">
          {correct} out of {total} correct
        </p>
      </div>
    )
  }

  const parts = currentItem.sentence.split("_______")
  const userAnswer = answers.get(currentItem.item_id) || ""

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-4 p-4 sm:p-6">
      <Card className="w-full shadow-lg">
        <CardContent className="p-6">
          {/* Sentence with blank */}
          <div className="text-center text-lg leading-relaxed">
            {parts[0]}
            <input
              type="text"
              value={userAnswer}
              onChange={(e) =>
                handleInputChange(currentItem.item_id, e.target.value)
              }
              disabled={showResults}
              className={cn(
                "inline-block w-40 mx-1 px-3 py-1 border-b-2 text-center text-lg font-medium bg-transparent outline-none transition-colors",
                "border-teal-400 focus:border-teal-600",
                showCorrectAnswers &&
                  correctAnswers.has(currentItem.item_id) &&
                  "border-green-500 text-green-700",
              )}
              placeholder="..."
              autoFocus
            />
            {parts[1] || ""}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
