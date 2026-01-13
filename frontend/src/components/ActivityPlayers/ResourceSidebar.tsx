/**
 * ResourceSidebar Component
 * Story 10.3+: Collapsible sidebar for additional resources in activity player
 * Story 13.3: Added teacher materials support with inline playback/viewing
 *
 * Shows attached resources (videos, teacher materials) with subtitle controls.
 * Panel pushes/shrinks the main content area instead of overlaying.
 */

import {
  AlertTriangle,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Headphones,
  ImageIcon,
  Loader2,
  Play,
  Subtitles,
  Video,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { OpenAPI } from "@/client"
import {
  getMaterialTypeLabel,
  MaterialTypeIcon,
} from "@/components/materials/MaterialTypeIcon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type {
  AdditionalResourcesResponse,
  TeacherMaterialResourceResponse,
  VideoResource,
} from "@/types/assignment"
import type { MaterialType } from "@/types/material"
import { AudioPlayer } from "./AudioPlayer"
import { VideoPlayer } from "./VideoPlayer"

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem("access_token")
}

/**
 * Fetch material content as blob URL via authenticated API
 * In preview mode, uses directDownloadUrl to bypass assignment lookup
 */
async function fetchMaterialBlobUrl(
  assignmentId: string,
  materialId: string,
  directDownloadUrl?: string | null,
): Promise<string> {
  const token = getAuthToken()
  // Use direct download URL if available (preview mode uses teacher materials API directly)
  const url =
    directDownloadUrl ??
    `${OpenAPI.BASE}/api/v1/assignments/${assignmentId}/materials/${materialId}/download`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch material: ${response.status}`)
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export interface ResourceSidebarProps {
  /** Additional resources attached to the assignment */
  resources: AdditionalResourcesResponse | null
  /** Book ID for constructing video URLs */
  bookId: string
  /** Assignment ID for material download URLs */
  assignmentId: string
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

/**
 * Get material streaming/viewing URL with auth token
 * In preview mode, materials have a direct download_url that bypasses assignment lookup
 */
function getMaterialStreamUrl(
  assignmentId: string,
  materialId: string,
  directDownloadUrl?: string | null,
): string {
  // Use direct download URL if available (preview mode uses teacher materials API directly)
  if (directDownloadUrl) {
    return directDownloadUrl
  }
  const token = getAuthToken()
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ""
  return `${OpenAPI.BASE}/api/v1/assignments/${assignmentId}/materials/${materialId}/download${tokenParam}`
}

export function ResourceSidebar({
  resources,
  bookId,
  assignmentId,
  getVideoUrl,
  getSubtitleUrl,
  isOpen,
  onClose,
  selectedVideo,
  onSelectVideo,
}: ResourceSidebarProps) {
  // State for viewing teacher materials in fullscreen modal
  const [selectedMaterial, setSelectedMaterial] =
    useState<TeacherMaterialResourceResponse | null>(null)
  // State for blob URL loading
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoadingBlob, setIsLoadingBlob] = useState(false)
  const [blobError, setBlobError] = useState<string | null>(null)

  // Fetch blob URL when material is selected (only for non-streaming types)
  useEffect(() => {
    // Track the current blob URL for cleanup
    let currentBlobUrl: string | null = null

    if (!selectedMaterial) {
      // Cleanup previous blob URL when material is deselected
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setBlobError(null)
      return
    }

    // Video/audio use direct streaming URLs - no blob needed
    // Only fetch blob for documents and images
    const needsBlob = ["document", "image"].includes(
      selectedMaterial.material_type,
    )
    if (!needsBlob) {
      return
    }

    const loadBlob = async () => {
      setIsLoadingBlob(true)
      setBlobError(null)
      // Clear previous blob URL before loading new one
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })

      try {
        const url = await fetchMaterialBlobUrl(
          assignmentId,
          selectedMaterial.material_id,
          selectedMaterial.download_url,
        )
        currentBlobUrl = url
        setBlobUrl(url)
      } catch (err) {
        console.error("Failed to load material:", err)
        setBlobError("Failed to load file. Please try again.")
      } finally {
        setIsLoadingBlob(false)
      }
    }

    loadBlob()

    // Cleanup on unmount or when material changes
    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl)
      }
    }
  }, [
    selectedMaterial?.material_id,
    assignmentId,
    selectedMaterial?.download_url,
    selectedMaterial,
  ])

  // Check if there are any resources
  const hasVideos = resources && resources.videos.length > 0
  const hasMaterials =
    resources && (resources.teacher_materials?.length ?? 0) > 0
  const hasResources = hasVideos || hasMaterials
  const totalCount =
    (resources?.videos.length ?? 0) +
    (resources?.teacher_materials?.length ?? 0)

  if (!hasResources || !isOpen) {
    return null
  }

  const handlePlayVideo = (video: VideoResource) => {
    onSelectVideo(video)
  }

  const handleCloseVideo = () => {
    onSelectVideo(null)
  }

  /**
   * Handle material action based on type
   */
  const handleMaterialAction = (material: TeacherMaterialResourceResponse) => {
    if (!material.is_available) return

    const materialType = material.material_type

    if (materialType === "url" && material.url) {
      // Open URL in new tab
      window.open(material.url, "_blank", "noopener,noreferrer")
    } else {
      // Open all other types in fullscreen modal
      setSelectedMaterial(material)
    }
  }

  /**
   * Get action button text based on material type
   */
  const getActionText = (material: TeacherMaterialResourceResponse): string => {
    switch (material.material_type) {
      case "url":
        return "Open Link"
      case "text_note":
        return "View Note"
      case "video":
        return "Watch Video"
      case "audio":
        return "Listen"
      case "image":
        return "View Image"
      case "document":
        return "View Document"
      default:
        return "View"
    }
  }

  /**
   * Get action icon based on material type
   */
  const ActionIcon = ({
    material,
  }: {
    material: TeacherMaterialResourceResponse
  }) => {
    switch (material.material_type) {
      case "url":
        return <ExternalLink className="h-4 w-4 mr-2" />
      case "text_note":
        return <FileText className="h-4 w-4 mr-2" />
      case "video":
        return <Play className="h-4 w-4 mr-2" />
      case "audio":
        return <Headphones className="h-4 w-4 mr-2" />
      case "image":
        return <ImageIcon className="h-4 w-4 mr-2" />
      case "document":
        return <FileText className="h-4 w-4 mr-2" />
      default:
        return <Play className="h-4 w-4 mr-2" />
    }
  }

  /**
   * Close material viewer modal
   */
  const handleCloseMaterialViewer = () => {
    setSelectedMaterial(null)
  }

  /**
   * Render content based on material type
   */
  const renderMaterialContent = (material: TeacherMaterialResourceResponse) => {
    // Video and audio use direct streaming URLs (supports Range requests)
    // Use download_url if available (preview mode uses teacher materials API directly)
    const streamUrl = getMaterialStreamUrl(
      assignmentId,
      material.material_id,
      material.download_url,
    )

    // For documents/images, we need blob URLs (show loading state)
    const needsBlob = ["document", "image"].includes(material.material_type)

    if (needsBlob) {
      if (isLoadingBlob) {
        return (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <Loader2 className="h-12 w-12 animate-spin text-teal-400" />
            <p className="text-white/80">Loading {material.material_type}...</p>
          </div>
        )
      }

      if (blobError) {
        return (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <p className="text-red-400">{blobError}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // Retry loading
                  setIsLoadingBlob(true)
                  setBlobError(null)
                  fetchMaterialBlobUrl(
                    assignmentId,
                    material.material_id,
                    material.download_url,
                  )
                    .then((url) => setBlobUrl(url))
                    .catch(() =>
                      setBlobError("Failed to load file. Please try again."),
                    )
                    .finally(() => setIsLoadingBlob(false))
                }}
              >
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Download as fallback
                  window.open(streamUrl, "_blank")
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Instead
              </Button>
            </div>
          </div>
        )
      }

      if (!blobUrl) {
        return (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <Loader2 className="h-12 w-12 animate-spin text-teal-400" />
            <p className="text-white/80">
              Preparing {material.material_type}...
            </p>
          </div>
        )
      }
    }

    switch (material.material_type) {
      case "video":
        // Use direct streaming URL - supports HTTP Range requests for seeking
        return (
          <div className="w-full max-h-[70vh] flex items-center justify-center bg-black rounded-lg overflow-hidden">
            <VideoPlayer
              src={streamUrl}
              isExpanded
              className="max-h-[70vh] w-auto [&_video]:object-contain [&_video]:max-h-[70vh]"
            />
          </div>
        )

      case "audio":
        // Use direct streaming URL - supports HTTP Range requests
        return (
          <div className="w-full max-w-md bg-gray-900 rounded-lg p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-teal-600 flex items-center justify-center">
                <Headphones className="h-12 w-12 text-white" />
              </div>
            </div>
            <AudioPlayer src={streamUrl} isExpanded={true} />
          </div>
        )

      case "image":
        return (
          <div className="max-w-4xl max-h-[80vh]">
            <img
              src={blobUrl!}
              alt={material.name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        )

      case "document":
        return (
          <div className="w-full max-w-4xl h-[80vh] bg-white rounded-lg overflow-hidden">
            <iframe
              src={`${blobUrl}#toolbar=1`}
              className="w-full h-full"
              title={material.name}
            />
          </div>
        )

      case "text_note":
        return (
          <div className="w-full max-w-2xl max-h-[80vh] bg-white dark:bg-neutral-800 rounded-lg overflow-auto">
            <div className="p-6">
              <pre className="whitespace-pre-wrap font-sans text-base text-gray-900 dark:text-gray-100">
                {material.text_content || "No content available"}
              </pre>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-white text-center">
            <p>Unable to preview this file type</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                const downloadUrl = getMaterialStreamUrl(
                  assignmentId,
                  material.material_id,
                  material.download_url,
                )
                window.open(downloadUrl, "_blank")
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        )
    }
  }

  return (
    <>
      {/* Sidebar Panel - integrated into layout */}
      <aside className="w-80 shrink-0 border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-neutral-800 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-teal-600" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Resources
            </h3>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-100 px-1.5 text-xs font-medium text-teal-700 dark:bg-teal-900 dark:text-teal-300">
              {totalCount}
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
          <div className="p-4 space-y-4">
            {/* Video Resources Section */}
            {hasVideos && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Videos ({resources.videos.length})
                </h4>
                {resources.videos.map((video) => (
                  <div
                    key={video.path}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-teal-300 hover:bg-teal-50/50 dark:border-gray-700 dark:bg-neutral-800/50 dark:hover:border-teal-700 dark:hover:bg-teal-900/20"
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
            )}

            {/* Separator if both sections exist */}
            {hasVideos && hasMaterials && <Separator />}

            {/* Teacher Materials Section */}
            {hasMaterials && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Materials ({resources.teacher_materials?.length})
                </h4>
                {resources.teacher_materials?.map((material) => (
                  <div
                    key={material.material_id}
                    className={`rounded-lg border p-3 transition-colors ${
                      material.is_available
                        ? "border-gray-200 bg-gray-50 hover:border-teal-300 hover:bg-teal-50/50 dark:border-gray-700 dark:bg-neutral-800/50 dark:hover:border-teal-700 dark:hover:bg-teal-900/20"
                        : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Material icon */}
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          material.is_available
                            ? "bg-gray-100 dark:bg-gray-700"
                            : "bg-amber-100 dark:bg-amber-900"
                        }`}
                      >
                        <MaterialTypeIcon
                          type={material.material_type as MaterialType}
                          size="md"
                        />
                      </div>

                      {/* Material info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                          {material.name}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {getMaterialTypeLabel(
                            material.material_type as MaterialType,
                          )}
                        </span>
                        {!material.is_available && (
                          <Badge
                            variant="outline"
                            className="mt-1 text-amber-600 border-amber-300"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Unavailable
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    {material.is_available && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-900/50 dark:hover:text-teal-300"
                        onClick={() => handleMaterialAction(material)}
                      >
                        <ActionIcon material={material} />
                        {getActionText(material)}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Supplementary materials for this assignment
          </p>
        </div>
      </aside>

      {/* Book Video Player Modal (fullscreen dark overlay) */}
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
              {selectedVideo.has_subtitles &&
                selectedVideo.subtitles_enabled && (
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

      {/* Teacher Material Viewer Modal (fullscreen dark overlay - same style as video) */}
      {selectedMaterial && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleCloseMaterialViewer}
        >
          {/* Close button - fixed top right */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={handleCloseMaterialViewer}
          >
            <X className="h-6 w-6" />
          </Button>

          <div
            className="relative w-full max-w-4xl mx-4 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Material title */}
            <div className="mb-3 text-center w-full">
              <h3 className="text-lg font-medium text-white flex items-center justify-center gap-2">
                <MaterialTypeIcon
                  type={selectedMaterial.material_type as MaterialType}
                  size="sm"
                  className="text-white"
                />
                {selectedMaterial.name}
              </h3>
              <p className="text-sm text-gray-300 mt-1">
                {getMaterialTypeLabel(
                  selectedMaterial.material_type as MaterialType,
                )}
              </p>
            </div>

            {/* Material content */}
            {renderMaterialContent(selectedMaterial)}
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

export function ResourcesButton({
  resourceCount,
  isOpen,
  onClick,
}: ResourcesButtonProps) {
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
