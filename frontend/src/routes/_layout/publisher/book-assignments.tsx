/**
 * Book Assignments Management Page - Story 9.4
 *
 * Allows publishers to view and manage all book assignments to schools/teachers.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Loader2,
  Search,
  Trash2,
  User,
} from "lucide-react"
import { useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useCustomToast from "@/hooks/useCustomToast"
import {
  type BookAssignmentResponse,
  deleteBookAssignment,
  listBookAssignments,
} from "@/services/bookAssignmentsApi"
import { booksApi } from "@/services/booksApi"

export const Route = createFileRoute("/_layout/publisher/book-assignments")({
  component: () => (
    <ErrorBoundary>
      <BookAssignmentsPage />
    </ErrorBoundary>
  ),
})

function BookAssignmentsPage() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // State
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBookId, setSelectedBookId] = useState<string | "all">("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<BookAssignmentResponse | null>(null)

  // Fetch all books for filter dropdown
  const { data: booksData } = useQuery({
    queryKey: ["publisherBooks"],
    queryFn: () => booksApi.getBooks({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  })

  const books = booksData?.items ?? []

  // Fetch book assignments
  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ["bookAssignments", selectedBookId],
    queryFn: () =>
      listBookAssignments({
        bookId: selectedBookId === "all" ? undefined : selectedBookId,
        limit: 500,
      }),
    staleTime: 30000,
  })

  const assignments = assignmentsData?.items ?? []

  // Filter assignments based on search
  const filteredAssignments = assignments.filter((assignment) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      assignment.book_title.toLowerCase().includes(searchLower) ||
      assignment.school_name?.toLowerCase().includes(searchLower) ||
      assignment.teacher_name?.toLowerCase().includes(searchLower) ||
      assignment.teacher_email?.toLowerCase().includes(searchLower)
    )
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (assignmentId: string) => deleteBookAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookAssignments"] })
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Book Assignments</h1>
        <p className="text-muted-foreground">
          Manage which schools and teachers have access to your books
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by book, school, or teacher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Book Filter */}
            <Select
              value={selectedBookId}
              onValueChange={(value: string) => setSelectedBookId(value)}
            >
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filter by book" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Books</SelectItem>
                {books.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Assignments</CardTitle>
            <Badge variant="secondary">
              {filteredAssignments.length} assignment
              {filteredAssignments.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground mb-2">
                {searchTerm || selectedBookId !== "all"
                  ? "No assignments found"
                  : "No book assignments yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchTerm || selectedBookId !== "all"
                  ? "Try adjusting your filters"
                  : "Use the 'Assign' button on books in your library to grant access to schools and teachers"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date Assigned</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.book_title}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {assignment.teacher_id ? (
                          <>
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div>
                                {assignment.teacher_name || "Unknown Teacher"}
                              </div>
                              {assignment.teacher_email && (
                                <div className="text-xs text-muted-foreground">
                                  {assignment.teacher_email}
                                </div>
                              )}
                              {assignment.school_name && (
                                <div className="text-xs text-muted-foreground">
                                  {assignment.school_name}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div>
                                {assignment.school_name || "Unknown School"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                All teachers
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          assignment.teacher_id ? "outline" : "secondary"
                        }
                      >
                        {assignment.teacher_id ? "Individual" : "School-wide"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(assignment.assigned_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(assignment)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Book Assignment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {assignmentToDelete && (
                <>
                  This will revoke access to "{assignmentToDelete.book_title}"
                  for{" "}
                  {assignmentToDelete.teacher_id
                    ? assignmentToDelete.teacher_name || "this teacher"
                    : `all teachers at ${assignmentToDelete.school_name || "this school"}`}
                  .
                  <br />
                  <br />
                  Teachers will no longer be able to see this book or create
                  assignments from it.
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
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Assignment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
