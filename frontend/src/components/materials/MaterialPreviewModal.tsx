/**
 * MaterialPreviewModal Component
 * Story 13.2: Frontend My Materials Management
 *
 * Preview modal for different material types.
 * Uses blob URLs fetched through authenticated backend proxy.
 */

import { ExternalLink, Loader2, ZoomIn, ZoomOut } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { AudioPlayer } from "@/components/ActivityPlayers/AudioPlayer"
import { VideoPlayer } from "@/components/ActivityPlayers/VideoPlayer"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { getDownloadBlobUrl, getMaterialBlobUrl } from "@/services/materialsApi"
import type { Material } from "@/types/material"
import { MaterialTypeIcon } from "./MaterialTypeIcon"

interface MaterialPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
}

/**
 * MaterialPreviewModal displays a preview of the selected material
 */
export function MaterialPreviewModal({
  open,
  onOpenChange,
  material,
}: MaterialPreviewModalProps) {
  const [imageZoom, setImageZoom] = useState(1)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  // Fetch blob URL when modal opens for file types
  useEffect(() => {
    if (!open || !material) {
      // Revoke old blob URL to free memory
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
      setBlobUrl(null)
      setUrlError(null)
      return
    }

    // Only fetch blob URL for file-based materials
    const needsBlobUrl = ["document", "image", "audio", "video"].includes(
      material.type,
    )

    if (!needsBlobUrl) {
      return
    }

    const fetchBlobUrl = async () => {
      setIsLoadingUrl(true)
      setUrlError(null)
      try {
        // Use stream endpoint for audio/video, download for documents/images
        const url = ["audio", "video"].includes(material.type)
          ? await getMaterialBlobUrl(material.id)
          : await getDownloadBlobUrl(material.id)
        setBlobUrl(url)
      } catch (err) {
        console.error("Failed to load file:", err)
        setUrlError("Failed to load file. Please try again.")
      } finally {
        setIsLoadingUrl(false)
      }
    }

    fetchBlobUrl()

    // Cleanup: revoke blob URL when effect reruns or component unmounts
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [open, material?.id, material?.type, blobUrl, material]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset zoom when modal closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setImageZoom(1)
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl)
        }
        setBlobUrl(null)
        setUrlError(null)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange, blobUrl],
  )

  // Handle zoom
  const handleZoomIn = () => setImageZoom((z) => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setImageZoom((z) => Math.max(z - 0.25, 0.5))

  // Open URL in new tab
  const handleOpenUrl = () => {
    if (material?.url) {
      window.open(material.url, "_blank", "noopener,noreferrer")
    }
  }

  if (!material) return null

  // Loading state for presigned URL
  const renderLoading = () => (
    <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      <p className="text-muted-foreground">Loading preview...</p>
    </div>
  )

  // Error state
  const renderError = () => (
    <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
      <p className="text-red-500">{urlError}</p>
      <Button
        variant="outline"
        onClick={() => {
          // Retry fetching blob URL
          if (material) {
            setIsLoadingUrl(true)
            setUrlError(null)
            const fetchFn = ["audio", "video"].includes(material.type)
              ? getMaterialBlobUrl
              : getDownloadBlobUrl
            fetchFn(material.id)
              .then((url) => setBlobUrl(url))
              .catch(() =>
                setUrlError("Failed to load file. Please try again."),
              )
              .finally(() => setIsLoadingUrl(false))
          }
        }}
      >
        Retry
      </Button>
    </div>
  )

  // Render content based on type
  const renderContent = () => {
    // For file-based types, check if we're loading or have error
    const isFileType = ["document", "image", "audio", "video"].includes(
      material.type,
    )

    if (isFileType) {
      if (isLoadingUrl) return renderLoading()
      if (urlError) return renderError()
      if (!blobUrl) return renderLoading()
    }

    switch (material.type) {
      case "document":
        return renderDocumentPreview()
      case "image":
        return renderImagePreview()
      case "audio":
        return renderAudioPreview()
      case "video":
        return renderVideoPreview()
      case "url":
        return renderUrlPreview()
      case "text_note":
        return renderTextNotePreview()
      default:
        return (
          <div className="p-8 text-center text-muted-foreground">
            Preview not available for this file type
          </div>
        )
    }
  }

  // Document preview (PDF using iframe)
  const renderDocumentPreview = () => {
    return (
      <div className="w-full h-[70vh]">
        <iframe
          src={`${blobUrl}#toolbar=1`}
          className="w-full h-full border-0 rounded-lg bg-gray-100 dark:bg-gray-800"
          title={material.name}
        />
      </div>
    )
  }

  // Image preview with zoom
  const renderImagePreview = () => {
    return (
      <div className="relative">
        {/* Zoom controls */}
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomOut}
            disabled={imageZoom <= 0.5}
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomIn}
            disabled={imageZoom >= 3}
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Image */}
        <div className="overflow-auto max-h-[70vh] flex justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <img
            src={blobUrl!}
            alt={material.name}
            className="object-contain transition-transform duration-200"
            style={{ transform: `scale(${imageZoom})` }}
          />
        </div>
      </div>
    )
  }

  // Audio preview
  const renderAudioPreview = () => {
    return (
      <div className="p-8 flex flex-col items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <MaterialTypeIcon type="audio" size="lg" className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-center">{material.name}</h3>
        <div className="w-full max-w-md">
          <AudioPlayer src={blobUrl!} isExpanded />
        </div>
      </div>
    )
  }

  // Video preview - constrained to fit dialog
  const renderVideoPreview = () => {
    return (
      <div className="w-full max-h-[70vh] flex items-center justify-center bg-black overflow-hidden">
        <VideoPlayer
          src={blobUrl!}
          isExpanded
          className="max-h-[70vh] w-auto [&_video]:object-contain [&_video]:max-h-[70vh]"
        />
      </div>
    )
  }

  // URL preview (link to open)
  const renderUrlPreview = () => {
    return (
      <div className="p-8 flex flex-col items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
          <MaterialTypeIcon type="url" size="lg" className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-center">{material.name}</h3>
        <p className="text-sm text-muted-foreground text-center break-all max-w-md">
          {material.url}
        </p>
        <Button
          onClick={handleOpenUrl}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Link in New Tab
        </Button>
      </div>
    )
  }

  // Text note preview
  const renderTextNotePreview = () => {
    return (
      <div className="p-6">
        <div className="prose dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
            {material.text_content || "No content"}
          </div>
        </div>
      </div>
    )
  }

  // Get dialog max width based on type
  const getMaxWidth = () => {
    switch (material.type) {
      case "document":
      case "video":
        return "max-w-4xl"
      case "image":
        return "max-w-5xl"
      default:
        return "max-w-2xl"
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("p-0 overflow-hidden max-h-[90vh]", getMaxWidth())}
      >
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center gap-3 pr-8">
            <MaterialTypeIcon type={material.type} />
            <DialogTitle className="truncate">{material.name}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="overflow-auto">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  )
}

MaterialPreviewModal.displayName = "MaterialPreviewModal"
