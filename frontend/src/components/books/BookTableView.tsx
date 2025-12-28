import { BookOpen, Eye } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAuthenticatedCoverUrl } from "@/services/booksApi"
import type { Book } from "@/types/book"

interface BookTableViewProps {
  books: Book[]
  onViewDetails?: (book: Book) => void
  onAssign?: (book: Book) => void
  showAssignButton?: boolean
  showViewDetails?: boolean
}

function BookCoverThumbnail({ book }: { book: Book }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    setImageError(false)

    async function fetchCover() {
      if (!book.cover_image_url) return

      const url = await getAuthenticatedCoverUrl(book.cover_image_url)
      if (isMounted) {
        blobUrl = url
        setCoverUrl(url)
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

  if (coverUrl && !imageError) {
    return (
      <img
        src={coverUrl}
        alt={`${book.title} cover`}
        className="w-12 h-16 object-cover rounded"
        onError={() => setImageError(true)}
      />
    )
  }

  return (
    <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
      <BookOpen className="h-6 w-6 text-muted-foreground" />
    </div>
  )
}

export function BookTableView({
  books,
  onViewDetails,
  onAssign,
  showAssignButton = false,
  showViewDetails = true,
}: BookTableViewProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Cover</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Publisher</TableHead>
            <TableHead className="text-center">Activities</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-8 text-muted-foreground"
              >
                No books found
              </TableCell>
            </TableRow>
          ) : (
            books.map((book) => (
              <TableRow key={book.id}>
                <TableCell>
                  <BookCoverThumbnail book={book} />
                </TableCell>
                <TableCell className="font-medium">{book.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {book.publisher_name}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{book.activity_count}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {showViewDetails && onViewDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(book)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  )}
                  {showAssignButton && onAssign && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAssign(book)}
                    >
                      Assign
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
