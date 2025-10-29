import { createFileRoute, Link } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { mockBooks } from "@/lib/mockData"
import { useAssignmentStore } from "@/stores/assignmentStore"

export const Route = createFileRoute("/_layout/teacher/assignments/")({
  component: TeacherAssignmentsPage,
})

function TeacherAssignmentsPage() {
  return (
    <ErrorBoundary>
      <TeacherAssignmentsContent />
    </ErrorBoundary>
  )
}

type AssignmentStatus = "all" | "active" | "completed" | "past-due"
type SortOrder = "asc" | "desc"

function TeacherAssignmentsContent() {
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus>("all")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const assignments = useAssignmentStore((state) => state.assignments)

  // Calculate assignment status based on due date and completion rate
  const getAssignmentStatus = (assignment: typeof assignments[0]): AssignmentStatus => {
    const now = new Date()
    const dueDate = new Date(assignment.due_date)

    if (assignment.completionRate === 100) {
      return "completed"
    } else if (dueDate < now) {
      return "past-due"
    } else {
      return "active"
    }
  }

  // Filter and sort assignments
  const filteredAndSortedAssignments = useMemo(() => {
    let filtered = assignments.filter((assignment) => {
      if (statusFilter === "all") return true
      return getAssignmentStatus(assignment) === statusFilter
    })

    // Sort by due date
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.due_date).getTime()
      const dateB = new Date(b.due_date).getTime()
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA
    })

    return filtered
  }, [assignments, statusFilter, sortOrder, getAssignmentStatus])

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  const getStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            Completed
          </Badge>
        )
      case "active":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            Active
          </Badge>
        )
      case "past-due":
        return (
          <Badge className="bg-red-100 text-red-800">
            Past Due
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Assignments</h1>
        <p className="text-muted-foreground">Manage and track student assignments</p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-4">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AssignmentStatus)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filter by status"
          >
            <option value="all">All Assignments</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="past-due">Past Due</option>
          </select>

          {/* Sort Button */}
          <Button
            variant="outline"
            onClick={toggleSortOrder}
            aria-label={`Sort by due date ${sortOrder === "asc" ? "descending" : "ascending"}`}
          >
            Due Date {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>

        {/* Create Assignment Button */}
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link to="/teacher/books">
            + Create Assignment
          </Link>
        </Button>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-muted-foreground">
        Showing {filteredAndSortedAssignments.length} of {assignments.length} assignments
      </div>

      {/* Assignments Table */}
      {filteredAndSortedAssignments.length === 0 ? (
        <Card className="shadow-neuro p-8 text-center">
          <p className="text-lg text-muted-foreground">
            No assignments found matching your filters.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your filter criteria or create a new assignment.
          </p>
        </Card>
      ) : (
        <Card className="shadow-neuro">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment Name</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedAssignments.map((assignment) => {
                    const book = mockBooks.find((b) => b.id === assignment.bookId)
                    const status = getAssignmentStatus(assignment)
                    const dueDate = new Date(assignment.due_date)

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.name}
                        </TableCell>
                        <TableCell>{book?.title || "Unknown"}</TableCell>
                        <TableCell>
                          <div>
                            {dueDate.toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dueDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={assignment.completionRate}
                                className="w-20"
                              />
                              <span className="text-sm font-medium">
                                {assignment.completionRate}%
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-teal-600 hover:text-teal-700"
                          >
                            <Link
                              to="/teacher/assignments/$assignmentId"
                              params={{ assignmentId: assignment.id }}
                            >
                              View Details
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
