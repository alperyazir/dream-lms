import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, RefreshCw, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { OpenAPI } from "@/client"
import { BookDetailsDialog } from "@/components/books/BookDetailsDialog"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { booksApi, getAuthenticatedCoverUrl } from "@/services/booksApi"
import { getMyProfile } from "@/services/publishersApi"
import type { Book } from "@/types/book"

export const Route = createFileRoute("/_layout/publisher/library")({
  component: () => (
    <ErrorBoundary>
      <PublisherLibraryPage />
    </ErrorBoundary>
  ),
})

/**
 * Custom hook for debouncing values
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Publisher Book Card - Story 9.4
 * Custom book card for publishers with Details button
 */
interface PublisherBookCardProps {
  book: Book
  onDetailsClick: () => void
}

function PublisherBookCard({ book, onDetailsClick }: PublisherBookCardProps) {
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
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full bg-teal-600 hover:bg-teal-700"
          onClick={onDetailsClick}
        >
          Details
        </Button>
      </CardFooter>
    </Card>
  )
}

function PublisherLibraryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  // Handle opening the details dialog
  const handleDetailsClick = (book: Book) => {
    setSelectedBook(book)
    setDetailsDialogOpen(true)
  }

  // Handle closing the details dialog
  const handleDetailsDialogClose = () => {
    setDetailsDialogOpen(false)
    setSelectedBook(null)
  }

  // Fetch publisher profile for logo display
  const { data: profile } = useQuery({
    queryKey: ["publisherProfile"],
    queryFn: () => getMyProfile(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Fetch books using useQuery
  const { data: booksData, isLoading: loading } = useQuery({
    queryKey: ["publisherBooks"],
    queryFn: () => booksApi.getBooks({ limit: 100 }),
    staleTime: 30000, // Cache for 30 seconds
  })

  const books = booksData?.items ?? []

  // Get publisher initials for fallback
  const getPublisherInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Debounce search term
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Filter books based on search
  const filteredBooks = books.filter((book) => {
    if (!debouncedSearch) return true
    const searchLower = debouncedSearch.toLowerCase()
    return (
      book.title.toLowerCase().includes(searchLower) ||
      book.publisher_name.toLowerCase().includes(searchLower) ||
      book.description?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Logo */}
      <div className="mb-8 flex items-center gap-6">
        {/* Publisher Logo */}
        {profile && (
          <div className="flex-shrink-0">
            {profile.logo_url ? (
              <img
                src={`${OpenAPI.BASE}${profile.logo_url}`}
                alt={`${profile.name} logo`}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {getPublisherInitials(profile.name)}
              </div>
            )}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold mb-2">My Library</h1>
          <p className="text-muted-foreground">
            View your published books and learning materials
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by title, publisher, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        {/* Results count */}
        {!loading && books.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            {filteredBooks.length === books.length
              ? `Showing all ${books.length} books`
              : `Found ${filteredBooks.length} of ${books.length} books`}
          </p>
        )}
      </div>

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
            {searchTerm ? "No books found" : "No books yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {searchTerm
              ? "Try adjusting your search terms"
              : "Books will appear here when they're available in the system"}
          </p>
        </div>
      ) : (
        /* Books Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <PublisherBookCard
              key={book.id}
              book={book}
              onDetailsClick={() => handleDetailsClick(book)}
            />
          ))}
        </div>
      )}

      {/* Book Details Dialog - Story 9.4 */}
      {selectedBook && (
        <BookDetailsDialog
          isOpen={detailsDialogOpen}
          onClose={handleDetailsDialogClose}
          book={selectedBook}
        />
      )}
    </div>
  )
}
