/**
 * ReadingComprehensionPlayer - Reading comprehension activity player
 * Story 27.10: Reading Comprehension Generation
 *
 * Displays the passage and questions. Students read the passage
 * and answer MCQ, True/False, and Short Answer questions.
 */

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react"
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
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"
import type {
  ReadingComprehensionActivityPublic,
  ReadingComprehensionAnswer,
  WordTimestamp,
} from "@/types/reading-comprehension"

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

/**
 * Split passage text into word spans that can be individually highlighted.
 * Matches words from timestamps by position in the text.
 */
function PassageWithHighlight({
  passage,
  timestamps,
  currentTime,
  isPlaying,
}: {
  passage: string
  timestamps: WordTimestamp[]
  currentTime: number
  isPlaying: boolean
}) {
  // Find the currently active word index based on audio time
  const activeWordIndex = useMemo(() => {
    if (!isPlaying || timestamps.length === 0) return -1
    for (let i = timestamps.length - 1; i >= 0; i--) {
      if (currentTime >= timestamps[i].start) {
        return i
      }
    }
    return -1
  }, [currentTime, timestamps, isPlaying])

  // Build spans from the passage, matching timestamp words sequentially
  const spans = useMemo(() => {
    if (timestamps.length === 0) {
      return [{ text: passage, wordIndex: -1 }]
    }

    const result: { text: string; wordIndex: number }[] = []
    // Split passage into tokens preserving whitespace
    const tokens = passage.split(/(\s+)/)
    let tsIdx = 0

    for (const token of tokens) {
      if (/^\s+$/.test(token)) {
        // whitespace - just add as-is
        result.push({ text: token, wordIndex: -1 })
      } else if (tsIdx < timestamps.length) {
        // word token - map to the next timestamp
        result.push({ text: token, wordIndex: tsIdx })
        tsIdx++
      } else {
        result.push({ text: token, wordIndex: -1 })
      }
    }

    return result
  }, [passage, timestamps])

  return (
    <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
      {spans.map((span, i) => (
        <span
          key={i}
          className={cn(
            "transition-colors duration-150",
            span.wordIndex >= 0 &&
              span.wordIndex === activeWordIndex &&
              "rounded-sm bg-teal-200 text-teal-900 dark:bg-teal-700 dark:text-teal-100",
          )}
        >
          {span.text}
        </span>
      ))}
    </p>
  )
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

  // ── Audio player state ──
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)

  const hasAudio = !!activity.passage_audio?.audio_base64

  // Create audio element from base64 data
  useEffect(() => {
    if (!activity.passage_audio?.audio_base64) return

    const audio = new Audio(
      `data:audio/mp3;base64,${activity.passage_audio.audio_base64}`,
    )
    audioRef.current = audio

    audio.addEventListener("loadedmetadata", () => {
      setAudioDuration(audio.duration)
    })
    audio.addEventListener("timeupdate", () => {
      setAudioProgress(audio.currentTime)
    })
    audio.addEventListener("ended", () => {
      setIsPlaying(false)
      setAudioProgress(0)
    })

    return () => {
      audio.pause()
      audio.removeAttribute("src")
      audioRef.current = null
    }
  }, [activity.passage_audio])

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const seekAudio = useCallback((value: number[]) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value[0]
    setAudioProgress(value[0])
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-4">
      <div className="flex w-full max-w-6xl flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Passage Panel + Audio */}
        <div
          className={cn(
            "flex flex-1 flex-col gap-3 lg:max-w-[45%]",
            !showPassage && "hidden lg:flex",
          )}
        >
          <Card className="shadow-lg">
            <CardContent className="p-4">
              {/* Passage text with word highlighting */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {hasAudio &&
                activity.passage_audio?.word_timestamps?.length ? (
                  <PassageWithHighlight
                    passage={activity.passage}
                    timestamps={activity.passage_audio.word_timestamps}
                    currentTime={audioProgress}
                    isPlaying={isPlaying}
                  />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                    {activity.passage}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inline audio player under the passage */}
          {hasAudio && (
            <div className="rounded-xl border bg-gray-50 px-3 py-2.5 shadow-sm dark:bg-gray-900">
              {/* Seek bar row */}
              <div className="flex items-center gap-2.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full bg-teal-600 text-white hover:bg-teal-700 hover:text-white"
                  onClick={toggleAudio}
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="ml-0.5 h-3.5 w-3.5" />
                  )}
                </Button>
                <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                  {formatTime(audioProgress)}
                </span>
                <Slider
                  value={[audioProgress]}
                  max={audioDuration || 1}
                  step={0.1}
                  onValueChange={seekAudio}
                  className="min-w-0 flex-1"
                />
                <span className="w-9 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {formatTime(audioDuration)}
                </span>
              </div>
            </div>
          )}
        </div>

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
                            "hover:border-teal-300 hover:bg-teal-50 hover:text-gray-900 dark:hover:border-teal-700 dark:hover:bg-teal-950/30 dark:hover:text-gray-100",
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
