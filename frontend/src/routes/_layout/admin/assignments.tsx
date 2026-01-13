import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Eye, Trash2 } from "lucide-react"
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

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading assignments...
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No assignments found
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow key={assignment.id}>
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

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {skip + 1} to {Math.min(skip + limit, data.total)} of{" "}
              {data.total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSkip(Math.max(0, skip - limit))}
                disabled={skip === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setSkip(skip + limit)}
                disabled={skip + limit >= data.total}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

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
