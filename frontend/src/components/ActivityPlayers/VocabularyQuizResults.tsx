/**
 * VocabularyQuizResults - Display quiz results after submission
 * Story 27.8: Vocabulary Quiz Generation (Definition-Based)
 *
 * Shows the overall score and detailed breakdown of each question,
 * highlighting correct and incorrect answers.
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
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type {
  QuestionResult,
  VocabularyQuizResult,
} from "@/types/vocabulary-quiz"

interface VocabularyQuizResultsProps {
  /** The quiz result data */
  result: VocabularyQuizResult
  /** Callback to retry the quiz */
  onRetry?: () => void
  /** Callback to go back to generator */
  onBack?: () => void
  /** Hide summary card when embedded in result page (to avoid duplication) */
  hideSummary?: boolean
}

export function VocabularyQuizResults({
  result,
  onRetry,
  onBack,
  hideSummary = false,
}: VocabularyQuizResultsProps) {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const correctCount = result.results.filter((r) => r.is_correct).length
  const totalCount = result.total
  const percentage = result.percentage

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

  // Play audio for a word
  const handlePlayAudio = useCallback((audioUrl: string | null) => {
    if (!audioUrl) return

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
              Quiz Complete!
            </h2>
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
              {percentage}%
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
                ? "Excellent work! You've mastered this vocabulary."
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
            Question Breakdown
          </h3>
        )}
        {hideSummary && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {correctCount}/{totalCount} questions correct
            </span>
            <span className={cn("font-semibold", getScoreColor(percentage))}>
              {percentage}%
            </span>
          </div>
        )}
        {result.results.map((questionResult, index) => (
          <QuestionResultCard
            key={questionResult.question_id}
            result={questionResult}
            index={index}
            onPlayAudio={handlePlayAudio}
            isPlaying={playingAudio === questionResult.audio_url}
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

interface QuestionResultCardProps {
  result: QuestionResult
  index: number
  onPlayAudio: (url: string | null) => void
  isPlaying: boolean
}

function QuestionResultCard({
  result,
  index,
  onPlayAudio,
  isPlaying,
}: QuestionResultCardProps) {
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
          <div className="min-w-0 flex-1">
            {/* Question number and definition */}
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  Q{index + 1}:
                </span>{" "}
                "{result.definition}"
              </p>
              {/* Audio button hidden for now */}
              {false && result.audio_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onPlayAudio(result.audio_url)}
                  disabled={isPlaying}
                  className="h-7 w-7 flex-shrink-0"
                  aria-label="Listen to pronunciation"
                >
                  <Volume2
                    className={cn(
                      "h-4 w-4",
                      isPlaying && "animate-pulse text-teal-600",
                    )}
                  />
                </Button>
              )}
            </div>

            {/* Answers */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Your answer:
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 font-medium",
                  result.is_correct
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                )}
              >
                {result.user_answer}
              </span>

              {!result.is_correct && (
                <>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Correct:
                  </span>
                  <span className="rounded-md bg-green-100 px-2 py-0.5 font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                    {result.correct_answer}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default VocabularyQuizResults
