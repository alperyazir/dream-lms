/**
 * Delete Assignment Confirmation Dialog
 * Story 3.8: Teacher Assignment Management Dashboard
 *
 * Shows confirmation dialog before deleting an assignment.
 * Warns user about consequences (students will lose access).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

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
import { useToast } from "@/hooks/use-toast"
import { deleteAssignment } from "@/services/assignmentsApi"
import type { AssignmentListItem } from "@/types/assignment"

interface DeleteAssignmentDialogProps {
  isOpen: boolean
  onClose: () => void
  assignment: AssignmentListItem | null
}

export function DeleteAssignmentDialog({
  isOpen,
  onClose,
  assignment,
}: DeleteAssignmentDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: string) => deleteAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      })
      onClose()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error?.response?.data?.detail || "Failed to delete assignment",
        variant: "destructive",
      })
    },
  })

  const handleDelete = () => {
    if (assignment) {
      deleteMutation.mutate(assignment.id)
    }
  }

  if (!assignment) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Assignment?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  &quot;{assignment.name}&quot;
                </span>
                ?
              </p>
              <p className="text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone. {assignment.total_students} student
                {assignment.total_students !== 1 ? "s" : ""} will lose access to
                this assignment.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
