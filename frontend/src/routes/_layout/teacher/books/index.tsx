/**
 * Teacher Books Page - Story 3.6
 *
 * Displays a catalog of books accessible to the teacher with:
 * - Grid/list view toggle
 * - Search functionality (debounced)
 * - Filter options (publisher, activity type)
 * - Pagination
 * - Loading and empty states
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Grid3x3, List, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { BookCard } from "@/components/books/BookCard"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
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
import { booksApi } from "@/services/booksApi"
import type { BooksFilter } from "@/types/book"

export const Route = createFileRoute("/_layout/teacher/books/")({
  component: () => (
    <ErrorBoundary>
      <TeacherBooksPage />
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

function TeacherBooksPage() {
  // View preference from localStorage
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("books-view-preference")
    return (saved === "list" ? "list" : "grid") as "grid" | "list"
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("")
  const [skip, setSkip] = useState(0)
  const limit = 20

  // Debounce search
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Build filter object
  const filters: BooksFilter = {
    skip,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(activityTypeFilter && { activity_type: activityTypeFilter as any }),
  }

  // Fetch books
  const { data, isLoading, error } = useQuery({
    queryKey: ["books", filters],
    queryFn: () => booksApi.getBooks(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Handle view mode change
  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode)
    localStorage.setItem("books-view-preference", mode)
  }

  // Handle pagination
  const handleNextPage = () => {
    if (data && skip + limit < data.total) {
      setSkip(skip + limit)
    }
  }

  const handlePrevPage = () => {
    if (skip > 0) {
      setSkip(Math.max(0, skip - limit))
    }
  }

  const books = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Book Catalog</h1>
        <p className="text-muted-foreground">
          Browse books and activities available to your school
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by title or publisher..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setSkip(0) // Reset to first page on search
              }}
              className="pl-10 w-full"
            />
          </div>

          {/* Activity Type Filter */}
          <Select
            value={activityTypeFilter}
            onValueChange={(value) => {
              setActivityTypeFilter(value === "all" ? "" : value)
              setSkip(0)
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Activity Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activity Types</SelectItem>
              <SelectItem value="dragdroppicture">Drag & Drop</SelectItem>
              <SelectItem value="matchTheWords">Match Words</SelectItem>
              <SelectItem value="circle">Circle</SelectItem>
              <SelectItem value="fillSentencesWithDots">
                Fill Sentences
              </SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => handleViewModeChange("grid")}
              aria-label="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => handleViewModeChange("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            Showing {skip + 1}-{Math.min(skip + limit, total)} of {total} books
          </p>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="w-full aspect-[3/4]" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-lg text-destructive mb-2">Failed to load books</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && books.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-lg text-muted-foreground mb-2">
            No books assigned to your school yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Contact your administrator to request access to books.
          </p>
        </div>
      )}

      {/* Books Grid/List */}
      {!isLoading && !error && books.length > 0 && (
        <div
          className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2"}`}
        >
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && total > limit && (
        <div className="mt-8 flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={handlePrevPage}
            disabled={skip === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={skip + limit >= total}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
