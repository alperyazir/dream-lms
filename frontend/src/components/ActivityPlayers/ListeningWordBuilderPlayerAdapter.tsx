/**
 * ListeningWordBuilderPlayerAdapter - Player for Listening Word Builder
 *
 * Audio-first spelling: students hear a word via TTS and arrange
 * scrambled letters to spell it. Optional definition hint toggle.
 *
 * Answer format: Map<item_id, joinedLettersString>
 */

import { Eye, EyeOff, Loader2, Pause, Play, RotateCcw, Volume2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ActivityConfig } from "@/lib/mockData"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"

interface ListeningWBItem {
  item_id: string
  letters: string[]
  letter_count: number
  definition?: string
  audio_url: string | null
  audio_status: string
  difficulty?: string
}

interface ListeningWBContent {
  activity_id: string
  words: ListeningWBItem[]
  total_items: number
  difficulty: string
}

interface ListeningWordBuilderPlayerAdapterProps {
  activity: ActivityConfig
  onAnswersChange: (answers: Map<string, string>) => void
  showResults: boolean
  correctAnswers: Set<string>
  initialAnswers?: Map<string, string>
  showCorrectAnswers?: boolean
  currentQuestionIndex?: number
  onQuestionIndexChange?: (index: number) => void
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

export function ListeningWordBuilderPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  initialAnswers,
  showCorrectAnswers: _showCorrectAnswers,
  currentQuestionIndex,
  onQuestionIndexChange: _onQuestionIndexChange,
  onNavigationStateChange,
}: ListeningWordBuilderPlayerAdapterProps) {
  const content = (activity as any).content as ListeningWBContent
  const items = content?.words || []

  // answers: Map<item_id, joined-letters string>
  const [answers, setAnswers] = useState<Map<string, string>>(
    () => initialAnswers || new Map(),
  )

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const [showHint, setShowHint] = useState(false)

  const qIndex = currentQuestionIndex ?? 0
  const currentItem = items[qIndex]

  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange

  useEffect(() => {
    onAnswersChangeRef.current(new Map(answers))
  }, [answers])

  // Letters placed by the student
  const placedLetters = (answers.get(currentItem?.item_id || "") || "").split("")

  // Track which letter bank indices are used
  const usedIndices = new Set<number>()
  if (currentItem) {
    const placed = [...placedLetters]
    for (const letter of placed) {
      for (let i = 0; i < currentItem.letters.length; i++) {
        if (!usedIndices.has(i) && currentItem.letters[i] === letter) {
          usedIndices.add(i)
          break
        }
      }
    }
  }

  // Navigation state
  useEffect(() => {
    if (onNavigationStateChange) {
      const answeredIndices = items
        .map((item, i) => {
          const ans = answers.get(item.item_id) || ""
          return ans.length === item.letter_count ? i : -1
        })
        .filter((i) => i >= 0)
      onNavigationStateChange({
        currentIndex: qIndex,
        totalItems: items.length,
        answeredItemIds: items
          .filter((item) => {
            const ans = answers.get(item.item_id) || ""
            return ans.length === item.letter_count
          })
          .map((item) => item.item_id),
        answeredIndices,
      })
    }
  }, [answers, items, qIndex, onNavigationStateChange])

  // Tap a letter from the bank -> add to answer
  const handleLetterTap = useCallback(
    (letter: string, bankIdx: number) => {
      if (!currentItem || showResults) return
      if (usedIndices.has(bankIdx)) return
      setAnswers((prev) => {
        const next = new Map(prev)
        const current = next.get(currentItem.item_id) || ""
        if (current.length >= currentItem.letter_count) return prev
        next.set(currentItem.item_id, current + letter)
        return next
      })
    },
    [currentItem, showResults, usedIndices],
  )

  // Tap a placed letter -> remove it (remove last occurrence for simplicity)
  const handlePlacedTap = useCallback(
    (letterIdx: number) => {
      if (!currentItem || showResults) return
      setAnswers((prev) => {
        const next = new Map(prev)
        const current = next.get(currentItem.item_id) || ""
        const letters = current.split("")
        letters.splice(letterIdx, 1)
        next.set(currentItem.item_id, letters.join(""))
        return next
      })
    },
    [currentItem, showResults],
  )

  // Reset current item
  const handleReset = useCallback(() => {
    if (!currentItem || showResults) return
    setAnswers((prev) => {
      const next = new Map(prev)
      next.delete(currentItem.item_id)
      return next
    })
  }, [currentItem, showResults])

  // Audio controls
  const handlePlayAudio = useCallback(() => {
    if (!currentItem?.audio_url) return
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.src = currentItem.audio_url
      setAudioLoading(true)
      audio
        .play()
        .then(() => {
          setIsPlaying(true)
          setAudioLoading(false)
        })
        .catch(() => setAudioLoading(false))
    }
  }, [currentItem, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => setIsPlaying(false)
    audio.addEventListener("ended", onEnded)
    return () => audio.removeEventListener("ended", onEnded)
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      setIsPlaying(false)
    }
    setShowHint(false)
  }, [qIndex])

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No items available.
      </div>
    )
  }

  if (showResults) {
    const total = items.length
    const correct = items.filter((item) =>
      correctAnswers.has(item.item_id),
    ).length
    const score = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">
          Listening Word Builder Complete!
        </h2>
        <p className="text-lg">Score: {score}%</p>
        <p className="text-sm text-gray-600">
          {correct} out of {total} correct
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6 max-w-2xl mx-auto">
      <audio ref={audioRef} preload="auto" />

      {/* Audio Play Button */}
      <div className="flex flex-col items-center gap-2">
        {currentItem.audio_url &&
        currentItem.audio_status === "ready" ? (
          <button
            onClick={handlePlayAudio}
            className={cn(
              "flex items-center justify-center w-20 h-20 rounded-full transition-all shadow-lg",
              isPlaying
                ? "bg-teal-600 hover:bg-teal-700 scale-110"
                : "bg-teal-500 hover:bg-teal-600",
            )}
          >
            {audioLoading ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <Play className="h-8 w-8 text-white ml-1" />
            )}
          </button>
        ) : (
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Volume2 className="h-4 w-4" />
            Audio not available
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Listen and spell the word
        </p>
      </div>

      {/* Definition hint toggle */}
      {currentItem.definition && (
        <button
          onClick={() => setShowHint(!showHint)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showHint ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {showHint ? "Hide hint" : "Show hint"}
        </button>
      )}
      {showHint && currentItem.definition && (
        <p className="text-sm text-muted-foreground italic px-4 text-center">
          {currentItem.definition}
        </p>
      )}

      {/* Answer area - placed letters */}
      <div className="w-full min-h-[56px] p-3 rounded-xl border-2 border-dashed border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-900/10 flex flex-wrap gap-1.5 items-center justify-center">
        {placedLetters.length === 0 || (placedLetters.length === 1 && placedLetters[0] === "") ? (
          <span className="text-sm text-muted-foreground">
            Tap letters below to spell the word
          </span>
        ) : (
          placedLetters.map((letter, idx) => (
            <button
              key={idx}
              onClick={() => handlePlacedTap(idx)}
              className="w-10 h-10 rounded-lg border-2 border-teal-400 bg-teal-100 dark:bg-teal-800/40 text-teal-800 dark:text-teal-200 text-lg font-bold uppercase flex items-center justify-center hover:bg-teal-200 dark:hover:bg-teal-800/60 transition-colors cursor-pointer"
            >
              {letter}
            </button>
          ))
        )}
      </div>

      {/* Reset button */}
      {placedLetters.length > 0 && placedLetters[0] !== "" && (
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      )}

      {/* Letter bank - tappable scrambled letters */}
      <div className="flex flex-wrap justify-center gap-2">
        {currentItem.letters.map((letter, lIdx) => {
          const isUsed = usedIndices.has(lIdx)
          return (
            <button
              key={lIdx}
              onClick={() => handleLetterTap(letter, lIdx)}
              disabled={showResults || isUsed}
              className={cn(
                "w-12 h-12 rounded-lg border-2 text-lg font-bold uppercase flex items-center justify-center transition-all",
                isUsed
                  ? "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed"
                  : "border-gray-200 dark:border-gray-600 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-gray-700 dark:text-gray-300 cursor-pointer",
              )}
            >
              {letter}
            </button>
          )
        })}
      </div>

      {/* Item counter */}
      <div className="text-sm text-muted-foreground">
        Word {qIndex + 1} of {items.length}
      </div>
    </div>
  )
}
