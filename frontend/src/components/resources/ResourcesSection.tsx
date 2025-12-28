/**
 * ResourcesSection Component
 * Story 21.2: Conditional Resources Section
 *
 * Displays book videos and supplementary materials.
 * Only renders when content is available (conditional display).
 *
 * Used in:
 * - Book detail view
 * - Assignment views (where applicable)
 */

import { Eye, Upload, Video } from "lucide-react"
import { useState } from "react"
import { VideoPreviewModal } from "@/components/ActivityPlayers/VideoPreviewModal"
import { AttachMaterialDialog } from "@/components/materials/AttachMaterialDialog"
import { Button } from "@/components/ui/button"
import { useBookResources } from "@/hooks/useBookResources"
import { cn } from "@/lib/utils"
import type { VideoInfo } from "@/services/booksApi"
import type { Material } from "@/types/material"
import { AddMaterialButton } from "./AddMaterialButton"
import { ResourcesSectionSkeleton } from "./ResourcesSectionSkeleton"

export interface ResourcesSectionProps {
  bookId: string | number
  showUploadButton?: boolean
  assignmentId?: string
  className?: string
}

export function ResourcesSection({
  bookId,
  showUploadButton = false,
  assignmentId,
  className,
}: ResourcesSectionProps) {
  const { videos, hasAnyContent, isLoading, error } = useBookResources(bookId)
  const [previewVideo, setPreviewVideo] = useState<VideoInfo | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [newMaterial, setNewMaterial] = useState<Material | null>(null)

  // Don't render anything if no content and no upload capability (after loading)
  if (!isLoading && !hasAnyContent && !showUploadButton) {
    return null
  }

  // Show skeleton while loading
  if (isLoading) {
    return <ResourcesSectionSkeleton className={className} />
  }

  // Handle error state - hide section on error
  if (error) {
    console.error("Failed to load resources:", error)
    return null
  }

  const handlePreviewVideo = (video: VideoInfo) => {
    setPreviewVideo(video)
    setIsPreviewOpen(true)
  }

  const handleUploadComplete = (material: Material) => {
    setNewMaterial(material)
    // Optionally show attach dialog or notification
  }

  return (
    <>
      <section className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Resources & Videos</h3>
          {showUploadButton && (
            <AddMaterialButton
              bookId={bookId}
              assignmentId={assignmentId}
              onUploadComplete={handleUploadComplete}
            />
          )}
        </div>

        {/* Videos List */}
        {videos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Videos ({videos.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {videos.map((video) => (
                <div
                  key={video.path}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900">
                      <Video className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {video.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {video.has_subtitles && "Subtitles available"}
                      </p>
                    </div>
                  </div>

                  {/* Preview Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handlePreviewVideo(video)}
                    aria-label={`Preview ${video.name}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when upload enabled but no content */}
        {!hasAnyContent && showUploadButton && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              No resources yet. Click "Add Material" to upload.
            </p>
          </div>
        )}
      </section>

      {/* Attach to Assignment Dialog */}
      {newMaterial && assignmentId && (
        <AttachMaterialDialog
          material={newMaterial}
          assignmentId={assignmentId}
          open={!!newMaterial}
          onOpenChange={(open) => !open && setNewMaterial(null)}
        />
      )}

      {/* Video Preview Modal */}
      <VideoPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        video={previewVideo}
        bookId={String(bookId)}
        showAttachButton={false}
      />
    </>
  )
}
