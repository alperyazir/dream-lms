/**
 * Book List View Component - Story 9.8
 *
 * Table/list view for books with sortable columns:
 * - Cover thumbnail (small)
 * - Title (sortable)
 * - Author/Publisher (sortable)
 * - Grade level (sortable)
 * - Activity count
 * - Row click navigates to book detail
 */

import { Link } from "@tanstack/react-router"
import { ArrowDown, ArrowUp, ArrowUpDown, BookOpen } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
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

export interface BookListViewProps {
  books: Book[]
}

type SortField = "title" | "publisher_name" | "activity_count"
type SortDirection = "asc" | "desc"

/**
 * Book cover thumbnail with authenticated URL loading
 */
function BookCoverThumbnail({ book }: { book: Book }) {
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

  if (isLoading) {
    return (
      <div className="w-10 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-5 h-5 text-gray-400 animate-pulse" />
      </div>
    )
  }

  if (coverUrl && !imageError) {
    return (
      <img
        src={coverUrl}
        alt={`${book.title} cover`}
        className="w-10 h-14 object-cover rounded flex-shrink-0"
        onError={() => setImageError(true)}
      />
    )
  }

  return (
    <div className="w-10 h-14 bg-gradient-to-br from-teal-100 to-teal-200 rounded flex items-center justify-center flex-shrink-0">
      <BookOpen className="w-5 h-5 text-teal-600" />
    </div>
  )
}

/**
 * Sort indicator icon
 */
function SortIcon({
  field,
  currentField,
  direction,
}: {
  field: SortField
  currentField: SortField | null
  direction: SortDirection
}) {
  if (currentField !== field) {
    return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />
  }
  return direction === "asc" ? (
    <ArrowUp className="ml-1 h-3 w-3 text-primary" />
  ) : (
    <ArrowDown className="ml-1 h-3 w-3 text-primary" />
  )
}

export function BookListView({ books }: BookListViewProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Sort books
  const sortedBooks = [...books].sort((a, b) => {
    if (!sortField) return 0

    let comparison = 0
    switch (sortField) {
      case "title":
        comparison = a.title.localeCompare(b.title)
        break
      case "publisher_name":
        comparison = a.publisher_name.localeCompare(b.publisher_name)
        break
      case "activity_count":
        comparison = a.activity_count - b.activity_count
        break
    }

    return sortDirection === "asc" ? comparison : -comparison
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Cover</TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/50"
              onClick={() => handleSort("title")}
            >
              <div className="flex items-center">
                Title
                <SortIcon
                  field="title"
                  currentField={sortField}
                  direction={sortDirection}
                />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/50"
              onClick={() => handleSort("publisher_name")}
            >
              <div className="flex items-center">
                Publisher
                <SortIcon
                  field="publisher_name"
                  currentField={sortField}
                  direction={sortDirection}
                />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/50 text-center"
              onClick={() => handleSort("activity_count")}
            >
              <div className="flex items-center justify-center">
                Activities
                <SortIcon
                  field="activity_count"
                  currentField={sortField}
                  direction={sortDirection}
                />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBooks.map((book) => (
            <TableRow
              key={book.id}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="py-2">
                <Link
                  to="/teacher/books/$bookId"
                  params={{ bookId: String(book.id) }}
                >
                  <BookCoverThumbnail book={book} />
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  to="/teacher/books/$bookId"
                  params={{ bookId: String(book.id) }}
                  className="block"
                >
                  <div className="font-medium hover:text-primary transition-colors">
                    {book.title}
                  </div>
                  {book.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {book.description}
                    </div>
                  )}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  to="/teacher/books/$bookId"
                  params={{ bookId: String(book.id) }}
                  className="block"
                >
                  <Badge
                    variant="secondary"
                    className="bg-teal-100 text-teal-800"
                  >
                    {book.publisher_name}
                  </Badge>
                </Link>
              </TableCell>
              <TableCell className="text-center">
                <Link
                  to="/teacher/books/$bookId"
                  params={{ bookId: String(book.id) }}
                  className="block"
                >
                  <Badge variant="outline">{book.activity_count}</Badge>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
