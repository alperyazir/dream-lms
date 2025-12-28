/**
 * Audio Player Component
 * Story 10.2: Frontend Audio Player Component
 *
 * Compact, professional audio player with play/pause, seeking, time display,
 * playback speed control, volume control, and mute toggle.
 */

import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface AudioPlayerProps {
  /** URL to the audio file */
  src: string
  /** Whether the player is expanded/visible */
  isExpanded?: boolean
  /** Callback when close button is clicked */
  onClose?: () => void
  /** Additional CSS classes */
  className?: string
}

/** Available playback speeds */
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

/**
 * Format seconds as MM:SS
 */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00"
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function AudioPlayer({
  src,
  isExpanded = true,
  onClose,
  className,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  // Handle play/pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch((err) => {
        setError("Failed to play audio")
        console.error("Audio play error:", err)
      })
    }
  }, [isPlaying])

  // Handle seek
  const handleSeek = useCallback(
    (value: number[]) => {
      const audio = audioRef.current
      if (!audio || !duration) return

      const newTime = (value[0] / 100) * duration
      audio.currentTime = newTime
      setCurrentTime(newTime)
    },
    [duration],
  )

  // Handle retry on error
  const handleRetry = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    setError(null)
    setIsLoading(true)
    audio.load()
  }, [])

  // Handle volume change
  const handleVolumeChange = useCallback(
    (value: number[]) => {
      const audio = audioRef.current
      if (!audio) return

      const newVolume = value[0] / 100
      audio.volume = newVolume
      setVolume(newVolume)
      if (newVolume > 0 && isMuted) {
        setIsMuted(false)
        audio.muted = false
      }
    },
    [isMuted],
  )

  // Handle mute toggle
  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    const newMuted = !isMuted
    audio.muted = newMuted
    setIsMuted(newMuted)
  }, [isMuted])

  // Handle playback speed change
  const handleSpeedChange = useCallback((speed: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.playbackRate = speed
    setPlaybackSpeed(speed)
  }, [])

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      if (audio) {
        audio.currentTime = 0
      }
    }

    const handleError = () => {
      setError("Failed to load audio")
      setIsLoading(false)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
      setError(null)
    }

    const handleLoadStart = () => {
      setIsLoading(true)
      setError(null)
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("error", handleError)
    audio.addEventListener("canplay", handleCanPlay)
    audio.addEventListener("loadstart", handleLoadStart)

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("error", handleError)
      audio.removeEventListener("canplay", handleCanPlay)
      audio.removeEventListener("loadstart", handleLoadStart)
    }
  }, [])

  // Cleanup: pause audio when component unmounts or src changes
  useEffect(() => {
    return () => {
      const audio = audioRef.current
      if (audio) {
        audio.pause()
      }
    }
  }, [])

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Get volume icon based on state
  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  if (!isExpanded) return null

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn("flex flex-col gap-2", className)}
        role="region"
        aria-label="Audio player"
      >
        {/* Hidden audio element */}
        <audio ref={audioRef} src={src} preload="metadata" />

        {/* Main controls row */}
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={error ? handleRetry : togglePlay}
                disabled={isLoading}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                  isLoading
                    ? "bg-gray-100 dark:bg-gray-700"
                    : error
                      ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400"
                      : isPlaying
                        ? "bg-teal-500 text-white hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
                        : "bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900 dark:text-teal-300 dark:hover:bg-teal-800",
                )}
                aria-label={
                  isLoading
                    ? "Loading audio"
                    : error
                      ? "Retry loading audio"
                      : isPlaying
                        ? "Pause"
                        : "Play"
                }
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                ) : error ? (
                  <RotateCcw className="h-4 w-4" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 translate-x-0.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isLoading
                ? "Loading..."
                : error
                  ? "Retry"
                  : isPlaying
                    ? "Pause"
                    : "Play"}
            </TooltipContent>
          </Tooltip>

          {/* Time Display - Current */}
          <span className="w-10 text-xs font-medium tabular-nums text-gray-600 dark:text-gray-400">
            {formatTime(currentTime)}
          </span>

          {/* Progress Bar */}
          <div className="flex flex-1 items-center">
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              onValueChange={handleSeek}
              disabled={isLoading || !!error}
              className="flex-1"
              aria-label="Audio progress"
            />
          </div>

          {/* Time Display - Duration */}
          <span className="w-10 text-xs font-medium tabular-nums text-gray-600 dark:text-gray-400">
            {error ? (
              <span className="text-red-500">Error</span>
            ) : (
              formatTime(duration)
            )}
          </span>

          {/* Speed Control */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-7 min-w-[40px] items-center justify-center rounded-md bg-gray-100 px-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    aria-label="Playback speed"
                  >
                    {playbackSpeed}x
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Playback speed
              </TooltipContent>
            </Tooltip>
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

          {/* Volume Control - Mute button + horizontal slider */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  <VolumeIcon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isMuted ? "Unmute" : "Mute"}
              </TooltipContent>
            </Tooltip>

            {/* Horizontal Volume Slider */}
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-20"
              aria-label="Volume"
            />
          </div>

          {/* Close Button */}
          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  aria-label="Close audio player"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Close
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
