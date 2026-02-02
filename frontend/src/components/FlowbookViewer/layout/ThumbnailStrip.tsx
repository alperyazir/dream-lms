import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { getPageImageUrl } from "@/services/booksApi"
import { useFlowbookBookStore, useFlowbookUIStore } from "../stores"

const THUMBNAIL_WIDTH = 52
const THUMBNAIL_HEIGHT = 72
const ITEM_WIDTH = THUMBNAIL_WIDTH + 8

// Momentum physics
const FRICTION = 0.95
const MIN_VELOCITY = 0.5

export function ThumbnailStrip() {
  const { config, currentPageIndex, currentModuleIndex, goToPage, goToModule } =
    useFlowbookBookStore()
  const { isThumbnailStripOpen, toggleThumbnailStrip } = useFlowbookUIStore()

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  // Mouse drag state
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const hasDraggedRef = useRef(false)

  // Momentum state
  const velocityRef = useRef(0)
  const lastXRef = useRef(0)
  const lastTimeRef = useRef(0)
  const animationRef = useRef<number | null>(null)

  // Store blob URLs for thumbnails
  const [blobUrls, setBlobUrls] = useState<Record<number, string>>({})
  const loadingRef = useRef<Set<number>>(new Set())

  const allPages = config?.pages ?? []
  const modules = config?.modules ?? []

  // Check if image needs authentication
  const needsAuth = useCallback((imageUrl: string) => {
    if (imageUrl.startsWith("/") && !imageUrl.startsWith("/api/")) {
      return false
    }
    return true
  }, [])

  // Load thumbnails in visible range
  const loadVisibleThumbnails = useCallback(() => {
    if (!config || !isThumbnailStripOpen) return

    const container = scrollContainerRef.current

    let startIdx: number
    let endIdx: number

    if (container && container.clientWidth > 0) {
      const scrollPos = container.scrollLeft
      const containerWidth = container.clientWidth
      startIdx = Math.max(0, Math.floor(scrollPos / ITEM_WIDTH) - 3)
      endIdx = Math.min(
        allPages.length - 1,
        Math.ceil((scrollPos + containerWidth) / ITEM_WIDTH) + 3,
      )
    } else {
      startIdx = Math.max(0, currentPageIndex - 5)
      endIdx = Math.min(allPages.length - 1, currentPageIndex + 10)
    }

    for (let pageIndex = startIdx; pageIndex <= endIdx; pageIndex++) {
      const page = allPages[pageIndex]
      if (!page) continue

      if (blobUrls[pageIndex] || loadingRef.current.has(pageIndex)) continue

      const imageUrl = page.image

      if (!needsAuth(imageUrl)) {
        setBlobUrls((prev) => ({ ...prev, [pageIndex]: imageUrl }))
        continue
      }

      loadingRef.current.add(pageIndex)

      getPageImageUrl(imageUrl)
        .then((blobUrl) => {
          if (blobUrl) {
            setBlobUrls((prev) => ({ ...prev, [pageIndex]: blobUrl }))
          }
        })
        .catch((err) => {
          console.error(`Failed to load thumbnail ${pageIndex}:`, err)
        })
        .finally(() => {
          loadingRef.current.delete(pageIndex)
        })
    }
  }, [allPages, blobUrls, config, isThumbnailStripOpen, needsAuth, currentPageIndex])

  // Load initial thumbnails when strip opens
  useEffect(() => {
    if (isThumbnailStripOpen) {
      loadVisibleThumbnails()
      const timer = setTimeout(loadVisibleThumbnails, 350)
      return () => clearTimeout(timer)
    }
  }, [isThumbnailStripOpen, loadVisibleThumbnails])

  // Load more on scroll
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !isThumbnailStripOpen) return

    const handleScroll = () => loadVisibleThumbnails()
    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [isThumbnailStripOpen, loadVisibleThumbnails])

  // Cleanup blob URLs on unmount
  useEffect(() => {
    const urls = blobUrls
    return () => {
      Object.values(urls).forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [])

  // Auto-scroll to center current page when strip opens or page changes
  useEffect(() => {
    if (!isThumbnailStripOpen) return

    const centerCurrentPage = () => {
      const container = scrollContainerRef.current
      if (!container || container.clientWidth === 0) return

      const containerWidth = container.clientWidth
      const targetScroll =
        currentPageIndex * ITEM_WIDTH - containerWidth / 2 + THUMBNAIL_WIDTH / 2

      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      })
    }

    centerCurrentPage()
    const timer = setTimeout(centerCurrentPage, 350)
    return () => clearTimeout(timer)
  }, [isThumbnailStripOpen, currentPageIndex])

  // Momentum animation loop
  const animateMomentum = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    velocityRef.current *= FRICTION

    if (Math.abs(velocityRef.current) < MIN_VELOCITY) {
      animationRef.current = null
      return
    }

    container.scrollLeft -= velocityRef.current
    animationRef.current = requestAnimationFrame(animateMomentum)
  }, [])

  // Stop momentum
  const stopMomentum = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    velocityRef.current = 0
  }, [])

  // Mouse handlers with momentum
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const container = scrollContainerRef.current
      if (!container) return

      stopMomentum()

      isDraggingRef.current = true
      hasDraggedRef.current = false
      startXRef.current = e.pageX
      scrollLeftRef.current = container.scrollLeft

      lastXRef.current = e.pageX
      lastTimeRef.current = performance.now()
      velocityRef.current = 0

      container.style.cursor = "grabbing"
      container.style.userSelect = "none"
    },
    [stopMomentum],
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = scrollContainerRef.current
    if (!isDraggingRef.current || !container) return

    e.preventDefault()
    const dx = e.pageX - startXRef.current

    if (Math.abs(dx) > 5) {
      hasDraggedRef.current = true
    }

    container.scrollLeft = scrollLeftRef.current - dx

    const now = performance.now()
    const dt = now - lastTimeRef.current
    if (dt > 0) {
      const moved = e.pageX - lastXRef.current
      velocityRef.current = (moved / dt) * 16
    }
    lastXRef.current = e.pageX
    lastTimeRef.current = now
  }, [])

  const handleMouseUp = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || !isDraggingRef.current) return

    isDraggingRef.current = false
    container.style.cursor = "grab"
    container.style.userSelect = ""

    if (Math.abs(velocityRef.current) > MIN_VELOCITY) {
      animationRef.current = requestAnimationFrame(animateMomentum)
    }
  }, [animateMomentum])

  const handleMouseLeave = useCallback(() => {
    handleMouseUp()
  }, [handleMouseUp])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  // Handle page click
  const handlePageClick = useCallback(
    (pageIndex: number) => {
      if (hasDraggedRef.current) {
        hasDraggedRef.current = false
        return
      }
      goToPage(pageIndex)
    },
    [goToPage],
  )

  if (!config) return null

  return (
    <div className="flex-shrink-0 ml-[76px] mr-[76px] pb-2">
      {/* Toggle Button - Centered */}
      <div className="flex justify-center mb-1 relative z-20">
        <button
          type="button"
          onClick={toggleThumbnailStrip}
          className={cn(
            "flex items-center justify-center w-20 h-7",
            "bg-cyan-500 border border-cyan-600 rounded-full shadow-md",
            "hover:bg-cyan-600 text-white",
            "transition-all",
          )}
          aria-label={
            isThumbnailStripOpen ? "Collapse thumbnails" : "Expand thumbnails"
          }
        >
          {isThumbnailStripOpen ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronUp className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Bottom Panel */}
      <div
        className={cn(
          "bg-white border border-slate-300 rounded-lg overflow-hidden transition-all duration-300 ease-in-out",
          isThumbnailStripOpen ? "h-[160px]" : "h-0 border-0",
        )}
      >
        {isThumbnailStripOpen && (
          <div className="h-full flex flex-col">
            {/* Module Navigation */}
            {modules.length > 0 && (
              <div className="flex items-center justify-center gap-1 px-4 py-1.5 border-b border-slate-100 bg-slate-50 overflow-x-auto">
                {modules.map((module, idx) => (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => goToModule(idx)}
                    className={cn(
                      "px-2.5 py-0.5 text-xs font-medium rounded-full transition-all flex-shrink-0",
                      idx === currentModuleIndex
                        ? "bg-cyan-500 text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-cyan-300 hover:text-cyan-600",
                    )}
                  >
                    {module.name}
                  </button>
                ))}
              </div>
            )}

            {/* Thumbnails */}
            <div
              ref={scrollContainerRef}
              className="flex-1 flex items-center gap-1 overflow-x-auto px-4 cursor-grab scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
              style={{ WebkitOverflowScrolling: "touch" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {allPages.map((page, pageIndex) => {
                const isActive = pageIndex === currentPageIndex
                const thumbnailSrc = blobUrls[pageIndex]
                const isLoading =
                  loadingRef.current.has(pageIndex) && !thumbnailSrc

                return (
                  <button
                    type="button"
                    key={page.id}
                    ref={isActive ? activeRef : null}
                    onClick={() => handlePageClick(pageIndex)}
                    className="flex-shrink-0 flex flex-col items-center group"
                    style={{ width: THUMBNAIL_WIDTH }}
                  >
                    {/* Page number - above thumbnail */}
                    <span
                      className={cn(
                        "mb-1 text-xs tabular-nums",
                        isActive ? "text-cyan-600 font-semibold" : "text-slate-400",
                      )}
                    >
                      {pageIndex + 1}
                    </span>

                    {/* Thumbnail */}
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-md border-2 bg-white shadow-sm transition-all",
                        isActive
                          ? "border-cyan-500 shadow-md shadow-cyan-100 scale-105"
                          : "border-transparent group-hover:border-slate-300 group-hover:shadow",
                      )}
                      style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
                    >
                      {!thumbnailSrc ? (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100">
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          ) : (
                            <span className="text-xs text-slate-400">
                              {pageIndex + 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <img
                          src={thumbnailSrc}
                          alt={`Page ${pageIndex + 1}`}
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
