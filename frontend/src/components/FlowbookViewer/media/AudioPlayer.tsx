import { Loader2, Pause, Play } from "lucide-react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useAudioPlayer } from "../hooks/useAudioPlayer"

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

interface AudioPlayerProps {
  src: string
  onEnded?: () => void
  volume?: number
  playbackRate?: number
  compact?: boolean
  autoPlay?: boolean
}

export function AudioPlayer({
  src,
  onEnded,
  volume = 1,
  playbackRate = 1,
  compact = false,
  autoPlay = false,
}: AudioPlayerProps) {
  const {
    isPlaying,
    isLoading,
    error,
    currentTime,
    duration,
    toggle,
    seek,
  } = useAudioPlayer(src, { onEnded, volume, playbackRate, autoPlay })

  const progressRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    )
    seek(percent * duration)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    handleProgressClick(e)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleProgressClick(e)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400">
        <span>Failed to load audio</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-3", compact ? "gap-2" : "gap-3")}>
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={toggle}
        disabled={isLoading}
        className={cn(
          "flex items-center justify-center rounded-full",
          "bg-cyan-500 text-white hover:bg-cyan-600",
          "transition-colors disabled:opacity-50",
          compact ? "h-8 w-8" : "h-10 w-10",
        )}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <Loader2
            className={cn("animate-spin", compact ? "h-4 w-4" : "h-5 w-5")}
          />
        ) : isPlaying ? (
          <Pause className={compact ? "h-4 w-4" : "h-5 w-5"} />
        ) : (
          <Play className={cn("ml-0.5", compact ? "h-4 w-4" : "h-5 w-5")} />
        )}
      </button>

      {/* Progress Bar and Time */}
      <div className="flex flex-1 items-center gap-2">
        <span
          className={cn(
            "w-10 text-right text-white",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {formatTime(currentTime)}
        </span>

        <div
          ref={progressRef}
          className="relative h-2 flex-1 cursor-pointer rounded-full bg-white/30"
          onClick={handleProgressClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          role="slider"
          aria-label="Audio progress"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
        >
          {/* Progress Fill */}
          <div
            className="h-full rounded-full bg-cyan-400"
            style={{ width: `${progress}%` }}
          />

          {/* Draggable Handle */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2",
              "h-4 w-4 rounded-full bg-white shadow-md",
              "transition-transform hover:scale-110",
              isDragging && "scale-110",
            )}
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>

        <span
          className={cn("w-10 text-white", compact ? "text-xs" : "text-sm")}
        >
          {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}
