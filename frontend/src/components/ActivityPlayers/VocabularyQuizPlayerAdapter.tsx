/**
 * VocabularyQuizPlayerAdapter - Adapter for VocabularyQuizPlayer
 * Story 27.20: Unified Activity Player Integration
 *
 * Bridges the interface between ActivityPlayer and VocabularyQuizPlayer.
 * Converts ActivityPlayer's interface to match VocabularyQuizPlayer's expected props.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ActivityConfig, VocabularyQuizActivity } from "@/lib/mockData"
import type { QuestionNavigationState } from "@/types/activity-player"
import type { VocabularyQuizPublic } from "@/types/vocabulary-quiz"
import { VocabularyQuizPlayer } from "./VocabularyQuizPlayer"

interface VocabularyQuizPlayerAdapterProps {
  activity: ActivityConfig
  onAnswersChange: (answers: Map<string, string>) => void
  showResults: boolean
  correctAnswers: Set<string>
  initialAnswers?: Map<string, string>
  showCorrectAnswers?: boolean
  /** External control: current question index */
  currentQuestionIndex?: number
  /** External control: callback when question index changes */
  onQuestionIndexChange?: (index: number) => void
  /** Callback to expose navigation state to parent */
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

/**
 * Adapter component that wraps VocabularyQuizPlayer to work with ActivityPlayer interface
 */
export function VocabularyQuizPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  initialAnswers,
  currentQuestionIndex,
  onQuestionIndexChange,
  onNavigationStateChange,
}: VocabularyQuizPlayerAdapterProps) {
  // Type assertion to access content property
  const quiz = (activity as VocabularyQuizActivity)
    .content as VocabularyQuizPublic

  // Convert initialAnswers from Map to Record
  // Memoized to prevent infinite loops from creating new object on every render
  const initialAnswersRecord = useMemo(() => {
    return initialAnswers ? Object.fromEntries(initialAnswers) : {}
  }, [initialAnswers])

  // Track answers locally
  const [answers, setAnswers] =
    useState<Record<string, string>>(initialAnswersRecord)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Store callback in ref to prevent infinite loops
  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange

  // Update parent when answers change (for auto-save)
  useEffect(() => {
    const callback = onAnswersChangeRef.current
    const answersMap = new Map(Object.entries(answers))
    callback(answersMap)
  }, [answers])

  // Handle quiz submission
  const handleSubmit = (submittedAnswers: Record<string, string>) => {
    setAnswers(submittedAnswers)
    setIsSubmitting(true)

    // Convert to Map and notify parent
    const answersMap = new Map(Object.entries(submittedAnswers))
    onAnswersChange(answersMap)

    // The parent ActivityPlayer will handle scoring and submission
    setIsSubmitting(false)
  }

  // Show results view
  if (showResults) {
    // Calculate score
    const totalQuestions = quiz.questions.length
    let correctCount = 0

    quiz.questions.forEach((question) => {
      if (correctAnswers.has(question.question_id)) {
        correctCount++
      }
    })

    const score = Math.round((correctCount / totalQuestions) * 100)

    // Simple results display for integration with ActivityPlayer
    // Full VocabularyQuizResults component requires complete result object from backend
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
        <p className="text-lg">Score: {score}%</p>
        <p className="text-sm text-gray-600">
          {correctCount} out of {totalQuestions} correct
        </p>
      </div>
    )
  }

  // Handle answers change from VocabularyQuizPlayer
  // Memoized to prevent infinite loops
  const handleAnswersChange = useCallback(
    (newAnswers: Record<string, string>) => {
      setAnswers(newAnswers)
    },
    [],
  )

  // Show quiz player
  return (
    <VocabularyQuizPlayer
      quiz={quiz}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      initialAnswers={initialAnswersRecord}
      hideSubmitButton={true}
      onAnswersChange={handleAnswersChange}
      currentQuestionIndex={currentQuestionIndex}
      onQuestionIndexChange={onQuestionIndexChange}
      onNavigationStateChange={onNavigationStateChange}
    />
  )
}
