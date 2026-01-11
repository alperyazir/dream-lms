/**
 * Book Detail Page - Story 3.6
 *
 * Displays book details with tabbed content:
 * - Activities tab: Activity list with assign buttons
 * - Videos tab: Book videos and resources
 * - Vocabulary tab: Vocabulary explorer for the book
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, BookOpen, BookText, Eye, Video } from "lucide-react"
import { useEffect, useState } from "react"
import { VideoPreviewModal } from "@/components/ActivityPlayers/VideoPreviewModal"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { VocabularyTable } from "@/components/DreamAI/VocabularyTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBookResources } from "@/hooks/useBookResources"
import type { VideoInfo } from "@/services/booksApi"
import { booksApi, getAuthenticatedCoverUrl } from "@/services/booksApi"
import { vocabularyExplorerApi } from "@/services/vocabularyExplorerApi"
import type { PaginationParams } from "@/types/vocabulary-explorer"

export const Route = createFileRoute("/_layout/teacher/books/$bookId")({
  component: BookDetailPage,
})

function BookDetailPage() {
  return (
    <ErrorBoundary>
      <BookDetailContent />
    </ErrorBoundary>
  )
}

function BookDetailContent() {
  const { bookId } = Route.useParams()
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [isLoadingCover, setIsLoadingCover] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [activeTab, setActiveTab] = useState("videos")
  const [vocabularyPagination, setVocabularyPagination] =
    useState<PaginationParams>({
      page: 1,
      pageSize: 25,
    })
  const [previewVideo, setPreviewVideo] = useState<VideoInfo | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Fetch book details
  const {
    data: book,
    isLoading: bookLoading,
    error: bookError,
  } = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => booksApi.getBookById(Number(bookId)),
    staleTime: 5 * 60 * 1000,
  })

  // Story 9.8: Fetch authenticated cover URL
  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    setImageError(false)

    async function fetchCover() {
      if (!book?.cover_image_url) {
        setIsLoadingCover(false)
        return
      }

      const url = await getAuthenticatedCoverUrl(book.cover_image_url)
      if (isMounted) {
        blobUrl = url
        setCoverUrl(url)
        setIsLoadingCover(false)
      }
    }

    fetchCover()

    return () => {
      isMounted = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [book?.cover_image_url])

  // Fetch videos/resources for this book
  const { videos, isLoading: videosLoading } = useBookResources(bookId)

  // Fetch vocabulary for this book
  const { data: vocabularyData, isLoading: vocabularyLoading } = useQuery({
    queryKey: ["book-vocabulary", bookId, vocabularyPagination],
    queryFn: () =>
      vocabularyExplorerApi.getVocabulary(
        { bookId: Number(bookId) },
        vocabularyPagination,
      ),
    staleTime: 5 * 60 * 1000,
    enabled: !!book,
  })

  const handleVocabularyPageChange = (page: number) => {
    setVocabularyPagination((prev) => ({ ...prev, page }))
  }

  const handleVocabularyPageSizeChange = (pageSize: number) => {
    setVocabularyPagination({ page: 1, pageSize })
  }

  const handlePreviewVideo = (video: VideoInfo) => {
    setPreviewVideo(video)
    setIsPreviewOpen(true)
  }

  // Loading state
  if (bookLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-32 mb-4" />
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="w-full aspect-[3/4]" />
              <div className="md:col-span-2 space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error or not found
  if (bookError || !book) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link
            to="/teacher/books"
            search={{ q: "", publisher: "", activity: "" }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>

        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Book Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The book you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <Button asChild>
            <Link
              to="/teacher/books"
              search={{ q: "", publisher: "", activity: "" }}
            >
              Return to Catalog
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-4">
        <Link
          to="/teacher/books"
          search={{ q: "", publisher: "", activity: "" }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Link>
      </Button>

      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-muted-foreground">
        <Link
          to="/teacher/books"
          search={{ q: "", publisher: "", activity: "" }}
          className="hover:text-foreground"
        >
          Library
        </Link>
        {" > "}
        <span className="text-foreground">{book.title}</span>
      </div>

      {/* Book Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Book Cover */}
            <div className="md:col-span-1">
              {isLoadingCover ? (
                <div className="w-full aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-gray-400 animate-pulse" />
                </div>
              ) : coverUrl && !imageError ? (
                <img
                  src={coverUrl}
                  alt={`${book.title} cover`}
                  className="w-full h-auto object-cover rounded-lg shadow-md"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full aspect-[3/4] bg-gradient-to-br from-teal-100 to-teal-200 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-teal-600" />
                </div>
              )}
            </div>

            {/* Book Info */}
            <div className="md:col-span-3">
              <h1 className="text-2xl font-bold mb-3">{book.title}</h1>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Badge
                  variant="secondary"
                  className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                >
                  {book.publisher_name}
                </Badge>
                <Badge variant="outline">
                  {book.activity_count}{" "}
                  {book.activity_count === 1 ? "activity" : "activities"}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  {videos?.length ?? 0}{" "}
                  {(videos?.length ?? 0) === 1 ? "video" : "videos"}
                </Badge>
                {vocabularyData && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <BookText className="h-3 w-3" />
                    {vocabularyData.total} words
                  </Badge>
                )}
              </div>

              {book.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {book.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Videos ({videos?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="vocabulary" className="flex items-center gap-2">
            <BookText className="h-4 w-4" />
            Vocabulary
          </TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos">
          <Card>
            <CardContent className="p-6">
              {videosLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                      <Skeleton className="h-8 w-8" />
                    </div>
                  ))}
                </div>
              ) : videos && videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {videos.map((video) => (
                    <div
                      key={video.path}
                      className="flex items-center justify-between rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900">
                          <Video className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {video.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {video.has_subtitles && "Subtitles available"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handlePreviewVideo(video)}
                        aria-label={`Preview ${video.name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No videos available</p>
                  <p className="text-sm mt-2">
                    This book doesn't have any videos yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vocabulary Tab */}
        <TabsContent value="vocabulary">
          <Card>
            <CardContent className="p-6">
              {vocabularyLoading && !vocabularyData ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading vocabulary...
                </div>
              ) : vocabularyData && vocabularyData.items.length > 0 ? (
                <VocabularyTable
                  words={vocabularyData.items}
                  total={vocabularyData.total}
                  page={vocabularyData.page}
                  pageSize={vocabularyData.page_size}
                  totalPages={vocabularyData.total_pages}
                  onPageChange={handleVocabularyPageChange}
                  onPageSizeChange={handleVocabularyPageSizeChange}
                  isLoading={vocabularyLoading}
                />
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <BookText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No vocabulary available</p>
                  <p className="text-sm mt-2">
                    This book hasn't been processed for vocabulary yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Video Preview Modal */}
      <VideoPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        video={previewVideo}
        bookId={String(bookId)}
        showAttachButton={false}
      />
    </div>
  )
}
