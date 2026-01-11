/**
 * ReadingComprehensionPlayerAdapter - Adapter for ReadingComprehensionPlayer
 * Story 27.20: Unified Activity Player Integration
 *
 * Bridges the interface between ActivityPlayer and ReadingComprehensionPlayer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  ActivityConfig,
  ReadingComprehensionActivity,
} from "@/lib/mockData"
import type { QuestionNavigationState } from "@/types/activity-player"
import type {
  ReadingComprehensionActivityPublic,
  ReadingComprehensionAnswer,
} from "@/types/reading-comprehension"
import { ReadingComprehensionPlayer } from "./ReadingComprehensionPlayer"

interface ReadingComprehensionPlayerAdapterProps {
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

export function ReadingComprehensionPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  initialAnswers,
  currentQuestionIndex,
  onQuestionIndexChange,
  onNavigationStateChange,
}: ReadingComprehensionPlayerAdapterProps) {
  // Type assertion to access content property
  const comprehension = (activity as ReadingComprehensionActivity)
    .content as ReadingComprehensionActivityPublic

  // Convert Map<string, string> to ReadingComprehensionAnswer[]
  // Format: "questionId" -> "index:3" or "text:answer"
  // Memoized to prevent infinite loops from creating new array on every render
  const initialAnswersArray = useMemo(() => {
    const answers: ReadingComprehensionAnswer[] = []
    if (initialAnswers) {
      initialAnswers.forEach((value, questionId) => {
        if (value.startsWith("index:")) {
          answers.push({
            question_id: questionId,
            answer_index: parseInt(value.substring(6), 10),
            answer_text: null,
          })
        } else if (value.startsWith("text:")) {
          answers.push({
            question_id: questionId,
            answer_index: null,
            answer_text: value.substring(5),
          })
        }
      })
    }
    return answers
  }, [initialAnswers])

  const [answers, setAnswers] =
    useState<ReadingComprehensionAnswer[]>(initialAnswersArray)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Store callback in ref to prevent infinite loops
  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange

  useEffect(() => {
    // Convert ReadingComprehensionAnswer[] to Map<string, string>
    const callback = onAnswersChangeRef.current
    const answersMap = new Map<string, string>()
    answers.forEach((answer) => {
      if (answer.answer_index !== null && answer.answer_index !== undefined) {
        answersMap.set(answer.question_id, `index:${answer.answer_index}`)
      } else if (answer.answer_text) {
        answersMap.set(answer.question_id, `text:${answer.answer_text}`)
      }
    })
    callback(answersMap)
  }, [answers])

  const handleSubmit = (submittedAnswers: ReadingComprehensionAnswer[]) => {
    setAnswers(submittedAnswers)
    setIsSubmitting(true)

    // Convert to Map for parent
    const answersMap = new Map<string, string>()
    submittedAnswers.forEach((answer) => {
      if (answer.answer_index !== null && answer.answer_index !== undefined) {
        answersMap.set(answer.question_id, `index:${answer.answer_index}`)
      } else if (answer.answer_text) {
        answersMap.set(answer.question_id, `text:${answer.answer_text}`)
      }
    })
    onAnswersChange(answersMap)

    setIsSubmitting(false)
  }

  if (showResults) {
    const totalQuestions = comprehension.questions.length
    let correctCount = 0

    comprehension.questions.forEach((question) => {
      if (correctAnswers.has(question.question_id)) {
        correctCount++
      }
    })

    const score = Math.round((correctCount / totalQuestions) * 100)

    // ReadingComprehensionResults expects different props - needs checking
    // For now, return a placeholder
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

  // Handle answers change from ReadingComprehensionPlayer
  // Memoized to prevent infinite loops
  const handleAnswersChange = useCallback(
    (newAnswers: ReadingComprehensionAnswer[]) => {
      setAnswers(newAnswers)
    },
    [],
  )

  return (
    <ReadingComprehensionPlayer
      activity={comprehension}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      initialAnswers={initialAnswersArray}
      hideSubmitButton={true}
      onAnswersChange={handleAnswersChange}
      currentQuestionIndex={currentQuestionIndex}
      onQuestionIndexChange={onQuestionIndexChange}
      onNavigationStateChange={onNavigationStateChange}
    />
  )
}
