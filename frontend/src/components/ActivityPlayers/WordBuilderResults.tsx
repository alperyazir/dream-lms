/**
 * WordBuilderResults - Display word builder results after submission
 * Story 27.14: Word Builder (Spelling Activity)
 *
 * Shows the overall score and detailed breakdown of each word,
 * highlighting correct and incorrect spellings with attempt-based scoring.
 */

import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Volume2,
  XCircle,
} from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { WordBuilderResult, WordResult } from "@/types/word-builder"

interface WordBuilderResultsProps {
  /** The word builder result data */
  result: WordBuilderResult
  /** Callback to retry the activity */
  onRetry?: () => void
  /** Callback to go back to generator */
  onBack?: () => void
  /** Hide summary info (for embedding in dialogs) */
  hideSummary?: boolean
}

export function WordBuilderResults({
  result,
  onRetry,
  onBack,
  hideSummary = false,
}: WordBuilderResultsProps) {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Play audio for a word
  const handlePlayAudio = useCallback((audioUrl: string) => {
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

  // Score color helper
  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-green-600 dark:text-green-400"
    if (pct >= 60) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  return (
    <div className={cn("mx-auto flex max-w-2xl flex-col gap-6", !hideSummary && "p-4")}>
      {/* Detailed results */}
      <div className="space-y-3">
        {!hideSummary && (
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Word Breakdown
          </h3>
        )}
        {hideSummary && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {result.correct_count}/{result.total} words correct
            </span>
            <span className={cn("font-semibold", getScoreColor(result.percentage))}>
              {result.percentage}%
            </span>
          </div>
        )}
        {result.word_results.map((wordResult, index) => (
          <WordResultCard
            key={wordResult.item_id}
            result={wordResult}
            index={index}
            onPlayAudio={handlePlayAudio}
            playingAudio={playingAudio}
          />
        ))}
      </div>

      {/* Action buttons */}
      {!hideSummary && (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {onRetry && (
            <Button onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          {onBack && (
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Generator
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface WordResultCardProps {
  result: WordResult
  index: number
  onPlayAudio: (url: string) => void
  playingAudio: string | null
}

function WordResultCard({
  result,
  index,
  onPlayAudio,
  playingAudio,
}: WordResultCardProps) {
  const hasAudio = result.audio_url !== null

  return (
    <Card
      className={cn(
        "border-l-4 transition-all",
        result.is_correct
          ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
          : "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div className="flex-shrink-0 pt-0.5">
            {result.is_correct ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Word number, points, and audio */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Word #{index + 1}
                </span>
                {hasAudio && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPlayAudio(result.audio_url!)}
                    disabled={playingAudio === result.audio_url}
                    className="h-7 px-2"
                    aria-label="Play word audio"
                  >
                    <Volume2
                      className={cn(
                        "h-4 w-4",
                        playingAudio === result.audio_url &&
                          "animate-pulse text-teal-600",
                      )}
                    />
                    <span className="ml-1 text-xs">Listen</span>
                  </Button>
                )}
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    result.is_correct
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {result.is_correct ? "Correct" : "Incorrect"}
                </span>
              </div>
            </div>

            {/* Definition */}
            <div className="text-sm text-muted-foreground italic">
              "{result.definition}"
            </div>

            {/* User's answer */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Your spelling:
              </span>
              <div
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-mono tracking-wider uppercase",
                  result.is_correct
                    ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
                )}
              >
                {result.submitted_word || (
                  <span className="italic normal-case">
                    No answer submitted
                  </span>
                )}
              </div>
            </div>

            {/* Correct answer (only shown if incorrect) */}
            {!result.is_correct && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Correct spelling:
                </span>
                <div className="rounded-md bg-green-100 px-3 py-2 text-sm font-mono tracking-wider uppercase text-green-800 dark:bg-green-900/50 dark:text-green-200">
                  {result.correct_word}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default WordBuilderResults
