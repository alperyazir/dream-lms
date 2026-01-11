/**
 * WordBuilderPlayerAdapter - Adapter for WordBuilderPlayer
 * Story 27.20: Unified Activity Player Integration
 *
 * Bridges the interface between ActivityPlayer and WordBuilderPlayer.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { ActivityConfig, WordBuilderActivity } from "@/lib/mockData"
import type { QuestionNavigationState } from "@/types/activity-player"
import type {
  WordBuilderActivityPublic,
  WordBuilderSubmission,
} from "@/types/word-builder"
import { WordBuilderPlayer } from "./WordBuilderPlayer"

interface WordBuilderPlayerAdapterProps {
  activity: ActivityConfig
  onAnswersChange: (answers: Map<string, string>) => void
  showResults: boolean
  correctAnswers: Set<string>
  initialAnswers?: Map<string, string>
  showCorrectAnswers?: boolean
  /** External control: current word index */
  currentWordIndex?: number
  /** External control: callback when word index changes */
  onWordIndexChange?: (index: number) => void
  /** Callback to expose navigation state to parent */
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

export function WordBuilderPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  initialAnswers,
  currentWordIndex,
  onWordIndexChange,
  onNavigationStateChange,
}: WordBuilderPlayerAdapterProps) {
  // Type assertion to access content property
  const wordBuilder = (activity as WordBuilderActivity)
    .content as WordBuilderActivityPublic

  const initialAnswersRecord = initialAnswers
    ? Object.fromEntries(initialAnswers)
    : {}

  const [answers, setAnswers] =
    useState<Record<string, string>>(initialAnswersRecord)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Store callback in ref to prevent infinite loops
  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange

  useEffect(() => {
    const callback = onAnswersChangeRef.current
    const answersMap = new Map(Object.entries(answers))
    callback(answersMap)
  }, [answers])

  const handleSubmit = (submission: WordBuilderSubmission) => {
    setAnswers(submission.answers)
    setIsSubmitting(true)

    const answersMap = new Map(Object.entries(submission.answers))
    onAnswersChange(answersMap)

    setIsSubmitting(false)
  }

  if (showResults) {
    const totalWords = wordBuilder.words.length
    let correctCount = 0

    wordBuilder.words.forEach((word) => {
      if (correctAnswers.has(word.item_id)) {
        correctCount++
      }
    })

    const score = Math.round((correctCount / totalWords) * 100)

    // Simple results display for integration with ActivityPlayer
    // Full WordBuilderResults component requires complete result object from backend
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Word Builder Complete!</h2>
        <p className="text-lg">Score: {score}%</p>
        <p className="text-sm text-gray-600">
          {correctCount} out of {totalWords} correct
        </p>
      </div>
    )
  }

  // Handle answers change from WordBuilderPlayer
  // Memoized to prevent infinite loops
  const handleAnswersChange = useCallback(
    (newAnswers: Record<string, string>) => {
      setAnswers(newAnswers)
    },
    [],
  )

  return (
    <WordBuilderPlayer
      activity={wordBuilder}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      hideSubmitButton={true}
      onAnswersChange={handleAnswersChange}
      currentWordIndex={currentWordIndex}
      onWordIndexChange={onWordIndexChange}
      onNavigationStateChange={onNavigationStateChange}
    />
  )
}
