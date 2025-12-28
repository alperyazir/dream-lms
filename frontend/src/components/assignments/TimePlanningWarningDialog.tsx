/**
 * Time Planning Warning Dialog - Story 20.4
 *
 * Warns users when enabling Time Planning will clear already-selected activities.
 * Only shown when activities exist and user tries to enable Time Planning.
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

interface TimePlanningWarningDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  activityCount: number
}

export function TimePlanningWarningDialog({
  open,
  onConfirm,
  onCancel,
  activityCount,
}: TimePlanningWarningDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enable Time Planning?</AlertDialogTitle>
          <AlertDialogDescription>
            You currently have {activityCount} activit
            {activityCount === 1 ? "y" : "ies"} selected.
            <br />
            <br />
            Enabling Time Planning will{" "}
            <strong>remove your selected activities</strong> because Time
            Planning uses a different activity selection method (by time
            sessions).
            <br />
            <br />
            Do you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Keep Activities
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Enable & Clear Activities
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
