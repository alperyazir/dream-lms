/**
 * BookSelector - Horizontal book scroller for content library
 *
 * Displays teacher's books in a horizontal scroll area with cover images.
 * Used by the Content Library page to select which book's content to browse.
 */

import { BookOpen, Check, Loader2, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { getAuthenticatedCoverUrl, getBooks } from "@/services/booksApi"
import type { Book } from "@/types/book"

interface BookSelectorProps {
  selectedBookId: number | null
  onBookSelect: (id: number | null) => void
}

export function BookSelector({
  selectedBookId,
  onBookSelect,
}: BookSelectorProps) {
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(false)
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
        setIsLoading(true)
        const response = await getBooks()
        setBooks(response.items || [])
      } catch (err) {
        console.error("Failed to load books:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadBooks()
  }, [])

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search books..."
          value={bookSearch}
          onChange={(e) => setBookSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Horizontal Book Picker */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {bookSearch ? "No books match your search" : "No books available"}
        </div>
      ) : (
        <div className="rounded-lg border bg-card/50 p-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex justify-center gap-3 py-2 px-2">
              {filteredBooks.map((book) => (
                <button
                  key={book.id}
                  onClick={() =>
                    onBookSelect(selectedBookId === book.id ? null : book.id)
                  }
                  className={cn(
                    "relative flex-shrink-0 w-28 rounded-lg border-2 p-1 transition-all hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                    selectedBookId === book.id
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
                  {selectedBookId === book.id && (
                    <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center z-10">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
