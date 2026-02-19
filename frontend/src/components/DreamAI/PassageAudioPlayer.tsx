/**
 * PassageAudioPlayer — Audio player with synchronized word highlighting.
 *
 * Renders the passage text as individual word spans and highlights the
 * currently spoken word using requestAnimationFrame + binary search.
 * Includes an inline voice picker to regenerate audio with a different voice.
 */

import { Loader2, Pause, Play, RefreshCw, Volume2, VolumeX } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import type { WordTimestamp } from "@/types/reading-comprehension"

export interface PassageAudioPlayerProps {
  audioBase64: string
  wordTimestamps: WordTimestamp[]
  durationSeconds: number
  className?: string
  /** Called when user wants to regenerate audio with a different voice */
  onRegenerateAudio?: (voiceId: string) => void
  /** True while audio is being regenerated */
  isRegenerating?: boolean
}

/** Edge TTS voices available for passage narration */
const VOICES = [
  { id: "en-US-JennyNeural", label: "Jenny — Female, Warm" },
  { id: "en-US-AriaNeural", label: "Aria — Female, Natural" },
  { id: "en-US-GuyNeural", label: "Guy — Male, Clear" },
  { id: "en-GB-SoniaNeural", label: "Sonia — Female, British" },
  { id: "en-GB-RyanNeural", label: "Ryan — Male, British" },
]

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function PassageAudioPlayer({
  audioBase64,
  wordTimestamps,
  durationSeconds,
  className,
  onRegenerateAudio,
  isRegenerating,
}: PassageAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const animFrameRef = useRef<number>(0)

  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(durationSeconds)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1)
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id)

  // Convert base64 to blob URL on mount
  useEffect(() => {
    const bytes = atob(audioBase64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) {
      arr[i] = bytes.charCodeAt(i)
    }
    const blob = new Blob([arr], { type: "audio/mpeg" })
    const url = URL.createObjectURL(blob)
    setBlobUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [audioBase64])

  // Binary search for the active word at a given time
  const findActiveWord = useCallback(
    (time: number): number => {
      if (wordTimestamps.length === 0) return -1

      let lo = 0
      let hi = wordTimestamps.length - 1

      while (lo <= hi) {
        const mid = (lo + hi) >>> 1
        const wt = wordTimestamps[mid]
        if (time < wt.start) {
          hi = mid - 1
        } else if (time >= wt.end) {
          lo = mid + 1
        } else {
          return mid
        }
      }
      return -1
    },
    [wordTimestamps],
  )

  // Animation frame loop for tracking playback position
  const tick = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audio.paused) return

    const t = audio.currentTime
    setCurrentTime(t)
    setActiveWordIndex(findActiveWord(t))
    animFrameRef.current = requestAnimationFrame(tick)
  }, [findActiveWord])

  // Start/stop animation frame when play state changes
  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(animFrameRef.current)
    }
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isPlaying, tick])

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      setActiveWordIndex(-1)
      setCurrentTime(0)
    }
    const onLoadedMetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)

    return () => {
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
    }
  }, [blobUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(console.error)
    }
  }, [isPlaying])

  const handleSeek = useCallback(
    (value: number[]) => {
      const audio = audioRef.current
      if (!audio || !duration) return
      const newTime = (value[0] / 100) * duration
      audio.currentTime = newTime
      setCurrentTime(newTime)
      setActiveWordIndex(findActiveWord(newTime))
    },
    [duration, findActiveWord],
  )

  const handleSpeedChange = useCallback((speed: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = speed
    setPlaybackSpeed(speed)
  }, [])

  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (!blobUrl) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparing audio...
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Audio element */}
      <audio ref={audioRef} src={blobUrl} preload="metadata" />

      {/* Passage text with highlighted words */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-sm leading-relaxed">
          {wordTimestamps.map((wt, i) => (
            <span key={i}>
              {i > 0 && " "}
              <span
                className={cn(
                  "rounded-sm transition-colors duration-150 cursor-pointer",
                  i === activeWordIndex
                    ? "bg-yellow-200 dark:bg-yellow-700/50"
                    : "hover:bg-blue-100 dark:hover:bg-blue-800/40",
                )}
                onClick={() => {
                  const audio = audioRef.current
                  if (audio) {
                    audio.currentTime = wt.start
                    setCurrentTime(wt.start)
                    setActiveWordIndex(i)
                    if (!isPlaying) audio.play().catch(console.error)
                  }
                }}
              >
                {wt.word}
              </span>
            </span>
          ))}
        </p>
      </div>

      {/* Player controls */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
            isPlaying
              ? "bg-teal-500 text-white hover:bg-teal-600"
              : "bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-800 dark:text-teal-300",
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5 translate-x-0.5" />
          )}
        </button>

        {/* Current time */}
        <span className="w-9 text-xs font-medium tabular-nums text-gray-600 dark:text-gray-400">
          {formatTime(currentTime)}
        </span>

        {/* Progress bar */}
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={handleSeek}
          className="flex-1"
          aria-label="Audio progress"
        />

        {/* Duration */}
        <span className="w-9 text-xs font-medium tabular-nums text-gray-600 dark:text-gray-400">
          {formatTime(duration)}
        </span>

        {/* Speed */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-6 min-w-[36px] items-center justify-center rounded-md bg-gray-100 px-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {playbackSpeed}x
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[80px]">
            {PLAYBACK_SPEEDS.map((speed) => (
              <DropdownMenuItem
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={cn(
                  "text-xs justify-center",
                  playbackSpeed === speed &&
                    "bg-teal-50 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
                )}
              >
                {speed}x
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mute */}
        <button
          type="button"
          onClick={toggleMute}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Regenerate audio with different voice */}
      {onRegenerateAudio && (
        <div className="flex items-center gap-2">
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICES.map((v) => (
                <SelectItem key={v.id} value={v.id} className="text-xs">
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => onRegenerateAudio(selectedVoice)}
            disabled={isRegenerating}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
              isRegenerating
                ? "border-muted text-muted-foreground cursor-not-allowed"
                : "border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-900/20",
            )}
          >
            {isRegenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      )}
    </div>
  )
}
