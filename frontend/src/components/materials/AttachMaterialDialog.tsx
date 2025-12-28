/**
 * AttachMaterialDialog Component
 * Story 21.3: Upload Materials in Resources Context
 *
 * Dialog for quickly attaching a newly uploaded material to an assignment.
 * Shows after material upload when in assignment context.
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
import useCustomToast from "@/hooks/useCustomToast"
import { assignmentsApi } from "@/services/assignmentsApi"
import type { Material } from "@/types/material"

export interface AttachMaterialDialogProps {
  material: Material
  assignmentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AttachMaterialDialog({
  material,
  assignmentId,
  open,
  onOpenChange,
}: AttachMaterialDialogProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const attachMutation = useMutation({
    mutationFn: () => assignmentsApi.attachMaterial(assignmentId, material.id),
    onSuccess: () => {
      showSuccessToast("Material attached to assignment")
      queryClient.invalidateQueries({ queryKey: ["assignment", assignmentId] })
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail || "Failed to attach material"
      showErrorToast(message)
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Attach to Assignment?</AlertDialogTitle>
          <AlertDialogDescription>
            Would you like to attach "{material.name}" to this assignment?
            Students will be able to access it as a resource.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not Now</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => attachMutation.mutate()}
            disabled={attachMutation.isPending}
          >
            {attachMutation.isPending ? "Attaching..." : "Attach"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

AttachMaterialDialog.displayName = "AttachMaterialDialog"
