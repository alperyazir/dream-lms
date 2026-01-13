/**
 * Page Viewer Component - Story 8.2 Enhanced
 *
 * Interactive page viewer with:
 * - Left sidebar with scrollable module list
 * - Large prev/next arrows on sides
 * - Full-size page images with activity markers
 * - Single/Double page view toggle
 */

import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { booksApi } from "@/services/booksApi"
import type { ActivityMarker, ModuleInfo, PageDetail } from "@/types/book"
import { SUPPORTED_ACTIVITY_TYPES } from "@/types/book"

interface PageViewerProps {
  bookId: string | number
  selectedActivityIds: Set<string>
  onActivityToggle: (activityId: string, activity: ActivityMarker) => void
}

type ViewMode = "single" | "double"

export function PageViewer({
  bookId,
  selectedActivityIds,
  onActivityToggle,
}: PageViewerProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>("double")
  const [pageInput, setPageInput] = useState("")

  // Fetch book pages with activity coordinates
  const { data, isLoading, error } = useQuery({
    queryKey: ["book-pages-detail", bookId],
    queryFn: () => booksApi.getBookPagesDetail(String(bookId)),
    staleTime: 5 * 60 * 1000,
  })

  // All pages as flat list
  const pages = data?.pages || []

  // Find which module the current page belongs to
  const currentModuleName = useMemo(() => {
    if (!data?.modules || pages.length === 0) return ""
    for (const module of data.modules) {
      const endIndex = module.first_page_index + module.page_count
      if (
        currentPageIndex >= module.first_page_index &&
        currentPageIndex < endIndex
      ) {
        return module.name
      }
    }
    return data.modules[0]?.name || ""
  }, [data, currentPageIndex, pages.length])

  // Handle module click - jump to first page of module
  const handleModuleClick = useCallback((module: ModuleInfo) => {
    setCurrentPageIndex(module.first_page_index)
    setPageInput("")
  }, [])

  // Handle page navigation
  const handlePrevPage = useCallback(() => {
    if (viewMode === "double") {
      setCurrentPageIndex((prev) => Math.max(0, prev - 2))
    } else {
      setCurrentPageIndex((prev) => Math.max(0, prev - 1))
    }
  }, [viewMode])

  const handleNextPage = useCallback(() => {
    const maxIndex = pages.length - 1
    if (viewMode === "double") {
      setCurrentPageIndex((prev) => Math.min(maxIndex - 1, prev + 2))
    } else {
      setCurrentPageIndex((prev) => Math.min(maxIndex, prev + 1))
    }
  }, [viewMode, pages.length])

  // Handle page input
  const handlePageInputSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const pageNum = parseInt(pageInput, 10)
      if (Number.isNaN(pageNum)) return

      const index = pages.findIndex((p) => p.page_number === pageNum)
      if (index >= 0) {
        if (viewMode === "double" && index % 2 !== 0) {
          setCurrentPageIndex(Math.max(0, index - 1))
        } else {
          setCurrentPageIndex(index)
        }
      }
      setPageInput("")
    },
    [pageInput, pages, viewMode],
  )

  // Get pages to display based on view mode
  const visiblePages = useMemo(() => {
    if (viewMode === "single") {
      return pages[currentPageIndex] ? [pages[currentPageIndex]] : []
    }
    const result: PageDetail[] = []
    if (pages[currentPageIndex]) result.push(pages[currentPageIndex])
    if (pages[currentPageIndex + 1]) result.push(pages[currentPageIndex + 1])
    return result
  }, [pages, currentPageIndex, viewMode])

  // Check if can navigate
  const canGoPrev = currentPageIndex > 0
  const canGoNext =
    viewMode === "double"
      ? currentPageIndex < pages.length - 2
      : currentPageIndex < pages.length - 1

  if (isLoading) {
    return (
      <div className="flex h-full gap-3">
        <Skeleton className="w-32 h-full" />
        <Skeleton className="flex-1 h-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load book pages
      </div>
    )
  }

  return (
    <div className="flex h-full gap-2 overflow-hidden">
      {/* Left Sidebar - Module List */}
      <div className="w-28 shrink-0 flex flex-col bg-muted/30 rounded-lg min-h-0 max-h-full">
        {/* Module List - Scrollable (takes remaining space after bottom controls) */}
        <div className="flex-1 overflow-y-auto py-1 min-h-0 max-h-[calc(100%-70px)]">
          {data.modules.map((module) => (
            <button
              key={module.name}
              onClick={() => handleModuleClick(module)}
              className={`w-full text-left px-2 py-1.5 text-[11px] transition-colors truncate ${
                currentModuleName === module.name
                  ? "bg-primary/20 text-primary font-medium border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              title={module.name}
            >
              {module.name}
            </button>
          ))}
        </div>

        {/* View Mode & Page Info - Bottom */}
        <div className="shrink-0 border-t border-border/50 p-1.5 space-y-1.5">
          {/* View Mode Toggle */}
          <div className="flex rounded-md overflow-hidden border border-border/50">
            <button
              onClick={() => setViewMode("single")}
              className={`flex-1 py-0.5 text-[9px] font-medium transition-colors ${
                viewMode === "single"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setViewMode("double")}
              className={`flex-1 py-0.5 text-[9px] font-medium transition-colors ${
                viewMode === "double"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              Double
            </button>
          </div>

          {/* Page Input */}
          <form
            onSubmit={handlePageInputSubmit}
            className="flex items-center gap-1"
          >
            <Input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              placeholder={visiblePages[0]?.page_number?.toString() || "1"}
              className="h-5 text-[9px] text-center px-1"
            />
            <span className="text-[9px] text-muted-foreground whitespace-nowrap">
              / {pages.length > 0 ? pages[pages.length - 1]?.page_number : 0}
            </span>
          </form>
        </div>
      </div>

      {/* Main Content - Pages with Side Navigation */}
      <div className="flex-1 flex items-center min-h-0 min-w-0 overflow-hidden">
        {/* Left Navigation Arrow */}
        <button
          onClick={handlePrevPage}
          disabled={!canGoPrev}
          className={`shrink-0 h-full w-10 flex items-center justify-center transition-all ${
            canGoPrev
              ? "text-muted-foreground hover:text-foreground hover:bg-muted/30 cursor-pointer"
              : "text-muted-foreground/30 cursor-not-allowed"
          }`}
          title="Previous page"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>

        {/* Pages Container */}
        <div className="flex-1 h-full min-w-0 min-h-0 px-1 py-1 overflow-hidden flex items-center justify-center">
          <div
            className="flex gap-3 h-full max-h-full justify-center items-center"
            style={{ maxHeight: "100%" }}
          >
            {visiblePages.map((page) => (
              <PageWithMarkers
                key={page.page_number}
                page={page}
                selectedActivityIds={selectedActivityIds}
                onActivityToggle={onActivityToggle}
                viewMode={viewMode}
                visiblePageCount={visiblePages.length}
              />
            ))}
          </div>
        </div>

        {/* Right Navigation Arrow */}
        <button
          onClick={handleNextPage}
          disabled={!canGoNext}
          className={`shrink-0 h-full w-10 flex items-center justify-center transition-all ${
            canGoNext
              ? "text-muted-foreground hover:text-foreground hover:bg-muted/30 cursor-pointer"
              : "text-muted-foreground/30 cursor-not-allowed"
          }`}
          title="Next page"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>
    </div>
  )
}

// --- Page with Activity Markers ---

interface PageWithMarkersProps {
  page: PageDetail
  selectedActivityIds: Set<string>
  onActivityToggle: (activityId: string, activity: ActivityMarker) => void
  viewMode: ViewMode
  visiblePageCount: number
}

function PageWithMarkers({
  page,
  selectedActivityIds,
  onActivityToggle,
  viewMode,
  visiblePageCount,
}: PageWithMarkersProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)

  // Load page image
  useEffect(() => {
    let isMounted = true

    const loadImage = async () => {
      setIsLoading(true)
      try {
        const url = await booksApi.getPageImageUrl(page.image_url)
        if (isMounted && url) {
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
              setIsLoading(false)
            }
          }
          img.src = url
        }
      } catch {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      isMounted = false
    }
  }, [page.image_url])

  // Calculate rendered dimensions
  const [renderedDimensions, setRenderedDimensions] = useState<{
    width: number
    height: number
    offsetX: number
    offsetY: number
  } | null>(null)

  useEffect(() => {
    if (!containerRef.current || !imageDimensions) return

    const updateDimensions = () => {
      const container = containerRef.current
      if (!container) return

      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      const imageAspect = imageDimensions.width / imageDimensions.height
      const containerAspect = containerWidth / containerHeight

      let renderedWidth: number
      let renderedHeight: number

      if (imageAspect > containerAspect) {
        renderedWidth = containerWidth
        renderedHeight = containerWidth / imageAspect
      } else {
        renderedHeight = containerHeight
        renderedWidth = containerHeight * imageAspect
      }

      const offsetX = (containerWidth - renderedWidth) / 2
      const offsetY = (containerHeight - renderedHeight) / 2

      setRenderedDimensions({
        width: renderedWidth,
        height: renderedHeight,
        offsetX,
        offsetY,
      })
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [imageDimensions])

  const useSingleSizing = viewMode === "single" || visiblePageCount === 1

  return (
    <div
      className={`relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-neutral-800 flex flex-col ${
        useSingleSizing
          ? "h-full max-h-full aspect-[3/4]"
          : "h-full max-h-full aspect-[3/4] max-w-[48%]"
      }`}
    >
      <div ref={containerRef} className="relative flex-1 min-h-0">
        {isLoading ? (
          <Skeleton className="absolute inset-0" />
        ) : imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={`Page ${page.page_number}`}
              className="w-full h-full object-contain"
            />
            {imageDimensions && renderedDimensions && (
              <ActivityMarkersOverlay
                activities={page.activities}
                imageDimensions={imageDimensions}
                renderedDimensions={renderedDimensions}
                selectedActivityIds={selectedActivityIds}
                onActivityToggle={onActivityToggle}
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <span className="text-2xl font-bold">{page.page_number}</span>
          </div>
        )}
      </div>

      {/* Page Number Label */}
      <div className="shrink-0 bg-black/60 py-1 text-center">
        <span className="text-white text-[10px] font-medium">
          Page {page.page_number}
        </span>
      </div>
    </div>
  )
}

// --- Activity Markers Overlay ---

interface ActivityMarkersOverlayProps {
  activities: ActivityMarker[]
  imageDimensions: { width: number; height: number }
  renderedDimensions: {
    width: number
    height: number
    offsetX: number
    offsetY: number
  }
  selectedActivityIds: Set<string>
  onActivityToggle: (activityId: string, activity: ActivityMarker) => void
}

function ActivityMarkersOverlay({
  activities,
  imageDimensions,
  renderedDimensions,
  selectedActivityIds,
  onActivityToggle,
}: ActivityMarkersOverlayProps) {
  // Filter to only show supported activity types
  const supportedActivities = activities.filter((a) =>
    SUPPORTED_ACTIVITY_TYPES.has(a.activity_type),
  )

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: renderedDimensions.offsetX,
        top: renderedDimensions.offsetY,
        width: renderedDimensions.width,
        height: renderedDimensions.height,
      }}
    >
      {supportedActivities.map((activity) => {
        if (!activity.coords) return null

        const isSelected = selectedActivityIds.has(activity.id)

        const scaleX = renderedDimensions.width / imageDimensions.width
        const scaleY = renderedDimensions.height / imageDimensions.height

        const left = activity.coords.x * scaleX
        const top = activity.coords.y * scaleY

        return (
          <button
            key={activity.id}
            onClick={() => onActivityToggle(activity.id, activity)}
            className={`absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 group ${
              isSelected ? "scale-110 z-10" : "hover:scale-125 hover:z-10"
            }`}
            style={{
              left: `${left}px`,
              top: `${top}px`,
            }}
            title={activity.title || `Activity ${activity.section_index + 1}`}
          >
            {/* Outer glow ring */}
            <div
              className={`absolute inset-0 rounded-full blur-sm transition-opacity ${
                isSelected
                  ? "bg-purple-400 opacity-60"
                  : "bg-cyan-400 opacity-0 group-hover:opacity-50"
              }`}
              style={{ transform: "scale(1.8)" }}
            />
            {/* Marker */}
            <div
              className={`relative w-6 h-6 flex items-center justify-center transition-all ${
                isSelected
                  ? "text-purple-500"
                  : "text-cyan-500 group-hover:text-cyan-400"
              }`}
            >
              {!isSelected && (
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-40" />
              )}
              <div
                className={`relative w-5 h-5 rounded-full border-[3px] flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-purple-500 border-purple-300 shadow-lg shadow-purple-500/60"
                    : "bg-cyan-500 border-cyan-300 shadow-md shadow-cyan-500/40 group-hover:bg-cyan-400"
                }`}
              >
                {isSelected ? (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default PageViewer
