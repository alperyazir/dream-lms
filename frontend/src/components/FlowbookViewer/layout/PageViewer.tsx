import { Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { getPageImageUrl } from "@/services/booksApi"
import type {
  ActivityReference,
  AudioReference,
  FillAnswerArea,
  Page,
  VideoReference,
} from "@/types/flowbook"
import { AnnotationCanvas } from "../annotation"
import { useZoomGestures } from "../hooks"
import { ActivityIcon, AudioIcon, FillAnswerOverlay, VideoIcon } from "../media"
import {
  useAnnotationStore,
  useFlowbookBookStore,
  useFlowbookUIStore,
} from "../stores"
import { getSpreadPages } from "../utils"

// Default page dimensions for positioning (will be overridden by actual image dimensions)
const DEFAULT_PAGE_WIDTH = 800
const DEFAULT_PAGE_HEIGHT = 1100

// Helper to collect all media from page and its sections
function collectAllMedia(page: Page) {
  // Start with page-level media
  const allAudio: AudioReference[] = [...(page.audio || [])]
  const allVideo: VideoReference[] = [...(page.video || [])]
  const allActivities: ActivityReference[] = [...(page.activities || [])]
  const allFillAnswers: FillAnswerArea[] = [...(page.fillAnswers || [])]

  // Add media from all sections
  if (page.sections) {
    for (const section of page.sections) {
      if (section.audio) allAudio.push(...section.audio)
      if (section.video) allVideo.push(...section.video)
      if (section.activities) allActivities.push(...section.activities)
      if (section.fillAnswers) allFillAnswers.push(...section.fillAnswers)
    }
  }

  return { allAudio, allVideo, allActivities, allFillAnswers }
}

interface PageImageProps {
  page: Page
  pageIndex: number
  viewMode: "single" | "double"
}

function PageImage({ page, pageIndex, viewMode }: PageImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  }>({
    width: DEFAULT_PAGE_WIDTH,
    height: DEFAULT_PAGE_HEIGHT,
  })
  const [displayDimensions, setDisplayDimensions] = useState<{
    width: number
    height: number
  }>({ width: 0, height: 0 })
  const imageContainerRef = useRef<HTMLDivElement>(null)

  const { showAnnotations, activeTool } = useAnnotationStore()

  // Collect all media from page and sections
  const { allAudio, allVideo, allActivities, allFillAnswers } = collectAllMedia(page)

  // Debug: log audio markers for each page
  if (allAudio.length > 0) {
    console.log(`Page ${pageIndex + 1}: Found ${allAudio.length} audio markers`, allAudio.map(a => ({ id: a.id, src: a.src, x: a.x, y: a.y })))
  }

  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    const loadImage = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch image through authenticated API and get blob URL
        const url = await getPageImageUrl(page.image)

        if (!isMounted) return

        if (!url) {
          setError("Failed to load image")
          setIsLoading(false)
          return
        }

        blobUrl = url

        // Preload the image to get dimensions
        const img = new Image()
        img.onload = () => {
          if (isMounted) {
            setImageDimensions({
              width: img.naturalWidth,
              height: img.naturalHeight,
            })
            setImageUrl(url)
            setIsLoading(false)
          }
        }
        img.onerror = () => {
          if (isMounted) {
            setError("Failed to load image")
            setIsLoading(false)
          }
        }
        img.src = url
      } catch {
        if (isMounted) {
          setError("Failed to load image")
          setIsLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      isMounted = false
      // Revoke blob URL on cleanup to free memory
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [page.image])

  // Track display dimensions for annotation canvas
  useEffect(() => {
    if (!imageContainerRef.current || !imageUrl) return

    const updateDisplayDimensions = () => {
      const img = imageContainerRef.current?.querySelector("img")
      if (img) {
        setDisplayDimensions({
          width: img.clientWidth,
          height: img.clientHeight,
        })
      }
    }

    // Initial update
    updateDisplayDimensions()

    // Update on resize
    const observer = new ResizeObserver(updateDisplayDimensions)
    if (imageContainerRef.current) {
      observer.observe(imageContainerRef.current)
    }

    return () => observer.disconnect()
  }, [imageUrl])

  // Determine if annotation canvas should be interactive
  const isAnnotationInteractive = showAnnotations && activeTool !== null

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-slate-200 h-full",
          viewMode === "single" ? "w-[300px]" : "w-[250px]",
        )}
      >
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Loading page {pageIndex + 1}...</span>
        </div>
      </div>
    )
  }

  if (error || !imageUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-slate-200 h-full",
          viewMode === "single" ? "w-[300px]" : "w-[250px]",
        )}
      >
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <span className="text-2xl font-bold">{pageIndex + 1}</span>
          <span className="text-sm">{error || "Image not available"}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={imageContainerRef}
      className="relative overflow-hidden rounded-lg bg-white p-0.5 shadow-lg h-full max-h-full"
    >
      <img
        src={imageUrl}
        alt={`Page ${pageIndex + 1}`}
        draggable={false}
        className={cn(
          "pointer-events-none select-none rounded object-contain h-full w-auto",
          viewMode === "double" && "max-w-[45vw]",
        )}
      />

      {/* Interactive Overlays - positioned absolutely over the image */}
      {imageUrl && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Fill Answer Overlays - clickable areas that show text answers */}
          {allFillAnswers.map((fillAnswer) => (
            <FillAnswerOverlay
              key={fillAnswer.id}
              fillAnswer={fillAnswer}
              pageWidth={imageDimensions.width}
              pageHeight={imageDimensions.height}
            />
          ))}

          {/* Audio Icons Layer - from page and all sections */}
          {allAudio.map((audioRef) => (
            <AudioIcon
              key={audioRef.id}
              audioRef={audioRef}
              pageWidth={imageDimensions.width}
              pageHeight={imageDimensions.height}
            />
          ))}

          {/* Video Icons Layer - from page and all sections */}
          {allVideo.map((videoRef) => (
            <VideoIcon
              key={videoRef.id}
              videoRef={videoRef}
              pageWidth={imageDimensions.width}
              pageHeight={imageDimensions.height}
            />
          ))}

          {/* Activity Icons Layer - from page and all sections */}
          {allActivities.map((activityRef) => (
            <ActivityIcon
              key={activityRef.id}
              activityRef={activityRef}
              pageWidth={imageDimensions.width}
              pageHeight={imageDimensions.height}
            />
          ))}
        </div>
      )}

      {/* Annotation Canvas Layer */}
      {displayDimensions.width > 0 && displayDimensions.height > 0 && (
        <AnnotationCanvas
          pageIndex={pageIndex}
          width={displayDimensions.width}
          height={displayDimensions.height}
          isInteractive={isAnnotationInteractive}
        />
      )}
    </div>
  )
}

export function PageViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { config, currentPageIndex } = useFlowbookBookStore()
  const { viewMode, zoomLevel, panX, panY, isPanning, resetPan } =
    useFlowbookUIStore()
  const { activeTool } = useAnnotationStore()

  // Enable zoom gestures (wheel, pinch, double-click) and panning
  useZoomGestures(containerRef)

  // Reset pan when page changes
  useEffect(() => {
    resetPan()
  }, [currentPageIndex, resetPan])

  if (!config) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading book...</span>
        </div>
      </div>
    )
  }

  if (config.pages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-slate-400">No pages available</span>
      </div>
    )
  }

  const spreadPages = getSpreadPages(
    currentPageIndex,
    config.pages.length,
    viewMode,
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden",
        zoomLevel > 1 && !isPanning && activeTool === null && "cursor-grab",
        isPanning && activeTool === null && "cursor-grabbing",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-2 h-full",
          viewMode === "double" && "gap-1",
          !isPanning && "transition-transform duration-100",
        )}
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
          transformOrigin: "center center",
        }}
      >
        {spreadPages.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-slate-400 shadow-lg">
            <p>No pages to display</p>
          </div>
        ) : (
          spreadPages.map((pageIdx) => {
            const page = config.pages[pageIdx]
            if (!page) {
              return (
                <div
                  key={pageIdx}
                  className="flex h-full w-[250px] items-center justify-center rounded-lg bg-slate-200"
                >
                  <span className="text-slate-400">
                    Page {pageIdx + 1} not found
                  </span>
                </div>
              )
            }

            return (
              <PageImage
                key={pageIdx}
                page={page}
                pageIndex={pageIdx}
                viewMode={viewMode}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
