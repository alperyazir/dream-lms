/**
 * Vocabulary Explorer Page
 * Story 27.18: Vocabulary Explorer with Audio Player
 *
 * Browse and explore book vocabulary with audio playback and quick-add to quiz functionality.
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { BookText, ShoppingCart, Sparkles } from "lucide-react"
import { useState } from "react"
import { VocabularyFilters } from "@/components/DreamAI/VocabularyFilters"
import { VocabularyTable } from "@/components/DreamAI/VocabularyTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useQuizCart } from "@/hooks/useQuizCart"
import { vocabularyExplorerApi } from "@/services/vocabularyExplorerApi"
import type {
  PaginationParams,
  VocabularyFilters as VocabularyFiltersType,
} from "@/types/vocabulary-explorer"

export const Route = createFileRoute("/_layout/dreamai/vocabulary")({
  component: VocabularyExplorerPage,
})

function VocabularyExplorerPage() {
  const navigate = useNavigate()
  const { getCartSize, clearCart } = useQuizCart()
  const cartSize = getCartSize()

  const [filters, setFilters] = useState<VocabularyFiltersType | null>(null)
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    pageSize: 25,
  })

  // Fetch books with vocabulary data
  const { data: books = [], isLoading: booksLoading } = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: vocabularyExplorerApi.getBooksWithVocabulary,
  })

  // Fetch vocabulary when filters are set
  const { data: vocabularyData, isLoading: vocabularyLoading } = useQuery({
    queryKey: ["vocabulary", filters, pagination],
    queryFn: () => {
      if (!filters) return null
      return vocabularyExplorerApi.getVocabulary(filters, pagination)
    },
    enabled: !!filters,
  })

  const handleFiltersChange = (newFilters: VocabularyFiltersType | null) => {
    setFilters(newFilters)
    // Reset to page 1 when filters change
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const handlePageSizeChange = (pageSize: number) => {
    setPagination({ page: 1, pageSize })
  }

  const handleCreateQuiz = () => {
    // Navigate to generator page with selected words
    navigate({
      to: "/dreamai/generator",
      search: { source: "vocabulary-cart" },
    })
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
            <BookText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Vocabulary Explorer
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Browse and explore vocabulary from your course books
            </p>
          </div>
        </div>

        {/* Cart Badge & Create Quiz Button */}
        {cartSize > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              <Badge variant="default" className="bg-emerald-600">
                {cartSize} {cartSize === 1 ? "word" : "words"} selected
              </Badge>
            </div>
            <Button
              onClick={handleCreateQuiz}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Create Quiz from Selection
            </Button>
            <Button variant="outline" size="sm" onClick={clearCart}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Loading State for Books */}
      {booksLoading && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Loading available books...
          </CardContent>
        </Card>
      )}

      {/* No Books Available */}
      {!booksLoading && books.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <BookText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">
                No books with vocabulary data found
              </p>
              <p className="text-sm mt-2">
                Books need to be processed with AI to extract vocabulary.
              </p>
              <p className="text-sm">
                Please ensure your books have been uploaded and processed.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {books.length > 0 && (
        <VocabularyFilters
          books={books}
          selectedBookId={filters?.bookId ?? null}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      )}

      {/* No Book Selected */}
      {!filters && books.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
            <p className="text-lg">Select a book to explore its vocabulary</p>
            <p className="text-sm mt-2">
              Choose a book from the dropdown above to get started
            </p>
          </CardContent>
        </Card>
      )}

      {/* Vocabulary Table */}
      {filters && vocabularyData && (
        <VocabularyTable
          words={vocabularyData.items}
          total={vocabularyData.total}
          page={vocabularyData.page}
          pageSize={vocabularyData.page_size}
          totalPages={vocabularyData.total_pages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          isLoading={vocabularyLoading}
        />
      )}

      {/* Loading Vocabulary */}
      {filters && vocabularyLoading && !vocabularyData && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Loading vocabulary...
          </CardContent>
        </Card>
      )}
    </div>
  )
}
