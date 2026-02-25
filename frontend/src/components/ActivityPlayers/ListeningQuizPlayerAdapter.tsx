/**
 * ListeningQuizPlayerAdapter - Player for Listening Quiz activities
 * Story 30.11: Activity Player Updates - Task 1
 *
 * Audio-first MCQ player. Students listen to audio and answer questions.
 */

import { Loader2, Pause, Play } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

        })
        .catch(() => {
          setAudioLoading(false)
        })
    }
  }, [currentQuestion, isPlaying])

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
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-4 p-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />

      {/* Question card */}
      <Card className="w-full shadow-lg">
        <CardContent className="p-6">
          {/* Audio play button — only shown when audio is available */}
          {currentQuestion.audio_url &&
          currentQuestion.audio_status === "ready" && (
            <div className="mb-4 flex justify-center">
              <button
                onClick={handlePlayAudio}
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full transition-all shadow-md",
                  isPlaying
                    ? "bg-teal-600 hover:bg-teal-700 scale-110"
                    : "bg-teal-500 hover:bg-teal-600",
                )}
              >
                {audioLoading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 text-white ml-0.5" />
                )}
              </button>
            </div>
          )}

          {/* Question text */}
          <div className="mb-6 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 p-6 dark:from-teal-950/50 dark:to-cyan-950/50">
            <p className="text-center text-lg font-medium leading-relaxed text-gray-800 dark:text-gray-200">
              {currentQuestion.question_text}
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {currentQuestion.options.map((option, i) => {
              const isSelected = selectedOption === String(i)
              const isCorrect =
                showCorrectAnswers &&
                correctAnswers.has(currentQuestion.question_id)
              return (
                <Button
                  key={`${currentQuestion.question_id}-${i}`}
                  variant={isSelected ? "default" : "outline"}
                  disabled={showResults}
                  className={cn(
                    "h-auto min-h-[3rem] justify-start whitespace-normal py-3 px-4 text-left text-base transition-all",
                    isSelected &&
                      !showCorrectAnswers &&
                      "bg-teal-600 text-white hover:bg-teal-700 hover:text-white dark:bg-teal-600 dark:hover:bg-teal-700",
                    !isSelected &&
                      "hover:border-teal-300 hover:bg-teal-50 hover:text-gray-900 dark:hover:border-teal-700 dark:hover:bg-teal-950/50 dark:hover:text-gray-100",
                    showCorrectAnswers &&
                      isCorrect &&
                      isSelected &&
                      "bg-green-600 text-white hover:bg-green-700 hover:text-white",
                  )}
                  onClick={() =>
                    handleSelectOption(currentQuestion.question_id, i)
                  }
                >
                  <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-medium dark:bg-gray-700">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{option}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
