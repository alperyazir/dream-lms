/**
 * Library Book Card Component
 * Story 29.2: Create DCS Library Browser Page
 *
 * Displays a book in the library viewer with preview and download actions.
 */

import { Download, Eye, Play } from "lucide-react"
import { useState } from "react"
import { BookCover } from "@/components/books/BookCover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { LibraryBook } from "@/types/library"

interface LibraryBookCardProps {
  book: LibraryBook
  onPreview?: (book: LibraryBook) => void
  onDownload?: (book: LibraryBook) => void
  showActions?: boolean
}

export function LibraryBookCard({
  book,
  onPreview,
  onDownload,
  showActions = true,
}: LibraryBookCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="p-0 relative">
        {/* Book Cover */}
        <div className="aspect-[3/4] relative bg-muted">
          <BookCover
            coverUrl={book.cover_image_url}
            title={book.title}
            size="lg"
            className="w-full h-full"
          />

          {/* Hover Overlay with Actions */}
          {showActions && isHovered && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onPreview?.(book)}
                      className="h-10 w-10 p-0 rounded-full"
                    >
                      <Play className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Preview Book</TooltipContent>
                </Tooltip>

                {onDownload && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onDownload(book)}
                        className="h-10 w-10 p-0 rounded-full"
                      >
                        <Download className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download Book</TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Activity Count Badge */}
        {book.activity_count > 0 && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 bg-primary text-primary-foreground"
          >
            {book.activity_count} {book.activity_count === 1 ? "Activity" : "Activities"}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-3">
        {/* Book Title */}
        <h3 className="font-semibold text-sm line-clamp-2 mb-1" title={book.title}>
          {book.title}
        </h3>

        {/* Publisher Name */}
        <p className="text-xs text-muted-foreground line-clamp-1">
          {book.publisher_name}
        </p>
      </CardContent>

      {showActions && (
        <CardFooter className="p-3 pt-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onPreview?.(book)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
