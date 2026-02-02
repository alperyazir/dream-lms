/**
 * SourceSelector - Select book and modules for AI generation
 * Story 27.17: Question Generator UI - Task 2
 *
 * Displays books horizontally with covers for easy selection,
 * then shows modules for the selected book.
 */

import { AlertCircle, BookOpen, Check, Loader2, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { getAuthenticatedCoverUrl, getBooks } from "@/services/booksApi"
import { type AIModuleSummary, getBookAIModules } from "@/services/dcsAiDataApi"
import type { Book } from "@/types/book"

interface SourceSelectorProps {
  bookId: number | null
  moduleIds: number[]
  onBookChange: (bookId: number | null) => void
  onModulesChange: (moduleIds: number[]) => void
}

export function SourceSelector({
  bookId,
  moduleIds,
  onBookChange,
  onModulesChange,
}: SourceSelectorProps) {
  const [books, setBooks] = useState<Book[]>([])
  const [modules, setModules] = useState<AIModuleSummary[]>([])
  const [isLoadingBooks, setIsLoadingBooks] = useState(false)
  const [isLoadingModules, setIsLoadingModules] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookSearch, setBookSearch] = useState("")
  const [coverUrls, setCoverUrls] = useState<Record<number, string>>({})

  // Load cover URLs for books
  useEffect(() => {
    const loadCovers = async () => {
      const urls: Record<number, string> = {}
      for (const book of books) {
        if (book.cover_image_url) {
          const url = await getAuthenticatedCoverUrl(book.cover_image_url)
          if (url) urls[book.id] = url
        }
      }
      setCoverUrls(urls)
    }
    if (books.length > 0) loadCovers()
  }, [books])

  // Filter books based on search
  const filteredBooks = useMemo(() => {
    if (!bookSearch.trim()) return books
    const searchLower = bookSearch.toLowerCase()
    return books.filter((book) =>
      book.title.toLowerCase().includes(searchLower),
    )
  }, [books, bookSearch])

  // Load books on mount
  useEffect(() => {
    const loadBooks = async () => {
      try {
        setIsLoadingBooks(true)
        setError(null)
        const response = await getBooks()
        setBooks(response.items || [])
      } catch (err) {
        console.error("Failed to load books:", err)
        setError("Failed to load books")
      } finally {
        setIsLoadingBooks(false)
      }
    }

    loadBooks()
  }, [])

  // Load AI modules when book is selected
  useEffect(() => {
    if (!bookId) {
      setModules([])
      return
    }

    const loadModules = async () => {
      try {
        setIsLoadingModules(true)
        setError(null)
        const response = await getBookAIModules(bookId)
        setModules(response.modules || [])
        onModulesChange([])
      } catch (err: any) {
        console.error("Failed to load AI modules:", err)
        const message =
          err.response?.data?.detail ||
          "Failed to load AI modules. Book may not be AI-processed."
        setError(message)
        setModules([])
      } finally {
        setIsLoadingModules(false)
      }
    }

    loadModules()
  }, [bookId, onModulesChange])

  // Handle select all modules
  const handleSelectAll = () => {
    const allModuleIds = modules.map((m) => m.module_id)
    onModulesChange(allModuleIds)
  }

  // Handle deselect all modules
  const handleDeselectAll = () => {
    onModulesChange([])
  }

  // Toggle module selection
  const toggleModule = (moduleId: number) => {
    if (moduleIds.includes(moduleId)) {
      onModulesChange(moduleIds.filter((id) => id !== moduleId))
    } else {
      onModulesChange([...moduleIds, moduleId])
    }
  }

  const selectedBook = books.find((b) => b.id === bookId)

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Select Book</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Choose a book to generate content from
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search books..."
          value={bookSearch}
          onChange={(e) => setBookSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Horizontal Book Picker */}
      {isLoadingBooks ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {bookSearch ? "No books match your search" : "No books available"}
        </div>
      ) : (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-4">
            {filteredBooks.map((book) => (
              <button
                key={book.id}
                onClick={() =>
                  onBookChange(bookId === book.id ? null : book.id)
                }
                className={cn(
                  "relative flex-shrink-0 w-28 rounded-lg border-2 p-1 transition-all hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                  bookId === book.id
                    ? "border-primary bg-primary/5"
                    : "border-muted bg-card",
                )}
              >
                {/* Book Cover */}
                <div className="aspect-[3/4] w-full rounded overflow-hidden bg-muted">
                  {coverUrls[book.id] ? (
                    <img
                      src={coverUrls[book.id]}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20">
                      <BookOpen className="h-8 w-8 text-purple-400" />
                    </div>
                  )}
                </div>

                {/* Book Title */}
                <p className="mt-1.5 text-xs font-medium text-center line-clamp-2 whitespace-normal leading-tight px-0.5">
                  {book.title}
                </p>

                {/* Selected Indicator */}
                {bookId === book.id && (
                  <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Module Selection */}
      {bookId && (
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Select Modules</Label>
              {selectedBook && (
                <p className="text-sm text-muted-foreground">
                  from {selectedBook.title}
                </p>
              )}
            </div>
            {modules.length > 0 && (
              <div className="space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={moduleIds.length === modules.length}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={moduleIds.length === 0}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          {isLoadingModules ? (
            <div className="flex items-center justify-center py-6 border rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">
                Loading modules...
              </span>
            </div>
          ) : modules.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No AI-processed modules found for this book
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto">
              {modules.map((module) => (
                <div
                  key={module.module_id}
                  className="flex items-start space-x-3"
                >
                  <Checkbox
                    id={`module-${module.module_id}`}
                    checked={moduleIds.includes(module.module_id)}
                    onCheckedChange={() => toggleModule(module.module_id)}
                  />
                  <div className="grid gap-1 leading-none flex-1">
                    <Label
                      htmlFor={`module-${module.module_id}`}
                      className="font-medium cursor-pointer"
                    >
                      {module.title}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {module.pages.length > 0
                        ? `Pages ${module.pages[0]}-${module.pages[module.pages.length - 1]}`
                        : "No pages"}{" "}
                      • {module.word_count.toLocaleString()} words
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
