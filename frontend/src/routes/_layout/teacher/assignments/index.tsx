import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { BookOpen, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { FiClipboard } from "react-icons/fi"
import {
  AssignmentFilters,
  type AssignmentFiltersState,
} from "@/components/assignments/AssignmentFilters"
import { AssignmentTableView } from "@/components/assignments/AssignmentTableView"
import { AssignmentWizardSheet } from "@/components/assignments/AssignmentWizardSheet"
import { DeleteAssignmentDialog } from "@/components/assignments/DeleteAssignmentDialog"
import { TeacherAssignmentCard } from "@/components/assignments/TeacherAssignmentCard"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ViewModeToggle } from "@/components/ui/view-mode-toggle"
import { useViewPreference } from "@/hooks/useViewPreference"
import useCustomToast from "@/hooks/useCustomToast"
import { deleteAssignment, getAssignments } from "@/services/assignmentsApi"
import { getMyClasses } from "@/services/teachersApi"
import type { AssignmentListItem } from "@/types/assignment"
import type { Class } from "@/types/teacher"

export const Route = createFileRoute("/_layout/teacher/assignments/")({
  component: TeacherAssignmentsPage,
})

function TeacherAssignmentsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [viewMode, setViewMode] = useViewPreference(
    "teacher-assignments",
    "grid",
  )
  const [deletingAssignment, setDeletingAssignment] =
    useState<AssignmentListItem | null>(null)
  const [filters, setFilters] = useState<AssignmentFiltersState>({})
  const [sortBy, setSortBy] = useState<"due_date">("due_date")
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [wizardMode, setWizardMode] = useState<"create" | "edit">("create")
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const PAGE_SIZE = 20
  const [currentPage, setCurrentPage] = useState(1)
  const skip = (currentPage - 1) * PAGE_SIZE

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
  }, [filters])

  const {
    data: assignmentsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["assignments", skip, PAGE_SIZE],
    queryFn: () => getAssignments({ limit: PAGE_SIZE, offset: skip }),
  })

  // Client-side filtering on the current page (search/status)
  const assignments = useMemo(() => {
    const items = assignmentsResponse?.items ?? []
    let filtered = items

    if (filters.search) {
      filtered = filtered.filter((a) =>
        a.name.toLowerCase().includes(filters.search!.toLowerCase()),
      )
    }

    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter((a) => a.status === filters.status)
    }

    return filtered
  }, [assignmentsResponse, filters])

  const totalAssignments = assignmentsResponse?.total ?? 0
  const totalPages = Math.ceil(totalAssignments / PAGE_SIZE)
  const paginatedAssignments = assignments

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["my-classes"],
    queryFn: getMyClasses,
  })

  const handleCreateAssignment = () => {
    setWizardMode("create")
    setEditingAssignmentId(null)
    setIsWizardOpen(true)
  }

  const handleEdit = (assignment: AssignmentListItem) => {
    setWizardMode("edit")
    setEditingAssignmentId(assignment.id)
    setIsWizardOpen(true)
  }

  const handleView = (assignment: AssignmentListItem) => {
    navigate({
      to: "/teacher/assignments/$assignmentId",
      params: { assignmentId: assignment.id },
    })
  }

  const handleDelete = (assignment: AssignmentListItem) => {
    setDeletingAssignment(assignment)
  }

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteAssignment(id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      setSelectedIds(new Set())
      setIsBulkDeleteDialogOpen(false)
      showSuccessToast("Selected assignments deleted successfully!")
    },
    onError: () => {
      showErrorToast("Failed to delete some assignments. Please try again.")
    },
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedAssignments.map((a) => a.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkDelete = () => {
    if (selectedIds.size > 0) {
      setIsBulkDeleteDialogOpen(true)
    }
  }

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedIds))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 dark:border-teal-400 mx-auto mb-4" />
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
    <PageContainer>
      <PageHeader
        icon={FiClipboard}
        title="My Assignments"
        description="View and manage all your assignments"
      >
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
        <Button
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
          onClick={handleCreateAssignment}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Assignment
        </Button>
      </PageHeader>

      {totalAssignments > 0 && (
        <AssignmentFilters
          filters={filters}
          onChange={setFilters}
          classes={classes || []}
          resultCount={assignments.length}
          totalCount={totalAssignments}
        />
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
          <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
            {selectedIds.size} assignment(s) selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete Selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {totalAssignments === 0 ? (
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
              className="mt-6 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
              onClick={handleCreateAssignment}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Assignment
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paginatedAssignments.map((assignment) => (
            <div key={assignment.id} className="relative">
              <div className="absolute top-3 left-3 z-10">
                <Checkbox
                  checked={selectedIds.has(assignment.id)}
                  onCheckedChange={(checked) =>
                    handleSelect(assignment.id, checked as boolean)
                  }
                  aria-label={`Select ${assignment.name}`}
                />
              </div>
              <TeacherAssignmentCard
                assignment={assignment}
                onView={() => handleView(assignment)}
                onEdit={() => handleEdit(assignment)}
                onDelete={() => handleDelete(assignment)}
              />
            </div>
          ))}
        </div>
      ) : (
        <AssignmentTableView
          assignments={paginatedAssignments}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          sortBy={sortBy}
          onSort={(column) => setSortBy(column as "due_date")}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
        />
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, totalAssignments)} of{" "}
            {totalAssignments} assignments
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Assignment Dialog */}
      <DeleteAssignmentDialog
        isOpen={!!deletingAssignment}
        onClose={() => setDeletingAssignment(null)}
        assignment={deletingAssignment}
      />

      {/* Assignment Wizard Sheet */}
      <AssignmentWizardSheet
        open={isWizardOpen}
        onOpenChange={(open) => {
          setIsWizardOpen(open)
          if (!open) {
            setEditingAssignmentId(null)
            setWizardMode("create")
          }
        }}
        mode={wizardMode}
        assignmentId={editingAssignmentId ?? undefined}
      />
      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Selected Assignments</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} selected
              assignment(s)? This will also remove all student submissions.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              disabled={bulkDeleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? "Deleting..."
                : `Delete ${selectedIds.size} Assignment(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
