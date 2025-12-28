/**
 * SkipTourDialog Component - Confirmation dialog for skipping the onboarding tour
 *
 * Displayed when user attempts to skip the tour via Escape key or skip button.
 * Confirms the user wants to skip since the tour won't show again.
 */

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

export interface SkipTourDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function SkipTourDialog({
  open,
  onConfirm,
  onCancel,
}: SkipTourDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Skip Tour?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to skip the tour? You won&apos;t see it again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Continue Tour
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Skip</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
