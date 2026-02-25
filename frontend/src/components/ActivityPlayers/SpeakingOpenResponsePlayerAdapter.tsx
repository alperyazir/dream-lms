/**
 * SpeakingOpenResponsePlayerAdapter - Player for Speaking Open Response
 *
 * Shows a speaking prompt + context card. Student records audio response.
 * Timer counts up to max_seconds. Auto-stops at time limit.
 * After recording: playback review with re-record option.
 * No auto-scoring — teacher reviews manually.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, MicOff, Play, Pause, RotateCcw } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent } from "@/components/ui/card"
import type { ActivityConfig } from "@/lib/mockData"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"

interface SpeakingItem {
  item_id: string
  prompt: string
  context: string
  max_seconds: number
  difficulty?: string
  grading_rubric?: string[]
}

interface SpeakingContent {
  activity_id: string
  items: SpeakingItem[]
  total_items: number
  difficulty: string
  requires_manual_grading?: boolean
}

interface SpeakingOpenResponsePlayerAdapterProps {
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function SpeakingOpenResponsePlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers: _correctAnswers,
  initialAnswers,
  showCorrectAnswers: _showCorrectAnswers,
  currentQuestionIndex,
  onQuestionIndexChange: _onQuestionIndexChange,
  onNavigationStateChange,
}: SpeakingOpenResponsePlayerAdapterProps) {
  const content = (activity as any).content as SpeakingContent
  const items = content?.items || []

  // Answers map: item_id -> "recorded" (audio is stored locally, we just track state)
  const [answers, setAnswers] = useState<Map<string, string>>(
    () => initialAnswers || new Map(),
  )

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)

  // Navigation guard: warn when trying to navigate while recording
  const [showRecordingWarning, setShowRecordingWarning] = useState(false)
  const [confirmedIndex, setConfirmedIndex] = useState(currentQuestionIndex ?? 0)
  const isRecordingRef = useRef(false)
  isRecordingRef.current = isRecording

  const qIndex = confirmedIndex
  const currentItem = items[qIndex]

  // Intercept navigation: if recording, show warning instead of navigating
  useEffect(() => {
    const incoming = currentQuestionIndex ?? 0
    if (incoming !== confirmedIndex) {
      if (isRecordingRef.current) {
        setShowRecordingWarning(true)
      } else {
        setConfirmedIndex(incoming)
      }
    }
  }, [currentQuestionIndex, confirmedIndex])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Per-item audio URLs
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map())

  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange

  useEffect(() => {
    onAnswersChangeRef.current(new Map(answers))
  }, [answers])

  useEffect(() => {
    if (onNavigationStateChange) {
      const answeredIndices = items
        .map((item, i) => (answers.has(item.item_id) ? i : -1))
        .filter((i) => i >= 0)
      onNavigationStateChange({
        currentIndex: qIndex,
        totalItems: items.length,
        answeredItemIds: items
          .filter((item) => answers.has(item.item_id))
          .map((item) => item.item_id),
        answeredIndices,
      })
    }
  }, [answers, items, qIndex, onNavigationStateChange])

  // Stop recording/playback when navigating to a different question
  useEffect(() => {
    // Stop active recording and save it
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const existingUrl = audioUrls.get(currentItem?.item_id || "")
    setAudioUrl(existingUrl || null)
    setRecordingTime(0)
    setIsRecording(false)
    setIsPlaying(false)
    setMicError(null)
  }, [qIndex, currentItem?.item_id, audioUrls])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setMicError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        if (currentItem) {
          setAudioUrls((prev) => {
            const next = new Map(prev)
            next.set(currentItem.item_id, url)
            return next
          })
          // Convert blob to base64 data URL and store as answer
          const reader = new FileReader()
          reader.onloadend = () => {
            const dataUrl = reader.result as string
            setAnswers((prev) => {
              const next = new Map(prev)
              next.set(currentItem.item_id, dataUrl)
              return next
            })
          }
          reader.readAsDataURL(audioBlob)
        }
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1
          if (currentItem && next >= currentItem.max_seconds) {
            // Auto-stop at time limit
            mediaRecorder.stop()
            setIsRecording(false)
            if (timerRef.current) clearInterval(timerRef.current)
          }
          return next
        })
      }, 1000)
    } catch (err) {
      setMicError(
        "Could not access microphone. Please allow microphone permissions.",
      )
    }
  }, [currentItem])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const reRecord = useCallback(() => {
    setAudioUrl(null)
    if (currentItem) {
      setAudioUrls((prev) => {
        const next = new Map(prev)
        next.delete(currentItem.item_id)
        return next
      })
      setAnswers((prev) => {
        const next = new Map(prev)
        next.delete(currentItem.item_id)
        return next
      })
    }
    setRecordingTime(0)
  }, [currentItem])

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return

    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onended = () => setIsPlaying(false)
      audio.play()
      setIsPlaying(true)
    }
  }, [audioUrl, isPlaying])

  // Navigation guard: stop recording and proceed to the pending question
  const handleConfirmNavigate = useCallback(() => {
    // Stop the active recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      if (timerRef.current) clearInterval(timerRef.current)
    }
    setIsRecording(false)
    setShowRecordingWarning(false)
    // Apply the pending navigation
    setConfirmedIndex(currentQuestionIndex ?? 0)
  }, [currentQuestionIndex])

  const handleCancelNavigate = useCallback(() => {
    setShowRecordingWarning(false)
    // Reset parent index back to confirmedIndex so UI stays in sync
    if (_onQuestionIndexChange) {
      _onQuestionIndexChange(confirmedIndex)
    }
  }, [confirmedIndex, _onQuestionIndexChange])

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No items available.
      </div>
    )
  }

  if (showResults) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Speaking Submitted</h2>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
            Pending Teacher Review
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Your responses have been saved. Your teacher will review and score
          them.
        </p>
      </div>
    )
  }

  const maxSec = currentItem.max_seconds
  const progress = maxSec > 0 ? Math.min((recordingTime / maxSec) * 100, 100) : 0

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-4 p-4 sm:p-6">
      <Card className="w-full shadow-lg">
        <CardContent className="p-6">
          {/* Prompt */}
          <div className="w-full text-center mb-6">
            <p className="text-lg font-medium">{currentItem.prompt}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Speak for up to {formatTime(maxSec)}
            </p>
          </div>

          {/* Mic error */}
          {micError && (
            <div className="w-full mb-4 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{micError}</p>
            </div>
          )}

          {/* Recording / Playback area */}
          {!audioUrl ? (
            <div className="flex flex-col items-center gap-4">
              {/* Timer display */}
              <div className="text-3xl font-mono tabular-nums">
                {formatTime(recordingTime)}
                <span className="text-lg text-muted-foreground">
                  {" "}
                  / {formatTime(maxSec)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-64 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    isRecording
                      ? progress > 80
                        ? "bg-red-500"
                        : "bg-teal-500"
                      : "bg-muted-foreground/30",
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Record button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg",
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                    : "bg-teal-500 hover:bg-teal-600 text-white",
                )}
              >
                {isRecording ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>

              <p className="text-sm text-muted-foreground">
                {isRecording ? "Tap to stop recording" : "Tap to start recording"}
              </p>
            </div>
          ) : (
            /* Playback review */
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayback}
                  className="w-14 h-14 rounded-full bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center shadow-lg transition-all"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-0.5" />
                  )}
                </button>
                <button
                  onClick={reRecord}
                  className="w-14 h-14 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground flex items-center justify-center shadow transition-all"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                {isPlaying
                  ? "Playing..."
                  : "Tap play to review, or re-record"}
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Recording saved
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning dialog when navigating while recording */}
      <AlertDialog open={showRecordingWarning} onOpenChange={setShowRecordingWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recording in Progress</AlertDialogTitle>
            <AlertDialogDescription>
              You are currently recording. If you navigate away, the recording
              will be stopped and saved. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNavigate}>
              Keep Recording
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigate}>
              Stop & Navigate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
