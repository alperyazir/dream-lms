/**
 * Activity Preview Modal - Story 9.7
 *
 * Modal component for previewing a single activity.
 * Used by teachers/publishers to test an activity before adding to assignments.
 */

import { X } from "lucide-react"
import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ActivityConfig } from "@/lib/mockData"
import type { ActivityPreviewResponse } from "@/types/assignment"
import { ActivityPlayer } from "../ActivityPlayers/ActivityPlayer"

interface ActivityPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  activity: ActivityPreviewResponse | null
}

/**
 * Normalize activity type string to player format
 */
function normalizeActivityType(
  type: string,
):
  | "dragdroppicture"
  | "dragdroppicturegroup"
  | "matchTheWords"
  | "circle"
  | "markwithx"
  | "puzzleFindWords" {
  const typeMap: Record<string, string> = {
    dragdroppicture: "dragdroppicture",
    dragdroppicturegroup: "dragdroppicturegroup",
    matchthewords: "matchTheWords",
    match_the_words: "matchTheWords",
    matchTheWords: "matchTheWords",
    circle: "circle",
    markwithx: "markwithx",
    puzzlefindwords: "puzzleFindWords",
    puzzleFindWords: "puzzleFindWords",
  }
  return (typeMap[type.toLowerCase()] || type) as ReturnType<
    typeof normalizeActivityType
  >
}

export function ActivityPreviewModal({
  isOpen,
  onClose,
  activity,
}: ActivityPreviewModalProps) {
  const [score, setScore] = useState<number | null>(null)

  const handleActivityComplete = useCallback(
    (activityScore: number, _answersJson: Record<string, unknown>) => {
      setScore(activityScore)
    },
    [],
  )

  const handleClose = useCallback(() => {
    setScore(null)
    onClose()
  }, [onClose])

  if (!activity) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-semibold">
                Activity Preview
              </DialogTitle>
              <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                Preview Mode
              </span>
            </div>
            <div className="flex items-center gap-4">
              {score !== null && (
                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                  Score: {Math.round(score)}%
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {activity.activity_title && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {activity.activity_title}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <ActivityPlayer
            activityConfig={activity.config_json as unknown as ActivityConfig}
            assignmentId="preview" // Dummy ID for preview
            bookId={activity.book_id}
            bookName={activity.book_name}
            publisherName={activity.publisher_name}
            bookTitle="" // Not needed for preview
            activityType={normalizeActivityType(activity.activity_type)}
            timeLimit={undefined}
            onExit={handleClose}
            initialProgress={null}
            initialTimeSpent={0}
            embedded={true}
            onActivityComplete={handleActivityComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
