import { BookOpen, Download, ExternalLink } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getAuthenticatedCoverUrl } from "@/services/booksApi"
import type { Book } from "@/types/book"

export interface BookCardProps {
  book: Book
  onOpenFlowbook?: (book: Book) => void
  onDownload?: (book: Book) => void
}

/**
 * BookCard Component - Story 3.6
 *
 * Displays a book with cover image, title, publisher, description, and activity count.
 *
 * Features:
 * - Cover image with fallback placeholder
 * - Truncated title (2 lines) and description (3 lines)
 * - Publisher badge
 * - Activity count badge
 * - Permanent action buttons: Open with Flowbook, Download (Story 29.3)
 */
export function BookCard({ book, onOpenFlowbook, onDownload }: BookCardProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [isLoadingCover, setIsLoadingCover] = useState(true)
  const [imageError, setImageError] = useState(false)

  // Fetch authenticated cover URL
  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    // Reset error state when cover URL changes
    setImageError(false)

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

  return (
    <Card className="h-full flex flex-col shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Cover Image - 3:4 aspect ratio */}
        <div className="relative w-full aspect-[3/4] bg-muted rounded-md overflow-hidden mb-4">
          {isLoadingCover ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <BookOpen className="w-16 h-16 text-gray-400 animate-pulse" />
            </div>
          ) : coverUrl && !imageError ? (
            <img
              src={coverUrl}
              alt={`${book.title} cover`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImageError(true)}
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

        {/* Description - truncate at 2 lines */}
        {book.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {book.description}
          </p>
        )}

        {/* Activity Count Badge */}
        <Badge variant="outline" className="mb-3 w-fit">
          {book.activity_count}{" "}
          {book.activity_count === 1 ? "activity" : "activities"}
        </Badge>

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1" />

        {/* Action Buttons - Always visible */}
        <div className="flex gap-2 mt-auto pt-3 border-t">
          <TooltipProvider>
            {onOpenFlowbook && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenFlowbook(book)
                    }}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open with Flowbook Viewer</TooltipContent>
              </Tooltip>
            )}

            {onDownload && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownload(book)
                    }}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download for offline use</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}
