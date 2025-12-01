/**
 * Step Select Book Component - Story 8.2
 *
 * Step 0: Book selection for assignment creation
 * Extracted from StepSelectBookActivity for cleaner separation
 */

import { useQuery } from "@tanstack/react-query"
import { BookOpen, Search } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { booksApi } from "@/services/booksApi"
import type { Book } from "@/types/book"

interface StepSelectBookProps {
  selectedBook: Book | null
  onSelectBook: (book: Book | null) => void
}

export function StepSelectBook({
  selectedBook,
  onSelectBook,
}: StepSelectBookProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch books
  const { data: booksData, isLoading: booksLoading } = useQuery({
    queryKey: ["books", { search: searchTerm, limit: 100 }],
    queryFn: () =>
      booksApi.getBooks({
        search: searchTerm || undefined,
        limit: 100,
      }),
    staleTime: 5 * 60 * 1000,
  })

  const books = booksData?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          {!selectedBook ? "Select a Book" : "Selected Book"}
        </h3>

        {!selectedBook ? (
          <>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search books..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Books Grid */}
            {booksLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No books found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
                {books.map((book) => (
                  <Card
                    key={book.id}
                    className="cursor-pointer hover:shadow-md transition-shadow bg-card dark:bg-card"
                    onClick={() => onSelectBook(book)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold line-clamp-2 mb-2 text-foreground">
                        {book.title}
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100 text-xs"
                        >
                          {book.publisher_name}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {book.activity_count}{" "}
                          {book.activity_count === 1
                            ? "activity"
                            : "activities"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Selected Book Display */
          <Card className="bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">
                    {selectedBook.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100 text-xs"
                    >
                      {selectedBook.publisher_name}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedBook.activity_count}{" "}
                      {selectedBook.activity_count === 1
                        ? "activity"
                        : "activities"}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => onSelectBook(null)}
                  className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Change
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
