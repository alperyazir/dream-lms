/**
 * Feedback Modal Component
 * Story 6.4: Teacher Feedback on Assignments
 * Story 6.5: Feedback Enhancements (Badges & Emoji Reactions)
 *
 * Modal for teachers to write and submit feedback on student assignments.
 * Supports draft saving, publishing, and badge/emoji functionality.
 */

import { useEffect, useState } from "react"
import { LuLoader, LuSave, LuSend } from "react-icons/lu"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { useFeedbackModal } from "@/hooks/useFeedback"
import { isFeedbackPublic } from "@/types/feedback"
import { EmojiPicker } from "./EmojiPicker"

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  assignmentId: string
  studentId: string
  studentName: string
  assignmentName: string
  score?: number | null
}

export function FeedbackModal({
  isOpen,
  onClose,
  assignmentId,
  studentId,
  studentName,
  assignmentName,
  score,
}: FeedbackModalProps) {
  const [feedbackText, setFeedbackText] = useState("")
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)

  const {
    feedback,
    isLoading,
    isSaving,
    saveError,
    saveDraft,
    publish,
    reset,
  } = useFeedbackModal(isOpen ? assignmentId : null, isOpen ? studentId : null)

  // Load existing feedback when modal opens
  useEffect(() => {
    if (isOpen && feedback && isFeedbackPublic(feedback)) {
      setFeedbackText(feedback.feedback_text || "")
      // emoji_reactions is an array, take first element if exists
      setSelectedEmoji(
        feedback.emoji_reactions && feedback.emoji_reactions.length > 0
          ? feedback.emoji_reactions[0]
          : null,
      )
    } else if (isOpen && !feedback) {
      setFeedbackText("")
      setSelectedEmoji(null)
    }
  }, [isOpen, feedback])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen, reset])

  const handleSaveDraft = async () => {
    if (!feedbackText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some feedback text",
        variant: "destructive",
      })
      return
    }

    try {
      await saveDraft(feedbackText, {
        emoji_reaction: selectedEmoji,
      })
      toast({
        title: "Draft Saved",
        description: "Feedback saved as draft",
      })
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePublish = async () => {
    if (!feedbackText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some feedback text",
        variant: "destructive",
      })
      return
    }

    try {
      await publish(feedbackText, {
        emoji_reaction: selectedEmoji,
      })
      toast({
        title: "Feedback Published",
        description: "Student has been notified of your feedback",
      })
      onClose()
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to publish feedback. Please try again.",
        variant: "destructive",
      })
    }
  }

  const isDraft = feedback && isFeedbackPublic(feedback) && feedback.is_draft
  const isExisting = feedback && isFeedbackPublic(feedback)
  const characterCount = feedbackText.length
  const maxCharacters = 1000

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isExisting ? "Edit Feedback" : "Write Feedback"}
          </DialogTitle>
          <DialogDescription>
            {studentName} - {assignmentName}
            {score !== null && score !== undefined && (
              <span className="ml-2 font-medium">Score: {score}%</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LuLoader className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Feedback Text */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Write your feedback here..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="min-h-[150px] resize-none"
                  maxLength={maxCharacters}
                  disabled={isSaving}
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {characterCount}/{maxCharacters} characters
                  </span>
                  {isDraft && (
                    <span className="text-yellow-600">
                      Currently saved as draft
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              {/* Emoji Reaction (Story 6.5) */}
              <EmojiPicker
                selectedEmoji={selectedEmoji}
                onEmojiChange={setSelectedEmoji}
                disabled={isSaving}
              />

              {saveError && (
                <p className="text-sm text-red-600">
                  Error: {saveError.message || "Failed to save feedback"}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={isSaving || isLoading || !feedbackText.trim()}
          >
            {isSaving ? (
              <LuLoader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LuSave className="mr-2 h-4 w-4" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isSaving || isLoading || !feedbackText.trim()}
          >
            {isSaving ? (
              <LuLoader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LuSend className="mr-2 h-4 w-4" />
            )}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default FeedbackModal
