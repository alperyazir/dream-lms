/**
 * Activity Player Route - Play an assignment's activity
 * Story 2.5 - Phase 1, Task 1.5
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { ActivityPlayer } from "@/components/ActivityPlayers/ActivityPlayer"
import {
  mockAssignments,
  mockActivities,
  mockActivityConfigs,
  mockBooks,
  type ActivityConfig,
} from "@/lib/mockData"

export const Route = createFileRoute(
  "/_layout/student/assignments/$assignmentId/play",
)({
  component: ActivityPlayerPage,
})

function ActivityPlayerPage() {
  return (
    <ErrorBoundary>
      <ActivityPlayerContent />
    </ErrorBoundary>
  )
}

function ActivityPlayerContent() {
  const { assignmentId } = Route.useParams()
  const navigate = useNavigate()

  // Find assignment
  const assignment = mockAssignments.find((a) => a.id === assignmentId)

  if (!assignment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <div className="rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-bold text-red-600 dark:text-red-400">
            Assignment Not Found
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            The assignment you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate({ to: "/student/assignments" })}
            className="rounded-lg bg-teal-600 px-6 py-2 font-semibold text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
          >
            Back to Assignments
          </button>
        </div>
      </div>
    )
  }

  // Find activity
  const activity = mockActivities.find((a) => a.id === assignment.activityId)

  if (!activity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <div className="rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-bold text-red-600 dark:text-red-400">
            Activity Not Found
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            The activity for this assignment is missing.
          </p>
          <button
            onClick={() => navigate({ to: "/student/assignments" })}
            className="rounded-lg bg-teal-600 px-6 py-2 font-semibold text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
          >
            Back to Assignments
          </button>
        </div>
      </div>
    )
  }

  // Find activity config by matching bookId and activity type
  const activityConfig = mockActivityConfigs.find(
    (config) =>
      config.bookId === activity.bookId && config.type === activity.activityType,
  ) as ActivityConfig | undefined

  if (!activityConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <div className="rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-bold text-orange-600 dark:text-orange-400">
            Activity Configuration Missing
          </h2>
          <p className="mb-2 text-gray-600 dark:text-gray-400">
            This activity type is not yet configured.
          </p>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-500">
            Activity Type: <span className="font-mono">{activity.activityType}</span>
          </p>
          <button
            onClick={() => navigate({ to: "/student/assignments" })}
            className="rounded-lg bg-teal-600 px-6 py-2 font-semibold text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
          >
            Back to Assignments
          </button>
        </div>
      </div>
    )
  }

  // Find book for title
  const book = mockBooks.find((b) => b.id === activity.bookId)

  // Navigation guard: Warn before leaving if activity is in progress
  // TODO: Implement beforeunload event listener with unsaved progress check

  const handleExit = () => {
    // Confirm exit if there's unsaved progress
    const hasUnsavedProgress = localStorage.getItem(
      `activity_progress_${assignmentId}`,
    )

    if (hasUnsavedProgress) {
      const confirmExit = window.confirm(
        "You have unsaved progress. Are you sure you want to exit?",
      )
      if (!confirmExit) return
    }

    navigate({ to: "/student/assignments" })
  }

  return (
    <ActivityPlayer
      activityConfig={activityConfig}
      assignmentId={assignmentId}
      timeLimit={assignment.time_limit_minutes}
      onExit={handleExit}
      bookTitle={book?.title || "Unknown Book"}
      activityType={activity.activityType}
    />
  )
}
