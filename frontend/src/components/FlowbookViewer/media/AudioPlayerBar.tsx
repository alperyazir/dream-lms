import { Volume2, VolumeX, X } from "lucide-react"
import { useCallback } from "react"
import { cn } from "@/lib/utils"
import { PLAYBACK_SPEEDS, useFlowbookAudioStore } from "../stores"
import { AudioPlayer } from "./AudioPlayer"

export function AudioPlayerBar() {
  const {
    currentSrc,
    volume,
    isMuted,
    playbackRate,
    stop,
    setVolume,
    setPlaybackRate,
    toggleMute,
  } = useFlowbookAudioStore()

  // Only show if there's an audio source
  const isVisible = !!currentSrc

  // Memoize to prevent AudioPlayer from recreating audio element
  const handleEnded = useCallback(() => {
    stop()
  }, [stop])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value))
  }

  const cyclePlaybackRate = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackRate)
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length
    setPlaybackRate(PLAYBACK_SPEEDS[nextIndex])
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-slate-900/95 backdrop-blur-sm",
        "transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex h-16 items-center gap-4 px-4">
        {currentSrc && (
          <>
            {/* Main Audio Player */}
            <div className="flex-1">
              <AudioPlayer
                src={currentSrc}
                volume={isMuted ? 0 : volume}
                playbackRate={playbackRate}
                onEnded={handleEnded}
                autoPlay
                compact
              />
            </div>

            {/* Additional Controls */}
            <div className="flex items-center gap-2">
              {/* Playback Speed */}
              <button
                type="button"
                onClick={cyclePlaybackRate}
                className={cn(
                  "flex h-8 w-12 items-center justify-center rounded",
                  "bg-white/10 text-xs font-medium text-white",
                  "hover:bg-white/20 transition-colors",
                )}
                title="Change playback speed"
              >
                {playbackRate}x
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded",
                    "text-white hover:bg-white/10 transition-colors",
                  )}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="h-1 w-20 cursor-pointer accent-cyan-500"
                  title={`Volume: ${Math.round(volume * 100)}%`}
                />
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={stop}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded",
                  "text-white hover:bg-white/10 transition-colors",
                )}
                title="Close audio player"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
