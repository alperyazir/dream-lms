import { Play } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { getMediaUrl, getPageImageUrl } from "@/services/booksApi"
import type { VideoReference } from "@/types/flowbook"
import { VideoModal } from "./VideoModal"

/**
 * Convert SRT subtitle format to WebVTT format
 * HTML5 <track> element only supports WebVTT
 */
function convertSrtToVtt(srtContent: string): string {
  // Add WebVTT header
  let vtt = "WEBVTT\n\n"

  // Replace SRT timestamp format (00:00:00,000) with VTT format (00:00:00.000)
  const lines = srtContent.trim().split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip sequence numbers (just digits)
    if (/^\d+$/.test(line)) {
      continue
    }

    // Convert timestamp line: 00:00:00,000 --> 00:00:00,000
    if (line.includes("-->")) {
      // Replace commas with periods for milliseconds
      vtt += line.replace(/,/g, ".") + "\n"
    } else {
      // Regular subtitle text or empty line
      vtt += line + "\n"
    }
  }

  return vtt
}

interface VideoIconProps {
  videoRef: VideoReference
  pageWidth: number
  pageHeight: number
}

export function VideoIcon({ videoRef, pageWidth, pageHeight }: VideoIconProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [posterUrl, setPosterUrl] = useState<string | undefined>(undefined)
  const [subtitleUrl, setSubtitleUrl] = useState<string | undefined>(undefined)

  // Build authenticated URLs using blobs (HTML5 video can't send Authorization headers)
  useEffect(() => {
    let isMounted = true
    const blobUrls: string[] = []

    // Helper to check if URL is remote (full URL or API path)
    const isRemoteUrl = (url: string) =>
      url.startsWith("http") || url.startsWith("/api")

    // Helper to generate subtitle URL from video URL (same name, .srt extension)
    const getSubtitleUrlFromVideo = (videoSrc: string): string => {
      return videoSrc.replace(/\.(mp4|webm|ogv|mov|avi|mkv)($|&)/i, ".srt$2")
    }

    const loadUrls = async () => {
      try {
        if (isRemoteUrl(videoRef.src)) {
          // Fetch video as blob with Authorization header
          const url = await getMediaUrl(videoRef.src)
          if (isMounted && url) {
            blobUrls.push(url)
            setVideoUrl(url)
          }

          // Fetch poster as blob if it's a remote URL
          if (videoRef.poster && isRemoteUrl(videoRef.poster)) {
            const poster = await getPageImageUrl(videoRef.poster)
            if (isMounted && poster) {
              blobUrls.push(poster)
              setPosterUrl(poster)
            }
          } else if (videoRef.poster) {
            if (isMounted) {
              setPosterUrl(videoRef.poster)
            }
          }

          // Fetch subtitle - use explicit subtitleSrc or derive from video URL
          const subtitleSrc =
            videoRef.subtitleSrc || getSubtitleUrlFromVideo(videoRef.src)
          if (isRemoteUrl(subtitleSrc)) {
            try {
              // Fetch SRT file as text, convert to VTT, then create blob URL
              const srtBlob = await getMediaUrl(subtitleSrc)
              if (isMounted && srtBlob) {
                // Fetch the blob content as text
                const response = await fetch(srtBlob)
                const srtText = await response.text()

                // Convert SRT to VTT format
                const vttContent = convertSrtToVtt(srtText)

                // Create a new blob with VTT content
                const vttBlob = new Blob([vttContent], { type: "text/vtt" })
                const vttUrl = URL.createObjectURL(vttBlob)

                // Revoke the original SRT blob URL
                URL.revokeObjectURL(srtBlob)

                blobUrls.push(vttUrl)
                setSubtitleUrl(vttUrl)
              }
            } catch {
              // Subtitle file might not exist, that's OK
            }
          }
        } else {
          // Local development fallback
          if (isMounted) {
            setVideoUrl(videoRef.src)
            if (videoRef.poster) {
              setPosterUrl(videoRef.poster)
            }
            // Try to load subtitle with same name
            const subtitlePath =
              videoRef.subtitleSrc ||
              videoRef.src.replace(/\.(mp4|webm|ogv|mov|avi|mkv)$/i, ".srt")
            setSubtitleUrl(subtitlePath)
          }
        }
      } catch (error) {
        console.error("Failed to get video URLs:", error)
      }
    }

    loadUrls()

    return () => {
      isMounted = false
      // Revoke all blob URLs on cleanup
      blobUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [videoRef.src, videoRef.poster, videoRef.subtitleSrc])

  // Calculate position as percentage of page dimensions
  const leftPercent = (videoRef.x / pageWidth) * 100
  const topPercent = (videoRef.y / pageHeight) * 100

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering zoom gestures
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
  }

  if (!videoUrl) return null

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "absolute z-20 pointer-events-auto",
          "flex items-center justify-center",
          "h-6 w-6 rounded-full",
          "border-2 border-white",
          "bg-cyan-500/90 text-white",
          "shadow-md transition-all duration-200",
          "hover:scale-110 hover:bg-cyan-600",
        )}
        style={{
          left: `${leftPercent}%`,
          top: `${topPercent}%`,
        }}
        aria-label="Play video"
      >
        <Play className="h-3 w-3" />
      </button>

      <VideoModal
        src={videoUrl}
        poster={posterUrl}
        subtitleSrc={subtitleUrl}
        isOpen={isModalOpen}
        onClose={handleClose}
      />
    </>
  )
}
