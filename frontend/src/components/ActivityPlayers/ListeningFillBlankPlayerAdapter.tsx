/**
 * ListeningFillBlankPlayerAdapter - Player for Listening Fill-in-the-Blank
 * Story 30.11: Activity Player Updates
 *
 * Audio + partial sentence with word bank. Students listen and tap words
 * from the word bank to fill multiple blanks.
 */

import { Loader2, Pause, Play, Volume2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ActivityConfig } from "@/lib/mockData"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"

interface ListeningFillBlankItem {
  item_id: string
  display_sentence: string
  word_bank: string[]
  audio_url: string | null
  audio_status: string
  difficulty?: string
}

interface ListeningFillBlankContent {
  activity_id: string
  items: ListeningFillBlankItem[]
  total_items: number
  difficulty: string
}

interface ListeningFillBlankPlayerAdapterProps {
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

/**
 * Parse answers stored as JSON string back to string array.
 * Each item's answer is stored as JSON: '["word1","word2"]'
 */
function parseFilledWords(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function ListeningFillBlankPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  initialAnswers,
  showCorrectAnswers,
  currentQuestionIndex,
  onQuestionIndexChange: _onQuestionIndexChange,
  onNavigationStateChange,
}: ListeningFillBlankPlayerAdapterProps) {
  const content = (activity as any).content as ListeningFillBlankContent
  const items = content?.items || []

  // answers: Map<item_id, JSON stringified array of filled words>
  const [answers, setAnswers] = useState<Map<string, string>>(
    () => initialAnswers || new Map(),
  )

  // Audio state
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

  // Compute blank count and filled words for current item
  const blankCount = currentItem
    ? currentItem.display_sentence.split("_______").length - 1
    : 0
  const filledWords = parseFilledWords(answers.get(currentItem?.item_id || ""))

  // Track which word bank words are used by the current item
  const usedWords = new Set<string>()
  for (const word of filledWords) {
    if (word) usedWords.add(word)
  }

  useEffect(() => {
    if (onNavigationStateChange) {
      const answeredIndices = items
        .map((item, i) => {
          const filled = parseFilledWords(answers.get(item.item_id))
          const blanks = item.display_sentence.split("_______").length - 1
          // Consider answered if all blanks are filled
          return filled.filter(Boolean).length === blanks ? i : -1
        })
        .filter((i) => i >= 0)
      onNavigationStateChange({
        currentIndex: qIndex,
        totalItems: items.length,
        answeredItemIds: items
          .filter((item) => {
            const filled = parseFilledWords(answers.get(item.item_id))
            const blanks = item.display_sentence.split("_______").length - 1
            return filled.filter(Boolean).length === blanks
          })
          .map((item) => item.item_id),
        answeredIndices,
      })
    }
  }, [answers, items, qIndex, onNavigationStateChange])

  // Tap a word from the word bank → fill the next empty blank
  const handleWordBankTap = useCallback(
    (word: string) => {
      if (!currentItem || showResults) return
      setAnswers((prev) => {
        const next = new Map(prev)
        const filled = parseFilledWords(next.get(currentItem.item_id))
        // Ensure array has enough slots
        while (filled.length < blankCount) filled.push("")
        // Find next empty blank
        const emptyIdx = filled.indexOf("")
        if (emptyIdx === -1) return prev // all blanks filled
        filled[emptyIdx] = word
        next.set(currentItem.item_id, JSON.stringify(filled))
        return next
      })
    },
    [currentItem, blankCount, showResults],
  )

  // Tap a filled blank → remove the word back to word bank
  const handleBlankTap = useCallback(
    (blankIdx: number) => {
      if (!currentItem || showResults) return
      setAnswers((prev) => {
        const next = new Map(prev)
        const filled = parseFilledWords(next.get(currentItem.item_id))
        if (blankIdx < filled.length && filled[blankIdx]) {
          filled[blankIdx] = ""
          next.set(currentItem.item_id, JSON.stringify(filled))
        }
        return next
      })
    },
    [currentItem, showResults],
  )

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
          Listening Fill-blank Complete!
        </h2>
        <p className="text-lg">Score: {score}%</p>
        <p className="text-sm text-gray-600">
          {correct} out of {total} correct
        </p>
      </div>
    )
  }

  // Parse display_sentence by splitting on _______
  const sentenceParts = currentItem.display_sentence.split("_______")

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
              "flex items-center justify-center w-16 h-16 rounded-full transition-all shadow-lg",
              isPlaying
                ? "bg-teal-600 hover:bg-teal-700 scale-110"
                : "bg-teal-500 hover:bg-teal-600",
            )}
          >
            {audioLoading ? (
              <Loader2 className="h-7 w-7 text-white animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-7 w-7 text-white" />
            ) : (
              <Play className="h-7 w-7 text-white ml-0.5" />
            )}
          </button>
        ) : (
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Volume2 className="h-4 w-4" />
            Audio not available
          </div>
        )}
      </div>

      {/* Sentence with inline blank slots */}
      <div className="text-center text-lg leading-relaxed">
        {sentenceParts.map((part, pIdx) => (
          <span key={pIdx}>
            {part}
            {pIdx < sentenceParts.length - 1 && (
              <button
                onClick={() => handleBlankTap(pIdx)}
                disabled={showResults}
                className={cn(
                  "inline-block min-w-[100px] mx-1 px-3 py-1 border-b-2 text-center text-lg font-medium transition-all rounded-t-md",
                  filledWords[pIdx]
                    ? "border-teal-500 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30 cursor-pointer"
                    : "border-gray-300 text-gray-400 cursor-default",
                  showCorrectAnswers &&
                    correctAnswers.has(currentItem.item_id) &&
                    "border-green-500 text-green-700",
                )}
              >
                {filledWords[pIdx] || "___"}
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Word bank — tappable buttons */}
      {currentItem.word_bank && currentItem.word_bank.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {currentItem.word_bank.map((word, wIdx) => {
            const isUsed = usedWords.has(word)
            return (
              <button
                key={wIdx}
                onClick={() => handleWordBankTap(word)}
                disabled={showResults || isUsed}
                className={cn(
                  "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                  isUsed
                    ? "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed"
                    : "border-gray-200 dark:border-gray-600 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-gray-700 dark:text-gray-300 cursor-pointer",
                )}
              >
                {word}
              </button>
            )
          })}
        </div>
      )}

      {/* Item counter */}
      <div className="text-sm text-muted-foreground">
        Item {qIndex + 1} of {items.length}
      </div>
    </div>
  )
}
