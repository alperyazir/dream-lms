/**
 * Library Viewer Page
 * Story 29.2: Create DCS Library Browser Page
 *
 * A page for browsing and previewing books from DCS Library.
 * Uses the FlowbookViewer component for book preview.
 * Shows a splash screen with animated book cover before opening viewer.
 */

import { useQuery } from "@tanstack/react-query"
import { BookOpen, Eye, RefreshCw, Search, X } from "lucide-react"
import { Suspense, lazy, useCallback, useMemo, useState } from "react"
import { BookEntrySplash } from "@/components/FlowbookViewer/BookEntrySplash"
import { LibraryBookCard } from "@/components/library/LibraryBookCard"
import { PlatformSelectDialog } from "@/components/library/PlatformSelectDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { booksApi } from "@/services/booksApi"
import type { Book } from "@/types/book"
import type { BookConfig } from "@/types/flowbook"
import type { LibraryBook } from "@/types/library"

// Lazy load FlowbookViewer for code splitting
const FlowbookViewer = lazy(() =>
  import("@/components/FlowbookViewer").then((m) => ({ default: m.FlowbookViewer }))
)

interface LibraryViewerProps {
  /** Whether to show publisher filter (admins/supervisors can filter by publisher) */
  showPublisherFilter?: boolean
  /** Title override */
  title?: string
  /** Description override */
  description?: string
}

export function LibraryViewer({
  showPublisherFilter = true,
  title = "Library Viewer",
  description = "Browse and preview books from the DCS library",
}: LibraryViewerProps) {
  // State for search and filters
  const [searchInput, setSearchInput] = useState("")
  const [selectedPublisher, setSelectedPublisher] = useState<string>("")
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  // State for preview - two stages: splash screen then viewer
  const [previewBook, setPreviewBook] = useState<LibraryBook | null>(null)
  const [showViewer, setShowViewer] = useState(false) // false = splash, true = viewer
  const [bookConfig, setBookConfig] = useState<BookConfig | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // State for download
  const [downloadBook, setDownloadBook] = useState<LibraryBook | null>(null)

  // Fetch books
  const {
    data: booksResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["libraryBooks", debouncedSearch],
    queryFn: () =>
      booksApi.getBooks({
        limit: 100,
        search: debouncedSearch || undefined,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Extract unique publishers for filter
  const publishers = useMemo(() => {
    if (!booksResponse?.items) return []
    const publisherSet = new Set(booksResponse.items.map((b) => b.publisher_name))
    return Array.from(publisherSet).sort()
  }, [booksResponse?.items])

  // Filter books by publisher (client-side)
  const filteredBooks = useMemo(() => {
    if (!booksResponse?.items) return []
    if (!selectedPublisher) return booksResponse.items
    return booksResponse.items.filter((b) => b.publisher_name === selectedPublisher)
  }, [booksResponse?.items, selectedPublisher])

  // Handle preview click - show splash screen first
  const handlePreview = useCallback((book: LibraryBook) => {
    setPreviewBook(book)
    setShowViewer(false) // Start with splash screen
    setBookConfig(null)
  }, [])

  // Handle "Open Book" click from splash screen - load the viewer
  const handleOpenBook = useCallback(async () => {
    if (!previewBook) return

    setLoadingPreview(true)

    try {
      // Fetch book pages detail to construct BookConfig
      const pagesDetail = await booksApi.getBookPagesDetail(String(previewBook.id))

      // Build BookConfig from pages detail
      const config: BookConfig = {
        title: previewBook.title,
        cover: previewBook.cover_image_url || "",
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
          audio: [],
          video: [],
          activities: p.activities?.map((a) => ({
            id: a.id,
            type: a.activity_type as any,
            x: a.coords?.x || 0,
            y: a.coords?.y || 0,
            width: a.coords?.w || 100,
            height: a.coords?.h || 100,
            config: {},
          })) || [],
        })),
      }

      setBookConfig(config)
      setShowViewer(true) // Show the viewer
    } catch (err) {
      console.error("Failed to load book for preview:", err)
      setPreviewBook(null)
    } finally {
      setLoadingPreview(false)
    }
  }, [previewBook])

  // Close preview (from viewer or splash)
  const handleClosePreview = useCallback(() => {
    setPreviewBook(null)
    setBookConfig(null)
    setShowViewer(false)
  }, [])

  // Handle download click
  const handleDownload = useCallback((book: LibraryBook) => {
    setDownloadBook(book)
  }, [])

  // Close download dialog
  const handleCloseDownload = useCallback(() => {
    setDownloadBook(null)
  }, [])

  // Clear filters
  const clearFilters = () => {
    setSearchInput("")
    setSelectedPublisher("")
  }

  const hasFilters = searchInput || selectedPublisher

  // Convert Book to LibraryBook
  const toLibraryBook = (book: Book): LibraryBook => ({
    id: book.id,
    dream_storage_id: book.dream_storage_id || String(book.id),
    title: book.title,
    book_name: book.title, // Use title as book_name fallback
    publisher_id: book.publisher_id,
    publisher_name: book.publisher_name,
    cover_image_url: book.cover_image_url,
    activity_count: book.activity_count || 0,
  })

  return (
    <div className="max-w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Eye className="h-8 w-8 text-primary" />
            {title}
          </h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search books..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Publisher Filter */}
        {showPublisherFilter && publishers.length > 0 && (
          <Select value={selectedPublisher} onValueChange={setSelectedPublisher}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Publishers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Publishers</SelectItem>
              {publishers.map((publisher) => (
                <SelectItem key={publisher} value={publisher}>
                  {publisher}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}

        {/* Result Count */}
        <span className="text-sm text-muted-foreground ml-auto">
          {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"}
        </span>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-destructive mb-4" />
          <p className="text-lg text-muted-foreground mb-2">Failed to load books</p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      ) : filteredBooks.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground mb-2">
            {hasFilters ? "No books found" : "No books available"}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "Try adjusting your search or filters"
              : "Books will appear here once they are available in the DCS library"}
          </p>
        </div>
      ) : (
        /* Book Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBooks.map((book) => (
            <LibraryBookCard
              key={book.id}
              book={toLibraryBook(book)}
              onPreview={handlePreview}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}

      {/* Book Preview - Splash Screen or FlowbookViewer */}
      {previewBook && !showViewer && (
        <BookEntrySplash
          title={previewBook.title}
          coverUrl={previewBook.cover_image_url}
          publisherName={previewBook.publisher_name}
          publisherId={previewBook.publisher_id}
          isLoading={loadingPreview}
          onOpen={handleOpenBook}
          onClose={handleClosePreview}
        />
      )}

      {/* FlowbookViewer - shown after splash */}
      {previewBook && showViewer && bookConfig && (
        <div className="fixed inset-0 z-50 bg-background">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="h-12 w-12 text-primary animate-spin" />
              </div>
            }
          >
            <FlowbookViewer
              bookConfig={bookConfig}
              onClose={handleClosePreview}
              showThumbnails={true}
              showNavigation={true}
            />
          </Suspense>
        </div>
      )}

      {/* Platform Select Dialog for Download */}
      {downloadBook && (
        <PlatformSelectDialog
          bookId={downloadBook.id}
          bookTitle={downloadBook.title}
          isOpen={!!downloadBook}
          onClose={handleCloseDownload}
        />
      )}
    </div>
  )
}

export default LibraryViewer
