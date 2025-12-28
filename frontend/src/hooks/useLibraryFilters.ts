import { useNavigate, useSearch } from "@tanstack/react-router"
import { useCallback, useMemo } from "react"
import { useDebouncedCallback } from "use-debounce"
import type { LibraryFiltersState } from "@/components/library/LibraryFilters"
import type { Book } from "@/types/book"

export function useLibraryFilters(books: Book[]) {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()

  // Parse filters from URL
  const filters: LibraryFiltersState = useMemo(
    () => ({
      search: (search as any).q || "",
      publisher: (search as any).publisher || "",
      activityType: (search as any).activity || "",
    }),
    [search],
  )

  // Debounced URL update for search
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

  // Filter books
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch =
          book.title.toLowerCase().includes(searchLower) ||
          book.publisher_name.toLowerCase().includes(searchLower) ||
          book.description?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Publisher filter
      if (filters.publisher && book.publisher_name !== filters.publisher) {
        return false
      }

      // Activity type filter - would need backend support or activity data
      // For now, skip if not available on book model

      return true
    })
  }, [books, filters])

  // Get unique publishers for filter dropdown
  const publishers = useMemo(() => {
    const unique = [...new Set(books.map((b) => b.publisher_name))]
    return unique.sort()
  }, [books])

  return {
    filters,
    setFilters,
    filteredBooks,
    publishers,
    totalCount: books.length,
    resultCount: filteredBooks.length,
  }
}
