/**
 * SentenceBuilderPlayer - Duolingo-Style Sentence Building Activity Player
 * Story 27.13: Sentence Builder Activity
 *
 * Interactive word-ordering activity where students click words from a word bank
 * to build sentences. Click-to-place interaction (not drag-drop).
 */

import { ArrowRight, Check, ChevronLeft, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useSoundContext } from "@/hooks/useSoundEffects"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"
import type {
  SentenceBuilderActivityPublic,
  SentenceBuilderSubmission,
} from "@/types/sentence-builder"
import { getProgressText } from "@/types/sentence-builder"

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

interface SentenceBuilderPlayerProps {
  /** The activity to display */
  activity: SentenceBuilderActivityPublic
  /** Callback when activity is submitted */
  onSubmit: (submission: SentenceBuilderSubmission) => void
  /** Whether submission is in progress */
  isSubmitting?: boolean
  /** Callback when a single sentence is completed correctly (for audio) */
  onSentenceCorrect?: (audioUrl: string | null) => void
  /** Hide the submit button (when embedded in ActivityPlayer which has its own submit) */
  hideSubmitButton?: boolean
  /** Callback when answers change (for parent to track progress) */
  onAnswersChange?: (answers: Record<string, string[]>) => void
  /** External control: current sentence index (when controlled by parent) */
  currentSentenceIndex?: number
  /** External control: callback when current sentence changes (for hybrid control - player can advance) */
  onSentenceIndexChange?: (index: number) => void
  /** Callback to expose navigation state to parent */
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

interface SentenceState {
  placedWords: string[]
  availableWords: string[]
  attempts: number
  isCorrect: boolean | null
  isChecking: boolean
}

export function SentenceBuilderPlayer({
  activity,
  onSubmit,
  isSubmitting = false,
  onSentenceCorrect: _onSentenceCorrect,
  hideSubmitButton = false,
  onAnswersChange,
  currentSentenceIndex,
  onSentenceIndexChange,
  onNavigationStateChange,
}: SentenceBuilderPlayerProps) {
  // Internal current sentence index (used when not externally controlled)
  const [internalIndex, setInternalIndex] = useState(0)
  // Use external index if provided, otherwise internal
  const isExternallyControlled = currentSentenceIndex !== undefined
  const currentIndex = isExternallyControlled
    ? currentSentenceIndex
    : internalIndex

  // Setter that works for both internal and external control (hybrid - player can advance)
  const setCurrentIndex = useCallback(
    (index: number) => {
      if (isExternallyControlled && onSentenceIndexChange) {
        onSentenceIndexChange(index)
      } else {
        setInternalIndex(index)
      }
    },
    [isExternallyControlled, onSentenceIndexChange],
  )
  const [sentenceStates, setSentenceStates] = useState<
    Record<string, SentenceState>
  >({})
  const [showSuccess, _setShowSuccess] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const { play: playSound } = useSoundContext()

  const totalSentences = activity.sentences.length

  // Store callbacks in refs to avoid infinite loops
  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange
  const onNavigationStateChangeRef = useRef(onNavigationStateChange)
  onNavigationStateChangeRef.current = onNavigationStateChange

  // Notify parent when answers change
  useEffect(() => {
    const callback = onAnswersChangeRef.current
    if (callback) {
      const answers: Record<string, string[]> = {}
      activity.sentences.forEach((sentence) => {
        const state = sentenceStates[sentence.item_id]
        if (state) {
          answers[sentence.item_id] = state.placedWords
        }
      })
      callback(answers)
    }
  }, [sentenceStates, activity.sentences])

  // Memoize navigation state components to prevent infinite loops
  const { answeredItemIds, answeredIndices } = useMemo(() => {
    const indices: number[] = []
    const itemIds: string[] = []
    activity.sentences.forEach((sentence, index) => {
      const state = sentenceStates[sentence.item_id]
      // Consider a sentence "answered" if all words have been placed
      if (state && state.placedWords.length === sentence.word_count) {
        indices.push(index)
        itemIds.push(sentence.item_id)
      }
    })
    return { answeredItemIds: itemIds, answeredIndices: indices }
  }, [sentenceStates, activity.sentences])

  // Track previous navigation state to avoid unnecessary updates
  const prevNavStateRef = useRef<string>("")

  // Notify parent of navigation state changes
  useEffect(() => {
    const callback = onNavigationStateChangeRef.current
    if (callback) {
      // Only call if state actually changed
      const stateKey = `${currentIndex}-${totalSentences}-${answeredItemIds.join(",")}`
      if (prevNavStateRef.current !== stateKey) {
        prevNavStateRef.current = stateKey
        callback({
          currentIndex,
          totalItems: totalSentences,
          answeredItemIds,
          answeredIndices,
        })
      }
    }
  }, [currentIndex, totalSentences, answeredItemIds, answeredIndices])

  const currentSentence = activity.sentences[currentIndex]
  const isCompleted = currentIndex >= totalSentences
  const progress = (currentIndex / totalSentences) * 100

  // Initialize state for current sentence
  useEffect(() => {
    if (currentSentence && !sentenceStates[currentSentence.item_id]) {
      setSentenceStates((prev) => ({
        ...prev,
        [currentSentence.item_id]: {
          placedWords: [],
          availableWords: shuffleArray([...currentSentence.words]),
          attempts: 0,
          isCorrect: null,
          isChecking: false,
        },
      }))
    }
  }, [currentSentence, sentenceStates])

  const currentState = currentSentence
    ? sentenceStates[currentSentence.item_id]
    : null

  // Handle clicking a word in the word bank
  const handleWordBankClick = useCallback(
    (word: string, index: number) => {
      if (!currentSentence || !currentState || currentState.isCorrect) return
      playSound("drop")

      setSentenceStates((prev) => {
        const state = prev[currentSentence.item_id]
        if (!state) return prev

        const newAvailable = [...state.availableWords]
        newAvailable.splice(index, 1)

        return {
          ...prev,
          [currentSentence.item_id]: {
            ...state,
            placedWords: [...state.placedWords, word],
            availableWords: newAvailable,
            isCorrect: null,
          },
        }
      })
    },
    [currentSentence, currentState, playSound],
  )

  // Handle clicking a placed word to return it
  const handlePlacedWordClick = useCallback(
    (word: string, index: number) => {
      if (!currentSentence || !currentState || currentState.isCorrect) return
      playSound("drag")

      setSentenceStates((prev) => {
        const state = prev[currentSentence.item_id]
        if (!state) return prev

        const newPlaced = [...state.placedWords]
        newPlaced.splice(index, 1)

        return {
          ...prev,
          [currentSentence.item_id]: {
            ...state,
            placedWords: newPlaced,
            availableWords: [...state.availableWords, word],
            isCorrect: null,
          },
        }
      })
    },
    [currentSentence, currentState, playSound],
  )

  // Clear all placed words
  const handleClearAll = useCallback(() => {
    if (!currentSentence || !currentState || currentState.isCorrect) return

    setSentenceStates((prev) => ({
      ...prev,
      [currentSentence.item_id]: {
        ...prev[currentSentence.item_id],
        placedWords: [],
        availableWords: shuffleArray([...currentSentence.words]),
        isCorrect: null,
      },
    }))
  }, [currentSentence, currentState])

  // Move to previous sentence
  const handlePreviousSentence = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }, [currentIndex, setCurrentIndex])

  // Move to next sentence
  const handleNextSentence = useCallback(() => {
    if (currentIndex < totalSentences - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // All sentences done - submit
      const answers: Record<string, string[]> = {}
      activity.sentences.forEach((sentence) => {
        const state = sentenceStates[sentence.item_id]
        if (state) {
          answers[sentence.item_id] = state.placedWords
        }
      })
      onSubmit({ answers })
    }
  }, [
    currentIndex,
    totalSentences,
    activity.sentences,
    sentenceStates,
    onSubmit,
    setCurrentIndex,
  ])

  // Move to next sentence (no immediate answer checking - deferred to submission)
  const handleCheckAnswer = useCallback(() => {
    if (!currentSentence || !currentState) return

    // Check if all words are placed
    if (currentState.placedWords.length === currentSentence.word_count) {
      // Record the attempt and move to next sentence
      // Validation happens at final submission
      setSentenceStates((prev) => ({
        ...prev,
        [currentSentence.item_id]: {
          ...prev[currentSentence.item_id],
          attempts: prev[currentSentence.item_id].attempts + 1,
          isChecking: false,
        },
      }))
      handleNextSentence()
    } else {
      // Not all words placed - show shake animation
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
    }
  }, [currentSentence, currentState, handleNextSentence])

  // Calculate if all words are placed for current sentence
  const allWordsPlaced =
    currentState?.placedWords.length === currentSentence?.word_count

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
        handlePreviousSentence()
      } else if (e.key === "ArrowRight") {
        // Only advance if all words are placed for current sentence
        if (allWordsPlaced && currentIndex < totalSentences - 1) {
          handleNextSentence()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    handlePreviousSentence,
    handleNextSentence,
    allWordsPlaced,
    currentIndex,
    totalSentences,
  ])

  if (isCompleted) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Activity Complete!</h2>
            <p className="text-muted-foreground">Submitting your answers...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Sentence Builder</CardTitle>
          <p className="text-sm text-muted-foreground">
            Put the words in the correct order
          </p>
          {/* Progress bar - hide when externally controlled */}
          {!isExternallyControlled && (
            <div className="flex items-center gap-4 mt-2">
              <Progress value={progress} className="flex-1" />
              <span className="text-sm font-medium">
                {getProgressText(currentIndex, totalSentences)}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Word Bank */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              WORD BANK
            </h3>
            <div
              className={cn(
                "flex flex-wrap gap-2 min-h-[56px] p-3 rounded-lg border-2 border-dashed",
                "bg-muted/30 justify-center items-center content-center",
              )}
            >
              {currentState?.availableWords.map((word, index) => (
                <button
                  key={`${word}-${index}`}
                  onClick={() => handleWordBankClick(word, index)}
                  disabled={showSuccess}
                  className={cn(
                    "px-3 py-1.5 rounded-md border-2 font-medium text-sm transition-all whitespace-nowrap",
                    "bg-background hover:bg-primary/10 hover:border-primary",
                    "active:scale-95 cursor-pointer",
                    showSuccess && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {word}
                </button>
              ))}
              {currentState?.availableWords.length === 0 && (
                <span className="text-muted-foreground text-sm italic">
                  All words placed
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Sentence Building Area */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              YOUR SENTENCE
            </h3>
            <div
              className={cn(
                "flex flex-wrap gap-2 min-h-[56px] p-3 rounded-lg border-2",
                "bg-background justify-center items-center content-center",
                isShaking && "animate-shake",
                showSuccess &&
                  "border-green-500 bg-green-50 dark:bg-green-900/20",
              )}
            >
              {currentState?.placedWords.map((word, index) => (
                <button
                  key={`placed-${word}-${index}`}
                  onClick={() => handlePlacedWordClick(word, index)}
                  disabled={showSuccess}
                  className={cn(
                    "px-3 py-1.5 rounded-md border-2 font-medium text-sm transition-all whitespace-nowrap",
                    "bg-primary/10 border-primary text-primary",
                    "hover:bg-destructive/10 hover:border-destructive hover:text-destructive",
                    "active:scale-95 cursor-pointer",
                    showSuccess &&
                      "border-green-500 bg-green-100 text-green-800 cursor-default",
                  )}
                >
                  {word}
                </button>
              ))}
              {/* Empty slots indicator */}
              {currentSentence &&
                currentState &&
                currentState.placedWords.length < currentSentence.word_count &&
                Array.from({
                  length:
                    currentSentence.word_count -
                    currentState.placedWords.length,
                }).map((_, index) => (
                  <div
                    key={`slot-${index}`}
                    className="px-3 py-1.5 rounded-md border-2 border-dashed border-muted-foreground/30 min-w-[50px] text-center text-sm text-muted-foreground/50"
                  >
                    _
                  </div>
                ))}
            </div>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="text-center py-2">
              <div className="inline-flex items-center gap-2 text-green-600 font-medium">
                <Check className="h-5 w-5" />
                <span>Great job! Moving to next sentence...</span>
              </div>
            </div>
          )}

          {/* Attempts Counter */}
          {currentState && currentState.attempts > 0 && !showSuccess && (
            <div className="text-center text-sm text-muted-foreground">
              Attempts: {currentState.attempts}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            {/* Previous button - hide when externally controlled */}
            {!isExternallyControlled && (
              <Button
                variant="outline"
                onClick={handlePreviousSentence}
                disabled={currentIndex === 0 || showSuccess || isSubmitting}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={
                !currentState?.placedWords.length || showSuccess || isSubmitting
              }
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>

            {!hideSubmitButton && (
              <Button
                onClick={handleCheckAnswer}
                disabled={!allWordsPlaced || isSubmitting}
              >
                {currentIndex === totalSentences - 1 ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Submit Activity
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Next
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Keyboard hints - hide when externally controlled */}
          {!isExternallyControlled && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Tip: Use arrow keys to navigate between sentences
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SentenceBuilderPlayer
