/**
 * Step Select Source Component
 * Story 8.2, Story 9.8, Story 27.x (Unified Assignment)
 *
 * Step 0: Source selection for assignment creation
 * Supports both Book Activities and AI Content from library
 */

import { useQuery } from "@tanstack/react-query"
import { BookOpen, FileText, Search, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useContentLibrary } from "@/hooks/useContentLibrary"
import {
  getActivityTypeColorClasses,
  getActivityTypeConfig,
} from "@/lib/activityTypeConfig"
import { booksApi, getAuthenticatedCoverUrl } from "@/services/booksApi"
import type { Book } from "@/types/book"
import type { ContentItem } from "@/types/content-library"

export type SourceType = "book" | "ai_content"

/**
 * Book cover thumbnail component with authenticated URL
 */
function BookCoverThumbnail({
  book,
  size = "small",
}: {
  book: Book
  size?: "small" | "medium"
}) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    setImageError(false)

    async function fetchCover() {
      if (!book.cover_image_url) {
        setIsLoading(false)
        return
      }

      const url = await getAuthenticatedCoverUrl(book.cover_image_url)
      if (isMounted) {
        blobUrl = url
        setCoverUrl(url)
        setIsLoading(false)
      }
    }

    fetchCover()

    return () => {
      isMounted = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [book.cover_image_url])

  const sizeClasses = size === "small" ? "w-12 h-16" : "w-20 h-28"
  const iconSize = size === "small" ? "w-6 h-6" : "w-10 h-10"

  if (isLoading) {
    return (
      <div
        className={`${sizeClasses} bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center flex-shrink-0`}
      >
        <BookOpen className={`${iconSize} text-gray-400 animate-pulse`} />
      </div>
    )
  }

  if (coverUrl && !imageError) {
    return (
      <img
        src={coverUrl}
        alt={`${book.title} cover`}
        className={`${sizeClasses} object-cover rounded flex-shrink-0 shadow-sm`}
        onError={() => setImageError(true)}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses} bg-gradient-to-br from-teal-100 to-teal-200 rounded flex items-center justify-center flex-shrink-0`}
    >
      <BookOpen className={`${iconSize} text-teal-600`} />
    </div>
  )
}

interface StepSelectSourceProps {
  sourceType: SourceType
  onSourceTypeChange: (type: SourceType) => void
  selectedBook: Book | null
  onSelectBook: (book: Book | null) => void
  selectedContent: ContentItem | null
  onSelectContent: (content: ContentItem | null) => void
}

export function StepSelectSource({
  sourceType,
  onSourceTypeChange,
  selectedBook,
  onSelectBook,
  selectedContent,
  onSelectContent,
}: StepSelectSourceProps) {
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
    enabled: sourceType === "book",
  })

  // Fetch AI content library
  const { data: contentData, isLoading: contentLoading } = useContentLibrary({
    page_size: 100,
  })

  const books = booksData?.items ?? []
  const contentItems = contentData?.items ?? []

  // Filter content items by search term
  const filteredContent = searchTerm
    ? contentItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.activity_type.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : contentItems

  // Handle tab change
  const handleTabChange = (value: string) => {
    const newSourceType = value as SourceType
    onSourceTypeChange(newSourceType)
    setSearchTerm("")
    // Clear selections when switching tabs
    if (newSourceType === "book") {
      onSelectContent(null)
    } else {
      onSelectBook(null)
    }
  }

  // Render selected book display
  const renderSelectedBook = () => (
    <Card className="bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <BookCoverThumbnail book={selectedBook!} size="medium" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-foreground text-lg">
                  {selectedBook!.title}
                </h4>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100 text-xs"
                  >
                    {selectedBook!.publisher_name}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedBook!.activity_count}{" "}
                    {selectedBook!.activity_count === 1
                      ? "activity"
                      : "activities"}
                  </Badge>
                </div>
                {selectedBook!.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {selectedBook!.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => onSelectBook(null)}
                className="text-sm text-teal-600 dark:text-teal-400 hover:underline flex-shrink-0 ml-2"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Render selected AI content display
  const renderSelectedContent = () => {
    const config = getActivityTypeConfig(selectedContent!.activity_type)
    const colorClasses = getActivityTypeColorClasses(config.color)
    const IconComponent = config.icon

    return (
      <Card className="bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div
              className={`w-20 h-28 rounded flex items-center justify-center ${colorClasses.bg}`}
            >
              <IconComponent className={`w-10 h-10 ${colorClasses.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-foreground text-lg">
                    {selectedContent!.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {config.label}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {selectedContent!.item_count}{" "}
                      {selectedContent!.item_count === 1 ? "item" : "items"}
                    </Badge>
                    {selectedContent!.book_title && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs"
                      >
                        <BookOpen className="w-3 h-3 mr-1" />
                        {selectedContent!.book_title}
                      </Badge>
                    )}
                    {selectedContent!.material_name && (
                      <Badge
                        variant="secondary"
                        className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 text-xs"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        {selectedContent!.material_name}
                      </Badge>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onSelectContent(null)}
                  className="text-sm text-teal-600 dark:text-teal-400 hover:underline flex-shrink-0 ml-2"
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div>
        <h3 className="text-lg font-semibold mb-2 text-foreground">
          Select Content Source
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose between book activities or AI-generated content from your
          library
        </p>
      </div>

      {/* Show selected item if any */}
      {sourceType === "book" && selectedBook && renderSelectedBook()}
      {sourceType === "ai_content" &&
        selectedContent &&
        renderSelectedContent()}

      {/* Show selection UI if nothing selected */}
      {!(
        (sourceType === "book" && selectedBook) ||
        (sourceType === "ai_content" && selectedContent)
      ) && (
        <Tabs
          value={sourceType}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="book" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Book Activities
            </TabsTrigger>
            <TabsTrigger value="ai_content" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Content
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={
                  sourceType === "book"
                    ? "Search books..."
                    : "Search AI content..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <TabsContent value="book" className="flex-1 overflow-auto mt-0">
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
                      <div className="flex gap-3">
                        <BookCoverThumbnail book={book} size="small" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold line-clamp-2 text-foreground text-sm">
                            {book.title}
                          </h4>
                          <div className="flex items-center gap-2 flex-wrap mt-2">
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai_content" className="flex-1 overflow-auto mt-0">
            {contentLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No AI content found</p>
                <p className="text-sm mt-1">
                  Generate content from the DreamAI section
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {filteredContent.map((content) => {
                  const config = getActivityTypeConfig(content.activity_type)
                  const colorClasses = getActivityTypeColorClasses(config.color)
                  const IconComponent = config.icon

                  return (
                    <div
                      key={content.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => onSelectContent(content)}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses.bg}`}
                      >
                        <IconComponent
                          className={`w-5 h-5 ${colorClasses.text}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {content.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {config.label}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {content.item_count}{" "}
                          {content.item_count === 1 ? "item" : "items"}
                        </Badge>
                        {content.source_type === "book" &&
                          content.book_title && (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs max-w-[120px] truncate"
                            >
                              <BookOpen className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">
                                {content.book_title}
                              </span>
                            </Badge>
                          )}
                        {content.material_name && (
                          <Badge
                            variant="secondary"
                            className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 text-xs max-w-[120px] truncate"
                          >
                            <FileText className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">
                              {content.material_name}
                            </span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
