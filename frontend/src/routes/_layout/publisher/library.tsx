import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, Download, ExternalLink, RefreshCw, UserPlus } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { FiBook } from "react-icons/fi"
import { PublishersService } from "@/client"
import { BookTableView } from "@/components/books/BookTableView"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { QuickAssignDialog } from "@/components/books/QuickAssignDialog"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { LibraryFilters } from "@/components/library/LibraryFilters"
import { PlatformSelectDialog } from "@/components/library/PlatformSelectDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ViewModeToggle } from "@/components/ui/view-mode-toggle"
import { useLibraryFilters } from "@/hooks/useLibraryFilters"
import { useViewPreference } from "@/hooks/useViewPreference"
import { getAuthenticatedCoverUrl } from "@/services/booksApi"
import type { Book } from "@/types/book"

export const Route = createFileRoute("/_layout/publisher/library")({
  component: () => (
    <ErrorBoundary>
      <PublisherLibraryPage />
    </ErrorBoundary>
  ),
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) || "",
    publisher: (search.publisher as string) || "",
    activity: (search.activity as string) || "",
  }),
})

/**
 * Publisher Book Card - Story 19.6
 * Custom book card for publishers with Assign button
 * Note: Restored assign functionality using QuickAssignDialog pattern
 */
interface PublisherBookCardProps {
  book: Book
  onAssignClick: () => void
  onOpenFlowbook?: () => void
  onDownload?: () => void
}

function PublisherBookCard({ book, onAssignClick, onOpenFlowbook, onDownload }: PublisherBookCardProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [isLoadingCover, setIsLoadingCover] = useState(true)
  const [imageError, setImageError] = useState(false)

  // Fetch authenticated cover URL
  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    setImageError(false)

    async function fetchCover() {
      if (!book.cover_image_url) {
        setIsLoadingCover(false)
        return
      }

      const url = await getAuthenticatedCoverUrl(book.cover_image_url)
      if (isMounted) {
        blobUrl = url
        setCoverUrl(url)
        setIsLoadingCover(false)
      }
    }

    fetchCover()

    return () => {
      isMounted = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [book.cover_image_url])

  return (
    <Card className="h-full flex flex-col shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-4 flex-1">
        {/* Cover Image - 3:4 aspect ratio */}
        <div className="relative w-full aspect-[3/4] bg-muted rounded-md overflow-hidden mb-4">
          {isLoadingCover ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <BookOpen className="w-16 h-16 text-gray-400 animate-pulse" />
            </div>
          ) : coverUrl && !imageError ? (
            <img
              src={coverUrl}
              alt={`${book.title} cover`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-teal-200">
              <BookOpen className="w-16 h-16 text-teal-600" />
            </div>
          )}
        </div>

        {/* Title - truncate at 2 lines */}
        <h3 className="text-lg font-semibold mb-2 line-clamp-2 min-h-[3.5rem]">
          {book.title}
        </h3>

        {/* Publisher Badge */}
        <div className="mb-2">
          <Badge variant="secondary" className="bg-teal-100 text-teal-800">
            {book.publisher_name}
          </Badge>
        </div>

        {/* Description - truncate at 3 lines */}
        {book.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3 min-h-[4.5rem]">
            {book.description}
          </p>
        )}

        {/* Activity Count Badge */}
        <Badge variant="outline" className="mb-2">
          {book.activity_count}{" "}
          {book.activity_count === 1 ? "activity" : "activities"}
        </Badge>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
        <div className="flex gap-2 w-full">
          {onOpenFlowbook && (
            <Button
              variant="default"
              size="sm"
              onClick={onOpenFlowbook}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
          )}
          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
        </div>
        <Button
          className="w-full bg-teal-600 hover:bg-teal-700"
          size="sm"
          onClick={onAssignClick}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Assign to Teachers
        </Button>
      </CardFooter>
    </Card>
  )
}

function PublisherLibraryPage() {
  const [assignBook, setAssignBook] = useState<Book | null>(null)
  const [downloadBook, setDownloadBook] = useState<Book | null>(null)
  const [viewMode, setViewMode] = useViewPreference("publisher-library", "grid")

  // Handle opening the assign dialog
  const handleAssignClick = (book: Book) => {
    setAssignBook(book)
  }

  const handleOpenFlowbook = useCallback((book: Book) => {
    window.open(`/viewer/${book.id}`, "_blank")
  }, [])

  const handleDownload = useCallback((book: Book) => {
    setDownloadBook(book)
  }, [])

  // Fetch books for this publisher only (much faster than fetching all books)
  const { data: booksData = [], isLoading: loading } = useQuery({
    queryKey: ["publisherMyBooks"],
    queryFn: () => PublishersService.listMyBooks(),
    staleTime: 30000, // Cache for 30 seconds
  })

  // Map BookPublic to Book type expected by the card
  const books: Book[] = booksData.map((book) => ({
    id: book.id,
    dream_storage_id: book.name, // Using book name as a fallback
    title: book.title || book.name,
    publisher_id: book.publisher_id,
    publisher_name: book.publisher_name,
    description: null, // Not available in BookPublic
    cover_image_url: book.cover_url || null,
    activity_count: book.activity_count || 0,
  }))

  // Use library filters hook
  const { filters, setFilters, filteredBooks, resultCount, totalCount } =
    useLibraryFilters(books)

  return (
    <PageContainer>
      <PageHeader
        icon={FiBook}
        title="My Library"
        description="View your published books and learning materials"
      >
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </PageHeader>

      {/* Filters - hide publisher filter for publishers */}
      <LibraryFilters
        filters={filters}
        onChange={setFilters}
        showPublisherFilter={false}
        resultCount={resultCount}
        totalCount={totalCount}
      />

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 mx-auto text-teal-500 animate-spin mb-4" />
          <p className="text-muted-foreground">Loading books...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-muted-foreground mb-2">
            {filters.search || filters.activityType
              ? "No books found"
              : "No books yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {filters.search || filters.activityType
              ? "Try adjusting your filter criteria"
              : "Your books will appear here once they're added to Dream Central Storage"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* Books Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <PublisherBookCard
              key={book.id}
              book={book}
              onAssignClick={() => handleAssignClick(book)}
              onOpenFlowbook={() => handleOpenFlowbook(book)}
              onDownload={() => handleDownload(book)}
            />
          ))}
        </div>
      ) : (
        /* Books Table */
        <BookTableView
          books={filteredBooks}
          onAssign={handleAssignClick}
          onOpenFlowbook={handleOpenFlowbook}
          onDownload={handleDownload}
          showAssignButton={true}
          showViewDetails={false}
        />
      )}

      {/* Quick Assign Dialog - Story 19.6 */}
      {assignBook && (
        <QuickAssignDialog
          open={!!assignBook}
          onOpenChange={(open) => !open && setAssignBook(null)}
          book={assignBook}
          isAdmin={false}
        />
      )}

      {/* Platform Select Dialog for Download */}
      {downloadBook && (
        <PlatformSelectDialog
          bookId={downloadBook.id}
          bookTitle={downloadBook.title || ""}
          isOpen={!!downloadBook}
          onClose={() => setDownloadBook(null)}
        />
      )}
    </PageContainer>
  )
}
