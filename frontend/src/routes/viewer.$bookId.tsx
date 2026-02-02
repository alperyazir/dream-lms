/**
 * FlowbookViewer Page - Standalone viewer that opens in a new tab
 *
 * Story 29.3: Book Preview and Download Actions
 *
 * This route provides a full-screen FlowbookViewer experience for previewing books.
 * It's designed to be opened in a new browser tab from the Library page.
 * Shows a splash screen with animated book cover before opening viewer.
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, Loader2 } from "lucide-react"
import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import { BookEntrySplash } from "@/components/FlowbookViewer/BookEntrySplash"
import { Button } from "@/components/ui/button"
import { booksApi } from "@/services/booksApi"
import type { ActivityType as BackendActivityType } from "@/types/book"
import type { ActivityType, BookConfig } from "@/types/flowbook"

/**
 * Map backend activity types to flowbook activity types
 */
function mapActivityType(backendType: BackendActivityType): ActivityType {
  const mapping: Record<BackendActivityType, ActivityType> = {
    dragdroppicture: "dragDropPicture",
    dragdroppicturegroup: "dragDropPictureGroup",
    matchTheWords: "matchTheWords",
    circle: "circleMark",
    markwithx: "circleMark", // Map to circleMark as fallback
    puzzleFindWords: "wordSearch",
    fillSentencesWithDots: "fillBlanks",
    fillpicture: "fillPicture",
  }
  return mapping[backendType] || "matchTheWords" // Default fallback
}

// Lazy load FlowbookViewer for code splitting
const FlowbookViewer = lazy(() =>
  import("@/components/FlowbookViewer").then((m) => ({ default: m.FlowbookViewer }))
)

export const Route = createFileRoute("/viewer/$bookId")({
  component: ViewerPage,
})

function ViewerPage() {
  const { bookId } = Route.useParams()

  // State for splash vs viewer
  const [showViewer, setShowViewer] = useState(false)

  // Fetch book details - use getBookById which fetches from list and filters
  const { data: book, isLoading: isLoadingBook, error: bookError } = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => booksApi.getBookById(Number(bookId)),
  })

  // Fetch book pages detail for FlowbookViewer - only when showViewer is true
  const { data: pagesDetail, isLoading: isLoadingPages, error: pagesError } = useQuery({
    queryKey: ["bookPagesDetail", bookId],
    queryFn: () => booksApi.getBookPagesDetail(bookId),
    enabled: !!book && showViewer,
  })

  // Transform to BookConfig format
  const bookConfig: BookConfig | null = useMemo(() => {
    if (!book || !pagesDetail) return null

    return {
      title: book.title || "",
      cover: book.cover_image_url || "",
      version: "1.0",
      modules: pagesDetail.modules.map((m) => ({
        id: m.name,
        name: m.name,
        startPage: m.first_page_index,
        endPage: m.first_page_index + m.page_count - 1,
      })),
      pages: pagesDetail.pages.map((p) => ({
        id: `page-${p.page_number}`,
        image: p.image_url,
        // Map audio markers
        audio: (p.audio || []).map((a) => ({
          id: a.id,
          src: a.src,
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
        })),
        // Map video markers
        video: (p.video || []).map((v) => ({
          id: v.id,
          src: v.src,
          poster: v.poster || undefined,
          subtitleSrc: v.subtitle_src || undefined,
          x: v.x,
          y: v.y,
          width: v.width,
          height: v.height,
        })),
        // Map fill answer areas
        fillAnswers: (p.fill_answers || []).map((f) => ({
          id: f.id,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          text: f.text,
        })),
        activities: (p.activities || []).map((a) => ({
          id: a.id,
          // Map backend activity types to flowbook activity types
          type: mapActivityType(a.activity_type),
          x: a.coords?.x || 0,
          y: a.coords?.y || 0,
          width: a.coords?.w || 100,
          height: a.coords?.h || 100,
          // Use config from backend API response
          config: a.config || {},
        })),
      })),
    }
  }, [book, pagesDetail])

  // Update document title
  useEffect(() => {
    if (book?.title) {
      document.title = `${book.title} - Flowbook Viewer`
    }
    return () => {
      document.title = "Dream LMS"
    }
  }, [book?.title])

  // Handle close - close the tab
  const handleClose = () => {
    window.close()
  }

  // Handle open book from splash
  const handleOpenBook = () => {
    setShowViewer(true)
  }

  // Loading state for initial book data
  if (isLoadingBook) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
          <p className="text-slate-600">Loading book...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (bookError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <BookOpen className="h-16 w-16 mx-auto text-destructive mb-4" />
          <p className="text-lg text-slate-800 mb-2">Failed to load book</p>
          <p className="text-sm text-slate-500 mb-4">
            {bookError instanceof Error ? bookError.message : "An error occurred"}
          </p>
          <Button onClick={handleClose}>Close</Button>
        </div>
      </div>
    )
  }

  // Book not found
  if (!book) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <BookOpen className="h-16 w-16 mx-auto text-destructive mb-4" />
          <p className="text-lg text-slate-800 mb-2">Book not found</p>
          <Button onClick={handleClose}>Close</Button>
        </div>
      </div>
    )
  }

  // Show splash screen if not yet opened
  if (!showViewer) {
    return (
      <BookEntrySplash
        title={book.title}
        coverUrl={book.cover_image_url}
        publisherName={book.publisher_name}
        publisherId={book.publisher_id}
        isLoading={false}
        onOpen={handleOpenBook}
        onClose={handleClose}
      />
    )
  }

  // Loading pages for viewer
  if (isLoadingPages) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
          <p className="text-slate-600">Loading book pages...</p>
        </div>
      </div>
    )
  }

  // Error loading pages
  if (pagesError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <BookOpen className="h-16 w-16 mx-auto text-destructive mb-4" />
          <p className="text-lg text-slate-800 mb-2">Failed to load book pages</p>
          <p className="text-sm text-slate-500 mb-4">
            {pagesError instanceof Error ? pagesError.message : "An error occurred"}
          </p>
          <Button onClick={handleClose}>Close</Button>
        </div>
      </div>
    )
  }

  // No book config (shouldn't happen if pages loaded)
  if (!bookConfig) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <BookOpen className="h-16 w-16 mx-auto text-destructive mb-4" />
          <p className="text-lg text-slate-800 mb-2">Failed to build book configuration</p>
          <Button onClick={handleClose}>Close</Button>
        </div>
      </div>
    )
  }

  // Show FlowbookViewer
  return (
    <div className="fixed inset-0 bg-slate-100">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </div>
        }
      >
        <FlowbookViewer
          bookConfig={bookConfig}
          onClose={handleClose}
          showThumbnails={true}
          showNavigation={true}
        />
      </Suspense>
    </div>
  )
}
