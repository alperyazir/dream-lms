import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Eye, Trash2, X } from "lucide-react"
import { useState } from "react"
import { FiClipboard } from "react-icons/fi"
import { AdminService } from "@/client"
import type {
  AssignmentListResponse,
  AssignmentWithTeacher,
} from "@/client/types.gen"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
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
import { Checkbox } from "@/components/ui/checkbox"
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
import { toast } from "@/hooks/use-toast"

export const Route = createFileRoute("/_layout/admin/assignments")({
  component: () => (
    <ErrorBoundary>
      <AdminAssignmentsPage />
    </ErrorBoundary>
  ),
})

interface AssignmentFilters {
  teacher_id?: string
  status?: string
  search?: string
}

function AdminAssignmentsPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<AssignmentFilters>({})
  const [skip, setSkip] = useState(0)
  const limit = 50

  // Selection + bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)

  // Delete assignment state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<AssignmentWithTeacher | null>(null)

  // Fetch teachers for filter dropdown (Story 20.1: AC 6)
  const { data: teachersData } = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: async () => {
      const response = await AdminService.listTeachers({ limit: 1000 })
      return response
    },
  })

  // Fetch assignments
  const { data, isLoading } = useQuery<AssignmentListResponse>({
    queryKey: ["admin-assignments", filters, skip, limit],
    queryFn: async () => {
      const response = await AdminService.listAllAssignments({
        skip,
        limit,
        teacherId: filters.teacher_id,
        status: filters.status,
        search: filters.search,
      })
      return response as AssignmentListResponse
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      AdminService.deleteAssignment({ assignmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] })
      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      })
      setDeleteDialogOpen(false)
      setAssignmentToDelete(null)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      })
    },
  })

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(
        ids.map((id) => AdminService.deleteAssignment({ assignmentId: id })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] })
      const count = selectedIds.size
      setSelectedIds(new Set())
      setIsBulkDeleteDialogOpen(false)
      toast({
        title: "Success",
        description: `Successfully deleted ${count} assignment(s)`,
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete some assignments",
        variant: "destructive",
      })
    },
  })

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedIds(new Set(data.items.map((a) => a.id)))
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

  const handleDelete = (assignment: AssignmentWithTeacher) => {
    setAssignmentToDelete(assignment)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (assignmentToDelete) {
      deleteMutation.mutate(assignmentToDelete.id)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      published: { label: "Active", className: "bg-green-500" },
      draft: { label: "Draft", className: "bg-gray-500" },
      scheduled: { label: "Scheduled", className: "bg-blue-500" },
    }
    const config = variants[status] || {
      label: status,
      className: "bg-gray-500",
    }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No due date"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <PageContainer>
      <PageHeader
        icon={FiClipboard}
        title="All Assignments"
        description="View and manage all assignments across teachers"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by title..."
          value={filters.search || ""}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-64"
        />

        <Select
          value={filters.status || "all"}
          onValueChange={(v) =>
            setFilters({
              ...filters,
              status: v === "all" ? undefined : v,
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
          </SelectContent>
        </Select>

        {/* Story 20.1: AC 6 - Teacher filter */}
        <Select
          value={filters.teacher_id || "all"}
          onValueChange={(v) =>
            setFilters({
              ...filters,
              teacher_id: v === "all" ? undefined : v,
            })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Teachers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teachers</SelectItem>
            {teachersData?.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.user_full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filters.search || filters.status || filters.teacher_id) && (
          <Button variant="ghost" onClick={() => setFilters({})}>
            Clear
          </Button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
              {selectedIds.size} assignment(s) selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-teal-600 hover:text-teal-700 hover:bg-teal-100 dark:hover:bg-teal-800"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Assignments Table */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FiClipboard className="w-5 h-5 text-teal-500" />
            All Assignments ({data?.total ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading assignments...
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No assignments found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        data !== undefined &&
                        data.items.length > 0 &&
                        data.items.every((a) => selectedIds.has(a.id))
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((assignment) => (
                  <TableRow
                    key={assignment.id}
                    className={
                      selectedIds.has(assignment.id)
                        ? "bg-teal-50 dark:bg-teal-900/20"
                        : ""
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(assignment.id)}
                        onCheckedChange={(checked) =>
                          handleSelect(assignment.id, checked as boolean)
                        }
                        aria-label={`Select ${assignment.title}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {assignment.title}
                    </TableCell>
                    <TableCell>{assignment.teacher_name}</TableCell>
                    <TableCell>
                      {assignment.recipient_count} students (
                      {assignment.completed_count} completed)
                    </TableCell>
                    <TableCell>{formatDate(assignment.due_date)}</TableCell>
                    <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(assignment)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {skip + 1} to {Math.min(skip + limit, data.total)} of{" "}
            {data.total}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSkip(Math.max(0, skip - limit))
                setSelectedIds(new Set())
              }}
              disabled={skip === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {Math.floor(skip / limit) + 1} of{" "}
              {Math.ceil(data.total / limit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSkip(skip + limit)
                setSelectedIds(new Set())
              }}
              disabled={skip + limit >= data.total}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Assignments</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected
              assignment(s)?
              <br />
              <br />
              This will permanently remove the assignments and all student
              submissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending
                ? "Deleting..."
                : `Delete ${selectedIds.size} Assignment(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{assignmentToDelete?.title}"?
              <br />
              <br />
              This will permanently remove the assignment and all student
              submissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Assignment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
