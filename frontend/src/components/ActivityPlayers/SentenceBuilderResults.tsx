/**
 * SentenceBuilderResults - Display sentence builder results after submission
 * Story 27.13: Sentence Builder Activity (Duolingo-Style)
 *
 * Shows the overall score and detailed breakdown of each sentence,
 * highlighting correct and incorrect word orderings.
 */

import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Volume2,
  XCircle,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useSoundContext } from "@/hooks/useSoundEffects"
import { cn } from "@/lib/utils"
import type {
  SentenceBuilderResult,
  SentenceResult,
} from "@/types/sentence-builder"
import { DIFFICULTY_LABELS } from "@/types/sentence-builder"

interface SentenceBuilderResultsProps {
  /** The sentence builder result data */
  result: SentenceBuilderResult
  /** Callback to retry the activity */
  onRetry?: () => void
  /** Callback to go back to generator */
  onBack?: () => void
  /** Hide summary card when embedded in result page (to avoid duplication) */
  hideSummary?: boolean
}

export function SentenceBuilderResults({
  result,
  onRetry,
  onBack,
  hideSummary = false,
}: SentenceBuilderResultsProps) {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { play: playSound } = useSoundContext()

  const correctCount = result.sentence_results.filter(
    (r) => r.is_correct,
  ).length
  const totalCount = result.total
  const percentage = result.percentage

  // Play completion sound on mount
  useEffect(() => {
    if (percentage >= 60) {
      playSound("complete")
    }
  }, [percentage, playSound])

  // Determine score color
  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-green-600 dark:text-green-400"
    if (pct >= 60) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  // Determine progress color
  const getProgressClass = (pct: number) => {
    if (pct >= 80) return "[&>div]:bg-green-500"
    if (pct >= 60) return "[&>div]:bg-yellow-500"
    return "[&>div]:bg-red-500"
  }

  // Play audio for a sentence
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

  return (
    <div
      className={cn(
        "mx-auto flex max-w-2xl flex-col gap-6",
        !hideSummary && "p-4",
      )}
    >
      {/* Score summary card - hidden when embedded */}
      {!hideSummary && (
        <Card className="overflow-hidden shadow-lg">
          <div
            className={cn(
              "p-6 text-center",
              percentage >= 80
                ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50"
                : percentage >= 60
                  ? "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/50 dark:to-amber-950/50"
                  : "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50",
            )}
          >
            <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Sentence Builder Complete!
            </h2>
            <p className="mb-2 text-sm text-muted-foreground">
              {DIFFICULTY_LABELS[
                result.difficulty as keyof typeof DIFFICULTY_LABELS
              ] || result.difficulty}
            </p>
            <div
              className={cn("text-5xl font-bold", getScoreColor(percentage))}
            >
              {correctCount}/{totalCount}
            </div>
            <p
              className={cn(
                "mt-1 text-2xl font-medium",
                getScoreColor(percentage),
              )}
            >
              {percentage.toFixed(0)}%
            </p>
            <Progress
              value={percentage}
              className={cn(
                "mx-auto mt-4 h-3 max-w-[200px]",
                getProgressClass(percentage),
              )}
            />

            <p className="mt-4 text-sm text-muted-foreground">
              {percentage >= 80
                ? "Excellent work! You've mastered sentence building."
                : percentage >= 60
                  ? "Good effort! Keep practicing to improve."
                  : "Keep studying! Practice makes perfect."}
            </p>
          </div>
        </Card>
      )}

      {/* Detailed results */}
      <div className="space-y-3">
        {!hideSummary && (
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Sentence Breakdown
          </h3>
        )}
        {hideSummary && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {correctCount}/{totalCount} sentences correct
            </span>
            <span className={cn("font-semibold", getScoreColor(percentage))}>
              {percentage}%
            </span>
          </div>
        )}
        {result.sentence_results.map((sentenceResult, index) => (
          <SentenceResultCard
            key={sentenceResult.item_id}
            result={sentenceResult}
            index={index}
            onPlayAudio={handlePlayAudio}
            playingAudio={playingAudio}
          />
        ))}
      </div>

      {/* Action buttons - hidden when embedded */}
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

interface SentenceResultCardProps {
  result: SentenceResult
  index: number
  onPlayAudio: (url: string) => void
  playingAudio: string | null
}

function SentenceResultCard({
  result,
  index,
  onPlayAudio,
  playingAudio,
}: SentenceResultCardProps) {
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
            {/* Sentence number and audio */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Sentence #{index + 1}
              </span>
              {hasAudio && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPlayAudio(result.audio_url!)}
                  disabled={playingAudio === result.audio_url}
                  className="h-7 px-2"
                  aria-label="Play sentence audio"
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

            {/* User's answer */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Your answer:
              </span>
              <div
                className={cn(
                  "rounded-md px-3 py-2 text-sm",
                  result.is_correct
                    ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
                )}
              >
                {result.submitted_words.length > 0 ? (
                  result.submitted_words.join(" ")
                ) : (
                  <span className="italic">No answer submitted</span>
                )}
              </div>
            </div>

            {/* Correct answer (only shown if incorrect) */}
            {!result.is_correct && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Correct sentence:
                </span>
                <div className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-900/50 dark:text-green-200">
                  {result.correct_sentence}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SentenceBuilderResults
