import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Book } from "@/lib/mockData"
import { Link } from "@tanstack/react-router"

export interface BookCardProps {
  book: Book
}

/**
 * BookCard Component
 *
 * Displays a book with cover image, title, publisher, grade, and activity count.
 * Navigates to book detail page on "View Activities" button click.
 */
export function BookCard({ book }: BookCardProps) {
  return (
    <Card className="shadow-neuro hover:shadow-neuro-lg transition-all duration-300">
      <CardContent className="p-4">
        <img
          src={book.coverUrl}
          alt={`${book.title} cover`}
          className="w-full h-48 object-cover rounded-md mb-4"
        />
        <h3 className="text-lg font-semibold mb-2 line-clamp-2">
          {book.title}
        </h3>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="secondary" className="bg-teal-100 text-teal-800">
            {book.grade}
          </Badge>
          <Badge variant="outline">
            {book.activityCount} {book.activityCount === 1 ? "activity" : "activities"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{book.publisher}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full bg-teal-600 hover:bg-teal-700">
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
