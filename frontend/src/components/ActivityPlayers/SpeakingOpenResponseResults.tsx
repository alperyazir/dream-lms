/**
 * SpeakingOpenResponseResults - Display submitted speaking prompts with audio playback
 *
 * Shows each prompt with an audio player for the student's recording.
 * No scoring — pending teacher review.
 */

import { Mic, Pause, Play } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { FreeResponseResult } from "@/lib/resultParsers"

interface SpeakingOpenResponseResultsProps {
  result: FreeResponseResult
  hideSummary?: boolean
  score?: number | null
}

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const animRef = useRef<number | null>(null)

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime
      const dur = audioRef.current.duration || 0
      setProgress(dur > 0 ? (current / dur) * 100 : 0)
      setDuration(dur)
    }
    if (isPlaying) {
      animRef.current = requestAnimationFrame(updateProgress)
    }
  }, [isPlaying])

  useEffect(() => {
    if (isPlaying) {
      animRef.current = requestAnimationFrame(updateProgress)
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [isPlaying, updateProgress])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  const togglePlay = () => {
    if (!audioRef.current) {
      const audio = new Audio(src)
      audioRef.current = audio
      audio.onended = () => {
        setIsPlaying(false)
        setProgress(0)
      }
      audio.onloadedmetadata = () => setDuration(audio.duration)
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-3 py-2">
      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-9 h-9 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center transition-colors"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-purple-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
        {formatTime(duration)}
      </span>
    </div>
  )
}

export function SpeakingOpenResponseResults({
  result,
  hideSummary = false,
  score,
}: SpeakingOpenResponseResultsProps) {
  return (
    <div className={cn("mx-auto flex max-w-2xl flex-col gap-4", !hideSummary && "p-4")}>
      {hideSummary && (
        score != null ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <span className="text-green-600 dark:text-green-400 text-sm font-medium">
              Scored: {score}%
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
              Pending Teacher Review
            </span>
          </div>
        )
      )}

      <div className="space-y-3">
        {result.item_results.map((item, index) => {
          const hasAudio = item.submitted_text && item.submitted_text.startsWith("data:audio")

          return (
            <Card
              key={item.item_id}
              className="border-l-4 border-l-purple-400 bg-purple-50/30 dark:bg-purple-950/10"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 pt-0.5">
                    <Mic className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Prompt #{index + 1}
                    </span>

                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {item.prompt}
                    </p>

                    {hasAudio ? (
                      <AudioPlayer src={item.submitted_text} />
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Recording submitted
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default SpeakingOpenResponseResults
