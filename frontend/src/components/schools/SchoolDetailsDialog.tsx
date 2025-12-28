import { useQuery } from "@tanstack/react-query"
import {
  BookOpen,
  Building2,
  GraduationCap,
  Loader2,
  Users,
} from "lucide-react"
import { PublishersService } from "@/client"
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

interface SchoolDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  school: {
    id: string
    name: string
    address?: string | null
    teacher_count?: number
    student_count?: number
    book_count?: number
  }
}

export function SchoolDetailsDialog({
  open,
  onOpenChange,
  school,
}: SchoolDetailsDialogProps) {
  // Fetch teachers for this school
  const { data: allTeachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ["publisherTeachers"],
    queryFn: () => PublishersService.listMyTeachers(),
    enabled: open,
  })

  const schoolTeachers = allTeachers.filter((t) => t.school_id === school.id)
  const teacherIds = new Set(schoolTeachers.map((t) => t.id))

  // Fetch all books to create a lookup
  const { data: booksData } = useQuery({
    queryKey: ["allBooks"],
    queryFn: () => booksApi.getBooks({ limit: 1000 }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch book assignments by checking each teacher's assigned books
  const { data: schoolBooks = [], isLoading: loadingBooks } = useQuery({
    queryKey: ["schoolBooks", school.id, Array.from(teacherIds)],
    queryFn: async () => {
      if (schoolTeachers.length === 0) return []

      const books = booksData?.items || []
      if (books.length === 0) return []

      const bookAssignmentMap = new Map()

      // Check each book for assignments to this school's teachers
      await Promise.all(
        books.map(async (book) => {
          try {
            const assignments = await getBookAssignments(book.id)

            // Filter assignments for teachers in this school
            const schoolAssignments = assignments.filter((assignment) =>
              teacherIds.has(assignment.teacher_id || ""),
            )

            if (schoolAssignments.length > 0) {
              bookAssignmentMap.set(book.id, {
                ...book,
                teacherCount: schoolAssignments.length,
                teacherNames: schoolAssignments
                  .map((a) => {
                    const teacher = schoolTeachers.find(
                      (t) => t.id === a.teacher_id,
                    )
                    return teacher?.user_full_name || ""
                  })
                  .filter(Boolean),
              })
            }
          } catch (error) {
            console.error(
              `Error fetching assignments for book ${book.id}:`,
              error,
            )
          }
        }),
      )

      return Array.from(bookAssignmentMap.values())
    },
    enabled: open && !!booksData && schoolTeachers.length > 0,
    retry: 1,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {school.name}
          </DialogTitle>
          <DialogDescription>
            {school.address || "No address available"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {school.teacher_count || 0}
                </p>
                <p className="text-xs text-muted-foreground">Teachers</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <GraduationCap className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {school.student_count || 0}
                </p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <BookOpen className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{school.book_count || 0}</p>
                <p className="text-xs text-muted-foreground">Books</p>
              </div>
            </div>

            <Separator />

            {/* Teachers List */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Teachers ({schoolTeachers.length})
              </h3>
              {loadingTeachers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : schoolTeachers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No teachers assigned to this school
                </p>
              ) : (
                <div className="space-y-2">
                  {schoolTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {teacher.user_full_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {teacher.user_email}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{teacher.books_assigned || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          <span>{teacher.classroom_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Assigned Books */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Assigned Books ({schoolBooks.length})
              </h3>
              {loadingBooks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground ml-2">
                    Checking book assignments...
                  </p>
                </div>
              ) : schoolBooks.length === 0 ? (
                <div className="py-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No books assigned to this school yet
                  </p>
                  {schoolTeachers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ({schoolTeachers.length} teacher
                      {schoolTeachers.length !== 1 ? "s" : ""} in this school)
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {schoolBooks.map((book: any) => (
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
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {book.activity_count}{" "}
                          {book.activity_count === 1
                            ? "activity"
                            : "activities"}
                        </Badge>
                        <Badge variant="secondary">
                          {book.teacherCount}{" "}
                          {book.teacherCount === 1 ? "teacher" : "teachers"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Note about students */}
            {school.student_count && school.student_count > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Students
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This school has {school.student_count} student
                    {school.student_count !== 1 ? "s" : ""} enrolled across all
                    classes.
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
