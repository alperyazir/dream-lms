import { createFileRoute } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import { BookCard } from "@/components/books/BookCard"
import { Input } from "@/components/ui/input"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { mockBooks, mockActivities } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/teacher/books/")({
  component: TeacherBooksPage,
})

function TeacherBooksPage() {
  return (
    <ErrorBoundary>
      <TeacherBooksContent />
    </ErrorBoundary>
  )
}

function TeacherBooksContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPublisher, setSelectedPublisher] = useState<string>("all")
  const [selectedGrade, setSelectedGrade] = useState<string>("all")
  const [selectedActivityType, setSelectedActivityType] = useState<string>("all")

  // Extract unique publishers and grades for filter dropdowns
  const publishers = useMemo(() => {
    const unique = Array.from(new Set(mockBooks.map((b) => b.publisher)))
    return unique.sort()
  }, [])

  const grades = useMemo(() => {
    const unique = Array.from(new Set(mockBooks.map((b) => b.grade)))
    return unique.sort()
  }, [])

  const activityTypes = useMemo(() => {
    const unique = Array.from(new Set(mockActivities.map((a) => a.activityType)))
    return unique.sort()
  }, [])

  // Filter books based on search and filters
  const filteredBooks = useMemo(() => {
    return mockBooks.filter((book) => {
      // Search filter: case-insensitive partial match on title
      const matchesSearch =
        searchQuery === "" ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase())

      // Publisher filter
      const matchesPublisher =
        selectedPublisher === "all" || book.publisher === selectedPublisher

      // Grade filter
      const matchesGrade = selectedGrade === "all" || book.grade === selectedGrade

      // Activity type filter: check if book has any activities of selected type
      const matchesActivityType =
        selectedActivityType === "all" ||
        mockActivities.some(
          (activity) =>
            activity.bookId === book.id &&
            activity.activityType === selectedActivityType,
        )

      // AND logic: all filters must match
      return (
        matchesSearch && matchesPublisher && matchesGrade && matchesActivityType
      )
    })
  }, [searchQuery, selectedPublisher, selectedGrade, selectedActivityType])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Book Catalog</h1>
        <p className="text-muted-foreground">
          Browse and assign books to your students
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <Input
            type="search"
            placeholder="Search books by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            aria-label="Search books by title"
          />
        </div>

        {/* Publisher Filter */}
        <div>
          <select
            value={selectedPublisher}
            onChange={(e) => setSelectedPublisher(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filter by publisher"
          >
            <option value="all">All Publishers</option>
            {publishers.map((publisher) => (
              <option key={publisher} value={publisher}>
                {publisher}
              </option>
            ))}
          </select>
        </div>

        {/* Grade Filter */}
        <div>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filter by grade"
          >
            <option value="all">All Grades</option>
            {grades.map((grade) => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Type Filter - Full width row */}
      <div className="mb-6">
        <select
          value={selectedActivityType}
          onChange={(e) => setSelectedActivityType(e.target.value)}
          className="w-full md:w-64 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filter by activity type"
        >
          <option value="all">All Activity Types</option>
          {activityTypes.map((type) => (
            <option key={type} value={type}>
              {type.replace(/([A-Z])/g, " $1").trim()}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-muted-foreground">
        Showing {filteredBooks.length} of {mockBooks.length} books
      </div>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            No books found matching your filters.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
