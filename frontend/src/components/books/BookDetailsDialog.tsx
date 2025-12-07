/**
 * Book Details Dialog - Story 9.4
 *
 * Shows book information and assignment management for publishers.
 * Features:
 * - Book cover, title, description, activity count
 * - Assign button to open assignment dialog
 * - List of assigned schools/teachers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BookOpen,
  Building2,
  Loader2,
  Share2,
  Trash2,
  User,
} from "lucide-react"
import { useEffect, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import useCustomToast from "@/hooks/useCustomToast"
import {
  type BookAssignmentResponse,
  deleteBookAssignment,
  getBookAssignments,
} from "@/services/bookAssignmentsApi"
import { getAuthenticatedCoverUrl } from "@/services/booksApi"
import type { Book } from "@/types/book"
import { BookAssignmentDialog } from "./BookAssignmentDialog"

interface BookDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  book: Book
}

export function BookDetailsDialog({
  isOpen,
  onClose,
  book,
}: BookDetailsDialogProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [isLoadingCover, setIsLoadingCover] = useState(true)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<BookAssignmentResponse | null>(null)

  // Fetch cover image
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

    if (isOpen) {
      fetchCover()
    }

    return () => {
      isMounted = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [book.cover_image_url, isOpen])

  // Fetch book assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["bookAssignments", book.id],
    queryFn: () => getBookAssignments(book.id),
    enabled: isOpen,
    staleTime: 30000,
  })

  // Delete assignment mutation
  const deleteMutation = useMutation({
    mutationFn: (assignmentId: string) => deleteBookAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookAssignments", book.id] })
      showSuccessToast("Assignment removed successfully")
      setDeleteDialogOpen(false)
      setAssignmentToDelete(null)
    },
    onError: (error: Error) => {
      showErrorToast(`Failed to remove assignment: ${error.message}`)
    },
  })

  const handleDeleteClick = (assignment: BookAssignmentResponse) => {
    setAssignmentToDelete(assignment)
    setDeleteDialogOpen(true)
  }

  // Group assignments by type
  const schoolAssignments = assignments.filter((a) => !a.teacher_id)
  const teacherAssignments = assignments.filter((a) => a.teacher_id)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Book Details</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Book Info Section */}
            <div className="flex gap-6 mb-6">
              {/* Cover Image */}
              <div className="flex-shrink-0 w-32">
                <div className="relative w-full aspect-[3/4] bg-muted rounded-md overflow-hidden">
                  {isLoadingCover ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <BookOpen className="w-10 h-10 text-gray-400 animate-pulse" />
                    </div>
                  ) : coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={`${book.title} cover`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-teal-200">
                      <BookOpen className="w-10 h-10 text-teal-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Book Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold mb-2">{book.title}</h2>
                <Badge
                  variant="secondary"
                  className="bg-teal-100 text-teal-800 mb-2"
                >
                  {book.publisher_name}
                </Badge>
                {book.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {book.description}
                  </p>
                )}
                <Badge variant="outline">
                  {book.activity_count}{" "}
                  {book.activity_count === 1 ? "activity" : "activities"}
                </Badge>
              </div>
            </div>

            {/* Assign Button */}
            <div className="mb-6">
              <Button
                onClick={() => setAssignDialogOpen(true)}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Assign to Schools / Teachers
              </Button>
            </div>

            {/* Assignments Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Assignments</h3>

              {assignmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Share2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>This book hasn't been assigned yet.</p>
                  <p className="text-sm">
                    Click the button above to assign it.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-4">
                    {/* School Assignments */}
                    {schoolAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {assignment.school_name || "Unknown School"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              All teachers in school
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(assignment)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Teacher Assignments */}
                    {teacherAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {assignment.teacher_name || "Unknown Teacher"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {assignment.teacher_email}
                              {assignment.school_name &&
                                ` • ${assignment.school_name}`}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(assignment)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <BookAssignmentDialog
        isOpen={assignDialogOpen}
        onClose={() => {
          setAssignDialogOpen(false)
          // Refresh assignments after closing
          queryClient.invalidateQueries({
            queryKey: ["bookAssignments", book.id],
          })
        }}
        book={book}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              {assignmentToDelete && (
                <>
                  This will revoke access to "{book.title}" for{" "}
                  {assignmentToDelete.teacher_id
                    ? assignmentToDelete.teacher_name || "this teacher"
                    : `all teachers at ${assignmentToDelete.school_name || "this school"}`}
                  .
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                assignmentToDelete &&
                deleteMutation.mutate(assignmentToDelete.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
