import {
  Captions,
  Loader2,
  Maximize,
  Pause,
  PictureInPicture2,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

interface VideoPlayerProps {
  src: string
  poster?: string
  subtitleSrc?: string
  onEnded?: () => void
  autoHideControls?: boolean
}

export function VideoPlayer({
  src,
  poster,
  subtitleSrc,
  onEnded,
  autoHideControls = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isPiPSupported, setIsPiPSupported] = useState(false)
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  // Check PiP support
  useEffect(() => {
    setIsPiPSupported(
      "pictureInPictureEnabled" in document &&
        (document as Document & { pictureInPictureEnabled?: boolean })
          .pictureInPictureEnabled === true,
    )
  }, [])

  // Video event listeners
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

    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    const handleError = () => {
      setError("Failed to load video")
      setIsLoading(false)
    }

    const handleWaiting = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("error", handleError)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("error", handleError)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
    }
  }, [onEnded])

  // Auto-hide controls when playing
  useEffect(() => {
    if (!autoHideControls) return

    if (showControls && isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [showControls, isPlaying, autoHideControls])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }, [])

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video) return

    const rect = e.currentTarget.getBoundingClientRect()
    const percent = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    )
    video.currentTime = percent * duration
  }

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const video = videoRef.current
      if (!video) return

      const clampedVolume = Math.max(0, Math.min(1, newVolume))
      video.volume = clampedVolume
      setVolume(clampedVolume)
      if (clampedVolume > 0 && isMuted) {
        video.muted = false
        setIsMuted(false)
      }
    },
    [isMuted],
  )

  const handleSpeedChange = useCallback((speed: number) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = speed
    setPlaybackRate(speed)
  }, [])

  const togglePiP = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await video.requestPictureInPicture()
      }
    } catch {
      // PiP not available
    }
  }, [])

  const toggleSubtitles = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.textTracks.length) return

    const track = video.textTracks[0]
    if (track) {
      const newMode = subtitlesEnabled ? "hidden" : "showing"
      track.mode = newMode
      setSubtitlesEnabled(!subtitlesEnabled)
    }
  }, [subtitlesEnabled])

  const handleMouseMove = () => {
    setShowControls(true)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current
      if (!video) return

      switch (e.key) {
        case " ":
          e.preventDefault()
          togglePlay()
          break
        case "f":
          e.preventDefault()
          toggleFullscreen()
          break
        case "m":
          e.preventDefault()
          toggleMute()
          break
        case "ArrowLeft":
          e.preventDefault()
          video.currentTime = Math.max(0, video.currentTime - 5)
          break
        case "ArrowRight":
          e.preventDefault()
          video.currentTime = Math.min(duration, video.currentTime + 5)
          break
        case "ArrowUp":
          e.preventDefault()
          handleVolumeChange(Math.min(1, volume + 0.1))
          break
        case "ArrowDown":
          e.preventDefault()
          handleVolumeChange(Math.max(0, volume - 0.1))
          break
      }
    }

    container.addEventListener("keydown", handleKeyDown)
    return () => container.removeEventListener("keydown", handleKeyDown)
  }, [
    duration,
    volume,
    togglePlay,
    toggleFullscreen,
    toggleMute,
    handleVolumeChange,
  ])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900 text-white">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-black"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="h-full w-full object-contain"
        onClick={togglePlay}
        playsInline
      >
        {subtitleSrc && (
          <track
            kind="subtitles"
            src={subtitleSrc}
            srcLang="en"
            label="English"
            default={false}
          />
        )}
      </video>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
      )}

      {/* Play Button Overlay (when paused) */}
      {!isPlaying && !isLoading && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 p-4 backdrop-blur-sm transition-transform hover:scale-110"
        >
          <Play className="h-12 w-12 text-white" />
        </button>
      )}

      {/* Controls Overlay */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4",
          "transition-opacity duration-200",
          showControls ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {/* Progress Bar */}
        <div
          className="mb-3 h-1 cursor-pointer rounded bg-white/30"
          onClick={handleSeek}
        >
          <div
            className="h-full rounded bg-cyan-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="text-white transition-transform hover:scale-110"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </button>

          {/* Time Display */}
          <span className="text-sm text-white">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Volume Control */}
          <div className="flex items-center gap-1">
            <button type="button" onClick={toggleMute} className="text-white">
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className={cn(
                "h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/30",
                "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3",
                "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                "[&::-webkit-slider-thumb]:bg-white",
              )}
            />
          </div>

          <div className="flex-1" />

          {/* Playback Speed */}
          <select
            value={playbackRate}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="rounded border border-white/30 bg-transparent px-2 py-0.5 text-sm text-white"
          >
            {PLAYBACK_SPEEDS.map((speed) => (
              <option key={speed} value={speed} className="text-black">
                {speed}x
              </option>
            ))}
          </select>

          {/* Subtitles Button */}
          <button
            type="button"
            onClick={toggleSubtitles}
            disabled={!subtitleSrc}
            className={cn(
              "transition-transform",
              !subtitleSrc && "cursor-not-allowed opacity-30",
              subtitleSrc && "hover:scale-110",
              subtitlesEnabled ? "text-cyan-400" : "text-white",
            )}
            title={
              !subtitleSrc
                ? "No subtitles available"
                : subtitlesEnabled
                  ? "Disable subtitles"
                  : "Enable subtitles"
            }
          >
            <Captions className="h-5 w-5" />
          </button>

          {/* PiP Button */}
          {isPiPSupported && (
            <button
              type="button"
              onClick={togglePiP}
              className="text-white transition-transform hover:scale-110"
            >
              <PictureInPicture2 className="h-5 w-5" />
            </button>
          )}

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="text-white transition-transform hover:scale-110"
          >
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
