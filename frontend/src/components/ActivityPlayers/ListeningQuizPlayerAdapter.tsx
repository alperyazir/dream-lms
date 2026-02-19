/**
 * ListeningQuizPlayerAdapter - Player for Listening Quiz activities
 * Story 30.11: Activity Player Updates - Task 1
 *
 * Audio-first MCQ player. Students listen to audio and answer questions.
 */

import { Loader2, Pause, Play, Volume2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ActivityConfig } from "@/lib/mockData"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"

interface ListeningQuizQuestion {
  question_id: string
  audio_url: string | null
  audio_status: string
  question_text: string
  options: string[]
  sub_skill?: string
  difficulty?: string
}

interface ListeningQuizContent {
  activity_id: string
  questions: ListeningQuizQuestion[]
  total_questions: number
  difficulty: string
}

interface ListeningQuizPlayerAdapterProps {
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

export function ListeningQuizPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  initialAnswers,
  showCorrectAnswers,
  currentQuestionIndex,
  onQuestionIndexChange: _onQuestionIndexChange,
  onNavigationStateChange,
}: ListeningQuizPlayerAdapterProps) {
  const content = (activity as any).content as ListeningQuizContent
  const questions = content?.questions || []

  // Answer state: question_id -> selected option index (as string)
  const [answers, setAnswers] = useState<Map<string, string>>(() => {
    return initialAnswers || new Map()
  })

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const [playCount, setPlayCount] = useState(0)

  // Current question index
  const qIndex =
    currentQuestionIndex !== undefined
      ? currentQuestionIndex
      : 0
  const currentQuestion = questions[qIndex]

  // Notify parent of answers changes
  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange

  useEffect(() => {
    onAnswersChangeRef.current(new Map(answers))
  }, [answers])

  // Report navigation state
  useEffect(() => {
    if (onNavigationStateChange) {
      const answeredIndices = questions
        .map((q, i) => (answers.has(q.question_id) ? i : -1))
        .filter((i) => i >= 0)
      onNavigationStateChange({
        currentIndex: qIndex,
        totalItems: questions.length,
        answeredItemIds: questions
          .filter((q) => answers.has(q.question_id))
          .map((q) => q.question_id),
        answeredIndices,
      })
    }
  }, [answers, questions, onNavigationStateChange])

  // Handle option selection
  const handleSelectOption = useCallback(
    (questionId: string, optionIndex: number) => {
      setAnswers((prev) => {
        const next = new Map(prev)
        next.set(questionId, String(optionIndex))
        return next
      })
    },
    [],
  )

  // Audio controls
  const handlePlayAudio = useCallback(() => {
    if (!currentQuestion?.audio_url) return
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.src = currentQuestion.audio_url
      setAudioLoading(true)
      audio
        .play()
        .then(() => {
          setIsPlaying(true)
          setAudioLoading(false)
          setPlayCount((c) => c + 1)
        })
        .catch(() => {
          setAudioLoading(false)
        })
    }
  }, [currentQuestion, isPlaying])

  const handleReplayAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentQuestion?.audio_url) return
    audio.currentTime = 0
    audio.src = currentQuestion.audio_url
    audio
      .play()
      .then(() => {
        setIsPlaying(true)
        setPlayCount((c) => c + 1)
      })
      .catch(() => {})
  }, [currentQuestion])

  // Audio ended handler
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => setIsPlaying(false)
    audio.addEventListener("ended", onEnded)
    return () => audio.removeEventListener("ended", onEnded)
  }, [])

  // Reset play state when question changes
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      setIsPlaying(false)
    }
    setPlayCount(0)
  }, [qIndex])

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No questions available.
      </div>
    )
  }

  const selectedOption = answers.get(currentQuestion.question_id)

  if (showResults) {
    const total = questions.length
    const correct = questions.filter((q) =>
      correctAnswers.has(q.question_id),
    ).length
    const score = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Listening Quiz Complete!</h2>
        <p className="text-lg">Score: {score}%</p>
        <p className="text-sm text-gray-600">
          {correct} out of {total} correct
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6 max-w-2xl mx-auto">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />

      {/* Audio Play Button - prominent */}
      <div className="flex flex-col items-center gap-3">
        {currentQuestion.audio_url &&
        currentQuestion.audio_status === "ready" ? (
          <>
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Volume2 className="h-4 w-4" />
              <span>
                {playCount > 0
                  ? `Played ${playCount} time${playCount > 1 ? "s" : ""}`
                  : "Tap to listen"}
              </span>
              {playCount > 0 && (
                <button
                  onClick={handleReplayAudio}
                  className="text-teal-600 hover:text-teal-700 underline text-xs"
                >
                  Replay
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            Audio not available
          </div>
        )}
      </div>

      {/* Question text */}
      <div className="text-center">
        <p className="text-lg font-medium">{currentQuestion.question_text}</p>
      </div>

      {/* Options */}
      <div className="w-full space-y-3">
        {currentQuestion.options.map((option, i) => {
          const isSelected = selectedOption === String(i)
          const isCorrect =
            showCorrectAnswers &&
            correctAnswers.has(currentQuestion.question_id)
          return (
            <button
              key={i}
              onClick={() =>
                handleSelectOption(currentQuestion.question_id, i)
              }
              disabled={showResults}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                isSelected
                  ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-teal-300",
                showCorrectAnswers &&
                  isCorrect &&
                  isSelected &&
                  "border-green-500 bg-green-50 dark:bg-green-900/20",
              )}
            >
              <span
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                  isSelected
                    ? "bg-teal-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{option}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
