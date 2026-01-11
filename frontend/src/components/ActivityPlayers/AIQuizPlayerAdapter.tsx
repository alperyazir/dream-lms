/**
 * AIQuizPlayerAdapter - Adapter for AIQuizPlayer
 * Story 27.20: Unified Activity Player Integration
 *
 * Bridges the interface between ActivityPlayer and AIQuizPlayer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ActivityConfig, AIQuizActivity } from "@/lib/mockData"
import type { QuestionNavigationState } from "@/types/activity-player"
import type { AIQuizPublic } from "@/types/ai-quiz"
import { AIQuizPlayer } from "./AIQuizPlayer"

interface AIQuizPlayerAdapterProps {
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

export function AIQuizPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  initialAnswers,
  currentQuestionIndex,
  onQuestionIndexChange,
  onNavigationStateChange,
}: AIQuizPlayerAdapterProps) {
  // Type assertion to access content property
  const quiz = (activity as AIQuizActivity).content as AIQuizPublic

  // Convert initialAnswers from Map<string, string> to Record<string, number>
  // The string values are option indices stored as strings
  // Memoized to prevent infinite loops from creating new object on every render
  const initialAnswersRecord = useMemo(() => {
    const record: Record<string, number> = {}
    if (initialAnswers) {
      initialAnswers.forEach((value, key) => {
        record[key] = parseInt(value, 10)
      })
    }
    return record
  }, [initialAnswers])

  const [answers, setAnswers] =
    useState<Record<string, number>>(initialAnswersRecord)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Store callback in ref to prevent infinite loops
  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange

  useEffect(() => {
    // Convert answers to Map<string, string> for parent (storing indices as strings)
    const callback = onAnswersChangeRef.current
    const answersMap = new Map(
      Object.entries(answers).map(([k, v]) => [k, String(v)]),
    )
    callback(answersMap)
  }, [answers])

  const handleSubmit = (submittedAnswers: Record<string, number>) => {
    setAnswers(submittedAnswers)
    setIsSubmitting(true)

    // Convert to Map<string, string> for parent
    const answersMap = new Map(
      Object.entries(submittedAnswers).map(([k, v]) => [k, String(v)]),
    )
    onAnswersChange(answersMap)

    setIsSubmitting(false)
  }

  if (showResults) {
    const totalQuestions = quiz.questions.length
    let correctCount = 0

    quiz.questions.forEach((question) => {
      if (correctAnswers.has(question.question_id)) {
        correctCount++
      }
    })

    const score = Math.round((correctCount / totalQuestions) * 100)

    // Simple results display for integration with ActivityPlayer
    // Full AIQuizResults component requires complete result object from backend
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

  // Handle answers change from AIQuizPlayer
  // Memoized to prevent infinite loops
  const handleAnswersChange = useCallback(
    (newAnswers: Record<string, number>) => {
      setAnswers(newAnswers)
    },
    [],
  )

  return (
    <AIQuizPlayer
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
