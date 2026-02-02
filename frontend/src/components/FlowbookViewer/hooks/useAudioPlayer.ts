import { useCallback, useEffect, useRef, useState } from "react"

interface UseAudioPlayerOptions {
  onEnded?: () => void
  volume?: number
  playbackRate?: number
  autoPlay?: boolean
}

interface UseAudioPlayerReturn {
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  currentTime: number
  duration: number
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
}

export function useAudioPlayer(
  src: string,
  options: UseAudioPlayerOptions = {},
): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndedRef = useRef(options.onEnded)
  const autoPlayRef = useRef(options.autoPlay)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Keep onEnded ref updated without triggering audio recreation
  useEffect(() => {
    onEndedRef.current = options.onEnded
  }, [options.onEnded])

  // Initialize audio element - only recreate when src changes
  useEffect(() => {
    const audio = new Audio(src)
    audioRef.current = audio

    // Apply initial settings
    if (options.volume !== undefined) {
      audio.volume = options.volume
    }
    if (options.playbackRate !== undefined) {
      audio.playbackRate = options.playbackRate
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      onEndedRef.current?.()
    }

    const handleError = (e: Event) => {
      const audioEl = e.target as HTMLAudioElement
      const errorCode = audioEl.error?.code
      const errorMessage = audioEl.error?.message
      console.error("Audio error:", {
        code: errorCode,
        message: errorMessage,
        src: audio.src,
      })
      setError(`Failed to load audio: ${errorMessage || "Unknown error"}`)
      setIsLoading(false)
    }

    const handleWaiting = () => setIsLoading(true)
    const handleCanPlay = () => {
      setIsLoading(false)
      // Auto-play when ready if autoPlay option is set
      if (autoPlayRef.current) {
        audio.play().catch(() => {
          console.log("Autoplay blocked by browser")
        })
      }
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("error", handleError)
    audio.addEventListener("waiting", handleWaiting)
    audio.addEventListener("canplay", handleCanPlay)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)

    return () => {
      audio.pause()
      audio.src = ""
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("error", handleError)
      audio.removeEventListener("waiting", handleWaiting)
      audio.removeEventListener("canplay", handleCanPlay)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]) // Only recreate audio element when src changes

  // Update volume when changed externally
  useEffect(() => {
    if (audioRef.current && options.volume !== undefined) {
      audioRef.current.volume = options.volume
    }
  }, [options.volume])

  // Update playback rate when changed externally
  useEffect(() => {
    if (audioRef.current && options.playbackRate !== undefined) {
      audioRef.current.playbackRate = options.playbackRate
    }
  }, [options.playbackRate])

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {
      setError("Playback failed")
    })
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      const clampedTime = Math.max(
        0,
        Math.min(time, audioRef.current.duration || 0),
      )
      audioRef.current.currentTime = clampedTime
      setCurrentTime(clampedTime)
    }
  }, [])

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume))
    }
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
  }, [])

  return {
    isPlaying,
    isLoading,
    error,
    currentTime,
    duration,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    setPlaybackRate,
  }
}
