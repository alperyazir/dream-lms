/**
 * Book Detail Page - Story 3.6
 *
 * Displays book details and activities with:
 * - Book cover, title, publisher, description
 * - Activity list with assign buttons
 * - Back navigation to catalog
 * - Loading and error states
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, BookOpen } from "lucide-react"
import { useEffect, useState } from "react"
import { AssignmentCreationDialog } from "@/components/assignments/AssignmentCreationDialog"
import { ActivityList } from "@/components/books/ActivityList"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { ResourcesSection } from "@/components/resources/ResourcesSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { booksApi, getAuthenticatedCoverUrl } from "@/services/booksApi"
import type { Activity } from "@/types/book"

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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [isLoadingCover, setIsLoadingCover] = useState(true)
  const [imageError, setImageError] = useState(false)

  // Fetch book details (using list endpoint to find the book)
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

  // Fetch activities for this book
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["book-activities", bookId],
    queryFn: () => booksApi.getBookActivities(bookId),
    staleTime: 5 * 60 * 1000,
    enabled: !!book, // Only fetch if book exists
  })

  // Story 8.2: Multi-activity selection - opens dialog with book pre-selected
  const handleAssign = (_activity: Activity) => {
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
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
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Book Cover - Story 9.8: Prominent display with authenticated URL */}
            <div className="md:col-span-1">
              {isLoadingCover ? (
                <div className="w-full aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-24 h-24 text-gray-400 animate-pulse" />
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
                  <BookOpen className="w-24 h-24 text-teal-600" />
                </div>
              )}
            </div>

            {/* Book Info */}
            <div className="md:col-span-2">
              <h1 className="text-3xl font-bold mb-4">{book.title}</h1>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Badge
                  variant="secondary"
                  className="bg-teal-100 text-teal-800"
                >
                  {book.publisher_name}
                </Badge>
                <Badge variant="outline">
                  {book.activity_count}{" "}
                  {book.activity_count === 1 ? "activity" : "activities"}
                </Badge>
              </div>

              {book.description && (
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-muted-foreground block mb-2">
                      Description:
                    </span>
                    <p className="text-sm leading-relaxed">
                      {book.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources Section - Story 21.2: Conditionally displays when book has videos */}
      <ResourcesSection bookId={bookId} className="mb-8" />

      {/* Activities Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          Activities ({activities?.length ?? 0})
        </h2>

        {activitiesLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <ActivityList activities={activities ?? []} onAssign={handleAssign} />
        )}
      </div>

      {/* Assignment Creation Dialog - Story 8.2: Multi-activity selection */}
      {book && (
        <AssignmentCreationDialog
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          book={book}
        />
      )}
    </div>
  )
}
