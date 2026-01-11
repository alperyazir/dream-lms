/**
 * Save Actions Dialog Component (Story 27.19)
 *
 * Standalone dialogs for saving generated content and creating assignments.
 * Can be triggered from any component without entering edit mode.
 */

import { useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

import {
  type CreateAssignmentRequest,
  contentReviewApi,
  type SaveToLibraryRequest,
} from "@/services/contentReviewApi"

export interface SaveActionsDialogProps {
  quizId: string
  activityType: string
  defaultTitle?: string
  content?: Record<string, any> | null
  showSaveDialog: boolean
  showAssignmentDialog: boolean
  onSaveDialogChange: (open: boolean) => void
  onAssignmentDialogChange: (open: boolean) => void
  onSaveSuccess?: () => void
  onAssignmentSuccess?: (redirectUrl: string) => void
}

export function SaveActionsDialog({
  quizId,
  activityType,
  defaultTitle = "",
  content,
  showSaveDialog,
  showAssignmentDialog,
  onSaveDialogChange,
  onAssignmentDialogChange,
  onSaveSuccess,
  onAssignmentSuccess,
}: SaveActionsDialogProps) {
  const [saveTitle, setSaveTitle] = useState(defaultTitle)
  const [saveDescription, setSaveDescription] = useState("")
  const [assignmentTitle, setAssignmentTitle] = useState(defaultTitle)
  const [assignmentDescription, setAssignmentDescription] = useState("")

  // Reset form when dialog opens
  useEffect(() => {
    if (showSaveDialog) {
      setSaveTitle(defaultTitle)
      setSaveDescription("")
    }
  }, [showSaveDialog, defaultTitle])

  useEffect(() => {
    if (showAssignmentDialog) {
      setAssignmentTitle(defaultTitle)
      setAssignmentDescription("")
    }
  }, [showAssignmentDialog, defaultTitle])

  // Save to library mutation
  const saveToLibraryMutation = useMutation({
    mutationFn: (request: SaveToLibraryRequest) =>
      contentReviewApi.saveToLibrary(request),
    onSuccess: () => {
      toast({
        title: "Content saved!",
        description: "You can now reuse this content in assignments.",
      })
      onSaveDialogChange(false)
      onSaveSuccess?.()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.detail || "Failed to save content to library",
        variant: "destructive",
      })
    },
  })

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: (request: CreateAssignmentRequest) =>
      contentReviewApi.createAssignment(request),
    onSuccess: (data) => {
      toast({
        title: "Assignment created!",
        description: "Redirecting to assignment wizard...",
      })
      onAssignmentDialogChange(false)
      onAssignmentSuccess?.(data.redirect_url)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.detail || "Failed to create assignment",
        variant: "destructive",
      })
    },
  })

  const handleSaveToLibrary = () => {
    if (!saveTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive",
      })
      return
    }

    saveToLibraryMutation.mutate({
      quiz_id: quizId,
      activity_type: activityType,
      title: saveTitle,
      description: saveDescription || null,
      content: content || null,
    })
  }

  const handleCreateAssignment = () => {
    if (!assignmentTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive",
      })
      return
    }

    createAssignmentMutation.mutate({
      quiz_id: quizId,
      activity_type: activityType,
      title: assignmentTitle,
      description: assignmentDescription || null,
    })
  }

  return (
    <>
      {/* Save to Library Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={onSaveDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to Library</DialogTitle>
            <DialogDescription>
              Save this content to your library for future use in assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-title">Title *</Label>
              <Input
                id="save-title"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="Enter a title for this content"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="save-description">Description (optional)</Label>
              <Textarea
                id="save-description"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="Add a description to help you remember this content"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onSaveDialogChange(false)}
              disabled={saveToLibraryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveToLibrary}
              disabled={saveToLibraryMutation.isPending}
            >
              {saveToLibraryMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Assignment Dialog */}
      <Dialog
        open={showAssignmentDialog}
        onOpenChange={onAssignmentDialogChange}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
            <DialogDescription>
              Create an assignment from this content. You'll be redirected to
              the assignment wizard to complete the setup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assignment-title">Title *</Label>
              <Input
                id="assignment-title"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                placeholder="Enter a title for this assignment"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-description">
                Description (optional)
              </Label>
              <Textarea
                id="assignment-description"
                value={assignmentDescription}
                onChange={(e) => setAssignmentDescription(e.target.value)}
                placeholder="Add a description for this assignment"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onAssignmentDialogChange(false)}
              disabled={createAssignmentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAssignment}
              disabled={createAssignmentMutation.isPending}
            >
              {createAssignmentMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
