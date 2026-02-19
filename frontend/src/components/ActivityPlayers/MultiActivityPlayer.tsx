/**
 * Multi-Activity Player - Container for multi-activity assignments
 * Story 8.3: Student Multi-Activity Assignment Player
 *
 * Wraps individual ActivityPlayer components with navigation between activities,
 * shared timer, and per-activity progress tracking.
 */

import { useQueryClient } from "@tanstack/react-query"
import { Eye, EyeOff, FolderOpen, LogOut, RotateCcw } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { hasAudio } from "@/lib/audioUtils"
import type {
  ActivityConfig,
  MatchTheWordsActivity,
  PuzzleFindWordsActivity,
} from "@/lib/mockData"
import { cn } from "@/lib/utils"
import {
  saveActivityProgress,
  submitMultiActivityAssignment,
} from "@/services/assignmentsApi"
import {
  getActivityAudioUrl,
  getSubtitleUrl,
  getVideoStreamUrl,
} from "@/services/booksApi"
import {
  type QuestionNavigationState,
  supportsQuestionNavigation,
} from "@/types/activity-player"
import type {
  ActivityProgressInfo,
  ActivityState,
  ActivityWithConfig,
  AdditionalResourcesResponse,
  AssignmentStudentActivityStatus,
  MultiActivitySubmitResponse,
  VideoResource,
} from "@/types/assignment"
import { ActivityNavigationBar } from "./ActivityNavigationBar"
import { ActivityPlayer } from "./ActivityPlayer"
import { AudioPlayer } from "./AudioPlayer"
import { ResourceSidebar } from "./ResourceSidebar"
import { SharedAssignmentTimer } from "./SharedAssignmentTimer"
import { SubmitConfirmationDialog } from "./SubmitConfirmationDialog"
import { VideoPlayer } from "./VideoPlayer"

/**
 * Get default header text for activity type
 */
function getDefaultActivityHeader(activityType: string): string {
  const type = activityType.toLowerCase()
  switch (type) {
    case "dragdroppicture":
    case "dragdroppicturegroup":
      return "Complete the sentences."
    case "matchthewords":
    case "match_the_words":
      return "Match the words."
    case "markwithx":
      return "Mark the correct option."
    case "circle":
      return "Circle the correct option."
    case "puzzlefindwords":
      return "Find the words."
    default:
      return ""
  }
}

/**
 * Get the question/header text for an activity
 * Checks config.headerText first, then falls back to activity-type-specific defaults
 */
function getActivityHeaderText(activity: ActivityWithConfig): string {
  const config = activity.config_json as ActivityConfig

  // Check if config exists and has headerText (MatchTheWords, PuzzleFindWords)
  if (config && "headerText" in config && config.headerText) {
    return (config as MatchTheWordsActivity | PuzzleFindWordsActivity)
      .headerText
  }

  // Use activity-type-specific default headers
  return getDefaultActivityHeader(activity.activity_type)
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
  /** Story 9.7: Preview/test mode - skip backend saves, keep local state */
  previewMode?: boolean
  /** Story 9.7: Callback for preview mode completion */
  onPreviewComplete?: (results: PreviewResults) => void
  /** Story 10.3: Video path attached to assignment (relative path like "videos/chapter1.mp4") - deprecated */
  videoPath?: string | null
  /** Story 10.3+: Additional resources with subtitle control */
  resources?: AdditionalResourcesResponse | null
}

/**
 * Story 9.7: Preview results returned on test mode completion
 */
export interface PreviewResults {
  totalScore: number
  activitiesCompleted: number
  totalActivities: number
  perActivityScores: Array<{
    activityId: string
    activityTitle: string | null
    score: number | null
    status: string
  }>
  timeSpentMinutes: number
}

/**
 * Convert activity type string to ActivityPlayer format
 */
function normalizeActivityType(
  type: string,
):
  | "dragdroppicture"
  | "dragdroppicturegroup"
  | "matchTheWords"
  | "circle"
  | "markwithx"
  | "puzzleFindWords"
  // Story 27.20: AI-generated types
  | "vocabulary_quiz"
  | "ai_quiz"
  | "reading_comprehension"
  | "sentence_builder"
  | "word_builder"
  // Story 30.11: New skill-based types
  | "listening_quiz"
  | "listening_fill_blank"
  | "grammar_fill_blank"
  | "writing_fill_blank" {
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
    // AI-generated types (pass through)
    vocabulary_quiz: "vocabulary_quiz",
    ai_quiz: "ai_quiz",
    reading_comprehension: "reading_comprehension",
    sentence_builder: "sentence_builder",
    word_builder: "word_builder",
    // Story 30.11: New skill-based types
    listening_quiz: "listening_quiz",
    listening_fill_blank: "listening_fill_blank",
    grammar_fill_blank: "grammar_fill_blank",
    writing_fill_blank: "writing_fill_blank",
    // writing_sentence_builder reuses sentence_builder
    writing_sentence_builder: "sentence_builder",
  }
  return (typeMap[type.toLowerCase()] || type) as ReturnType<
    typeof normalizeActivityType
  >
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
  previewMode = false,
  onPreviewComplete,
  videoPath,
  resources,
}: MultiActivityPlayerProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Current activity index
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Start at first incomplete activity, or first if all done
    const firstIncomplete = activityProgress.findIndex(
      (p) => p.status !== "completed",
    )
    return firstIncomplete >= 0 ? firstIncomplete : 0
  })

  // Track per-activity state locally
  const [activityStates, setActivityStates] = useState<
    Map<string, ActivityState>
  >(() => {
    const states = new Map<string, ActivityState>()
    for (const activity of activities) {
      const progress = activityProgress.find(
        (p) => p.activity_id === activity.id,
      )
      states.set(activity.id, {
        activityId: activity.id,
        status: (progress?.status ||
          "not_started") as AssignmentStudentActivityStatus,
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

  // Story 9.7: Show answers toggle for preview mode
  const [showAnswers, setShowAnswers] = useState(false)

  // Story 10.3: Video player expanded state
  const [videoExpanded, setVideoExpanded] = useState(true)

  // Story 10.3+/13.3: Resource sidebar state
  const [resourceSidebarOpen, setResourceSidebarOpen] = useState(false)
  const [selectedResourceVideo, setSelectedResourceVideo] =
    useState<VideoResource | null>(null)
  const resourceCount =
    (resources?.videos?.length ?? 0) +
    (resources?.teacher_materials?.length ?? 0)

  // Story 10.3: Reset trigger and confirmation dialog
  const [resetTrigger, setResetTrigger] = useState(0)
  const [showResetDialog, setShowResetDialog] = useState(false)

  // Question-level navigation state (for activities that support it)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [questionNavigationState, setQuestionNavigationState] =
    useState<QuestionNavigationState | null>(null)

  // Story 10.3: Video URLs (only compute if videoPath exists)
  const videoSrc = useMemo(() => {
    if (!videoPath) return null
    return getVideoStreamUrl(bookId, videoPath)
  }, [bookId, videoPath])

  const subtitleSrc = useMemo(() => {
    if (!videoPath) return null
    return getSubtitleUrl(bookId, videoPath)
  }, [bookId, videoPath])

  // Time tracking - track elapsed seconds for accurate saving
  const [elapsedSeconds, setElapsedSeconds] = useState(
    Math.floor(initialTimeSpent * 60),
  )

  // Convert to minutes for API calls (ceil so partial minutes count)
  const getElapsedMinutes = useCallback(() => {
    return elapsedSeconds > 0 ? Math.ceil(elapsedSeconds / 60) : 0
  }, [elapsedSeconds])

  // Callback for timer to update elapsed time
  const handleElapsedChange = useCallback((seconds: number) => {
    setElapsedSeconds(seconds)
  }, [])

  // Current activity data
  const currentActivity = activities[currentIndex]
  const currentState = activityStates.get(currentActivity?.id || "")

  // Check if current activity supports question-level navigation
  const hasQuestionNavigation = supportsQuestionNavigation(
    currentActivity?.activity_type || "",
  )

  // Reset question navigation state when activity changes
  useEffect(() => {
    if (!hasQuestionNavigation) {
      setQuestionIndex(0)
      setQuestionNavigationState(null)
    }
  }, [hasQuestionNavigation])

  // Story 10.2: Check if current activity has audio
  const audioPath = useMemo(() => {
    const config = currentActivity?.config_json
    if (hasAudio(config)) {
      return config.audio_extra.path
    }
    return null
  }, [currentActivity?.config_json])

  // Story 10.2: Fetch authenticated audio blob URL
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)
  // Use ref to track blob URL for cleanup without causing re-renders
  const audioUrlRef = useRef<string | null>(null)

  useEffect(() => {
    // Revoke previous blob URL before fetching new one
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }

    // Reset audio URL when activity changes
    setAudioUrl(null)

    if (!audioPath) return

    let cancelled = false
    setAudioLoading(true)

    getActivityAudioUrl(bookId, audioPath)
      .then((url) => {
        if (!cancelled && url) {
          audioUrlRef.current = url
          setAudioUrl(url)
          setAudioLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAudioLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [audioPath, bookId])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
    }
  }, [])

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
  // Story 9.7: Skip backend save in preview mode - just update local state
  // forceInProgress: when true, always send status as "in_progress" (for Save & Exit)
  const saveCurrentActivityProgress = useCallback(
    async (forNavigation = false, forceInProgress = false) => {
      if (!currentActivity || !currentState) return

      // Only save if there's something to save
      if (!currentState.isDirty && !forNavigation) return

      // Story 9.7: In preview mode, just mark as not dirty without backend call
      if (previewMode) {
        setActivityStates((prev) => {
          const newStates = new Map(prev)
          const state = newStates.get(currentActivity.id)
          if (state) {
            newStates.set(currentActivity.id, { ...state, isDirty: false })
          }
          return newStates
        })
        return
      }

      setIsSaving(true)
      try {
        // Determine status: forceInProgress overrides completed status (for Save & Exit)
        const saveStatus = forceInProgress
          ? "in_progress"
          : currentState.status === "completed"
            ? "completed"
            : "in_progress"

        await saveActivityProgress(assignmentId, currentActivity.id, {
          response_data: currentState.responseData || {},
          time_spent_seconds: currentState.timeSpentSeconds,
          status: saveStatus,
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
      } catch (error: any) {
        console.error("Failed to save activity progress:", error)
        console.error("Error response:", error?.response?.data)
        console.error("Error status:", error?.response?.status)
        console.error("Request data was:", {
          assignmentId,
          activityId: currentActivity.id,
          responseData: currentState.responseData,
          status: currentState.status,
        })
        toast({
          title: "Save failed",
          description:
            error?.response?.data?.detail ||
            "Could not save your progress. Please try again.",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsSaving(false)
      }
    },
    [assignmentId, currentActivity, currentState, previewMode, toast],
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
  // Always save as "in_progress" to prevent marking assignment as completed
  const handleSaveAndExit = useCallback(async () => {
    try {
      await saveCurrentActivityProgress(false, true) // forceInProgress = true
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
      // Build activity_states from local state for Content Library assignments
      const activityStatesForSubmit = activities.map((activity, index) => {
        const state = activityStates.get(activity.id)
        return {
          activity_index: index,
          score: state?.score ?? null,
          answers_json: state?.responseData || {},
          status: state?.status || "completed",
        }
      })

      const response = await submitMultiActivityAssignment(assignmentId, {
        force_submit: true,
        total_time_spent_seconds: elapsedSeconds, // Send precise seconds
        activity_states: activityStatesForSubmit,
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
  }, [
    activities,
    activityStates,
    assignmentId,
    elapsedSeconds,
    onSubmitSuccess,
    toast,
  ])

  // Confirm and submit assignment
  // Story 9.7: In preview mode, calculate local results without backend call
  const handleConfirmSubmit = useCallback(async () => {
    setShowSubmitDialog(false)
    setIsSubmitting(true)

    // Debug: log all activity states before submit
    console.log("[Submit] Activity states before save:")
    activityStates.forEach((state, id) => {
      console.log(
        `  Activity ${id}: status=${state.status}, score=${state.score}, isDirty=${state.isDirty}`,
      )
      console.log(`    responseData:`, state.responseData)
    })

    try {
      // Save current activity first (force save with true to ensure last activity is saved)
      console.log("[Submit] Saving current activity:", currentActivity?.id)
      await saveCurrentActivityProgress(true)

      // Story 9.7: In preview mode, calculate local results
      if (previewMode) {
        // Calculate preview results from local state
        const perActivityScores: PreviewResults["perActivityScores"] = []
        let totalScore = 0
        let scoredCount = 0

        for (const activity of activities) {
          const state = activityStates.get(activity.id)
          perActivityScores.push({
            activityId: activity.id,
            activityTitle: activity.title,
            score: state?.score ?? null,
            status: state?.status || "not_started",
          })
          if (state?.score !== null && state?.score !== undefined) {
            totalScore += state.score
            scoredCount++
          }
        }

        const previewResults: PreviewResults = {
          totalScore: scoredCount > 0 ? totalScore / scoredCount : 0,
          activitiesCompleted: completedCount,
          totalActivities: activities.length,
          perActivityScores,
          timeSpentMinutes: getElapsedMinutes(),
        }

        toast({
          title: "Test Complete!",
          description: `Your score: ${Math.round(previewResults.totalScore)}% (not saved)`,
        })

        onPreviewComplete?.(previewResults)
        setIsSubmitting(false)
        return
      }

      // Build activity_states from local state for Content Library assignments
      // This sends scores calculated by ActivityPlayer to the backend
      const activityStatesForSubmit = activities.map((activity, index) => {
        const state = activityStates.get(activity.id)
        return {
          activity_index: index,
          score: state?.score ?? null,
          answers_json: state?.responseData || {},
          status: state?.status || "completed",
        }
      })

      // Submit the assignment (force_submit=true if not all activities completed)
      const response = await submitMultiActivityAssignment(assignmentId, {
        force_submit: !allCompleted,
        total_time_spent_seconds: elapsedSeconds, // Send precise seconds
        activity_states: activityStatesForSubmit,
      })

      toast({
        title: "Assignment submitted!",
        description: `Your score: ${Math.round(response.combined_score)}%`,
      })

      onSubmitSuccess?.(response)

      // Invalidate student assignments query so dashboard shows updated status
      queryClient.invalidateQueries({ queryKey: ["studentAssignments"] })
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
  }, [
    activities,
    activityStates,
    allCompleted,
    assignmentId,
    completedCount,
    currentActivity,
    elapsedSeconds,
    getElapsedMinutes,
    onPreviewComplete,
    onSubmitSuccess,
    previewMode,
    queryClient,
    saveCurrentActivityProgress,
    toast,
  ])

  // Auto-save on interval (30 seconds)
  // Story 9.7: Skip auto-save in preview mode
  useEffect(() => {
    if (previewMode) return // No auto-save in preview mode

    const intervalId = setInterval(() => {
      if (currentState?.isDirty) {
        saveCurrentActivityProgress(false).catch(() => {
          // Ignore errors in auto-save - will be retried
        })
      }
    }, 30000)

    return () => clearInterval(intervalId)
  }, [currentState?.isDirty, previewMode, saveCurrentActivityProgress])

  // Save on page unload
  // Story 9.7: Skip save on unload in preview mode
  useEffect(() => {
    if (previewMode) return // No save on unload in preview mode

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
  }, [assignmentId, currentActivity?.id, currentState, previewMode])

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
    ? getActivityHeaderText(currentActivity)
    : ""

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-neutral-900">
      {/* Story 9.7: Preview mode banner */}
      {previewMode && (
        <div className="shrink-0 bg-amber-100 dark:bg-amber-900 border-b border-amber-200 dark:border-amber-800">
          <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-center">
            <span className="font-medium text-amber-800 dark:text-amber-100">
              Preview Mode - Your results will not be saved
            </span>
          </div>
        </div>
      )}

      {/* Compact header with stepper, timer, and question */}
      <header className="shrink-0 border-b bg-white shadow-sm dark:border-gray-700 dark:bg-neutral-800">
        <div className="px-3 py-3">
          {/* Top row: centered stepper with timer/resources on sides */}
          <div className="relative flex items-center justify-center min-h-[40px]">
            {/* Left spacer for balance */}
            <div className="absolute left-0 w-32" />

            {/* Activity/Question stepper (mini-map) - centered */}
            <div className="flex justify-center">
              {hasQuestionNavigation && questionNavigationState ? (
                // Question-level navigation for activities that support it
                <div className="flex items-center gap-0 mx-auto px-2 py-1 overflow-x-auto scrollbar-none">
                  {Array.from({
                    length: questionNavigationState.totalItems,
                  }).map((_, i) => {
                    // Use questionIndex for immediate feedback, fall back to navigationState
                    const isCurrent = i === questionIndex
                    // Check if this question index is in the answered indices
                    const itemAnswered =
                      questionNavigationState.answeredIndices.includes(i)
                    const isLast = i === questionNavigationState.totalItems - 1

                    return (
                      <div key={i} className="flex items-center shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setQuestionIndex(i)
                          }}
                          disabled={isSaving || isSubmitting}
                          className={cn(
                            "relative flex items-center justify-center rounded-full font-semibold transition-all duration-200",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            "h-8 w-8 text-sm",
                            isCurrent
                              ? "bg-teal-600 text-white shadow-lg scale-110 dark:bg-teal-500"
                              : itemAnswered
                                ? "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"
                                : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
                          )}
                          title={`Item ${i + 1}`}
                          aria-label={`Item ${i + 1}${itemAnswered ? " (answered)" : ""}`}
                        >
                          {i + 1}
                        </button>
                        {/* Connector line */}
                        {!isLast && (
                          <div
                            className={cn(
                              "h-0.5 w-3 transition-colors duration-200",
                              itemAnswered
                                ? "bg-teal-400 dark:bg-teal-600"
                                : "bg-gray-300 dark:bg-gray-600",
                            )}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Regular activities: Show activity navigation
                <ActivityNavigationBar
                  activities={activities}
                  currentIndex={currentIndex}
                  activityStates={activityStates}
                  onNavigate={handleNavigate}
                  disabled={isSaving || isSubmitting}
                />
              )}
            </div>

            {/* Timer and Resources button - absolute right */}
            <div className="absolute right-0 flex items-center gap-2">
              {/* Resources button */}
              {resourceCount > 0 && (
                <Button
                  variant={resourceSidebarOpen ? "default" : "outline"}
                  size="sm"
                  className={`gap-1.5 ${resourceSidebarOpen ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}`}
                  onClick={() => setResourceSidebarOpen(!resourceSidebarOpen)}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Resources</span>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-500 px-1 text-xs font-medium text-white">
                    {resourceCount}
                  </span>
                </Button>
              )}

              {/* Always show timer - for countdown if timeLimit set, or elapsed time tracking otherwise */}
              <SharedAssignmentTimer
                totalTimeLimit={timeLimit}
                elapsedMinutes={initialTimeSpent}
                onTimeExpired={timeLimit ? handleTimeExpired : undefined}
                onElapsedChange={handleElapsedChange}
              />
            </div>
          </div>

          {/* Question header for current activity */}
          <div className="mt-1 text-center">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {currentActivityHeader}
            </h2>
          </div>
        </div>
      </header>

      {/* Story 10.3: Video Player Section - shown when assignment has video attached */}
      {videoSrc && (
        <div className="shrink-0 border-b border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-850">
          <div className="mx-auto max-w-4xl px-3 py-2">
            <VideoPlayer
              src={videoSrc}
              subtitleSrc={subtitleSrc || undefined}
              isExpanded={videoExpanded}
              onMinimize={() => setVideoExpanded(false)}
              onExpand={() => setVideoExpanded(true)}
              className={videoExpanded ? "" : ""}
            />
          </div>
        </div>
      )}

      {/* Main content area with optional sidebar */}
      <div className="min-h-0 flex-1 flex overflow-hidden">
        {/* Activity Player - takes remaining width with smooth transition */}
        <main className="flex-1 min-w-0 overflow-auto transition-all duration-300 ease-in-out">
          <div className="h-full">
            {currentActivity?.config_json ? (
              <ActivityPlayer
                key={`${currentActivity.id}-${resetTrigger}`} // Re-mount on activity change or reset
                activityConfig={currentActivity.config_json as ActivityConfig}
                assignmentId={assignmentId}
                bookId={bookId}
                bookName={bookName}
                publisherName={publisherName}
                bookTitle={bookTitle}
                activityType={normalizeActivityType(
                  currentActivity.activity_type,
                )}
                // No per-activity time limit - shared timer handles it
                timeLimit={undefined}
                onExit={handleSaveAndExit}
                initialProgress={currentState?.responseData}
                initialTimeSpent={0} // Time tracked at assignment level
                embedded={true} // Fully embedded - hide header and footer
                onActivityComplete={handleActivityComplete} // Story 8.3: Notify parent when activity completed with score
                showCorrectAnswers={previewMode && showAnswers} // Story 9.7: Show correct answers in preview mode
                resetTrigger={resetTrigger} // Story 10.3: External reset trigger from footer
                // Question-level navigation for activities that support it
                currentQuestionIndex={
                  hasQuestionNavigation ? questionIndex : undefined
                }
                onQuestionIndexChange={
                  hasQuestionNavigation ? setQuestionIndex : undefined
                }
                onNavigationStateChange={
                  hasQuestionNavigation ? setQuestionNavigationState : undefined
                }
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    Activity Configuration Missing
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    This activity is missing its configuration data and cannot
                    be displayed.
                  </p>
                  {currentActivity && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Activity ID: {currentActivity.id}</p>
                      <p>Title: {currentActivity.title || "No title"}</p>
                      <p>Type: {currentActivity.activity_type}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Story 10.3+/13.3: Resource Sidebar - pushes content when open */}
        <ResourceSidebar
          resources={resources ?? null}
          bookId={bookId}
          assignmentId={assignmentId}
          getVideoUrl={getVideoStreamUrl}
          getSubtitleUrl={getSubtitleUrl}
          isOpen={resourceSidebarOpen}
          onClose={() => setResourceSidebarOpen(false)}
          selectedVideo={selectedResourceVideo}
          onSelectVideo={setSelectedResourceVideo}
        />
      </div>

      {/* Compact footer with navigation and submit */}
      <footer className="shrink-0 border-t bg-white shadow-sm dark:border-gray-700 dark:bg-neutral-800">
        {/* Story 10.2: Audio Player Row - always shown when activity has audio */}
        {audioPath && (
          <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-neutral-900">
            <div className="mx-auto max-w-3xl">
              {audioLoading ? (
                <div className="flex items-center justify-center gap-2 py-1 text-sm text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                  <span>Loading audio...</span>
                </div>
              ) : audioUrl ? (
                <AudioPlayer src={audioUrl} isExpanded={true} />
              ) : (
                <div className="py-1 text-center text-sm text-red-500">
                  Failed to load audio
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main footer controls */}
        <div className="px-4 py-3">
          <div className="mx-auto flex max-w-7xl items-center">
            {/* Left side: Reset button + Show Answers toggle in preview mode */}
            <div className="flex flex-1 items-center gap-3">
              {/* Reset button */}
              <button
                type="button"
                onClick={() => setShowResetDialog(true)}
                disabled={isSaving || isSubmitting}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              {/* Show Answers toggle in preview mode */}
              {previewMode && (
                <button
                  type="button"
                  onClick={() => setShowAnswers(!showAnswers)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    showAnswers
                      ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {showAnswers ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Hide Answers
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Show Answers
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Center: Activity/Question navigation */}
            <div className="flex items-center gap-3">
              {hasQuestionNavigation && questionNavigationState ? (
                // Question-level navigation for activities that support it
                <>
                  <button
                    type="button"
                    onClick={() => setQuestionIndex(questionIndex - 1)}
                    disabled={questionIndex === 0 || isSaving || isSubmitting}
                    className="flex items-center gap-1.5 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Prev
                  </button>

                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {questionIndex + 1} / {questionNavigationState.totalItems}
                  </span>

                  <button
                    type="button"
                    onClick={() => setQuestionIndex(questionIndex + 1)}
                    disabled={
                      questionIndex ===
                        questionNavigationState.totalItems - 1 ||
                      isSaving ||
                      isSubmitting
                    }
                    className="flex items-center gap-1.5 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Next
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </>
              ) : (
                // Regular: Navigate activities
                <>
                  <button
                    type="button"
                    onClick={() => handleNavigate(currentIndex - 1)}
                    disabled={currentIndex === 0 || isSaving || isSubmitting}
                    className="flex items-center gap-1.5 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Prev
                  </button>

                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {currentIndex + 1} / {activities.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleNavigate(currentIndex + 1)}
                    disabled={
                      currentIndex === activities.length - 1 ||
                      isSaving ||
                      isSubmitting
                    }
                    className="flex items-center gap-1.5 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Next
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Right side: Save & Exit + Submit (or Exit Preview in preview mode) */}
            <div className="flex flex-1 items-center justify-end gap-3">
              {previewMode ? (
                <button
                  type="button"
                  onClick={onExit}
                  className="flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
                >
                  <LogOut className="h-4 w-4" />
                  Exit Preview
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveAndExit}
                    disabled={isSaving || isSubmitting}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {isSaving ? "Saving..." : "Save & Exit"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitClick}
                    disabled={isSubmitting}
                    className="rounded-md bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-600"
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </>
              )}
            </div>
          </div>
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

      {/* Reset confirmation dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Reset Activity?
              </h3>
            </div>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              This will clear all your answers for the current activity. Are you
              sure you want to start over?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetDialog(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetTrigger((prev) => prev + 1)
                  setShowResetDialog(false)
                  // Turn off Show Answers so user can interact
                  setShowAnswers(false)
                  // Reset question index for activities with question navigation
                  if (hasQuestionNavigation) {
                    setQuestionIndex(0)
                  }
                  // Also reset the activity state in the parent
                  if (currentActivity) {
                    setActivityStates((prev) => {
                      const newStates = new Map(prev)
                      const state = newStates.get(currentActivity.id)
                      if (state) {
                        newStates.set(currentActivity.id, {
                          ...state,
                          status: "in_progress",
                          responseData: null,
                          score: null,
                          isDirty: true,
                        })
                      }
                      return newStates
                    })
                  }
                  toast({
                    title: "Activity Reset",
                    description: "Your answers have been cleared.",
                  })
                }}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
