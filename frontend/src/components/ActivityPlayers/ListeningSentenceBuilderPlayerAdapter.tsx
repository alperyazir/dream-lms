/**
 * ListeningSentenceBuilderPlayerAdapter - Player for Listening Sentence Builder
 *
 * Audio-first word ordering: students hear a sentence via TTS and arrange
 * shuffled words into the correct order. No text is shown -- audio is the
 * only input.
 *
 * Answer format: Map<item_id, JSON.stringify(orderedWords[])>
 */

import { Loader2, Pause, Play, RotateCcw, Volume2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ActivityConfig } from "@/lib/mockData"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"

interface ListeningSBItem {
  item_id: string
  words: string[]
  word_count: number
  audio_url: string | null
  audio_status: string
  difficulty?: string
}

interface ListeningSBContent {
  activity_id: string
  sentences: ListeningSBItem[]
  total_items: number
  difficulty: string
}

interface ListeningSentenceBuilderPlayerAdapterProps {
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

function parseOrderedWords(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function ListeningSentenceBuilderPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  initialAnswers,
  showCorrectAnswers: _showCorrectAnswers,
  currentQuestionIndex,
  onQuestionIndexChange: _onQuestionIndexChange,
  onNavigationStateChange,
}: ListeningSentenceBuilderPlayerAdapterProps) {
  const content = (activity as any).content as ListeningSBContent
  const items = content?.sentences || []

  const [answers, setAnswers] = useState<Map<string, string>>(
    () => initialAnswers || new Map(),
  )

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)

  const qIndex = currentQuestionIndex ?? 0
  const currentItem = items[qIndex]

  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange

  useEffect(() => {
    onAnswersChangeRef.current(new Map(answers))
  }, [answers])

  // Words placed by the student (ordered)
  const placedWords = parseOrderedWords(answers.get(currentItem?.item_id || ""))

  // Words still in the bank (not yet placed)
  const remainingWords = currentItem
    ? (() => {
        const placed = [...placedWords]
        return currentItem.words.filter((word) => {
          const idx = placed.indexOf(word)
          if (idx !== -1) {
            placed.splice(idx, 1)
            return false
          }
          return true
        })
      })()
    : []

  // Navigation state
  useEffect(() => {
    if (onNavigationStateChange) {
      const answeredIndices = items
        .map((item, i) => {
          const placed = parseOrderedWords(answers.get(item.item_id))
          return placed.length === item.word_count ? i : -1
        })
        .filter((i) => i >= 0)
      onNavigationStateChange({
        currentIndex: qIndex,
        totalItems: items.length,
        answeredItemIds: items
          .filter((item) => {
            const placed = parseOrderedWords(answers.get(item.item_id))
            return placed.length === item.word_count
          })
          .map((item) => item.item_id),
        answeredIndices,
      })
    }
  }, [answers, items, qIndex, onNavigationStateChange])

  // Tap a word from the bank -> add to answer
  const handleWordTap = useCallback(
    (word: string) => {
      if (!currentItem || showResults) return
      setAnswers((prev) => {
        const next = new Map(prev)
        const placed = parseOrderedWords(next.get(currentItem.item_id))
        placed.push(word)
        next.set(currentItem.item_id, JSON.stringify(placed))
        return next
      })
    },
    [currentItem, showResults],
  )

  // Tap a placed word -> remove it back to the bank
  const handlePlacedTap = useCallback(
    (wordIdx: number) => {
      if (!currentItem || showResults) return
      setAnswers((prev) => {
        const next = new Map(prev)
        const placed = parseOrderedWords(next.get(currentItem.item_id))
        placed.splice(wordIdx, 1)
        next.set(currentItem.item_id, JSON.stringify(placed))
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
          Listening Sentence Builder Complete!
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
          Listen and arrange the words
        </p>
      </div>

      {/* Answer area - placed words */}
      <div className="w-full min-h-[56px] p-3 rounded-xl border-2 border-dashed border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-900/10 flex flex-wrap gap-2 items-center justify-center">
        {placedWords.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            Tap words below to build the sentence
          </span>
        ) : (
          placedWords.map((word, idx) => (
            <button
              key={idx}
              onClick={() => handlePlacedTap(idx)}
              className="px-3 py-1.5 rounded-lg border-2 border-teal-400 bg-teal-100 dark:bg-teal-800/40 text-teal-800 dark:text-teal-200 text-sm font-medium hover:bg-teal-200 dark:hover:bg-teal-800/60 transition-colors cursor-pointer"
            >
              {word}
            </button>
          ))
        )}
      </div>

      {/* Reset button */}
      {placedWords.length > 0 && (
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      )}

      {/* Word bank - tappable shuffled words */}
      <div className="flex flex-wrap justify-center gap-2">
        {currentItem.words.map((word, wIdx) => {
          // Check if this specific index's word is still available
          const availableCount = remainingWords.filter((w) => w === word).length
          // For the nth occurrence of this word, is it used?
          let occurrenceSoFar = 0
          for (let i = 0; i <= wIdx; i++) {
            if (currentItem.words[i] === word) occurrenceSoFar++
          }
          const thisOneUsed = occurrenceSoFar > availableCount

          return (
            <button
              key={wIdx}
              onClick={() => handleWordTap(word)}
              disabled={showResults || thisOneUsed}
              className={cn(
                "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                thisOneUsed
                  ? "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed"
                  : "border-gray-200 dark:border-gray-600 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-gray-700 dark:text-gray-300 cursor-pointer",
              )}
            >
              {word}
            </button>
          )
        })}
      </div>

      {/* Item counter */}
      <div className="text-sm text-muted-foreground">
        Sentence {qIndex + 1} of {items.length}
      </div>
    </div>
  )
}
