/**
 * VideoPicker Component
 * Story 10.3: Video Attachment to Assignments
 *
 * Allows teachers to select a video from the book's video library
 * to attach to an assignment.
 */

import { useQuery } from "@tanstack/react-query"
import { Eye, Loader2, Subtitles, Video, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getBookVideos, type VideoInfo } from "@/services/booksApi"

export interface VideoPickerProps {
  /** Book ID to fetch videos from */
  bookId: string
  /** Currently selected video path */
  value?: string | null
  /** Called when video selection changes */
  onChange: (videoPath: string | null) => void
  /** Called when preview button is clicked */
  onPreview?: (video: VideoInfo) => void
  /** Whether the picker is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Placeholder text */
  placeholder?: string
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function VideoPicker({
  bookId,
  value,
  onChange,
  onPreview,
  disabled = false,
  className,
  placeholder = "Select a video...",
}: VideoPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Fetch videos for the book
  const {
    data: videosResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["bookVideos", bookId],
    queryFn: () => getBookVideos(bookId),
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const videos = videosResponse?.videos ?? []
  const selectedVideo = videos.find((v) => v.path === value)

  const handleValueChange = (newValue: string) => {
    if (newValue === "__clear__") {
      onChange(null)
    } else {
      onChange(newValue)
    }
  }

  const handlePreviewClick = (e: React.MouseEvent, video: VideoInfo) => {
    e.stopPropagation()
    e.preventDefault()
    onPreview?.(video)
  }

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onChange(null)
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading videos...</span>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive",
          className,
        )}
      >
        <span>Failed to load videos</span>
      </div>
    )
  }

  // No videos available
  if (videos.length === 0) {
    return (
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <Video className="h-4 w-4" />
        <span>No videos available in this book</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        value={value ?? ""}
        onValueChange={handleValueChange}
        disabled={disabled}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder}>
            {selectedVideo && (
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{selectedVideo.name}</span>
                {selectedVideo.has_subtitles && (
                  <Subtitles className="h-3 w-3 text-teal-500" />
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {value && (
            <SelectItem value="__clear__" className="text-muted-foreground">
              <X className="mr-2 h-4 w-4" />
              Clear selection
            </SelectItem>
          )}
          {videos.map((video) => (
            <SelectItem key={video.path} value={video.path}>
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{video.name}</span>
                  {video.has_subtitles && (
                    <Subtitles
                      className="h-3 w-3 text-teal-500"
                      aria-label="Has subtitles"
                    />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(video.size_bytes)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Preview button - shown when a video is selected */}
      {selectedVideo && onPreview && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => handlePreviewClick(e, selectedVideo)}
          disabled={disabled}
          aria-label="Preview video"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}

      {/* Clear button - shown when a video is selected */}
      {value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClearClick}
          disabled={disabled}
          aria-label="Clear video selection"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export default VideoPicker
