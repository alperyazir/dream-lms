import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, Plus, RefreshCw, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { BookCard } from "@/components/books/BookCard"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import useCustomToast from "@/hooks/useCustomToast"
import { booksApi } from "@/services/booksApi"
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

function PublisherLibraryPage() {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Debounce search term
  const debouncedSearch = useDebounce(searchTerm, 300)

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const response = await booksApi.getBooks({ limit: 100 })
      setBooks(response.items)
    } catch (error) {
      console.error("Failed to fetch books:", error)
      showErrorToast("Failed to load books")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  const handleAddBook = () => {
    showSuccessToast("Add Book feature coming soon!")
  }

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
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Library</h1>
          <p className="text-muted-foreground">
            Manage your published books and learning materials
          </p>
        </div>
        <Button
          onClick={handleAddBook}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Book
        </Button>
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
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
