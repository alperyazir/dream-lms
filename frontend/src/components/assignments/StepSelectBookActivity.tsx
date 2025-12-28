/**
 * Step 0: Select Book and Activity
 * Allows users to browse books and select an activity to assign
 */

import { useQuery } from "@tanstack/react-query"
import { BookOpen, Search } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { booksApi } from "@/services/booksApi"
import type { Activity, Book } from "@/types/book"
import { ACTIVITY_TYPE_CONFIG } from "@/types/book"

interface StepSelectBookActivityProps {
  selectedBook: Book | null
  selectedActivity: Activity | null
  onSelectBook: (book: Book) => void
  onSelectActivity: (activity: Activity) => void
}

export function StepSelectBookActivity({
  selectedBook,
  selectedActivity,
  onSelectBook,
  onSelectActivity,
}: StepSelectBookActivityProps) {
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

  // Fetch activities for selected book
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["book-activities", selectedBook?.id],
    queryFn: () => booksApi.getBookActivities(String(selectedBook!.id)),
    enabled: !!selectedBook,
    staleTime: 5 * 60 * 1000,
  })

  const books = booksData?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {!selectedBook ? "Select a Book" : "Select an Activity"}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No books found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                {books.map((book) => (
                  <Card
                    key={book.id}
                    className="cursor-pointer hover:shadow-md transition-shadow bg-card dark:bg-card"
                    onClick={() => onSelectBook(book)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold line-clamp-1 mb-2 text-foreground">
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
          <>
            {/* Selected Book */}
            <Card className="mb-4 bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-teal-700 dark:text-teal-300 mb-1">
                      Selected Book:
                    </p>
                    <h4 className="font-semibold text-foreground">
                      {selectedBook.title}
                    </h4>
                    <Badge
                      variant="secondary"
                      className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100 text-xs mt-2"
                    >
                      {selectedBook.publisher_name}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectBook(null as any)}
                  >
                    Change Book
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Activities List */}
            {activitiesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : !activities || activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No activities available for this book</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activities.map((activity, index) => {
                  const typeConfig =
                    ACTIVITY_TYPE_CONFIG[activity.activity_type]
                  const isSelected = selectedActivity?.id === activity.id

                  return (
                    <Card
                      key={activity.id}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "ring-2 ring-purple-600 dark:ring-purple-500 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800"
                          : "hover:shadow-md bg-card dark:bg-card"
                      }`}
                      onClick={() => onSelectActivity(activity)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                              {index + 1}
                            </span>
                            <div>
                              <h5 className="font-medium text-foreground">
                                {activity.title || `Activity ${index + 1}`}
                              </h5>
                              <Badge
                                variant={typeConfig.badgeVariant}
                                className="mt-1"
                              >
                                {typeConfig.label}
                              </Badge>
                            </div>
                          </div>
                          {isSelected && (
                            <Badge className="bg-purple-600 dark:bg-purple-500 text-white">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
