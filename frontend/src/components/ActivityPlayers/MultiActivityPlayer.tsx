/**
 * Multi-Activity Player - Container for multi-activity assignments
 * Story 8.3: Student Multi-Activity Assignment Player
 *
 * Wraps individual ActivityPlayer components with navigation between activities,
 * shared timer, and per-activity progress tracking.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import type {
  ActivityConfig,
  MatchTheWordsActivity,
  PuzzleFindWordsActivity,
} from "@/lib/mockData"
import {
  saveActivityProgress,
  submitMultiActivityAssignment,
} from "@/services/assignmentsApi"
import type {
  ActivityProgressInfo,
  ActivityState,
  ActivityWithConfig,
  AssignmentStudentActivityStatus,
  MultiActivitySubmitResponse,
} from "@/types/assignment"
import { ActivityNavigationBar } from "./ActivityNavigationBar"
import { ActivityPlayer } from "./ActivityPlayer"
import { SharedAssignmentTimer } from "./SharedAssignmentTimer"
import { SubmitConfirmationDialog } from "./SubmitConfirmationDialog"

/**
 * Get the question/header text for an activity
 * Checks config.headerText first, then activity.title, then falls back to default
 */
function getActivityHeaderText(
  activity: ActivityWithConfig,
  activityIndex: number,
): string {
  const config = activity.config_json as ActivityConfig

  // Check if config has headerText (MatchTheWords, PuzzleFindWords)
  if ("headerText" in config && config.headerText) {
    return (config as MatchTheWordsActivity | PuzzleFindWordsActivity).headerText
  }

  // Use activity title if available
  if (activity.title) {
    return activity.title
  }

  // Default fallback
  return `Activity ${activityIndex + 1}`
}

export interface MultiActivityPlayerProps {
  assignmentId: string
  assignmentName: string
  bookId: string
  bookTitle: string
  bookName: string
  publisherName: string
  activities: ActivityWithConfig[]
  activityProgress: ActivityProgressInfo[]
  timeLimit?: number | null // minutes for entire assignment
  initialTimeSpent?: number // minutes already spent
  onExit: () => void
  onSubmitSuccess?: (response: MultiActivitySubmitResponse) => void
}

/**
 * Convert activity type string to ActivityPlayer format
 */
function normalizeActivityType(
  type: string,
): "dragdroppicture" | "dragdroppicturegroup" | "matchTheWords" | "circle" | "markwithx" | "puzzleFindWords" {
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
  return (typeMap[type.toLowerCase()] || type) as ReturnType<typeof normalizeActivityType>
}

export function MultiActivityPlayer({
  assignmentId,
  assignmentName: _assignmentName,
  bookId,
  bookTitle,
  bookName,
  publisherName,
  activities,
  activityProgress,
  timeLimit,
  initialTimeSpent = 0,
  onExit,
  onSubmitSuccess,
}: MultiActivityPlayerProps) {
  const { toast } = useToast()

  // Current activity index
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Start at first incomplete activity, or first if all done
    const firstIncomplete = activityProgress.findIndex(
      (p) => p.status !== "completed",
    )
    return firstIncomplete >= 0 ? firstIncomplete : 0
  })

  // Track per-activity state locally
  const [activityStates, setActivityStates] = useState<Map<string, ActivityState>>(() => {
    const states = new Map<string, ActivityState>()
    for (const activity of activities) {
      const progress = activityProgress.find((p) => p.activity_id === activity.id)
      states.set(activity.id, {
        activityId: activity.id,
        status: (progress?.status || "not_started") as AssignmentStudentActivityStatus,
        isDirty: false,
        responseData: progress?.response_data || null,
        score: progress?.score ?? null,
        timeSpentSeconds: 0,
      })
    }
    return states
  })

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)

  // Saving state
  const [isSaving, setIsSaving] = useState(false)

  // Time tracking
  const [startTime] = useState(Date.now())
  const getElapsedMinutes = useCallback(() => {
    return initialTimeSpent + Math.floor((Date.now() - startTime) / 1000 / 60)
  }, [initialTimeSpent, startTime])

  // Current activity data
  const currentActivity = activities[currentIndex]
  const currentState = activityStates.get(currentActivity?.id || "")

  // Computed: all activities completed?
  const completedCount = useMemo(() => {
    let count = 0
    for (const state of activityStates.values()) {
      if (state.status === "completed") count++
    }
    return count
  }, [activityStates])

  const allCompleted = completedCount === activities.length

  // Save current activity progress to backend
  const saveCurrentActivityProgress = useCallback(
    async (forNavigation = false) => {
      if (!currentActivity || !currentState) return

      // Only save if there's something to save
      if (!currentState.isDirty && !forNavigation) return

      setIsSaving(true)
      try {
        await saveActivityProgress(assignmentId, currentActivity.id, {
          response_data: currentState.responseData || {},
          time_spent_seconds: currentState.timeSpentSeconds,
          status: currentState.status === "completed" ? "completed" : "in_progress",
          score: currentState.score,
          max_score: 100,
        })

        // Mark as not dirty after save
        setActivityStates((prev) => {
          const newStates = new Map(prev)
          const state = newStates.get(currentActivity.id)
          if (state) {
            newStates.set(currentActivity.id, { ...state, isDirty: false })
          }
          return newStates
        })
        // Note: Removed toast on navigation to reduce popups
      } catch (error) {
        console.error("Failed to save activity progress:", error)
        toast({
          title: "Save failed",
          description: "Could not save your progress. Please try again.",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsSaving(false)
      }
    },
    [assignmentId, currentActivity, currentState, toast],
  )

  // Navigate to a different activity
  const handleNavigate = useCallback(
    async (targetIndex: number) => {
      if (targetIndex === currentIndex) return
      if (targetIndex < 0 || targetIndex >= activities.length) return

      // Save current activity before navigating
      try {
        await saveCurrentActivityProgress(true)
        setCurrentIndex(targetIndex)
      } catch {
        // Save failed - stay on current activity
      }
    },
    [currentIndex, activities.length, saveCurrentActivityProgress],
  )

  // Story 8.3: Handle activity score update from ActivityPlayer
  // This callback is called whenever answers change and score is calculated
  // It only updates local state - saves happen on navigation/auto-save/submit
  const handleActivityComplete = useCallback(
    (score: number, answersJson: Record<string, any>) => {
      if (!currentActivity) return

      // Update local state with score and answers
      setActivityStates((prev) => {
        const newStates = new Map(prev)
        const existingState = newStates.get(currentActivity.id)
        if (existingState) {
          newStates.set(currentActivity.id, {
            ...existingState,
            status: "completed",
            score: score,
            responseData: answersJson,
            isDirty: true,
          })
        }
        return newStates
      })
    },
    [currentActivity],
  )

  // Handle "Save & Exit" button
  const handleSaveAndExit = useCallback(async () => {
    try {
      await saveCurrentActivityProgress(false)
      // Note: Removed toast - exit action is self-explanatory
      onExit()
    } catch {
      // Error already shown by saveCurrentActivityProgress
    }
  }, [saveCurrentActivityProgress, onExit])

  // Handle time expired (auto-submit)
  const handleTimeExpired = useCallback(async () => {
    toast({
      title: "Time's up!",
      description: "Submitting your assignment automatically...",
      variant: "destructive",
    })

    // Force submit with current progress
    setIsSubmitting(true)
    try {
      const response = await submitMultiActivityAssignment(assignmentId, {
        force_submit: true,
        total_time_spent_minutes: getElapsedMinutes(),
      })
      onSubmitSuccess?.(response)
    } catch (error) {
      console.error("Auto-submit failed:", error)
      toast({
        title: "Submission failed",
        description: "Please try submitting manually.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [assignmentId, getElapsedMinutes, onSubmitSuccess, toast])

  // Confirm and submit assignment
  const handleConfirmSubmit = useCallback(async () => {
    setShowSubmitDialog(false)
    setIsSubmitting(true)

    // Debug: log all activity states before submit
    console.log("[Submit] Activity states before save:")
    activityStates.forEach((state, id) => {
      console.log(`  Activity ${id}: status=${state.status}, score=${state.score}, isDirty=${state.isDirty}`)
      console.log(`    responseData:`, state.responseData)
    })

    try {
      // Save current activity first (force save with true to ensure last activity is saved)
      console.log("[Submit] Saving current activity:", currentActivity?.id)
      await saveCurrentActivityProgress(true)

      // Submit the assignment (force_submit=true if not all activities completed)
      const response = await submitMultiActivityAssignment(assignmentId, {
        force_submit: !allCompleted,
        total_time_spent_minutes: getElapsedMinutes(),
      })

      toast({
        title: "Assignment submitted!",
        description: `Your score: ${Math.round(response.combined_score)}%`,
      })

      onSubmitSuccess?.(response)
    } catch (error) {
      console.error("Submit failed:", error)
      toast({
        title: "Submission failed",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [activityStates, allCompleted, assignmentId, currentActivity, getElapsedMinutes, onSubmitSuccess, saveCurrentActivityProgress, toast])

  // Auto-save on interval (30 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (currentState?.isDirty) {
        saveCurrentActivityProgress(false).catch(() => {
          // Ignore errors in auto-save - will be retried
        })
      }
    }, 30000)

    return () => clearInterval(intervalId)
  }, [currentState?.isDirty, saveCurrentActivityProgress])

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentState?.isDirty) {
        // Use sendBeacon for reliable save on unload
        const blob = new Blob(
          [
            JSON.stringify({
              response_data: currentState.responseData || {},
              time_spent_seconds: currentState.timeSpentSeconds,
              status: "in_progress",
            }),
          ],
          { type: "application/json" },
        )
        navigator.sendBeacon(
          `${import.meta.env.VITE_API_URL || ""}/api/v1/assignments/${assignmentId}/students/me/activities/${currentActivity?.id}`,
          blob,
        )

        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [assignmentId, currentActivity?.id, currentState])

  if (!currentActivity) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">No activities found in this assignment.</p>
      </div>
    )
  }

  // Handle submit button click - show confirmation dialog
  const handleSubmitClick = useCallback(() => {
    setShowSubmitDialog(true)
  }, [])

  // Get current activity header text
  const currentActivityHeader = currentActivity
    ? getActivityHeaderText(currentActivity, currentIndex)
    : ""

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Compact header with stepper, timer, and question */}
      <header className="shrink-0 border-b bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-3 py-2">
          {/* Top row: stepper and timer */}
          <div className="flex items-center justify-between">
            {/* Activity stepper (mini-map) */}
            <div className="flex-1">
              <ActivityNavigationBar
                activities={activities}
                currentIndex={currentIndex}
                activityStates={activityStates}
                onNavigate={handleNavigate}
                disabled={isSaving || isSubmitting}
              />
            </div>

            {/* Timer (if timed) */}
            {timeLimit && (
              <div className="ml-4">
                <SharedAssignmentTimer
                  totalTimeLimit={timeLimit}
                  elapsedMinutes={getElapsedMinutes()}
                  onTimeExpired={handleTimeExpired}
                />
              </div>
            )}
          </div>

          {/* Question header for current activity */}
          <div className="mt-2 text-center">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              {currentActivityHeader}
            </h2>
          </div>
        </div>
      </header>

      {/* Main content - Activity Player - takes remaining height */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full">
          <ActivityPlayer
            key={currentActivity.id} // Re-mount on activity change
            activityConfig={currentActivity.config_json as ActivityConfig}
            assignmentId={assignmentId}
            bookId={bookId}
            bookName={bookName}
            publisherName={publisherName}
            bookTitle={bookTitle}
            activityType={normalizeActivityType(currentActivity.activity_type)}
            // No per-activity time limit - shared timer handles it
            timeLimit={undefined}
            onExit={handleSaveAndExit}
            initialProgress={currentState?.responseData}
            initialTimeSpent={0} // Time tracked at assignment level
            embedded={true} // Fully embedded - hide header and footer
            onActivityComplete={handleActivityComplete} // Story 8.3: Notify parent when activity completed with score
          />
        </div>
      </main>

      {/* Compact footer with navigation and submit */}
      <footer className="shrink-0 border-t bg-white px-4 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Left side: Save & Exit */}
          <button
            type="button"
            onClick={handleSaveAndExit}
            disabled={isSaving || isSubmitting}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {isSaving ? "Saving..." : "Save & Exit"}
          </button>

          {/* Center: Activity navigation - compact */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleNavigate(currentIndex - 1)}
              disabled={currentIndex === 0 || isSaving || isSubmitting}
              className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>

            <button
              type="button"
              onClick={() => handleNavigate(currentIndex + 1)}
              disabled={currentIndex === activities.length - 1 || isSaving || isSubmitting}
              className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Next
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Right side: Submit */}
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={isSubmitting}
            className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-600"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </footer>

      {/* Submit confirmation dialog */}
      <SubmitConfirmationDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleConfirmSubmit}
        activitiesCompleted={completedCount}
        totalActivities={activities.length}
        activityStates={activityStates}
        activities={activities}
      />
    </div>
  )
}
