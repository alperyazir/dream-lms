import { Volume2 } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { getMediaUrl } from "@/services/booksApi"
import type { AudioReference } from "@/types/flowbook"
import { useFlowbookAudioStore } from "../stores"

interface AudioIconProps {
  audioRef: AudioReference
  pageWidth: number
  pageHeight: number
}

export function AudioIcon({ audioRef, pageWidth, pageHeight }: AudioIconProps) {
  const { currentSrc, isPlaying, play, pause } = useFlowbookAudioStore()
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // Build authenticated audio URL using blob (HTML5 audio can't send Authorization headers)
  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    const loadUrl = async () => {
      try {
        // Check URL type
        const isRemoteUrl =
          audioRef.src.startsWith("http") || audioRef.src.startsWith("/api")

        if (isRemoteUrl) {
          // Fetch as blob with Authorization header
          const url = await getMediaUrl(audioRef.src)
          if (isMounted && url) {
            blobUrl = url
            setAudioUrl(url)
          }
        } else {
          // Local development fallback - direct URL
          if (isMounted) {
            setAudioUrl(audioRef.src)
          }
        }
      } catch (error) {
        console.error("Failed to get audio URL:", error)
      }
    }

    loadUrl()

    return () => {
      isMounted = false
      // Revoke blob URL on cleanup
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [audioRef.src])

  const isActive = audioUrl && currentSrc === audioUrl && isPlaying

  // Calculate position as percentage of page dimensions
  const leftPercent = (audioRef.x / pageWidth) * 100
  const topPercent = (audioRef.y / pageHeight) * 100

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering zoom gestures
    if (!audioUrl) return

    if (isActive) {
      pause()
    } else {
      play(audioUrl)
    }
  }

  if (!audioUrl) return null

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "absolute z-20 pointer-events-auto",
        "flex items-center justify-center",
        "h-6 w-6 rounded-full",
        "border-2 border-white",
        "shadow-md transition-all duration-200",
        isActive
          ? "scale-110 bg-cyan-500 text-white"
          : "bg-cyan-500/90 text-white hover:bg-cyan-600 hover:scale-110",
      )}
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
      }}
      aria-label={isActive ? "Pause audio" : "Play audio"}
    >
      <Volume2 className={cn("h-3 w-3", isActive && "animate-pulse")} />
    </button>
  )
}
