/**
 * Save Actions Component (Story 27.19)
 *
 * Action buttons for saving generated content:
 * - Save to Library
 * - Create Assignment
 */

import { useMutation } from "@tanstack/react-query"
import { BookMarked, ClipboardList } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

import {
  type CreateAssignmentRequest,
  contentReviewApi,
  type SaveToLibraryRequest,
} from "@/services/contentReviewApi"

export interface SaveActionsProps {
  quizId: string
  activityType: string
  defaultTitle?: string
  content?: Record<string, any> | null
  onSaveSuccess?: () => void
  onAssignmentSuccess?: (redirectUrl: string) => void
}

export function SaveActions({
  quizId,
  activityType,
  defaultTitle = "",
  content,
  onSaveSuccess,
  onAssignmentSuccess,
}: SaveActionsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)

  const [saveTitle, setSaveTitle] = useState(defaultTitle)
  const [saveDescription, setSaveDescription] = useState("")
  const [assignmentTitle, setAssignmentTitle] = useState(defaultTitle)
  const [assignmentDescription, setAssignmentDescription] = useState("")

  // Save to library mutation
  const saveToLibraryMutation = useMutation({
    mutationFn: (request: SaveToLibraryRequest) =>
      contentReviewApi.saveToLibrary(request),
    onSuccess: () => {
      toast({
        title: "Content saved!",
        description: "You can now reuse this content in assignments.",
      })
      setShowSaveDialog(false)
      setSaveTitle("")
      setSaveDescription("")
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
      setShowAssignmentDialog(false)
      setAssignmentTitle("")
      setAssignmentDescription("")
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
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => setShowSaveDialog(true)}
          className="flex-1"
        >
          <BookMarked className="mr-2 h-4 w-4" />
          Save to Library
        </Button>
        <Button
          onClick={() => setShowAssignmentDialog(true)}
          className="flex-1"
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          Create Assignment
        </Button>
      </div>

      {/* Save to Library Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
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
              onClick={() => setShowSaveDialog(false)}
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
        onOpenChange={setShowAssignmentDialog}
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
              onClick={() => setShowAssignmentDialog(false)}
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
