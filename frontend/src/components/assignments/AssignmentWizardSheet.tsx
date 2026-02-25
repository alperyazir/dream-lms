/**
 * AssignmentWizardSheet — iOS-style bottom sheet wrapper for the assignment wizard.
 *
 * Slides up from the bottom covering ~95% of the viewport, with rounded top corners
 * and a drag-handle bar. Close is only possible via the wizard's internal Cancel button.
 */

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { AssignmentWizardContent } from "./AssignmentWizardPage"

export interface AssignmentWizardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  prefilledPublishDate?: string | null
  preSelectedContentId?: string | null
  assignmentId?: string
}

export function AssignmentWizardSheet({
  open,
  onOpenChange,
  mode,
  prefilledPublishDate,
  preSelectedContentId,
  assignmentId,
}: AssignmentWizardSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideCloseButton
        className="h-[95vh] rounded-t-2xl p-0 border-t-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Accessible title (visually hidden) */}
        <SheetTitle className="sr-only">
          {mode === "edit" ? "Edit Assignment" : "Create Assignment"}
        </SheetTitle>

        {/* iOS-style drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Wizard content fills the rest */}
        <div className="flex-1 overflow-hidden h-[calc(95vh-2rem)]">
          <AssignmentWizardContent
            mode={mode}
            prefilledPublishDate={prefilledPublishDate}
            preSelectedContentId={preSelectedContentId}
            assignmentId={assignmentId}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
