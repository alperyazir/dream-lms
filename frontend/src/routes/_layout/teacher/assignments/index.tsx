import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { BookOpen, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { AssignmentCreationDialog } from "@/components/assignments/AssignmentCreationDialog"
import {
  AssignmentFilters,
  type AssignmentFiltersState,
} from "@/components/assignments/AssignmentFilters"
import { AssignmentTableView } from "@/components/assignments/AssignmentTableView"
import { DeleteAssignmentDialog } from "@/components/assignments/DeleteAssignmentDialog"
import { TeacherAssignmentCard } from "@/components/assignments/TeacherAssignmentCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ViewModeToggle } from "@/components/ui/view-mode-toggle"
import { useViewPreference } from "@/hooks/useViewPreference"
import { getAssignmentForEdit, getAssignments } from "@/services/assignmentsApi"
import { getMyClasses } from "@/services/teachersApi"
import type {
  AssignmentForEditResponse,
  AssignmentListItem,
} from "@/types/assignment"
import type { Class } from "@/types/teacher"

export const Route = createFileRoute("/_layout/teacher/assignments/")({
  component: TeacherAssignmentsPage,
})

function TeacherAssignmentsPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useViewPreference(
    "teacher-assignments",
    "grid",
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] =
    useState<AssignmentForEditResponse | null>(null) // Story 20.2: Use for-edit response
  const [deletingAssignment, setDeletingAssignment] =
    useState<AssignmentListItem | null>(null)
  const [filters, setFilters] = useState<AssignmentFiltersState>({})
  const [sortBy, setSortBy] = useState<"due_date">("due_date")

  const {
    data: assignments,
    isLoading,
    error,
  } = useQuery<AssignmentListItem[]>({
    queryKey: ["assignments"],
    queryFn: getAssignments,
  })

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["my-classes"],
    queryFn: getMyClasses,
  })

  // Filtering and sorting logic
  const filteredAndSortedAssignments = useMemo(() => {
    if (!assignments) return []

    let filtered = [...assignments]

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter((assignment) =>
        assignment.name.toLowerCase().includes(filters.search!.toLowerCase()),
      )
    }

    // Apply class filter
    if (filters.class_id) {
      // Note: We'll need to enhance AssignmentListItem to include class_ids
      // For now, this is a placeholder for the filter logic
      // filtered = filtered.filter(a => a.class_ids?.includes(filters.class_id!))
    }

    // Apply status filter
    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter(
        (assignment) => assignment.status === filters.status,
      )
    }

    // Sort by due date
    filtered.sort((a, b) => {
      const aDate = a.due_date ? new Date(a.due_date).getTime() : 0
      const bDate = b.due_date ? new Date(b.due_date).getTime() : 0
      return bDate - aDate // Descending order
    })

    return filtered
  }, [assignments, filters])

  const handleCreateAssignment = () => {
    setIsDialogOpen(true)
  }

  const handleView = (assignment: AssignmentListItem) => {
    navigate({
      to: "/teacher/assignments/$assignmentId",
      params: { assignmentId: assignment.id },
    })
  }

  const handleEdit = async (assignment: AssignmentListItem) => {
    try {
      // Story 20.2 CRITICAL FIX: Use for-edit endpoint to get recipients
      const fullAssignment = await getAssignmentForEdit(assignment.id)
      setEditingAssignment(fullAssignment)
    } catch (error) {
      console.error("Failed to fetch assignment for editing:", error)
    }
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
        <div className="flex items-center gap-4">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button
            onClick={handleCreateAssignment}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Assignment
          </Button>
        </div>
      </div>

      {assignments && assignments.length > 0 && (
        <AssignmentFilters
          filters={filters}
          onChange={setFilters}
          classes={classes || []}
          resultCount={filteredAndSortedAssignments.length}
          totalCount={assignments.length}
        />
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
      ) : viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedAssignments.map((assignment) => (
            <TeacherAssignmentCard
              key={assignment.id}
              assignment={assignment}
              onView={() => handleView(assignment)}
              onEdit={() => handleEdit(assignment)}
              onDelete={() => handleDelete(assignment)}
            />
          ))}
        </div>
      ) : (
        <AssignmentTableView
          assignments={filteredAndSortedAssignments}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          sortBy={sortBy}
          onSort={(column) => setSortBy(column as "due_date")}
        />
      )}

      {/* Story 20.2: Unified Creation/Edit Dialog */}
      <AssignmentCreationDialog
        isOpen={isDialogOpen || !!editingAssignment}
        onClose={() => {
          setIsDialogOpen(false)
          setEditingAssignment(null)
        }}
        mode={editingAssignment ? "edit" : "create"}
        existingAssignment={editingAssignment || undefined}
      />

      {/* Delete Assignment Dialog */}
      <DeleteAssignmentDialog
        isOpen={!!deletingAssignment}
        onClose={() => setDeletingAssignment(null)}
        assignment={deletingAssignment}
      />
    </div>
  )
}
