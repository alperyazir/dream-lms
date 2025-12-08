/**
 * ResourceSidebar Component
 * Story 10.3+: Collapsible sidebar for additional resources in activity player
 *
 * Shows attached resources (videos, etc.) with subtitle controls.
 * Panel pushes/shrinks the main content area instead of overlaying.
 */

import {
  ChevronRight,
  FolderOpen,
  Play,
  Subtitles,
  Video,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { VideoPlayer } from "./VideoPlayer"
import type { AdditionalResources, VideoResource } from "@/types/assignment"

export interface ResourceSidebarProps {
  /** Additional resources attached to the assignment */
  resources: AdditionalResources | null
  /** Book ID for constructing video URLs */
  bookId: string
  /** Function to get video stream URL */
  getVideoUrl: (bookId: string, videoPath: string) => string
  /** Function to get subtitle URL */
  getSubtitleUrl: (bookId: string, videoPath: string) => string
  /** Whether the sidebar is open */
  isOpen: boolean
  /** Callback to close the sidebar */
  onClose: () => void
  /** Currently selected video for playback */
  selectedVideo: VideoResource | null
  /** Callback when video is selected */
  onSelectVideo: (video: VideoResource | null) => void
}

export function ResourceSidebar({
  resources,
  bookId,
  getVideoUrl,
  getSubtitleUrl,
  isOpen,
  onClose,
  selectedVideo,
  onSelectVideo,
}: ResourceSidebarProps) {
  // Check if there are any resources
  const hasResources = resources && resources.videos.length > 0

  if (!hasResources || !isOpen) {
    return null
  }

  const handlePlayVideo = (video: VideoResource) => {
    onSelectVideo(video)
  }

  const handleCloseVideo = () => {
    onSelectVideo(null)
  }

  return (
    <>
      {/* Sidebar Panel - integrated into layout */}
      <aside className="w-80 shrink-0 border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-teal-600" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Resources
            </h3>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-100 px-1.5 text-xs font-medium text-teal-700 dark:bg-teal-900 dark:text-teal-300">
              {resources.videos.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onClose}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {/* Video Resources */}
            {resources.videos.map((video) => (
              <div
                key={video.path}
                className="rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-teal-300 hover:bg-teal-50/50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-teal-700 dark:hover:bg-teal-900/20"
              >
                <div className="flex items-start gap-3">
                  {/* Video icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900">
                    <Video className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>

                  {/* Video info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                      {video.name}
                    </p>
                    {video.has_subtitles && video.subtitles_enabled && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-teal-600 dark:text-teal-400">
                        <Subtitles className="h-3 w-3" />
                        Subtitles
                      </span>
                    )}
                  </div>
                </div>

                {/* Play button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-900/50 dark:hover:text-teal-300"
                  onClick={() => handlePlayVideo(video)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Watch Video
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Supplementary materials for this assignment
          </p>
        </div>
      </aside>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl mx-4">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={handleCloseVideo}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Video title */}
            <div className="mb-3 text-center">
              <h3 className="text-lg font-medium text-white">
                {selectedVideo.name}
              </h3>
              {selectedVideo.has_subtitles && selectedVideo.subtitles_enabled && (
                <p className="text-sm text-gray-300 flex items-center justify-center gap-1 mt-1">
                  <Subtitles className="h-4 w-4" />
                  Subtitles enabled
                </p>
              )}
            </div>

            {/* Video Player */}
            <div className="rounded-lg overflow-hidden bg-black shadow-2xl">
              <VideoPlayer
                src={getVideoUrl(bookId, selectedVideo.path)}
                subtitleSrc={
                  selectedVideo.has_subtitles && selectedVideo.subtitles_enabled
                    ? getSubtitleUrl(bookId, selectedVideo.path)
                    : undefined
                }
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Resources Toggle Button - to be used in the header
 */
export interface ResourcesButtonProps {
  resourceCount: number
  isOpen: boolean
  onClick: () => void
}

export function ResourcesButton({ resourceCount, isOpen, onClick }: ResourcesButtonProps) {
  if (resourceCount === 0) return null

  return (
    <Button
      variant={isOpen ? "default" : "outline"}
      size="sm"
      className={`gap-2 ${isOpen ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}`}
      onClick={onClick}
    >
      <FolderOpen className="h-4 w-4" />
      <span className="hidden sm:inline">Resources</span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-500 px-1.5 text-xs font-medium text-white">
        {resourceCount}
      </span>
    </Button>
  )
}

export default ResourceSidebar
