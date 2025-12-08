/**
 * Step 3: Additional Resources - Story 10.3+
 *
 * Form for adding supplementary resources to assignments.
 * Currently supports video with subtitle control.
 * Extensible for future resource types (PDFs, images, links, etc.)
 */

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Eye,
  FolderOpen,
  Plus,
  Subtitles,
  Trash2,
  Video,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { VideoPreviewModal } from "@/components/ActivityPlayers/VideoPreviewModal"
import { getBookVideos, type VideoInfo } from "@/services/booksApi"
import type { AdditionalResources, AssignmentFormData, VideoResource } from "@/types/assignment"

interface StepAdditionalResourcesProps {
  formData: AssignmentFormData
  onFormDataChange: (data: Partial<AssignmentFormData>) => void
  bookId?: string
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function StepAdditionalResources({
  formData,
  onFormDataChange,
  bookId,
}: StepAdditionalResourcesProps) {
  // Video preview modal state
  const [previewVideo, setPreviewVideo] = useState<VideoInfo | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Fetch available videos from book
  const {
    data: videosData,
    isLoading: isLoadingVideos,
    error: videosError,
  } = useQuery({
    queryKey: ["book-videos", bookId],
    queryFn: () => (bookId ? getBookVideos(bookId) : Promise.resolve({ videos: [], total_count: 0, book_id: "" })),
    enabled: !!bookId,
  })

  const availableVideos = videosData?.videos ?? []

  // Get current resources or initialize empty
  const currentResources: AdditionalResources = formData.resources ?? { videos: [] }

  /**
   * Add a video resource
   */
  const handleAddVideo = (videoInfo: VideoInfo) => {
    const newVideoResource: VideoResource = {
      type: "video",
      path: videoInfo.path,
      name: videoInfo.name,
      subtitles_enabled: videoInfo.has_subtitles, // Enable subtitles by default if available
      has_subtitles: videoInfo.has_subtitles,
    }

    const updatedResources: AdditionalResources = {
      ...currentResources,
      videos: [...currentResources.videos, newVideoResource],
    }

    onFormDataChange({ resources: updatedResources })
  }

  /**
   * Remove a video resource by index
   */
  const handleRemoveVideo = (index: number) => {
    const updatedVideos = [...currentResources.videos]
    updatedVideos.splice(index, 1)

    const updatedResources: AdditionalResources = {
      ...currentResources,
      videos: updatedVideos,
    }

    onFormDataChange({ resources: updatedResources.videos.length > 0 ? updatedResources : null })
  }

  /**
   * Toggle subtitles for a video resource
   */
  const handleToggleSubtitles = (index: number, enabled: boolean) => {
    const updatedVideos = [...currentResources.videos]
    updatedVideos[index] = {
      ...updatedVideos[index],
      subtitles_enabled: enabled,
    }

    const updatedResources: AdditionalResources = {
      ...currentResources,
      videos: updatedVideos,
    }

    onFormDataChange({ resources: updatedResources })
  }

  /**
   * Preview a video
   */
  const handlePreviewVideo = (videoResource: VideoResource) => {
    const videoInfo: VideoInfo = {
      path: videoResource.path,
      name: videoResource.name,
      size_bytes: 0, // Not needed for preview
      has_subtitles: videoResource.has_subtitles,
    }
    setPreviewVideo(videoInfo)
    setIsPreviewOpen(true)
  }

  /**
   * Get videos not yet added
   */
  const getAvailableToAdd = (): VideoInfo[] => {
    const addedPaths = new Set(currentResources.videos.map(v => v.path))
    return availableVideos.filter(v => !addedPaths.has(v.path))
  }

  const videosToAdd = getAvailableToAdd()
  const hasVideos = currentResources.videos.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="space-y-2 shrink-0 mb-4">
        <h3 className="text-lg font-semibold">Additional Resources</h3>
        <p className="text-sm text-muted-foreground">
          Add supplementary materials for students to access during the assignment.
          You can control whether subtitles are shown for video resources.
        </p>
      </div>

      <ScrollArea className="flex-1 pr-4">
      <div className="space-y-6">
      {/* Video Resources Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Video Resources</CardTitle>
            </div>
            {hasVideos && (
              <Badge variant="secondary">{currentResources.videos.length} added</Badge>
            )}
          </div>
          <CardDescription>
            Attach videos from the book for students to watch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Added Videos List */}
          {hasVideos && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Added Videos</Label>
              <div className="space-y-2">
                {currentResources.videos.map((video, index) => (
                  <div
                    key={video.path}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{video.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{video.path}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Subtitle Toggle */}
                      {video.has_subtitles && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`subtitles-${index}`}
                            checked={video.subtitles_enabled}
                            onCheckedChange={(checked) =>
                              handleToggleSubtitles(index, checked === true)
                            }
                          />
                          <Label
                            htmlFor={`subtitles-${index}`}
                            className="text-xs cursor-pointer flex items-center gap-1"
                          >
                            <Subtitles className="h-3 w-3" />
                            Subtitles
                          </Label>
                        </div>
                      )}

                      {/* Preview Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePreviewVideo(video)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveVideo(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* Add Video Section */}
          {bookId ? (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {hasVideos ? "Add More Videos" : "Select Videos to Add"}
              </Label>

              {isLoadingVideos ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  Loading available videos...
                </div>
              ) : videosError ? (
                <div className="flex items-center justify-center py-4 text-sm text-destructive">
                  Failed to load videos
                </div>
              ) : videosToAdd.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {availableVideos.length === 0
                      ? "No videos available in this book"
                      : "All available videos have been added"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {videosToAdd.map((video) => (
                    <div
                      key={video.path}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{video.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(video.size_bytes)}
                            </span>
                            {video.has_subtitles && (
                              <Badge variant="outline" className="text-xs h-5">
                                <Subtitles className="h-3 w-3 mr-1" />
                                Subtitles
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddVideo(video)}
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Select a book first to see available videos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future Resource Types Placeholder */}
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              More resource types coming soon
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDFs, images, links, and more
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
      </ScrollArea>

      {/* Video Preview Modal */}
      {bookId && (
        <VideoPreviewModal
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          video={previewVideo}
          bookId={bookId}
          showAttachButton={false}
        />
      )}
    </div>
  )
}

export default StepAdditionalResources
