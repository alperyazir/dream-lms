import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, RefreshCw, UserPlus } from "lucide-react"
import { useEffect, useState } from "react"
import { AdminBookCard } from "@/components/books/AdminBookCard"
import { BookCover } from "@/components/books/BookCover"
import { BookDetailsDialog } from "@/components/books/BookDetailsDialog"
import { QuickAssignDialog } from "@/components/books/QuickAssignDialog"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { LibraryFilters } from "@/components/library/LibraryFilters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ViewModeToggle } from "@/components/ui/view-mode-toggle"
import { toast } from "@/hooks/use-toast"
import { useLibraryFilters } from "@/hooks/useLibraryFilters"
import { useViewPreference } from "@/hooks/useViewPreference"
import { booksApi } from "@/services/booksApi"
import type { Book } from "@/types/book"

export const Route = createFileRoute("/_layout/admin/books")({
  component: () => (
    <ErrorBoundary>
      <AdminBooks />
    </ErrorBoundary>
  ),
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) || "",
    publisher: (search.publisher as string) || "",
    activity: (search.activity as string) || "",
  }),
})

function AdminBooks() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useViewPreference("admin-library", "table")
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [assignBook, setAssignBook] = useState<Book | null>(null)

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const response = await booksApi.getBooks({ limit: 100 })
      setBooks(response.items)
    } catch (error) {
      console.error("Failed to fetch books:", error)
      toast({
        title: "Error",
        description: "Failed to load books",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch books on mount
  useEffect(() => {
    fetchBooks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBooks])

  // Use library filters hook
  const {
    filters,
    setFilters,
    filteredBooks,
    publishers,
    resultCount,
    totalCount,
  } = useLibraryFilters(books)

  const handleViewDetails = (book: Book) => {
    setSelectedBook(book)
  }

  const handleAssignClick = (book: Book) => {
    setAssignBook(book)
  }

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Library</h1>
          <p className="text-muted-foreground">
            Manage educational books in the system
          </p>
        </div>
        {/* View Mode Toggle */}
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Filters */}
      <LibraryFilters
        filters={filters}
        onChange={setFilters}
        publishers={publishers}
        showPublisherFilter={true}
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
            {filters.search || filters.publisher || filters.activityType
              ? "No books found"
              : "No books yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {filters.search || filters.publisher || filters.activityType
              ? "Try adjusting your filter criteria"
              : "Books are automatically synced from Dream Central Storage"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredBooks.map((book) => (
            <AdminBookCard
              key={book.id}
              book={book}
              onViewDetails={() => handleViewDetails(book)}
              onAssign={() => handleAssignClick(book)}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-500" />
              All Books ({filteredBooks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Cover</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead className="text-center">Activities</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBooks.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell className="w-16">
                      <BookCover
                        coverUrl={book.cover_image_url}
                        title={book.title}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell className="text-sm">
                      {book.publisher_name}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{book.activity_count}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {book.description || "No description"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignClick(book)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Book Details Dialog */}
      {selectedBook && (
        <BookDetailsDialog
          book={selectedBook}
          isOpen={!!selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}

      {/* Quick Assign Dialog - Story 19.5 */}
      {assignBook && (
        <QuickAssignDialog
          open={!!assignBook}
          onOpenChange={(open) => !open && setAssignBook(null)}
          book={assignBook}
          isAdmin={true}
        />
      )}
    </div>
  )
}
