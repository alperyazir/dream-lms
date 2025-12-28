import { Eye, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import type { Book } from "@/types/book"
import { BookCover } from "./BookCover"

interface AdminBookCardProps {
  book: Book
  onViewDetails: () => void
  onAssign?: () => void
}

export function AdminBookCard({
  book,
  onViewDetails,
  onAssign,
}: AdminBookCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-[3/4] relative bg-muted">
        <BookCover
          coverUrl={book.cover_image_url}
          title={book.title}
          size="lg"
          className="w-full h-full"
        />
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold truncate" title={book.title}>
          {book.title}
        </h3>
        <p className="text-sm text-muted-foreground truncate">
          {book.publisher_name}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {book.activity_count} activities
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex gap-2">
        {onAssign && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAssign}
            className="flex-1"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Assign
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onViewDetails}
          className="flex-1"
        >
          <Eye className="h-4 w-4 mr-1" />
          Details
        </Button>
      </CardFooter>
    </Card>
  )
}
