/**
 * VideoPreviewModal Component
 * Story 10.3: Video Attachment to Assignments
 *
 * Modal dialog for previewing a video before attaching it to an assignment.
 * Allows teachers to watch the video and confirm their selection.
 */

import { Subtitles, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { VideoInfo } from "@/services/booksApi"
import { VideoPlayer } from "./VideoPlayer"

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem("access_token")
}

/**
 * Get the API base URL from environment
 */
function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || ""
}

export interface VideoPreviewModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Called when the modal should close */
  onOpenChange: (open: boolean) => void
  /** The video to preview */
  video: VideoInfo | null
  /** Book ID for constructing video URL */
  bookId: string | number
  /** Video source URL (pre-constructed) */
  videoSrc?: string
  /** Subtitle source URL (pre-constructed) */
  subtitleSrc?: string
  /** Called when user clicks "Attach This Video" */
  onAttach?: (video: VideoInfo) => void
  /** Label for the attach button */
  attachButtonLabel?: string
  /** Whether to show the attach button */
  showAttachButton?: boolean
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function VideoPreviewModal({
  open,
  onOpenChange,
  video,
  bookId,
  videoSrc,
  subtitleSrc,
  onAttach,
  attachButtonLabel = "Attach This Video",
  showAttachButton = true,
}: VideoPreviewModalProps) {
  const handleAttach = () => {
    if (video && onAttach) {
      onAttach(video)
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  if (!video) {
    return null
  }

  // Construct URLs if not provided (include auth token for HTML5 video element)
  const token = getAuthToken()
  const baseUrl = getApiBaseUrl()
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ""
  const src =
    videoSrc ||
    `${baseUrl}/api/v1/books/${bookId}/media/${video.path}${tokenParam}`
  const subtitles =
    video.has_subtitles && !subtitleSrc
      ? `${baseUrl}/api/v1/books/${bookId}/media/${video.path.replace(/\.[^.]+$/, ".srt")}${tokenParam}`
      : subtitleSrc

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl"
        aria-describedby="video-preview-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Preview Video
          </DialogTitle>
          <DialogDescription
            id="video-preview-description"
            className="flex items-center gap-2"
          >
            <span>{video.name}</span>
            <span className="text-muted-foreground">
              ({formatFileSize(video.size_bytes)})
            </span>
            {video.has_subtitles && (
              <span className="flex items-center gap-1 text-teal-600">
                <Subtitles className="h-3 w-3" />
                <span className="text-xs">Subtitles</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg">
          <VideoPlayer src={src} subtitleSrc={subtitles} className="w-full" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          {showAttachButton && onAttach && (
            <Button onClick={handleAttach}>{attachButtonLabel}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default VideoPreviewModal
