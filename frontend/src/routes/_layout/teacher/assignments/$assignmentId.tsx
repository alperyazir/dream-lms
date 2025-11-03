import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  mockActivities,
  mockAssignmentStudents,
  mockAssignments,
  mockBooks,
} from "@/lib/mockData"

export const Route = createFileRoute(
  "/_layout/teacher/assignments/$assignmentId",
)({
  component: AssignmentDetailPage,
})

function AssignmentDetailPage() {
  return (
    <ErrorBoundary>
      <AssignmentDetailContent />
    </ErrorBoundary>
  )
}

type StudentStatus = "all" | "not_started" | "in_progress" | "completed"
type SortBy = "name" | "score" | "completion"

function AssignmentDetailContent() {
  const { assignmentId } = Route.useParams()
  const [statusFilter, setStatusFilter] = useState<StudentStatus>("all")
  const [sortBy, setSortBy] = useState<SortBy>("name")

  // Find assignment
  const assignment = mockAssignments.find((a) => a.id === assignmentId)
  const book = assignment
    ? mockBooks.find((b) => b.id === assignment.bookId)
    : null
  const activity = assignment
    ? mockActivities.find((a) => a.id === assignment.activityId)
    : null

  // Get student submissions for this assignment
  const studentSubmissions = mockAssignmentStudents.filter(
    (s) => s.assignmentId === assignmentId,
  )

  // Filter and sort student submissions
  const filteredAndSortedSubmissions = useMemo(() => {
    let filtered = studentSubmissions.filter((submission) => {
      if (statusFilter === "all") return true
      return submission.status === statusFilter
    })

    // Sort
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.studentName.localeCompare(b.studentName)
        case "score":
          return (b.score || 0) - (a.score || 0)
        case "completion":
          if (!a.completed_at) return 1
          if (!b.completed_at) return -1
          return (
            new Date(b.completed_at).getTime() -
            new Date(a.completed_at).getTime()
          )
        default:
          return 0
      }
    })

    return filtered
  }, [studentSubmissions, statusFilter, sortBy])

  if (!assignment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="shadow-neuro p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Assignment Not Found</h2>
          <p className="text-muted-foreground">
            The assignment you're looking for doesn't exist.
          </p>
        </Card>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case "in_progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
        )
      case "not_started":
        return <Badge className="bg-blue-100 text-blue-800">Not Started</Badge>
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => window.history.back()}
        className="mb-4"
        aria-label="Go back to assignments list"
      >
        ← Back to Assignments
      </Button>

      {/* Assignment Header */}
      <Card className="shadow-neuro mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{assignment.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Book: {book?.title || "Unknown"}</span>
                <span>•</span>
                <span>Activity: {activity?.title || "Unknown"}</span>
              </div>
            </div>
            <Badge className="bg-teal-100 text-teal-800">
              {assignment.completionRate}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-sm font-semibold text-muted-foreground">
                Due Date
              </span>
              <p className="text-base">
                {new Date(assignment.due_date).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(assignment.due_date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {assignment.time_limit_minutes && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  Time Limit
                </span>
                <p className="text-base">
                  {assignment.time_limit_minutes} minutes
                </p>
              </div>
            )}
            <div>
              <span className="text-sm font-semibold text-muted-foreground">
                Created
              </span>
              <p className="text-base">
                {new Date(assignment.created_at).toLocaleDateString()}
              </p>
            </div>
            {assignment.instructions && (
              <div className="md:col-span-2 lg:col-span-4">
                <span className="text-sm font-semibold text-muted-foreground">
                  Instructions
                </span>
                <p className="text-base whitespace-pre-wrap">
                  {assignment.instructions}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Student Completion Table */}
      <div>
        <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
          <h2 className="text-2xl font-bold">Student Progress</h2>

          <div className="flex gap-4">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StudentStatus)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Filter by status"
            >
              <option value="all">All Students</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Sort by"
            >
              <option value="name">Sort by Name</option>
              <option value="score">Sort by Score</option>
              <option value="completion">Sort by Completion</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredAndSortedSubmissions.length} of{" "}
          {studentSubmissions.length} students
        </div>

        {filteredAndSortedSubmissions.length === 0 ? (
          <Card className="shadow-neuro p-8 text-center">
            <p className="text-lg text-muted-foreground">
              No students found matching your filters.
            </p>
          </Card>
        ) : (
          <Card className="shadow-neuro">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Time Spent</TableHead>
                      <TableHead>Started At</TableHead>
                      <TableHead>Completed At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          {submission.studentName}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(submission.status)}
                        </TableCell>
                        <TableCell>
                          {submission.score !== undefined ? (
                            <span className="font-semibold text-green-600">
                              {submission.score}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.time_spent_minutes !== undefined ? (
                            <span>{submission.time_spent_minutes} min</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.started_at ? (
                            <div>
                              {new Date(
                                submission.started_at,
                              ).toLocaleDateString()}
                              <div className="text-xs text-muted-foreground">
                                {new Date(
                                  submission.started_at,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.completed_at ? (
                            <div>
                              {new Date(
                                submission.completed_at,
                              ).toLocaleDateString()}
                              <div className="text-xs text-muted-foreground">
                                {new Date(
                                  submission.completed_at,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="text-teal-600"
                            title="View student work (coming soon)"
                          >
                            View Work
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
