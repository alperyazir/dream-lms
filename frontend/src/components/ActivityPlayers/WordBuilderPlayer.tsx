/**
 * WordBuilderPlayer - Spelling Practice Activity Player
 * Story 27.14: Word Builder (Spelling Activity)
 *
 * Interactive spelling activity where students click letters from a scrambled
 * letter bank to spell vocabulary words. Click-to-place interaction.
 */

import { ArrowRight, Check, Lightbulb, Trash2, Volume2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"
import type {
  LetterWithIndex,
  WordBuilderActivityPublic,
  WordBuilderSubmission,
} from "@/types/word-builder"
import {
  getFeedbackMessage,
  getProgressText,
  HINT_TYPE_LABELS,
  initializeLettersWithIndices,
} from "@/types/word-builder"

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

interface WordBuilderPlayerProps {
  /** The activity to display */
  activity: WordBuilderActivityPublic
  /** Callback when activity is submitted */
  onSubmit: (submission: WordBuilderSubmission) => void
  /** Whether submission is in progress */
  isSubmitting?: boolean
  /** Callback when a word is spelled correctly (for audio) */
  onWordCorrect?: (audioUrl: string | null) => void
  /** Hide the submit button (when embedded in ActivityPlayer which has its own submit) */
  hideSubmitButton?: boolean
  /** Callback when answers change (for parent to track progress) */
  onAnswersChange?: (answers: Record<string, string>) => void
  /** External control: current word index (when controlled by parent) */
  currentWordIndex?: number
  /** External control: callback when current word changes (for hybrid control - player can advance) */
  onWordIndexChange?: (index: number) => void
  /** Callback to expose navigation state to parent */
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

interface WordState {
  placedLetters: LetterWithIndex[]
  availableLetters: LetterWithIndex[]
  attempts: number
  isCorrect: boolean | null
  isChecking: boolean
}

export function WordBuilderPlayer({
  activity,
  onSubmit,
  isSubmitting = false,
  onWordCorrect,
  hideSubmitButton = false,
  onAnswersChange,
  currentWordIndex,
  onWordIndexChange,
  onNavigationStateChange,
}: WordBuilderPlayerProps) {
  // Internal current word index (used when not externally controlled)
  const [internalIndex, setInternalIndex] = useState(0)
  // Use external index if provided, otherwise internal
  const isExternallyControlled = currentWordIndex !== undefined
  const currentIndex = isExternallyControlled ? currentWordIndex : internalIndex

  // Setter that works for both internal and external control (hybrid - player can advance)
  const setCurrentIndex = useCallback(
    (index: number) => {
      if (isExternallyControlled && onWordIndexChange) {
        onWordIndexChange(index)
      } else {
        setInternalIndex(index)
      }
    },
    [isExternallyControlled, onWordIndexChange],
  )
  const [wordStates, setWordStates] = useState<Record<string, WordState>>({})
  const [showSuccess, setShowSuccess] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const totalWords = activity.words.length

  // Store callbacks in refs to avoid infinite loops
  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange
  const onNavigationStateChangeRef = useRef(onNavigationStateChange)
  onNavigationStateChangeRef.current = onNavigationStateChange

  // Notify parent when answers change
  useEffect(() => {
    const callback = onAnswersChangeRef.current
    if (callback) {
      const answers: Record<string, string> = {}
      activity.words.forEach((word) => {
        const state = wordStates[word.item_id]
        if (state) {
          answers[word.item_id] = state.placedLetters
            .map((l) => l.letter)
            .join("")
        }
      })
      callback(answers)
    }
  }, [wordStates, activity.words])

  // Memoize navigation state components to prevent infinite loops
  const { answeredItemIds, answeredIndices } = useMemo(() => {
    const indices: number[] = []
    const itemIds: string[] = []
    activity.words.forEach((word, index) => {
      const state = wordStates[word.item_id]
      // Consider a word "answered" if all letters have been placed
      if (state && state.placedLetters.length === word.letter_count) {
        indices.push(index)
        itemIds.push(word.item_id)
      }
    })
    return { answeredItemIds: itemIds, answeredIndices: indices }
  }, [wordStates, activity.words])

  // Track previous navigation state to avoid unnecessary updates
  const prevNavStateRef = useRef<string>("")

  // Notify parent of navigation state changes
  useEffect(() => {
    const callback = onNavigationStateChangeRef.current
    if (callback) {
      // Only call if state actually changed
      const stateKey = `${currentIndex}-${totalWords}-${answeredItemIds.join(",")}`
      if (prevNavStateRef.current !== stateKey) {
        prevNavStateRef.current = stateKey
        callback({
          currentIndex,
          totalItems: totalWords,
          answeredItemIds,
          answeredIndices,
        })
      }
    }
  }, [currentIndex, totalWords, answeredItemIds, answeredIndices])

  const currentWord = activity.words[currentIndex]
  const isCompleted = currentIndex >= totalWords
  const progress = (currentIndex / totalWords) * 100

  // Initialize state for current word
  useEffect(() => {
    if (currentWord && !wordStates[currentWord.item_id]) {
      setWordStates((prev) => ({
        ...prev,
        [currentWord.item_id]: {
          placedLetters: [],
          availableLetters: shuffleArray(initializeLettersWithIndices(currentWord.letters)),
          attempts: 0,
          isCorrect: null,
          isChecking: false,
        },
      }))
    }
  }, [currentWord, wordStates])

  const currentState = currentWord ? wordStates[currentWord.item_id] : null

  // Play audio if available
  const playAudio = useCallback((audioUrl: string | null) => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl
      audioRef.current
        .play()
        .catch((e) => console.warn("Audio playback failed:", e))
    }
  }, [])

  // Handle clicking a letter in the letter bank
  const handleLetterBankClick = useCallback(
    (letterWithIndex: LetterWithIndex, bankIndex: number) => {
      if (!currentWord || !currentState || currentState.isCorrect) return

      setWordStates((prev) => {
        const state = prev[currentWord.item_id]
        if (!state) return prev

        const newAvailable = [...state.availableLetters]
        newAvailable.splice(bankIndex, 1)

        return {
          ...prev,
          [currentWord.item_id]: {
            ...state,
            placedLetters: [...state.placedLetters, letterWithIndex],
            availableLetters: newAvailable,
            isCorrect: null,
          },
        }
      })
    },
    [currentWord, currentState],
  )

  // Handle clicking a placed letter to return it
  const handlePlacedLetterClick = useCallback(
    (letterWithIndex: LetterWithIndex, placedIndex: number) => {
      if (!currentWord || !currentState || currentState.isCorrect) return

      setWordStates((prev) => {
        const state = prev[currentWord.item_id]
        if (!state) return prev

        const newPlaced = [...state.placedLetters]
        newPlaced.splice(placedIndex, 1)

        return {
          ...prev,
          [currentWord.item_id]: {
            ...state,
            placedLetters: newPlaced,
            availableLetters: [...state.availableLetters, letterWithIndex],
            isCorrect: null,
          },
        }
      })
    },
    [currentWord, currentState],
  )

  // Clear all placed letters
  const handleClearAll = useCallback(() => {
    if (!currentWord || !currentState || currentState.isCorrect) return

    setWordStates((prev) => ({
      ...prev,
      [currentWord.item_id]: {
        ...prev[currentWord.item_id],
        placedLetters: [],
        availableLetters: shuffleArray(initializeLettersWithIndices(currentWord.letters)),
        isCorrect: null,
      },
    }))
  }, [currentWord, currentState])

  // Move to next word
  const handleNextWord = useCallback(() => {
    if (currentIndex < totalWords - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // All words done - submit
      const answers: Record<string, string> = {}
      const attempts: Record<string, number> = {}

      activity.words.forEach((word) => {
        const state = wordStates[word.item_id]
        if (state) {
          answers[word.item_id] = state.placedLetters
            .map((l) => l.letter)
            .join("")
          attempts[word.item_id] = state.attempts
        }
      })
      onSubmit({ answers, attempts })
    }
  }, [
    currentIndex,
    totalWords,
    activity.words,
    wordStates,
    onSubmit,
    setCurrentIndex,
  ])

  // Move to next word (no immediate answer checking - deferred to submission)
  const handleCheckAnswer = useCallback(() => {
    if (!currentWord || !currentState) return

    // Check if all letters are placed
    if (currentState.placedLetters.length === currentWord.letter_count) {
      // Record the attempt and move to next word
      // Validation happens at final submission
      setWordStates((prev) => ({
        ...prev,
        [currentWord.item_id]: {
          ...prev[currentWord.item_id],
          attempts: prev[currentWord.item_id].attempts + 1,
          isChecking: false,
        },
      }))
      handleNextWord()
    } else {
      // Not all letters placed - show shake animation
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
    }
  }, [currentWord, currentState, handleNextWord])

  // Calculate if all letters are placed for current word
  const allLettersPlaced =
    currentState?.placedLetters.length === currentWord?.letter_count

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
        {/* Hidden audio element for playback */}
        <audio ref={audioRef} />

        <CardHeader>
          <CardTitle className="text-lg">Word Builder</CardTitle>
          <p className="text-sm text-muted-foreground">
            Spell the word by clicking letters
          </p>
          {/* Progress bar - hide when externally controlled */}
          {!isExternallyControlled && (
            <div className="flex items-center gap-4 mt-2">
              <Progress value={progress} className="flex-1" />
              <span className="text-sm font-medium">
                {getProgressText(currentIndex, totalWords)}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Hint Area */}
          {currentWord && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">
                    HINT
                  </h3>
                  {activity.hint_type !== "audio" && currentWord.definition && (
                    <p className="text-base">{currentWord.definition}</p>
                  )}
                  {(activity.hint_type === "audio" ||
                    activity.hint_type === "both") &&
                    currentWord.audio_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => playAudio(currentWord.audio_url)}
                        className="mt-2"
                      >
                        <Volume2 className="h-4 w-4 mr-2" />
                        Listen to pronunciation
                      </Button>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Letter Bank */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              LETTER BANK
            </h3>
            <div
              className={cn(
                "flex flex-wrap gap-2 min-h-[60px] p-3 rounded-lg border-2 border-dashed",
                "bg-muted/30 justify-center items-center content-center",
              )}
            >
              {currentState?.availableLetters.map((letterWithIndex, index) => (
                <button
                  key={`${letterWithIndex.letter}-${letterWithIndex.originalIndex}`}
                  onClick={() => handleLetterBankClick(letterWithIndex, index)}
                  disabled={showSuccess}
                  className={cn(
                    "w-10 h-10 rounded-lg border-2 font-bold text-lg transition-all",
                    "bg-background hover:bg-primary/10 hover:border-primary",
                    "active:scale-95 cursor-pointer uppercase",
                    showSuccess && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {letterWithIndex.letter}
                </button>
              ))}
              {currentState?.availableLetters.length === 0 && (
                <span className="text-muted-foreground text-sm italic">
                  All letters placed
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Spelling Area */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              YOUR SPELLING
            </h3>
            <div
              className={cn(
                "flex flex-wrap gap-2 min-h-[60px] p-3 rounded-lg border-2",
                "bg-background justify-center items-center content-center",
                isShaking && "animate-shake",
                showSuccess &&
                  "border-green-500 bg-green-50 dark:bg-green-900/20",
              )}
            >
              {currentState?.placedLetters.map((letterWithIndex, index) => (
                <button
                  key={`placed-${letterWithIndex.letter}-${letterWithIndex.originalIndex}`}
                  onClick={() =>
                    handlePlacedLetterClick(letterWithIndex, index)
                  }
                  disabled={showSuccess}
                  className={cn(
                    "w-10 h-10 rounded-lg border-2 font-bold text-lg transition-all uppercase",
                    "bg-primary/10 border-primary text-primary",
                    "hover:bg-destructive/10 hover:border-destructive hover:text-destructive",
                    "active:scale-95 cursor-pointer",
                    showSuccess &&
                      "border-green-500 bg-green-100 text-green-800 cursor-default",
                  )}
                >
                  {letterWithIndex.letter}
                </button>
              ))}
              {/* Empty slots indicator */}
              {currentWord &&
                currentState &&
                currentState.placedLetters.length < currentWord.letter_count &&
                Array.from({
                  length:
                    currentWord.letter_count -
                    currentState.placedLetters.length,
                }).map((_, index) => (
                  <div
                    key={`slot-${index}`}
                    className="w-10 h-10 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground/50"
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
                <span>
                  {getFeedbackMessage(true, currentState?.attempts || 1)} Moving
                  to next word...
                </span>
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
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={
                !currentState?.placedLetters.length ||
                showSuccess ||
                isSubmitting
              }
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>

            {!hideSubmitButton && (
              <Button
                onClick={handleCheckAnswer}
                disabled={!allLettersPlaced || isSubmitting}
              >
                {currentIndex === totalWords - 1 ? (
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
        </CardContent>
      </Card>
    </div>
  )
}

export default WordBuilderPlayer
