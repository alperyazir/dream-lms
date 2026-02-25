/**
 * InlineFeedback - Expandable inline feedback section for the StudentAnswersDialog
 *
 * Allows teachers to score AND leave feedback in one flow.
 */

import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react"
import { useEffect, useState } from "react"
import { LuLoader, LuSave, LuSend } from "react-icons/lu"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { useFeedbackModal } from "@/hooks/useFeedback"
import { isFeedbackPublic } from "@/types/feedback"
import { EmojiPicker } from "@/components/feedback/EmojiPicker"

interface InlineFeedbackProps {
  assignmentId: string
  studentId: string
}

export function InlineFeedback({
  assignmentId,
  studentId,
}: InlineFeedbackProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)

  const {
    feedback,
    isLoading,
    isSaving,
    saveError,
    saveDraft,
    publish,
  } = useFeedbackModal(
    isExpanded ? assignmentId : null,
    isExpanded ? studentId : null,
  )

  // Load existing feedback when expanded
  useEffect(() => {
    if (isExpanded && feedback && isFeedbackPublic(feedback)) {
      setFeedbackText(feedback.feedback_text || "")
      setSelectedEmoji(
        feedback.emoji_reactions && feedback.emoji_reactions.length > 0
          ? feedback.emoji_reactions[0]
          : null,
      )
    }
  }, [isExpanded, feedback])

  const handleSaveDraft = async () => {
    if (!feedbackText.trim()) return
    try {
      await saveDraft(feedbackText, { emoji_reaction: selectedEmoji })
      toast({ title: "Draft Saved", description: "Feedback saved as draft" })
    } catch {
      toast({
        title: "Error",
        description: "Failed to save draft.",
        variant: "destructive",
      })
    }
  }

  const handlePublish = async () => {
    if (!feedbackText.trim()) return
    try {
      await publish(feedbackText, { emoji_reaction: selectedEmoji })
      toast({
        title: "Feedback Published",
        description: "Student has been notified of your feedback",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to publish feedback.",
        variant: "destructive",
      })
    }
  }

  const isDraft = feedback && isFeedbackPublic(feedback) && feedback.is_draft
  const isExisting = feedback && isFeedbackPublic(feedback)
  const maxCharacters = 1000

  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-lg"
      >
        <span className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Feedback
          {isExisting && !isDraft && (
            <span className="text-xs font-normal text-green-600 dark:text-green-400">
              (Published)
            </span>
          )}
          {isDraft && (
            <span className="text-xs font-normal text-yellow-600 dark:text-yellow-400">
              (Draft)
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <Separator />
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <LuLoader className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Textarea
                placeholder="Write your feedback here..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={maxCharacters}
                disabled={isSaving}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {feedbackText.length}/{maxCharacters}
                </span>
                {isDraft && (
                  <span className="text-yellow-600">Saved as draft</span>
                )}
              </div>

              <EmojiPicker
                selectedEmoji={selectedEmoji}
                onEmojiChange={setSelectedEmoji}
                disabled={isSaving}
              />

              {saveError && (
                <p className="text-xs text-red-600">
                  Error: {saveError.message || "Failed to save"}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={isSaving || !feedbackText.trim()}
                >
                  {isSaving ? (
                    <LuLoader className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <LuSave className="mr-1 h-3 w-3" />
                  )}
                  Save Draft
                </Button>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={isSaving || !feedbackText.trim()}
                >
                  {isSaving ? (
                    <LuLoader className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <LuSend className="mr-1 h-3 w-3" />
                  )}
                  Publish
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
