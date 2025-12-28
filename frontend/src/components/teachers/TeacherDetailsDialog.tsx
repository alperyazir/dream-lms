import { useQuery } from "@tanstack/react-query"
import { BookOpen, Building2, Loader2, User, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { getBookAssignments } from "@/services/bookAssignmentsApi"
import { booksApi } from "@/services/booksApi"

interface TeacherDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher: {
    id: string
    user_full_name: string
    user_email: string
    school_name?: string | null
    school_id?: string
    books_assigned?: number
    classroom_count?: number
  }
}

export function TeacherDetailsDialog({
  open,
  onOpenChange,
  teacher,
}: TeacherDetailsDialogProps) {
  // Fetch all books to create a lookup map
  const { data: booksData } = useQuery({
    queryKey: ["allBooks"],
    queryFn: () => booksApi.getBooks({ limit: 1000 }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch book assignments for all books and filter by this teacher
  const { data: allBooks = [], isLoading: loadingBooks } = useQuery({
    queryKey: ["teacherBooks", teacher.id],
    queryFn: async () => {
      // Get all books
      const books = booksData?.items || []
      const teacherBooks = []

      // For each book, check if this teacher has it assigned
      for (const book of books) {
        try {
          const assignments = await getBookAssignments(book.id)
          const hasAssignment = assignments.some(
            (a) => a.teacher_id === teacher.id,
          )
          if (hasAssignment) {
            teacherBooks.push(book)
          }
        } catch (_error) {}
      }

      return teacherBooks
    },
    enabled: open && !!booksData,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {teacher.user_full_name}
          </DialogTitle>
          <DialogDescription>{teacher.user_email}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <Building2 className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium truncate">
                  {teacher.school_name || "No School"}
                </p>
                <p className="text-xs text-muted-foreground">School</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <BookOpen className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {teacher.books_assigned || 0}
                </p>
                <p className="text-xs text-muted-foreground">Books</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {teacher.classroom_count || 0}
                </p>
                <p className="text-xs text-muted-foreground">Classes</p>
              </div>
            </div>

            <Separator />

            {/* Assigned Books */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Assigned Books ({allBooks.length})
              </h3>
              {loadingBooks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : allBooks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No books assigned to this teacher
                </p>
              ) : (
                <div className="space-y-2">
                  {allBooks.map((book) => (
                    <div
                      key={book.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{book.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {book.publisher_name}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {book.activity_count}{" "}
                        {book.activity_count === 1 ? "activity" : "activities"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Classes Info */}
            {teacher.classroom_count && teacher.classroom_count > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Classes
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This teacher manages {teacher.classroom_count} class
                    {teacher.classroom_count !== 1 ? "es" : ""}.
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
