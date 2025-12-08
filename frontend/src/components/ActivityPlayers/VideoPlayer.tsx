/**
 * Video Player Component
 * Story 10.3: Video Attachment to Assignments
 *
 * Modern full-featured video player with play/pause, seeking, time display,
 * playback speed control, volume control, fullscreen, subtitle support,
 * and minimize/expand functionality.
 */

import { useRef, useState, useEffect, useCallback } from "react"
import {
  Play,
  Pause,
  Loader2,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize2,
  ChevronUp,
  ChevronDown,
  Captions,
  CaptionsOff,
  Settings,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { parseSRT, type Subtitle, getCurrentSubtitle } from "@/lib/videoUtils"

export interface VideoPlayerProps {
  /** URL to the video file */
  src: string
  /** URL to subtitle file (.srt) - optional */
  subtitleSrc?: string
  /** Whether player is expanded */
  isExpanded?: boolean
  /** Callback when minimize clicked */
  onMinimize?: () => void
  /** Callback when expand clicked */
  onExpand?: () => void
  /** Additional CSS classes */
  className?: string
}

/** Available playback speeds */
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

/**
 * Format seconds as MM:SS or HH:MM:SS for longer videos
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return "0:00"
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function VideoPlayer({
  src,
  subtitleSrc,
  isExpanded = true,
  onMinimize,
  onExpand,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [subtitles, setSubtitles] = useState<Subtitle[]>([])
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null)
  const [subtitlesAvailable, setSubtitlesAvailable] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isHoveringProgress, setIsHoveringProgress] = useState(false)
  const [hoverTime, setHoverTime] = useState(0)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying && !isHoveringProgress) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    } else {
      setShowControls(true)
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying, isHoveringProgress])

  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying])

  // Load subtitles if available
  useEffect(() => {
    if (!subtitleSrc) {
      setSubtitlesAvailable(false)
      setSubtitles([])
      return
    }

    const loadSubtitles = async () => {
      try {
        const response = await fetch(subtitleSrc)
        if (response.ok) {
          const srtText = await response.text()
          const parsed = parseSRT(srtText)
          setSubtitles(parsed)
          setSubtitlesAvailable(parsed.length > 0)
        } else {
          setSubtitlesAvailable(false)
        }
      } catch (err) {
        console.warn("Failed to load subtitles:", err)
        setSubtitlesAvailable(false)
      }
    }

    loadSubtitles()
  }, [subtitleSrc])

  // Update current subtitle based on time
  useEffect(() => {
    if (!showSubtitles || subtitles.length === 0) {
      setCurrentSubtitle(null)
      return
    }

    const subtitle = getCurrentSubtitle(subtitles, currentTime)
    setCurrentSubtitle(subtitle?.text || null)
  }, [currentTime, subtitles, showSubtitles])

  // Handle play/pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch((err) => {
        setError("Failed to play video")
        console.error("Video play error:", err)
      })
    }
  }, [isPlaying])

  // Handle seek from progress bar click
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current
      const progressBar = progressRef.current
      if (!video || !progressBar || !duration) return

      const rect = progressBar.getBoundingClientRect()
      const clickPosition = (e.clientX - rect.left) / rect.width
      const newTime = clickPosition * duration
      video.currentTime = newTime
      setCurrentTime(newTime)
    },
    [duration],
  )

  // Handle hover on progress bar
  const handleProgressHover = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const progressBar = progressRef.current
      if (!progressBar || !duration) return

      const rect = progressBar.getBoundingClientRect()
      const hoverPosition = (e.clientX - rect.left) / rect.width
      setHoverTime(hoverPosition * duration)
    },
    [duration],
  )

  // Handle retry on error
  const handleRetry = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    setError(null)
    setIsLoading(true)
    video.load()
  }, [])

  // Handle volume change
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current
      if (!video) return

      const newVolume = parseFloat(e.target.value)
      video.volume = newVolume
      setVolume(newVolume)
      if (newVolume > 0 && isMuted) {
        setIsMuted(false)
        video.muted = false
      }
    },
    [isMuted],
  )

  // Handle mute toggle
  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const newMuted = !isMuted
    video.muted = newMuted
    setIsMuted(newMuted)
  }, [isMuted])

  // Handle playback speed change
  const handleSpeedChange = useCallback((speed: number) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = speed
    setPlaybackSpeed(speed)
  }, [])

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error("Fullscreen error:", err)
    }
  }, [])

  // Handle subtitle toggle
  const toggleSubtitles = useCallback(() => {
    setShowSubtitles((prev) => !prev)
  }, [])

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      if (video) {
        video.currentTime = 0
      }
    }

    const handleError = () => {
      setError("Failed to load video")
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

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("error", handleError)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("loadstart", handleLoadStart)

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("error", handleError)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("loadstart", handleLoadStart)
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Cleanup: pause video when component unmounts or src changes
  useEffect(() => {
    return () => {
      const video = videoRef.current
      if (video) {
        video.pause()
      }
    }
  }, [src])

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const hoverProgress = duration > 0 ? (hoverTime / duration) * 100 : 0

  // Get volume icon based on state
  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  // Minimized view
  if (!isExpanded) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 p-3 shadow-lg",
          className,
        )}
      >
        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200",
            isPlaying
              ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30 hover:bg-teal-400"
              : "bg-white/10 text-white hover:bg-white/20",
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 translate-x-0.5" />
          )}
        </button>

        <div className="flex flex-1 items-center gap-3">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/20"
            onClick={handleProgressClick}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="min-w-[80px] text-right text-xs font-medium tabular-nums text-white/70">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Expand video player"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        ref={containerRef}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-xl bg-black shadow-2xl",
          isFullscreen && "fixed inset-0 z-50 rounded-none",
          className,
        )}
        role="region"
        aria-label="Video player"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {/* Video Container */}
        <div className="relative aspect-video w-full bg-black">
          <video
            ref={videoRef}
            src={src}
            preload="metadata"
            className="h-full w-full"
            onClick={togglePlay}
          />

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 animate-spin text-teal-400" />
                <span className="text-sm text-white/70">Loading video...</span>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-red-500/20 p-4">
                  <RotateCcw className="h-8 w-8 text-red-400" />
                </div>
                <p className="text-sm text-white/80">{error}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-2 rounded-full bg-teal-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-teal-400 hover:shadow-lg hover:shadow-teal-500/30"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Subtitle Overlay */}
          {currentSubtitle && showSubtitles && (
            <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-4">
              <p className="max-w-[85%] rounded-lg bg-black/80 px-4 py-2 text-center text-base font-medium text-white shadow-lg backdrop-blur-sm md:text-lg">
                {currentSubtitle}
              </p>
            </div>
          )}

          {/* Center Play Button (shows when paused) */}
          {!isLoading && !error && !isPlaying && (
            <div
              className="absolute inset-0 flex cursor-pointer items-center justify-center"
              onClick={togglePlay}
            >
              <div className="rounded-full bg-black/50 p-5 backdrop-blur-sm transition-transform hover:scale-110">
                <Play className="h-12 w-12 translate-x-1 text-white" />
              </div>
            </div>
          )}

          {/* Gradient overlay for controls visibility */}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-0",
            )}
          />
        </div>

        {/* Controls Bar */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex flex-col gap-2 px-4 pb-4 pt-8 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0",
          )}
        >
          {/* Progress Bar */}
          <div
            ref={progressRef}
            className="group/progress relative h-1 cursor-pointer rounded-full bg-white/30 transition-all hover:h-1.5"
            onClick={handleProgressClick}
            onMouseEnter={() => setIsHoveringProgress(true)}
            onMouseLeave={() => setIsHoveringProgress(false)}
            onMouseMove={handleProgressHover}
          >
            {/* Hover preview */}
            {isHoveringProgress && (
              <div
                className="absolute -top-8 -translate-x-1/2 rounded bg-black/90 px-2 py-1 text-xs text-white"
                style={{ left: `${hoverProgress}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
            {/* Buffered indicator could go here */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all"
              style={{ width: `${progress}%` }}
            />
            {/* Thumb */}
            <div
              className={cn(
                "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400 shadow-lg transition-all",
                isHoveringProgress ? "scale-100 opacity-100" : "scale-0 opacity-0",
              )}
              style={{ left: `${progress}%` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-1">
            {/* Play/Pause Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={error ? handleRetry : togglePlay}
                  disabled={isLoading}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                    isLoading
                      ? "text-white/50"
                      : error
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "text-white hover:bg-white/10",
                  )}
                  aria-label={
                    isLoading
                      ? "Loading video"
                      : error
                        ? "Retry loading video"
                        : isPlaying
                          ? "Pause"
                          : "Play"
                  }
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : error ? (
                    <RotateCcw className="h-5 w-5" />
                  ) : isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 translate-x-0.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isLoading
                  ? "Loading..."
                  : error
                    ? "Retry"
                    : isPlaying
                      ? "Pause"
                      : "Play"}
              </TooltipContent>
            </Tooltip>

            {/* Volume Control */}
            <div
              className="relative flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    <VolumeIcon className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {isMuted ? "Unmute" : "Mute"}
                </TooltipContent>
              </Tooltip>

              {/* Volume Slider */}
              <div
                className={cn(
                  "flex items-center overflow-hidden transition-all duration-200",
                  showVolumeSlider ? "w-24 opacity-100" : "w-0 opacity-0",
                )}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-teal-400 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-400"
                  aria-label="Volume"
                />
              </div>
            </div>

            {/* Time Display */}
            <span className="ml-2 text-sm font-medium tabular-nums text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Subtitle Toggle */}
            {subtitlesAvailable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleSubtitles}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
                      showSubtitles
                        ? "bg-teal-500/20 text-teal-400"
                        : "text-white/60 hover:bg-white/10 hover:text-white",
                    )}
                    aria-label={showSubtitles ? "Hide subtitles" : "Show subtitles"}
                  >
                    {showSubtitles ? (
                      <Captions className="h-5 w-5" />
                    ) : (
                      <CaptionsOff className="h-5 w-5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {showSubtitles ? "Hide subtitles" : "Show subtitles"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Speed Control */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-10 items-center gap-1 rounded-full px-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label="Playback speed"
                    >
                      <Settings className="h-4 w-4" />
                      <span>{playbackSpeed}x</span>
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Playback speed
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="min-w-[100px]">
                {PLAYBACK_SPEEDS.map((speed) => (
                  <DropdownMenuItem
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={cn(
                      "justify-center text-sm",
                      playbackSpeed === speed &&
                        "bg-teal-50 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400",
                    )}
                  >
                    {speed}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Minimize Button */}
            {onMinimize && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onMinimize}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Minimize video player"
                  >
                    <ChevronUp className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Minimize
                </TooltipContent>
              </Tooltip>
            )}

            {/* Fullscreen Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
