/**
 * VocabularyQuizPlayer - AI-Generated Vocabulary Quiz Player
 * Story 27.8: Vocabulary Quiz Generation (Definition-Based)
 *
 * Displays definition-based vocabulary quiz where students
 * select the correct word matching each English definition.
 */

import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react"
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
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"
import type { VocabularyQuizPublic } from "@/types/vocabulary-quiz"

interface VocabularyQuizPlayerProps {
  /** The quiz to display */
  quiz: VocabularyQuizPublic
  /** Callback when quiz is submitted */
  onSubmit: (answers: Record<string, string>) => void
  /** Whether submission is in progress */
  isSubmitting?: boolean
  /** Initial answers (for resuming) */
  initialAnswers?: Record<string, string>
  /** Hide the submit button (when embedded in ActivityPlayer which has its own submit) */
  hideSubmitButton?: boolean
  /** Callback when answers change (for parent to track progress) */
  onAnswersChange?: (answers: Record<string, string>) => void
  /** External control: current question index (when controlled by parent) */
  currentQuestionIndex?: number
  /** External control: callback when current question should change */
  onQuestionIndexChange?: (index: number) => void
  /** Callback to expose navigation state to parent */
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

export function VocabularyQuizPlayer({
  quiz,
  onSubmit,
  isSubmitting = false,
  initialAnswers = {},
  hideSubmitButton = false,
  onAnswersChange,
  currentQuestionIndex,
  onQuestionIndexChange,
  onNavigationStateChange,
}: VocabularyQuizPlayerProps) {
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

  // Selected answers map: questionId -> selected option
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers)
  // Confirm dialog visibility
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  // Audio playing state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const totalQuestions = quiz.questions.length
  const currentQuestion = quiz.questions[currentIndex]

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
  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === totalQuestions
  const progressPercent = (answeredCount / totalQuestions) * 100

  // Handle option selection
  const handleSelectOption = useCallback(
    (questionId: string, option: string) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: option,
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

  // Play audio for a word
  const handlePlayAudio = useCallback((audioUrl: string | null) => {
    if (!audioUrl) return

    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const audio = new Audio(audioUrl)
    audioRef.current = audio
    setPlayingAudio(audioUrl)

    audio.onended = () => {
      setPlayingAudio(null)
      audioRef.current = null
    }

    audio.onerror = () => {
      setPlayingAudio(null)
      audioRef.current = null
    }

    audio.play().catch(() => {
      setPlayingAudio(null)
      audioRef.current = null
    })
  }, [])

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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

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
          handleSelectOption(
            currentQuestion.question_id,
            currentQuestion.options[optionIndex],
          )
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handlePrevious, handleNext, handleSelectOption, currentQuestion])

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center gap-6 p-4">
      {/* Progress bar - hide when externally controlled */}
      {!isExternallyControlled && (
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span>
              {answeredCount} of {totalQuestions} answered
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Question card */}
      <Card className="w-full shadow-lg">
        <CardContent className="p-6">
          {/* Audio button */}
          <div className="mb-4 flex items-center justify-end">
            {currentQuestion.audio_url && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePlayAudio(currentQuestion.audio_url)}
                disabled={playingAudio === currentQuestion.audio_url}
                className="h-8 w-8"
                aria-label="Listen to pronunciation"
              >
                <Volume2
                  className={cn(
                    "h-5 w-5",
                    playingAudio === currentQuestion.audio_url &&
                      "animate-pulse text-teal-600",
                  )}
                />
              </Button>
            )}
          </div>

          {/* Definition */}
          <div className="mb-6 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 p-6 dark:from-teal-950/50 dark:to-cyan-950/50">
            <p className="text-center text-lg font-medium leading-relaxed text-gray-800 dark:text-gray-200">
              "{currentQuestion.definition}"
            </p>
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-2 gap-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = answers[currentQuestion.question_id] === option
              return (
                <Button
                  key={option}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "h-auto min-h-[3rem] whitespace-normal py-3 text-base transition-all",
                    isSelected &&
                      "bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700",
                    !isSelected &&
                      "hover:border-teal-300 hover:bg-teal-50 dark:hover:border-teal-700 dark:hover:bg-teal-950/50",
                  )}
                  onClick={() =>
                    handleSelectOption(currentQuestion.question_id, option)
                  }
                >
                  <span className="mr-2 text-sm opacity-70">{index + 1}.</span>
                  {option}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation - hide when externally controlled */}
      {!isExternallyControlled && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>

          {/* Question dots */}
          <div className="flex gap-1.5">
            {quiz.questions.map((q, i) => (
              <button
                key={q.question_id}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-all",
                  i === currentIndex
                    ? "scale-125 bg-teal-600"
                    : answers[q.question_id]
                      ? "bg-teal-300 dark:bg-teal-700"
                      : "bg-gray-200 dark:bg-gray-700",
                )}
                aria-label={`Go to question ${i + 1}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex === totalQuestions - 1}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

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

      {/* Keyboard hints - hide when externally controlled */}
      {!isExternallyControlled && (
        <p className="text-center text-xs text-muted-foreground">
          Tip: Use arrow keys to navigate, 1-4 to select answers
        </p>
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

export default VocabularyQuizPlayer
