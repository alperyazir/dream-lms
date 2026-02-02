import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { FlowbookViewerProps } from "@/types/flowbook"
import { ActivityOverlay } from "./activities"
import { AnnotationToolbar, PieMenu } from "./annotation"
import { useLongPress } from "./hooks"
import { LeftToolbar, PageViewer, ThumbnailStrip } from "./layout"
import { AudioPlayerBar } from "./media"
import {
  useAnnotationStore,
  useFlowbookAudioStore,
  useFlowbookBookStore,
  useFlowbookUIStore,
} from "./stores"

export function FlowbookViewer({
  bookConfig,
  onClose,
  className,
  initialPage = 0,
  showThumbnails = true,
  showNavigation = true,
}: FlowbookViewerProps) {
  const {
    setConfig,
    clearConfig,
    currentPageIndex,
    nextPage,
    prevPage,
    goToPage,
    totalPages,
  } = useFlowbookBookStore()
  const {
    viewMode,
    zoomIn,
    zoomOut,
    resetZoom,
    activeActivityId,
    closeActivity,
    reset: resetUI,
  } = useFlowbookUIStore()
  const { reset: resetAudio } = useFlowbookAudioStore()
  const {
    isPieMenuOpen,
    pieMenuPosition,
    openPieMenu,
    closePieMenu,
    initializeBook,
    reset: resetAnnotations,
  } = useAnnotationStore()

  // Annotation toolbar state
  const [showAnnotationToolbar, setShowAnnotationToolbar] = useState(false)

  // Handlers for annotation toolbar
  const handleOpenToolbar = useCallback(() => {
    setShowAnnotationToolbar(true)
  }, [])

  const handleCloseToolbar = useCallback(() => {
    setShowAnnotationToolbar(false)
  }, [])

  // Long press handler to open pie menu (only when not in annotation mode)
  const { handlers: longPressHandlers } = useLongPress({
    onLongPress: (position) => {
      // Don't open pie menu if annotation toolbar is already open
      if (!showAnnotationToolbar) {
        openPieMenu(position)
      }
    },
  })

  // Initialize store with book config
  useEffect(() => {
    setConfig(bookConfig)
    if (initialPage > 0) {
      goToPage(initialPage)
    }

    // Initialize annotation store with book ID for persistence
    // Use book ID, or fallback to title-based ID, or generate a session ID
    const annotationBookId = bookConfig.id || bookConfig.title || `book_${Date.now()}`
    initializeBook(annotationBookId)

    // Cleanup on unmount
    return () => {
      clearConfig()
      resetUI()
      resetAudio()
      resetAnnotations()
    }
  }, [
    bookConfig,
    initialPage,
    setConfig,
    clearConfig,
    goToPage,
    resetUI,
    resetAudio,
    initializeBook,
    resetAnnotations,
  ])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const total = totalPages()
      const normalizedIdx =
        viewMode === "double"
          ? currentPageIndex % 2 === 0
            ? currentPageIndex
            : currentPageIndex - 1
          : currentPageIndex

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
          e.preventDefault()
          if (viewMode === "double") {
            goToPage(Math.min(normalizedIdx + 2, total - 1))
          } else {
            nextPage()
          }
          break
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault()
          if (viewMode === "double") {
            goToPage(Math.max(0, normalizedIdx - 2))
          } else {
            prevPage()
          }
          break
        case "Home":
          e.preventDefault()
          goToPage(0)
          break
        case "End":
          e.preventDefault()
          goToPage(total - 1)
          break
        case "Escape":
          e.preventDefault()
          // Only close activity overlay, not the viewer
          if (activeActivityId) {
            closeActivity()
          }
          break
        case "+":
        case "=":
          e.preventDefault()
          zoomIn()
          break
        case "-":
          e.preventDefault()
          zoomOut()
          break
        case "0":
          e.preventDefault()
          resetZoom()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    viewMode,
    currentPageIndex,
    nextPage,
    prevPage,
    goToPage,
    totalPages,
    zoomIn,
    zoomOut,
    resetZoom,
    activeActivityId,
    closeActivity,
  ])

  const total = totalPages()

  // In double mode, normalize to even index (left page of spread)
  const normalizedIndex =
    viewMode === "double"
      ? currentPageIndex % 2 === 0
        ? currentPageIndex
        : currentPageIndex - 1
      : currentPageIndex

  const isFirstPage = normalizedIndex === 0
  const isLastPage =
    viewMode === "double"
      ? normalizedIndex >= total - 2
      : currentPageIndex >= total - 1

  const handlePrevPage = useCallback(() => {
    if (viewMode === "double") {
      // In double mode, go back by 2
      goToPage(Math.max(0, normalizedIndex - 2))
    } else {
      prevPage()
    }
  }, [viewMode, normalizedIndex, goToPage, prevPage])

  const handleNextPage = useCallback(() => {
    if (viewMode === "double") {
      // In double mode, advance by 2
      goToPage(Math.min(normalizedIndex + 2, total - 1))
    } else {
      nextPage()
    }
  }, [viewMode, normalizedIndex, total, goToPage, nextPage])

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col bg-slate-200",
        className,
      )}
    >
      {/* Main Content Area */}
      <div className="relative flex-1 flex min-h-0">
        {/* Left Toolbar */}
        <LeftToolbar onClose={onClose} />

        {/* Center Content with Pages - equal distance from both edges (sidebar 60px + 16px gap = 76px) */}
        <div className="flex-1 flex flex-col items-center justify-center pt-3 pb-2 ml-[76px] mr-[76px] min-h-0">
          {/* Page Container Wrapper - allows buttons to be visible */}
          <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
            {/* Page Container - This clips the zoom */}
            <div
              className="relative flex-1 h-full flex items-center justify-center border border-slate-300 rounded-lg bg-slate-100 overflow-hidden"
              {...longPressHandlers}
            >
              <PageViewer />
            </div>

            {/* Previous Page Button - Bottom left corner */}
            {showNavigation && (
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={isFirstPage}
                className={cn(
                  "absolute left-0 bottom-8 -translate-x-1/2 z-30",
                  "flex h-16 w-16 items-center justify-center",
                  "rounded-full bg-white text-slate-500 shadow-lg border-2 border-slate-200",
                  "transition-all hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                  "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200",
                )}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-9 w-9" />
              </button>
            )}

            {/* Next Page Button - Bottom right corner */}
            {showNavigation && (
              <button
                type="button"
                onClick={handleNextPage}
                disabled={isLastPage}
                className={cn(
                  "absolute right-0 bottom-8 translate-x-1/2 z-30",
                  "flex h-16 w-16 items-center justify-center",
                  "rounded-full bg-white text-slate-500 shadow-lg border-2 border-slate-200",
                  "transition-all hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                  "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200",
                )}
                aria-label="Next page"
              >
                <ChevronRight className="h-9 w-9" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail Strip */}
      {showThumbnails && <ThumbnailStrip />}

      {/* Activity Overlay */}
      {activeActivityId && <ActivityOverlay activityId={activeActivityId} />}

      {/* Audio Player Bar - appears at bottom when audio is playing */}
      <AudioPlayerBar />

      {/* Pie Menu for annotation tools */}
      <PieMenu
        isOpen={isPieMenuOpen}
        position={pieMenuPosition}
        onClose={closePieMenu}
        onOpenToolbar={handleOpenToolbar}
      />

      {/* Annotation Toolbar - floating draggable panel */}
      {showAnnotationToolbar && (
        <AnnotationToolbar onClose={handleCloseToolbar} />
      )}
    </div>
  )
}
