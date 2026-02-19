/**
 * GrammarFillBlankPlayerAdapter - Player for Grammar Fill-in-the-Blank
 * Story 30.11: Activity Player Updates - Task 3
 *
 * Two modes: word_bank (tap options) or free_type (text input).
 */

import { HelpCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ActivityConfig } from "@/lib/mockData"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"

interface GrammarFillBlankItem {
  item_id: string
  sentence: string
  word_bank: string[] | null
  grammar_topic: string
  grammar_hint: string | null
  difficulty?: string
}

interface GrammarFillBlankContent {
  activity_id: string
  mode: "word_bank" | "free_type"
  items: GrammarFillBlankItem[]
  total_items: number
  difficulty: string
}

interface GrammarFillBlankPlayerAdapterProps {
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

export function GrammarFillBlankPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  initialAnswers,
  showCorrectAnswers,
  currentQuestionIndex,
  onQuestionIndexChange: _onQuestionIndexChange,
  onNavigationStateChange,
}: GrammarFillBlankPlayerAdapterProps) {
  const content = (activity as any).content as GrammarFillBlankContent
  const items = content?.items || []
  const mode = content?.mode || "word_bank"

  const [answers, setAnswers] = useState<Map<string, string>>(
    () => initialAnswers || new Map(),
  )
  const [showHints, setShowHints] = useState<Set<string>>(new Set())

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

  const handleWordBankSelect = useCallback(
    (itemId: string, word: string) => {
      setAnswers((prev) => {
        const next = new Map(prev)
        const current = next.get(itemId)
        // Toggle: if already selected, deselect
        if (current === word) {
          next.delete(itemId)
        } else {
          next.set(itemId, word)
        }
        return next
      })
    },
    [],
  )

  const toggleHint = useCallback((itemId: string) => {
    setShowHints((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

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
          Grammar Fill-blank Complete!
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
  const isHintVisible = showHints.has(currentItem.item_id)

  return (
    <div className="flex flex-col items-center gap-6 p-6 max-w-2xl mx-auto">
      {/* Grammar topic badge */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          {currentItem.grammar_topic.replace(/_/g, " ")}
        </span>
        {currentItem.grammar_hint && (
          <button
            onClick={() => toggleHint(currentItem.item_id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Show hint"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Hint */}
      {isHintVisible && currentItem.grammar_hint && (
        <div className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
          {currentItem.grammar_hint}
        </div>
      )}

      {/* Sentence with blank */}
      <div className="text-center text-lg leading-relaxed">
        {parts[0]}
        {mode === "free_type" ? (
          <input
            type="text"
            value={userAnswer}
            onChange={(e) =>
              handleInputChange(currentItem.item_id, e.target.value)
            }
            disabled={showResults}
            className={cn(
              "inline-block w-40 mx-1 px-3 py-1 border-b-2 text-center text-lg font-medium bg-transparent outline-none transition-colors",
              "border-purple-400 focus:border-purple-600",
              showCorrectAnswers &&
                correctAnswers.has(currentItem.item_id) &&
                "border-green-500 text-green-700",
            )}
            placeholder="..."
          />
        ) : (
          <span
            className={cn(
              "inline-block min-w-[120px] mx-1 px-3 py-1 border-b-2 text-center text-lg font-medium",
              userAnswer
                ? "border-purple-500 text-purple-700 dark:text-purple-300"
                : "border-gray-300 text-gray-400",
              showCorrectAnswers &&
                correctAnswers.has(currentItem.item_id) &&
                "border-green-500 text-green-700",
            )}
          >
            {userAnswer || "___"}
          </span>
        )}
        {parts[1] || ""}
      </div>

      {/* Word bank (word_bank mode only) */}
      {mode === "word_bank" && currentItem.word_bank && (
        <div className="flex flex-wrap justify-center gap-2">
          {currentItem.word_bank.map((word, i) => {
            const isSelected = userAnswer === word
            return (
              <button
                key={i}
                onClick={() =>
                  handleWordBankSelect(currentItem.item_id, word)
                }
                disabled={showResults}
                className={cn(
                  "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                  isSelected
                    ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 shadow-sm"
                    : "border-gray-200 dark:border-gray-600 hover:border-purple-300 text-gray-700 dark:text-gray-300",
                )}
              >
                {word}
              </button>
            )
          })}
        </div>
      )}

      {/* Item counter */}
      <div className="text-sm text-muted-foreground">
        Item {qIndex + 1} of {items.length}
      </div>
    </div>
  )
}
