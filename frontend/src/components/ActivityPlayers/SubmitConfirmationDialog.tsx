/**
 * Submit Confirmation Dialog Component
 * Story 8.3: Student Multi-Activity Assignment Player
 *
 * Simplified dialog:
 * - If all activities have all answers filled: just show confirmation
 * - If any activity has unfilled answers: show warning listing which activities are incomplete
 *
 * "Complete" = all answer slots filled (drop zones have words, matches made, etc.)
 * NOT about correctness - just whether the student has provided all answers.
 */

import { useMemo } from "react"
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
import type { ActivityConfig } from "@/lib/mockData"
import type { ActivityState, ActivityWithConfig } from "@/types/assignment"

export interface SubmitConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  activitiesCompleted: number
  totalActivities: number
  activityStates: Map<string, ActivityState>
  activities: ActivityWithConfig[]
}

/**
 * Check if an activity has all answers filled based on activity type
 * Returns true if all answer slots are filled (regardless of correctness)
 */
function isActivityFullyAnswered(
  activity: ActivityWithConfig,
  state: ActivityState | undefined,
): boolean {
  if (!state?.responseData) return false

  const config = activity.config_json as ActivityConfig
  const responseData = state.responseData

  // Get the number of expected answers based on activity type
  switch (config.type) {
    case "dragdroppicture":
    case "dragdroppicturegroup": {
      // Check if all drop zones have answers
      const expectedCount = config.answer?.length || 0
      const answersObj = responseData.answers || responseData
      const filledCount = Object.keys(answersObj).length
      return filledCount >= expectedCount
    }

    case "matchTheWords": {
      // Check if all sentences have matching words
      const expectedCount = config.sentences?.length || 0
      const answersObj = responseData.answers || responseData
      const filledCount = Object.keys(answersObj).length
      return filledCount >= expectedCount
    }

    case "circle":
    case "markwithx": {
      // Check if all question groups have selections
      const circleCount = config.circleCount ?? 2
      const effectiveCircleCount = circleCount === 0 ? 2 : circleCount
      const isMultiSelect = circleCount === -1

      if (isMultiSelect) {
        // For multi-select, just need at least one selection
        const answersObj = responseData.answers || responseData
        return Object.keys(answersObj).length > 0
      }

      // For question grouping mode, need one answer per group
      const totalOptions = config.answer?.length || 0
      const expectedGroups = Math.ceil(totalOptions / effectiveCircleCount)
      const answersObj = responseData.answers || responseData
      const filledCount = Object.keys(answersObj).length
      return filledCount >= expectedGroups
    }

    case "puzzleFindWords": {
      // Check if any words have been found
      const foundWords = responseData.words || responseData.answers || []
      return Array.isArray(foundWords) && foundWords.length > 0
    }

    default:
      // Fallback: check if responseData has any content
      return Object.keys(responseData).length > 0
  }
}

export function SubmitConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  activityStates,
  activities,
}: SubmitConfirmationDialogProps) {
  // Check which activities are incomplete (have unfilled answers)
  const incompleteActivities = useMemo(() => {
    const incomplete: { index: number; title: string }[] = []

    activities.forEach((activity, index) => {
      const state = activityStates.get(activity.id)
      if (!isActivityFullyAnswered(activity, state)) {
        incomplete.push({
          index: index + 1,
          title: activity.title || `Activity ${index + 1}`,
        })
      }
    })

    return incomplete
  }, [activities, activityStates])

  const allComplete = incompleteActivities.length === 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {allComplete ? "Submit Assignment?" : "Incomplete Answers"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {allComplete ? (
                <p className="text-gray-600 dark:text-gray-400">
                  Are you ready to submit your assignment?
                </p>
              ) : (
                <>
                  <p className="text-gray-600 dark:text-gray-400">
                    The following activities have incomplete answers:
                  </p>
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/30">
                    <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                      {incompleteActivities.map((item) => (
                        <li key={item.index} className="flex items-center gap-2">
                          <span className="font-medium">Activity {item.index}:</span>
                          <span>{item.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    You can still submit, but unfilled answers will be marked as incorrect.
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              allComplete
                ? "bg-teal-600 hover:bg-teal-700"
                : "bg-amber-600 hover:bg-amber-700"
            }
          >
            {allComplete ? "Submit" : "Submit Anyway"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
