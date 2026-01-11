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
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router"
import { useCallback, useMemo } from "react"
import { useDebouncedCallback } from "use-debounce"
import { BookCard } from "@/components/books/BookCard"
import { BookTableView } from "@/components/books/BookTableView"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import {
  LibraryFilters,
  type LibraryFiltersState,
} from "@/components/library/LibraryFilters"
import { Skeleton } from "@/components/ui/skeleton"
import { ViewModeToggle } from "@/components/ui/view-mode-toggle"
import { useViewPreference } from "@/hooks/useViewPreference"
import { booksApi } from "@/services/booksApi"
import type { Book, BooksFilter } from "@/types/book"

export const Route = createFileRoute("/_layout/teacher/books/")({
  component: () => (
    <ErrorBoundary>
      <TeacherBooksPage />
    </ErrorBoundary>
  ),
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) || "",
    publisher: (search.publisher as string) || "",
    activity: (search.activity as string) || "",
  }),
})

function TeacherBooksPage() {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  // View preference from localStorage
  const [viewMode, setViewMode] = useViewPreference("teacher-library", "grid")

  // Parse filters from URL
  const filters: LibraryFiltersState = useMemo(
    () => ({
      search: (search as any).q || "",
      publisher: (search as any).publisher || "",
      activityType: (search as any).activity || "",
    }),
    [search],
  )

  // Debounced URL update for filters
  const debouncedNavigate = useDebouncedCallback(
    (newFilters: LibraryFiltersState) => {
      navigate({
        search: (prev: any) => ({
          ...prev,
          q: newFilters.search || "",
          publisher: newFilters.publisher || "",
          activity: newFilters.activityType || "",
        }),
        replace: true,
      } as any)
    },
    300,
  )

  const setFilters = useCallback(
    (newFilters: LibraryFiltersState) => {
      debouncedNavigate(newFilters)
    },
    [debouncedNavigate],
  )

  // Build backend filter object
  const backendFilters: BooksFilter = {
    ...(filters.search && { search: filters.search }),
    ...(filters.publisher && { publisher: filters.publisher }),
    ...(filters.activityType && { activity_type: filters.activityType as any }),
  }

  // Fetch books with backend filtering
  const { data, isLoading, error } = useQuery({
    queryKey: ["books", backendFilters],
    queryFn: () => booksApi.getBooks(backendFilters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const books = data?.items ?? []
  const total = data?.total ?? 0

  // Get unique publishers for filter dropdown
  const publishers = useMemo(() => {
    const unique = [...new Set(books.map((b: Book) => b.publisher_name))]
    return unique.sort()
  }, [books])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Library</h1>
        <p className="text-muted-foreground">
          Browse books and activities available to your school
        </p>
      </div>

      {/* Header Actions */}
      <div className="flex justify-end mb-4">
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Filters */}
      <LibraryFilters
        filters={filters}
        onChange={setFilters}
        publishers={publishers}
        showPublisherFilter={true}
        resultCount={books.length}
        totalCount={total}
      />

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

      {/* Books Grid/Table - Story 19.2: Conditional rendering based on view mode */}
      {!isLoading &&
        !error &&
        books.length > 0 &&
        (viewMode === "grid" ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <BookTableView
            books={books}
            showAssignButton={false}
            showViewDetails={true}
            onViewDetails={(book) =>
              navigate({
                to: "/teacher/books/$bookId",
                params: { bookId: String(book.id) },
              })
            }
          />
        ))}
    </div>
  )
}
