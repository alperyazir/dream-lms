/**
 * Vocabulary Filters Component
 * Story 27.18: Vocabulary Explorer with Audio Player
 *
 * Filter bar for vocabulary explorer with book, module, search, and CEFR level filters.
 */

import { Search } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  BookWithVocabulary,
  CEFRLevel,
  VocabularyFilters as VocabularyFiltersType,
} from "@/types/vocabulary-explorer"

export interface VocabularyFiltersProps {
  books: BookWithVocabulary[]
  selectedBookId: number | null
  filters: VocabularyFiltersType | null
  onFiltersChange: (filters: VocabularyFiltersType | null) => void
}

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"]

/**
 * Vocabulary Explorer Filters
 *
 * Provides UI for filtering vocabulary by:
 * - Book selection (required)
 * - Module within book
 * - Search term
 * - CEFR proficiency levels (multi-select)
 */
export function VocabularyFilters({
  books,
  selectedBookId,
  filters,
  onFiltersChange,
}: VocabularyFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLevels, setSelectedLevels] = useState<CEFRLevel[]>([])

  const selectedBook = books.find((b) => b.id === selectedBookId)

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters && searchTerm !== filters.search) {
        onFiltersChange({
          ...filters,
          search: searchTerm || undefined,
        })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, filters, onFiltersChange])

  const handleBookChange = (bookId: string) => {
    const id = parseInt(bookId, 10)
    const book = books.find((b) => b.id === id)
    if (book) {
      onFiltersChange({
        bookId: id,
        cefrLevels: selectedLevels.length > 0 ? selectedLevels : undefined,
      })
      setSearchTerm("")
    }
  }

  const handleModuleChange = (moduleId: string) => {
    if (filters) {
      onFiltersChange({
        ...filters,
        moduleId: moduleId === "all" ? undefined : moduleId,
      })
    }
  }

  const handleLevelToggle = (level: CEFRLevel) => {
    const newLevels = selectedLevels.includes(level)
      ? selectedLevels.filter((l) => l !== level)
      : [...selectedLevels, level]

    setSelectedLevels(newLevels)

    if (filters) {
      onFiltersChange({
        ...filters,
        cefrLevels: newLevels.length > 0 ? newLevels : undefined,
      })
    }
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-neutral-800 rounded-lg border">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Book Selector */}
        <div className="space-y-2">
          <Label htmlFor="book-select">Book</Label>
          <Select
            value={selectedBookId?.toString()}
            onValueChange={handleBookChange}
          >
            <SelectTrigger id="book-select">
              <SelectValue placeholder="Select a book" />
            </SelectTrigger>
            <SelectContent>
              {books.map((book) => (
                <SelectItem key={book.id} value={book.id.toString()}>
                  <div className="flex items-center justify-between gap-2">
                    <span>{book.title}</span>
                    {book.processing_status === "completed" && (
                      <Badge variant="outline" className="text-xs">
                        {book.vocabulary_count} words
                      </Badge>
                    )}
                    {book.processing_status === "processing" && (
                      <Badge variant="secondary" className="text-xs">
                        Processing...
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Module Selector */}
        <div className="space-y-2">
          <Label htmlFor="module-select">Module</Label>
          <Select
            value={filters?.moduleId || "all"}
            onValueChange={handleModuleChange}
            disabled={!selectedBook}
          >
            <SelectTrigger id="module-select">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {selectedBook?.modules.map((module) => (
                <SelectItem key={module.id} value={module.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span>{module.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {module.vocabulary_count}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="search-input">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              id="search-input"
              type="text"
              placeholder="Search vocabulary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!selectedBook}
              className="pl-9"
            />
          </div>
        </div>

        {/* CEFR Level Filter - Placeholder for future expansion */}
        <div className="space-y-2">
          <Label>CEFR Levels</Label>
          <div className="flex flex-wrap gap-2 items-center h-10">
            {CEFR_LEVELS.map((level) => (
              <div key={level} className="flex items-center space-x-1">
                <Checkbox
                  id={`level-${level}`}
                  checked={selectedLevels.includes(level)}
                  onCheckedChange={() => handleLevelToggle(level)}
                  disabled={!selectedBook}
                />
                <label
                  htmlFor={`level-${level}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {level}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {filters && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>Active filters:</span>
          {selectedBook && (
            <Badge variant="secondary">{selectedBook.title}</Badge>
          )}
          {filters.moduleId && selectedBook && (
            <Badge variant="secondary">
              {
                selectedBook.modules.find((m) => m.id === filters.moduleId)
                  ?.name
              }
            </Badge>
          )}
          {filters.search && (
            <Badge variant="secondary">Search: {filters.search}</Badge>
          )}
          {selectedLevels.length > 0 && (
            <Badge variant="secondary">
              Levels: {selectedLevels.join(", ")}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
