/**
 * AIQuizPlayer - AI-Generated MCQ Quiz Player
 * Story 27.9: AI Quiz Generation (MCQ)
 *
 * Displays MCQ quiz where students select the correct answer
 * from four options. Shows no feedback until quiz is submitted.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"
import type { AIQuizPublic } from "@/types/ai-quiz"

/** @deprecated Use QuestionNavigationState from @/types/activity-player instead */
export type AIQuizNavigationState = QuestionNavigationState

interface AIQuizPlayerProps {
  /** The quiz to display */
  quiz: AIQuizPublic
  /** Callback when quiz is submitted */
  onSubmit: (answers: Record<string, number>) => void
  /** Whether submission is in progress */
  isSubmitting?: boolean
  /** Initial answers (for resuming) */
  initialAnswers?: Record<string, number>
  /** Hide the submit button (when embedded in ActivityPlayer which has its own submit) */
  hideSubmitButton?: boolean
  /** Callback when answers change (for parent to track progress) */
  onAnswersChange?: (answers: Record<string, number>) => void
  /** External control: current question index (when controlled by parent) */
  currentQuestionIndex?: number
  /** External control: callback when current question should change */
  onQuestionIndexChange?: (index: number) => void
  /** Callback to expose navigation state to parent */
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

export function AIQuizPlayer({
  quiz,
  onSubmit,
  isSubmitting = false,
  initialAnswers = {},
  hideSubmitButton = false,
  onAnswersChange,
  currentQuestionIndex,
  onQuestionIndexChange,
  onNavigationStateChange,
}: AIQuizPlayerProps) {
  // Internal current question index (used when not externally controlled)
  const [internalIndex, setInternalIndex] = useState(0)
  // Use external index if provided, otherwise internal
  const isExternallyControlled = currentQuestionIndex !== undefined
  const currentIndex = isExternallyControlled
    ? currentQuestionIndex
    : internalIndex

  // Setter that works for both internal and external control
  const setCurrentIndex = useCallback(
    (index: number) => {
      if (isExternallyControlled && onQuestionIndexChange) {
        onQuestionIndexChange(index)
      } else {
        setInternalIndex(index)
      }
    },
    [isExternallyControlled, onQuestionIndexChange],
  )

  // Selected answers map: questionId -> selected option index
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers)
  // Confirm dialog visibility
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const totalQuestions = quiz.questions.length
  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === totalQuestions

  // Reset answers when initialAnswers changes (for Reset functionality)
  useEffect(() => {
    setAnswers(initialAnswers)
    // Also reset to first question on reset
    if (Object.keys(initialAnswers).length === 0) {
      if (!isExternallyControlled) {
        setInternalIndex(0)
      } else if (onQuestionIndexChange) {
        onQuestionIndexChange(0)
      }
    }
  }, [initialAnswers, isExternallyControlled, onQuestionIndexChange])

  // Store callbacks in refs to avoid infinite loops
  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange
  const onNavigationStateChangeRef = useRef(onNavigationStateChange)
  onNavigationStateChangeRef.current = onNavigationStateChange

  // Notify parent when answers change
  useEffect(() => {
    const callback = onAnswersChangeRef.current
    if (callback) {
      callback(answers)
    }
  }, [answers])

  // Track previous navigation state to avoid unnecessary updates
  const prevNavStateRef = useRef<string>("")

  // Notify parent of navigation state changes
  useEffect(() => {
    const callback = onNavigationStateChangeRef.current
    if (callback) {
      // Calculate answered indices based on question order
      const answeredIndices: number[] = []
      const answeredItemIds: string[] = []
      quiz.questions.forEach((q, index) => {
        if (answers[q.question_id] !== undefined) {
          answeredIndices.push(index)
          answeredItemIds.push(q.question_id)
        }
      })

      // Only call if state actually changed
      const stateKey = `${currentIndex}-${totalQuestions}-${answeredItemIds.join(",")}`
      if (prevNavStateRef.current !== stateKey) {
        prevNavStateRef.current = stateKey
        callback({
          currentIndex,
          totalItems: totalQuestions,
          answeredItemIds,
          answeredIndices,
        })
      }
    }
  }, [currentIndex, totalQuestions, answers, quiz.questions])

  const currentQuestion = quiz.questions[currentIndex]

  // Handle option selection
  const handleSelectOption = useCallback(
    (questionId: string, optionIndex: number) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: optionIndex,
      }))
    },
    [],
  )

  // Navigate to previous question
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }, [currentIndex, setCurrentIndex])

  // Navigate to next question
  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }, [currentIndex, totalQuestions, setCurrentIndex])

  // Handle submit button click
  const handleSubmitClick = useCallback(() => {
    if (allAnswered) {
      setShowConfirmDialog(true)
    }
  }, [allAnswered])

  // Confirm and submit
  const handleConfirmSubmit = useCallback(() => {
    setShowConfirmDialog(false)
    onSubmit(answers)
  }, [answers, onSubmit])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevious()
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if (e.key >= "1" && e.key <= "4") {
        const optionIndex = parseInt(e.key, 10) - 1
        if (currentQuestion.options[optionIndex]) {
          handleSelectOption(currentQuestion.question_id, optionIndex)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handlePrevious, handleNext, handleSelectOption, currentQuestion])

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-4 p-4">
      {/* Question card */}
      <Card className="w-full shadow-lg">
        <CardContent className="p-6">
          {/* Question text */}
          <div className="mb-6 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 p-6 dark:from-teal-950/50 dark:to-cyan-950/50">
            <p className="text-center text-lg font-medium leading-relaxed text-gray-800 dark:text-gray-200">
              {currentQuestion.question_text}
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = answers[currentQuestion.question_id] === index
              return (
                <Button
                  key={`${currentQuestion.question_id}-${index}`}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "h-auto min-h-[3rem] justify-start whitespace-normal py-3 px-4 text-left text-base transition-all",
                    isSelected &&
                      "bg-teal-600 text-white hover:bg-teal-700 hover:text-white dark:bg-teal-600 dark:hover:bg-teal-700",
                    !isSelected &&
                      "hover:border-teal-300 hover:bg-teal-50 hover:text-gray-900 dark:hover:border-teal-700 dark:hover:bg-teal-950/50 dark:hover:text-gray-100",
                  )}
                  onClick={() =>
                    handleSelectOption(currentQuestion.question_id, index)
                  }
                >
                  <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-medium dark:bg-gray-700">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{option}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit button - hidden when embedded in ActivityPlayer */}
      {!hideSubmitButton && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmitClick}
            disabled={!allAnswered || isSubmitting}
            className="min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Submitting...
              </>
            ) : (
              "Submit Quiz"
            )}
          </Button>
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered all {totalQuestions} questions. Once submitted,
              you cannot change your answers. Are you sure you want to submit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review Answers</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AIQuizPlayer
