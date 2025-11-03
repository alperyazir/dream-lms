import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, Plus, Search } from "lucide-react"
import { useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import useCustomToast from "@/hooks/useCustomToast"
import { mockBooks } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/teacher/books")({
  component: () => (
    <ErrorBoundary>
      <TeacherBooksPage />
    </ErrorBoundary>
  ),
})

function TeacherBooksPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const { showSuccessToast } = useCustomToast()

  const handleAddBook = () => {
    showSuccessToast("Request Book feature coming soon!")
  }

  const filteredBooks = mockBooks.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.publisher.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Book Library</h1>
        <p className="text-muted-foreground">
          Browse and use educational books for your classes
        </p>
      </div>

      {/* Search and Request */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search books by title, grade, or publisher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Button
          onClick={handleAddBook}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Request Book
        </Button>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredBooks.map((book) => (
          <Card
            key={book.id}
            className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-shadow overflow-hidden cursor-pointer"
          >
            <div className="relative aspect-[2/3] bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2 line-clamp-2 min-h-[2.5rem]">
                {book.title}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Grade:</span>
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-700 text-xs"
                  >
                    {book.grade}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Activities:</span>
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 text-xs"
                  >
                    <BookOpen className="w-3 h-3 mr-1" />
                    {book.activityCount}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {book.publisher}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBooks.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-muted-foreground">No books found</p>
        </div>
      )}
    </div>
  )
}
