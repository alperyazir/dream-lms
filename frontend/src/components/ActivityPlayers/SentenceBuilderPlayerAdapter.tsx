/**
 * SentenceBuilderPlayerAdapter - Adapter for SentenceBuilderPlayer
 * Story 27.20: Unified Activity Player Integration
 *
 * Bridges the interface between ActivityPlayer and SentenceBuilderPlayer.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { ActivityConfig, SentenceBuilderActivity } from "@/lib/mockData"
import type { QuestionNavigationState } from "@/types/activity-player"
import type {
  SentenceBuilderActivityPublic,
  SentenceBuilderSubmission,
} from "@/types/sentence-builder"
import { SentenceBuilderPlayer } from "./SentenceBuilderPlayer"

interface SentenceBuilderPlayerAdapterProps {
  activity: ActivityConfig
  onAnswersChange: (answers: Map<string, string>) => void
  showResults: boolean
  correctAnswers: Set<string>
  initialAnswers?: Map<string, string>
  showCorrectAnswers?: boolean
  /** External control: current sentence index */
  currentSentenceIndex?: number
  /** External control: callback when sentence index changes */
  onSentenceIndexChange?: (index: number) => void
  /** Callback to expose navigation state to parent */
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

export function SentenceBuilderPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  currentSentenceIndex,
  onSentenceIndexChange,
  onNavigationStateChange,
}: SentenceBuilderPlayerAdapterProps) {
  // Type assertion to access content property
  const sentenceBuilder = (activity as SentenceBuilderActivity)
    .content as SentenceBuilderActivityPublic

  // SentenceBuilder uses Record<string, string[]> internally
  // We need to serialize/deserialize arrays to/from strings
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Store callback in ref to prevent infinite loops
  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange

  useEffect(() => {
    // Convert Record<string, string[]> to Map<string, string>
    // Serialize arrays as JSON strings
    const callback = onAnswersChangeRef.current
    const answersMap = new Map<string, string>()
    Object.entries(answers).forEach(([key, value]) => {
      answersMap.set(key, JSON.stringify(value))
    })
    callback(answersMap)
  }, [answers])

  const handleSubmit = (submission: SentenceBuilderSubmission) => {
    setAnswers(submission.answers)
    setIsSubmitting(true)

    // Convert to Map for parent
    const answersMap = new Map<string, string>()
    Object.entries(submission.answers).forEach(([key, value]) => {
      answersMap.set(key, JSON.stringify(value))
    })
    onAnswersChange(answersMap)

    setIsSubmitting(false)
  }

  if (showResults) {
    const totalSentences = sentenceBuilder.sentences.length
    let correctCount = 0

    sentenceBuilder.sentences.forEach((sentence) => {
      if (correctAnswers.has(sentence.item_id)) {
        correctCount++
      }
    })

    const score = Math.round((correctCount / totalSentences) * 100)

    // Simple results display for integration with ActivityPlayer
    // Full SentenceBuilderResults component requires complete result object from backend
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Sentence Builder Complete!</h2>
        <p className="text-lg">Score: {score}%</p>
        <p className="text-sm text-gray-600">
          {correctCount} out of {totalSentences} correct
        </p>
      </div>
    )
  }

  // Handle answers change from SentenceBuilderPlayer
  // Memoized to prevent infinite loops
  const handleAnswersChange = useCallback(
    (newAnswers: Record<string, string[]>) => {
      setAnswers(newAnswers)
    },
    [],
  )

  return (
    <SentenceBuilderPlayer
      activity={sentenceBuilder}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      hideSubmitButton={true}
      onAnswersChange={handleAnswersChange}
      currentSentenceIndex={currentSentenceIndex}
      onSentenceIndexChange={onSentenceIndexChange}
      onNavigationStateChange={onNavigationStateChange}
    />
  )
}
