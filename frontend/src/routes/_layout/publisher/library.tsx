import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, Plus } from "lucide-react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/publisher/library")({
  component: () => (
    <ErrorBoundary>
      <PublisherLibraryPage />
    </ErrorBoundary>
  ),
})

function PublisherLibraryPage() {
  const { showSuccessToast } = useCustomToast()

  const handleAddBook = () => {
    showSuccessToast("Add Book feature coming soon!")
  }

  // TODO: Fetch books from API
  const books: any[] = []

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Library</h1>
        <p className="text-muted-foreground">
          Manage your published books and learning materials
        </p>
      </div>

      {/* Add Button */}
      <div className="flex justify-end mb-6">
        <Button
          onClick={handleAddBook}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Book
        </Button>
      </div>

      {/* Empty State */}
      {books.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-muted-foreground mb-2">No books yet</p>
          <p className="text-sm text-muted-foreground">
            Start by adding your first book to the library
          </p>
        </div>
      )}
    </div>
  )
}
