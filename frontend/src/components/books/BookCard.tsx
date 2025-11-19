import { Link } from "@tanstack/react-router"
import { BookOpen } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { getAuthenticatedCoverUrl } from "@/services/booksApi"
import type { Book } from "@/types/book"

export interface BookCardProps {
  book: Book
  onClick?: () => void
}

/**
 * BookCard Component - Story 3.6
 *
 * Displays a book with cover image, title, publisher, description, and activity count.
 * Navigates to book detail page on click.
 *
 * Features:
 * - Cover image with fallback placeholder
 * - Truncated title (2 lines) and description (3 lines)
 * - Publisher badge
 * - Activity count badge
 * - Hover effects
 */
export function BookCard({ book, onClick }: BookCardProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [isLoadingCover, setIsLoadingCover] = useState(true)

  // Fetch authenticated cover URL
  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    async function fetchCover() {
      if (!book.cover_image_url) {
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

    // Cleanup: revoke blob URL when component unmounts or cover changes
    return () => {
      isMounted = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [book.cover_image_url])

  const cardContent = (
    <>
      {/* Cover Image - 3:4 aspect ratio */}
      <div className="relative w-full aspect-[3/4] bg-muted rounded-md overflow-hidden mb-4">
        {isLoadingCover ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <BookOpen className="w-16 h-16 text-gray-400 animate-pulse" />
          </div>
        ) : coverUrl ? (
          <img
            src={coverUrl}
            alt={`${book.title} cover`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-teal-200">
            <BookOpen className="w-16 h-16 text-teal-600" />
          </div>
        )}
      </div>

      {/* Title - truncate at 2 lines */}
      <h3 className="text-lg font-semibold mb-2 line-clamp-2 min-h-[3.5rem]">
        {book.title}
      </h3>

      {/* Publisher Badge */}
      <div className="mb-2">
        <Badge variant="secondary" className="bg-teal-100 text-teal-800">
          {book.publisher_name}
        </Badge>
      </div>

      {/* Description - truncate at 3 lines */}
      {book.description && (
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3 min-h-[4.5rem]">
          {book.description}
        </p>
      )}

      {/* Activity Count Badge */}
      <Badge variant="outline" className="mb-2">
        {book.activity_count}{" "}
        {book.activity_count === 1 ? "activity" : "activities"}
      </Badge>
    </>
  )

  return (
    <Card className="h-full flex flex-col shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-4 flex-1">{cardContent}</CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          asChild
          className="w-full bg-teal-600 hover:bg-teal-700"
          onClick={onClick}
        >
          <Link
            to="/teacher/books/$bookId"
            params={{ bookId: book.id }}
            aria-label={`View activities for ${book.title}`}
          >
            View Activities
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
