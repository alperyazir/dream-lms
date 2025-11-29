import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  MoreVertical,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react"
import { useMemo, useState } from "react"
import { AssignmentCreationDialog } from "@/components/assignments/AssignmentCreationDialog"
import { DeleteAssignmentDialog } from "@/components/assignments/DeleteAssignmentDialog"
import { EditAssignmentDialog } from "@/components/assignments/EditAssignmentDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAssignments } from "@/services/assignmentsApi"
import type { AssignmentListItem } from "@/types/assignment"

export const Route = createFileRoute("/_layout/teacher/assignments/")({
  component: TeacherAssignmentsPage,
})

function TeacherAssignmentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] =
    useState<AssignmentListItem | null>(null)
  const [deletingAssignment, setDeletingAssignment] =
    useState<AssignmentListItem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"created_at" | "due_date" | "name">(
    "created_at",
  )
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const {
    data: assignments,
    isLoading,
    error,
  } = useQuery<AssignmentListItem[]>({
    queryKey: ["assignments"],
    queryFn: getAssignments,
  })

  // Sorting and filtering logic
  const sortedAndFilteredAssignments = useMemo(() => {
    if (!assignments) return []

    // Filter by search query
    let filtered = assignments.filter((assignment) =>
      assignment.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let compareValue = 0

      switch (sortBy) {
        case "name":
          compareValue = a.name.localeCompare(b.name)
          break
        case "due_date": {
          const aDate = a.due_date ? new Date(a.due_date).getTime() : 0
          const bDate = b.due_date ? new Date(b.due_date).getTime() : 0
          compareValue = aDate - bDate
          break
        }
        default:
          compareValue =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }

      return sortOrder === "asc" ? compareValue : -compareValue
    })

    return filtered
  }, [assignments, searchQuery, sortBy, sortOrder])

  const handleCreateAssignment = () => {
    setIsDialogOpen(true)
  }

  const handleEdit = (assignment: AssignmentListItem) => {
    setEditingAssignment(assignment)
  }

  const handleDelete = (assignment: AssignmentListItem) => {
    setDeletingAssignment(assignment)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">
            Loading assignments...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">
            Error loading assignments
          </p>
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Assignments
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            View and manage all your assignments
          </p>
        </div>
        <Button
          onClick={handleCreateAssignment}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {/* Search and Sort Controls */}
      {assignments && assignments.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">
              Search assignments
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Sort By */}
          <div className="w-full sm:w-48">
            <Label htmlFor="sortBy" className="sr-only">
              Sort by
            </Label>
            <Select
              value={sortBy}
              onValueChange={(value: "created_at" | "due_date" | "name") => setSortBy(value)}
            >
              <SelectTrigger id="sortBy">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Created Date</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="w-full sm:w-auto"
          >
            {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
          </Button>
        </div>
      )}

      {/* Result Count */}
      {assignments && assignments.length > 0 && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {sortedAndFilteredAssignments.length} of {assignments.length}{" "}
          assignment{assignments.length !== 1 ? "s" : ""}
        </div>
      )}

      {!assignments || assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No assignments yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-center max-w-md">
              You haven't created any assignments yet. Create your first
              assignment to get started.
            </p>
            <Button
              onClick={handleCreateAssignment}
              className="mt-6 bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
          {sortedAndFilteredAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Assignment Creation Dialog */}
      <AssignmentCreationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />

      {/* Edit Assignment Dialog */}
      {editingAssignment && (
        <EditAssignmentDialog
          isOpen={!!editingAssignment}
          onClose={() => setEditingAssignment(null)}
          assignment={editingAssignment}
        />
      )}

      {/* Delete Assignment Dialog */}
      <DeleteAssignmentDialog
        isOpen={!!deletingAssignment}
        onClose={() => setDeletingAssignment(null)}
        assignment={deletingAssignment}
      />
    </div>
  )
}

interface AssignmentCardProps {
  assignment: AssignmentListItem
  onEdit: (assignment: AssignmentListItem) => void
  onDelete: (assignment: AssignmentListItem) => void
}

function AssignmentCard({ assignment, onEdit, onDelete }: AssignmentCardProps) {
  const navigate = useNavigate()
  const completionRate =
    assignment.total_students > 0
      ? Math.round((assignment.completed / assignment.total_students) * 100)
      : 0

  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null
  const isOverdue = dueDate && dueDate < new Date()

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <CardTitle className="text-lg line-clamp-2 flex-1">
            {assignment.name}
          </CardTitle>
          <div className="flex items-center gap-2 ml-2">
            {isOverdue && <Badge variant="destructive">Overdue</Badge>}
            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(assignment)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(assignment)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardDescription className="space-y-1 text-gray-600 dark:text-gray-300">
          <div className="flex items-center text-sm">
            <BookOpen className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">{assignment.book_title}</span>
          </div>
          <div className="flex items-center text-sm">
            <span className="font-medium mr-1.5">Activity:</span>
            <span className="truncate">{assignment.activity_title}</span>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Due Date */}
        {dueDate && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Due {formatDistanceToNow(dueDate, { addSuffix: true })}</span>
          </div>
        )}

        {/* Time Limit */}
        {assignment.time_limit_minutes && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{assignment.time_limit_minutes} minutes</span>
          </div>
        )}

        {/* Student Count */}
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <Users className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{assignment.total_students} students</span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Progress</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              {completionRate}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-600 dark:bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="flex items-center mb-1">
              <Clock className="w-3 h-3 mr-1 text-gray-500 dark:text-gray-400" />
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {assignment.not_started}
              </span>
            </div>
            <span className="text-gray-600 dark:text-gray-300">
              Not Started
            </span>
          </div>
          <div className="flex flex-col items-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
            <div className="flex items-center mb-1">
              <PlayCircle className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {assignment.in_progress}
              </span>
            </div>
            <span className="text-blue-600 dark:text-blue-400">
              In Progress
            </span>
          </div>
          <div className="flex flex-col items-center p-2 bg-green-50 dark:bg-green-900/30 rounded">
            <div className="flex items-center mb-1">
              <CheckCircle className="w-3 h-3 mr-1 text-green-600 dark:text-green-400" />
              <span className="font-semibold text-green-600 dark:text-green-400">
                {assignment.completed}
              </span>
            </div>
            <span className="text-green-600 dark:text-green-400">
              Completed
            </span>
          </div>
        </div>

        {/* Created Date */}
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t dark:border-gray-700">
          Created{" "}
          {formatDistanceToNow(new Date(assignment.created_at), {
            addSuffix: true,
          })}
        </div>

        {/* View Button */}
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700"
          onClick={() =>
            navigate({
              to: "/teacher/assignments/$assignmentId",
              params: { assignmentId: assignment.id },
            })
          }
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  )
}
