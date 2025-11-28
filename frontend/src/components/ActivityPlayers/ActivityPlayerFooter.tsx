/**
 * Activity Player Footer Component
 * Story 4.1: Activity Player Framework & Layout
 *
 * Action buttons for submit, save, and exit
 */

import { useState } from "react"
import { Button } from "../ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"

interface ActivityPlayerFooterProps {
  onSubmit: () => void
  onExit: () => void
  submitDisabled?: boolean
  saveDisabled?: boolean
  hasUnsavedChanges?: boolean
}

export function ActivityPlayerFooter({
  onSubmit,
  onExit,
  submitDisabled = true,
  saveDisabled = true,
  hasUnsavedChanges = false,
}: ActivityPlayerFooterProps) {
  const [showExitDialog, setShowExitDialog] = useState(false)

  const handleExit = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true)
    } else {
      onExit()
    }
  }

  const confirmExit = () => {
    setShowExitDialog(false)
    onExit()
  }

  return (
    <>
      <div className="border-t bg-background p-4">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3">
          {/* Save Progress Button - for Story 4.8 */}
          <Button
            variant="outline"
            onClick={() => {
              /* TODO: Implement save progress */
            }}
            disabled={saveDisabled}
          >
            Save Progress
          </Button>

          {/* Exit Button */}
          <Button variant="outline" onClick={handleExit}>
            Exit
          </Button>

          {/* Submit Button */}
          <Button onClick={onSubmit} disabled={submitDisabled}>
            Submit
          </Button>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Activity?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you exit now, your progress will be
              lost. Are you sure you want to exit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>
              Exit Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
