/**
 * AddToAssignmentModal - Add content to new or existing assignment
 * Story 27.21: Content Library UI - Task 8
 *
 * Allows teacher to create new assignment or add to existing draft.
 */

import { useNavigate } from "@tanstack/react-router"
import { FileEdit, PlusCircle } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { ContentItem } from "@/types/content-library"

interface AddToAssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: ContentItem | null
}

export function AddToAssignmentModal({
  open,
  onOpenChange,
  content,
}: AddToAssignmentModalProps) {
  const [option, setOption] = useState<"new" | "existing">("new")
  const navigate = useNavigate()

  if (!content) return null

  const handleConfirm = () => {
    if (option === "new") {
      // Navigate to new assignment creation with content pre-selected
      // The assignment creation page should handle query params for pre-selected content
      navigate({
        to: "/teacher/assignments/new",
        search: {
          content_id: content.id,
          activity_type: content.activity_type,
        },
      })
    } else {
      // Navigate to assignment list filtered by drafts
      // Teacher can then select which draft to add content to
      navigate({
        to: "/teacher/assignments",
        search: {
          status: "draft",
          add_content_id: content.id,
        },
      })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Assignment</DialogTitle>
          <DialogDescription>
            Choose how you want to use "{content.title}"
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={option}
          onValueChange={(v) => setOption(v as "new" | "existing")}
        >
          <div className="space-y-4">
            <div className="flex items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent">
              <RadioGroupItem value="new" id="new" />
              <Label
                htmlFor="new"
                className="flex flex-1 cursor-pointer flex-col gap-1"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  <span className="font-medium">Create New Assignment</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Start a new assignment with this content
                </span>
              </Label>
            </div>

            <div className="flex items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent">
              <RadioGroupItem value="existing" id="existing" />
              <Label
                htmlFor="existing"
                className="flex flex-1 cursor-pointer flex-col gap-1"
              >
                <div className="flex items-center gap-2">
                  <FileEdit className="h-4 w-4" />
                  <span className="font-medium">Add to Existing Draft</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Add this content to a draft assignment
                </span>
              </Label>
            </div>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
