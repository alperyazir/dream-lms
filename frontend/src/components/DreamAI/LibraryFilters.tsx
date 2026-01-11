/**
 * LibraryFilters - Filter controls for Content Library
 * Story 27.21: Content Library UI - Task 5
 *
 * Provides filtering options for the content library including
 * activity type, book, and date range.
 */

import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ACTIVITY_TYPE_CONFIG } from "@/lib/activityTypeConfig"
import { getBooks } from "@/services/booksApi"
import type { Book } from "@/types/book"
import type { LibraryFilters as Filters } from "@/types/content-library"

interface LibraryFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
}

export function LibraryFilters({
  filters,
  onFiltersChange,
}: LibraryFiltersProps) {
  const [books, setBooks] = useState<Book[]>([])
  const [isLoadingBooks, setIsLoadingBooks] = useState(false)

  // Load books on mount
  useEffect(() => {
    const loadBooks = async () => {
      try {
        setIsLoadingBooks(true)
        const response = await getBooks()
        setBooks(response.items || [])
      } catch (err) {
        console.error("Failed to load books:", err)
      } finally {
        setIsLoadingBooks(false)
      }
    }

    loadBooks()
  }, [])

  const handleFilterChange = (key: keyof Filters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
      // Reset page when filters change
      page: 1,
    })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      page: 1,
      page_size: filters.page_size || 20,
    })
  }

  const hasActiveFilters = filters.type || filters.book_id || filters.date_from

  // Get AI activity types from config
  const activityTypes = Object.entries(ACTIVITY_TYPE_CONFIG)
    .filter(([key]) =>
      [
        "ai_quiz",
        "vocabulary_quiz",
        "reading_comprehension",
        "sentence_builder",
        "word_builder",
      ].includes(key),
    )
    .map(([key, config]) => ({
      value: key,
      label: config.label,
    }))

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 px-2"
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Activity Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="activity-type">Activity Type</Label>
          <Select
            value={filters.type || "all"}
            onValueChange={(value) =>
              handleFilterChange("type", value === "all" ? null : value)
            }
          >
            <SelectTrigger id="activity-type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {activityTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Book Filter */}
        <div className="space-y-2">
          <Label htmlFor="book">Book</Label>
          <Select
            value={filters.book_id?.toString() || "all"}
            onValueChange={(value) =>
              handleFilterChange(
                "book_id",
                value === "all" ? null : parseInt(value, 10),
              )
            }
            disabled={isLoadingBooks}
          >
            <SelectTrigger id="book">
              <SelectValue placeholder="All books" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All books</SelectItem>
              {books.map((book) => (
                <SelectItem key={book.id} value={book.id.toString()}>
                  {book.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From Filter */}
        <div className="space-y-2">
          <Label htmlFor="date-from">From Date</Label>
          <Input
            id="date-from"
            type="date"
            value={filters.date_from || ""}
            onChange={(e) => handleFilterChange("date_from", e.target.value)}
          />
        </div>

        {/* Date To Filter */}
        <div className="space-y-2">
          <Label htmlFor="date-to">To Date</Label>
          <Input
            id="date-to"
            type="date"
            value={filters.date_to || ""}
            onChange={(e) => handleFilterChange("date_to", e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
