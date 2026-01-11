/**
 * ReadingComprehensionPlayer - Reading comprehension activity player
 * Story 27.10: Reading Comprehension Generation
 *
 * Displays the passage and questions. Students read the passage
 * and answer MCQ, True/False, and Short Answer questions.
 */

import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"
import type {
  ReadingComprehensionActivityPublic,
  ReadingComprehensionAnswer,
} from "@/types/reading-comprehension"
import { getDifficultyLabel } from "@/types/reading-comprehension"

interface ReadingComprehensionPlayerProps {
  /** The activity to display */
  activity: ReadingComprehensionActivityPublic
  /** Callback when activity is submitted */
  onSubmit: (answers: ReadingComprehensionAnswer[]) => void
  /** Whether submission is in progress */
  isSubmitting?: boolean
  /** Initial answers (for resuming) */
  initialAnswers?: ReadingComprehensionAnswer[]
  /** Hide the submit button (when embedded in ActivityPlayer which has its own submit) */
  hideSubmitButton?: boolean
  /** Callback when answers change (for parent to track progress) */
  onAnswersChange?: (answers: ReadingComprehensionAnswer[]) => void
  /** External control: current question index (when controlled by parent) */
  currentQuestionIndex?: number
  /** External control: callback when current question should change */
  onQuestionIndexChange?: (index: number) => void
  /** Callback to expose navigation state to parent */
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

export function ReadingComprehensionPlayer({
  activity,
  onSubmit,
  isSubmitting = false,
  initialAnswers = [],
  hideSubmitButton = false,
  onAnswersChange,
  currentQuestionIndex,
  onQuestionIndexChange,
  onNavigationStateChange,
}: ReadingComprehensionPlayerProps) {
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

  // Answers map: questionId -> answer
  const [answers, setAnswers] = useState<
    Map<string, ReadingComprehensionAnswer>
  >(() => {
    const map = new Map<string, ReadingComprehensionAnswer>()
    initialAnswers.forEach((a) => map.set(a.question_id, a))
    return map
  })
  // Confirm dialog visibility
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  // Show passage panel on mobile
  const [showPassage, setShowPassage] = useState(true)

  const totalQuestions = activity.questions.length
  const currentQuestion = activity.questions[currentIndex]

  // Store callbacks in refs to avoid infinite loops
  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange
  const onNavigationStateChangeRef = useRef(onNavigationStateChange)
  onNavigationStateChangeRef.current = onNavigationStateChange

  // Notify parent when answers change
  useEffect(() => {
    const callback = onAnswersChangeRef.current
    if (callback) {
      callback(Array.from(answers.values()))
    }
  }, [answers])

  // Memoize navigation state components to prevent infinite loops
  const answeredItemIds = useMemo(() => Array.from(answers.keys()), [answers])
  const answeredIndices = useMemo(() => {
    const indices: number[] = []
    activity.questions.forEach((q, index) => {
      if (answers.has(q.question_id)) {
        indices.push(index)
      }
    })
    return indices
  }, [answers, activity.questions])

  // Track previous navigation state to avoid unnecessary updates
  const prevNavStateRef = useRef<string>("")

  // Notify parent of navigation state changes
  useEffect(() => {
    const callback = onNavigationStateChangeRef.current
    if (callback) {
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
  }, [currentIndex, totalQuestions, answeredItemIds, answeredIndices])

  const answeredCount = answers.size
  const allAnswered = answeredCount === totalQuestions
  const progressPercent = (answeredCount / totalQuestions) * 100

  // Handle MCQ/True-False option selection
  const handleSelectOption = useCallback(
    (questionId: string, optionIndex: number) => {
      setAnswers((prev) => {
        const next = new Map(prev)
        next.set(questionId, {
          question_id: questionId,
          answer_index: optionIndex,
          answer_text: null,
        })
        return next
      })
    },
    [],
  )

  // Handle short answer text input
  const handleTextInput = useCallback((questionId: string, text: string) => {
    setAnswers((prev) => {
      const next = new Map(prev)
      if (text.trim()) {
        next.set(questionId, {
          question_id: questionId,
          answer_index: null,
          answer_text: text,
        })
      } else {
        next.delete(questionId)
      }
      return next
    })
  }, [])

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
    onSubmit(Array.from(answers.values()))
  }, [answers, onSubmit])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (e.key === "ArrowLeft") {
        handlePrevious()
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if (
        e.key >= "1" &&
        e.key <= "4" &&
        currentQuestion.question_type !== "short_answer"
      ) {
        const optionIndex = parseInt(e.key, 10) - 1
        if (currentQuestion.options?.[optionIndex]) {
          handleSelectOption(currentQuestion.question_id, optionIndex)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handlePrevious, handleNext, handleSelectOption, currentQuestion])

  // Get current answer for the question
  const getCurrentAnswer = (questionId: string) => answers.get(questionId)

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-4">
      <div className="flex w-full max-w-6xl flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Passage Panel */}
        <Card
          className={cn(
            "flex-1 shadow-lg lg:max-w-[45%]",
            !showPassage && "hidden lg:block",
          )}
        >
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-600" />
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                {activity.module_title}
              </h2>
            </div>
            <ScrollArea className="h-[300px] lg:h-[500px]">
              <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                  {activity.passage}
                </p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Questions Panel */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Toggle passage button on mobile */}
          <Button
            variant="outline"
            className="lg:hidden"
            onClick={() => setShowPassage(!showPassage)}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            {showPassage ? "Hide Passage" : "Show Passage"}
          </Button>

          {/* Progress bar - hide when externally controlled */}
          {!isExternallyControlled && (
            <div className="space-y-2">
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
          <Card className="shadow-lg">
            <CardContent className="p-6">
              {/* Question text */}
              <div className="mb-6 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 p-6 dark:from-teal-950/50 dark:to-cyan-950/50">
                <p className="text-center text-lg font-medium leading-relaxed text-gray-800 dark:text-gray-200">
                  {currentQuestion.question_text}
                </p>
              </div>

              {/* Answer options or text input */}
              {currentQuestion.question_type === "short_answer" ? (
                <div className="space-y-2">
                  <Label htmlFor="short-answer">Your Answer</Label>
                  <Input
                    id="short-answer"
                    placeholder="Type your answer here..."
                    value={
                      getCurrentAnswer(currentQuestion.question_id)
                        ?.answer_text || ""
                    }
                    onChange={(e) =>
                      handleTextInput(
                        currentQuestion.question_id,
                        e.target.value,
                      )
                    }
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    Brief answer expected (1-5 words)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {currentQuestion.options?.map((option, index) => {
                    const isSelected =
                      getCurrentAnswer(currentQuestion.question_id)
                        ?.answer_index === index
                    return (
                      <Button
                        key={`${currentQuestion.question_id}-${index}`}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "h-auto min-h-[3rem] justify-start whitespace-normal py-3 px-4 text-left text-base transition-all",
                          isSelected &&
                            "bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700",
                          !isSelected &&
                            "hover:border-teal-300 hover:bg-teal-50 dark:hover:border-teal-700 dark:hover:bg-teal-950/50",
                        )}
                        onClick={() =>
                          handleSelectOption(currentQuestion.question_id, index)
                        }
                      >
                        {currentQuestion.question_type !== "true_false" && (
                          <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-medium dark:bg-gray-700">
                            {String.fromCharCode(65 + index)}
                          </span>
                        )}
                        <span className="flex-1">{option}</span>
                      </Button>
                    )
                  })}
                </div>
              )}
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
              <div className="flex flex-wrap justify-center gap-1.5">
                {activity.questions.map((q, i) => (
                  <button
                    key={q.question_id}
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition-all",
                      i === currentIndex
                        ? "scale-125 bg-teal-600"
                        : answers.has(q.question_id)
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
                  "Submit Activity"
                )}
              </Button>
            </div>
          )}

          {/* Keyboard hints - hide when externally controlled */}
          {!isExternallyControlled && (
            <p className="text-center text-xs text-muted-foreground">
              Tip: Use arrow keys to navigate
              {currentQuestion.question_type !== "short_answer" &&
                ", 1-4 to select answers"}
            </p>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Activity?</AlertDialogTitle>
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

export default ReadingComprehensionPlayer
