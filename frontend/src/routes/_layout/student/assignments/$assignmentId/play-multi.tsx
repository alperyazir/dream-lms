/**
 * Multi-Activity Assignment Player Route
 * Story 8.3: Student Multi-Activity Assignment Player
 *
 * Route for playing multi-activity assignments with navigation
 * between activities, shared timer, and per-activity progress tracking.
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { AlertCircle, Loader2 } from "lucide-react"
import { MultiActivityPlayer } from "@/components/ActivityPlayers/MultiActivityPlayer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { startMultiActivityAssignment } from "@/services/assignmentsApi"
import type {
  MultiActivityStartResponse,
  MultiActivitySubmitResponse,
} from "@/types/assignment"

export const Route = createFileRoute(
  "/_layout/student/assignments/$assignmentId/play-multi",
)({
  component: MultiActivityPlayerPage,
})

function MultiActivityPlayerPage() {
  const { assignmentId } = Route.useParams()
  const navigate = useNavigate()

  // Fetch multi-activity assignment data
  const {
    data: assignment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["assignments", assignmentId, "play-multi"],
    queryFn: (): Promise<MultiActivityStartResponse> =>
      startMultiActivityAssignment(assignmentId),
    retry: false,
    staleTime: 0, // Always refetch to get latest progress
    gcTime: 0, // Don't cache - we want fresh data every time
  })

  // Handle exit - return to assignment detail page
  const handleExit = () => {
    navigate({
      to: "/student/assignments/$assignmentId",
      params: { assignmentId },
    })
  }

  // Handle successful submission
  const handleSubmitSuccess = (response: MultiActivitySubmitResponse) => {
    navigate({
      to: "/student/assignments/$assignmentId/success",
      params: { assignmentId },
      search: {
        score: Math.round(response.combined_score),
        completedAt: response.completed_at,
      },
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading assignment...</p>
        </div>
      </div>
    )
  }

  // Error states
  if (error) {
    const errorResponse = (error as any)?.response
    const status = errorResponse?.status
    const detail = errorResponse?.data?.detail || "An error occurred"

    let errorTitle = "Error Loading Assignment"
    let errorMessage = detail

    if (status === 404) {
      errorTitle = "Assignment Not Found"
      errorMessage = "This assignment doesn't exist or is not assigned to you."
    } else if (status === 409) {
      errorTitle = "Assignment Already Completed"
      errorMessage = "You have already completed this assignment."
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{errorTitle}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate({ to: "/student/assignments" })}>
              Back to Assignments
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!assignment) {
    return null
  }

  // Validate we have activities
  if (!assignment.activities || assignment.activities.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Activities Found</AlertTitle>
            <AlertDescription>
              This assignment has no activities configured.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate({ to: "/student/assignments" })}>
              Back to Assignments
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <MultiActivityPlayer
      assignmentId={assignmentId}
      assignmentName={assignment.assignment_name}
      bookId={assignment.book_id}
      bookTitle={assignment.book_title}
      bookName={assignment.book_name}
      publisherName={assignment.publisher_name}
      activities={assignment.activities}
      activityProgress={assignment.activity_progress}
      timeLimit={assignment.time_limit_minutes}
      initialTimeSpent={assignment.time_spent_minutes}
      onExit={handleExit}
      onSubmitSuccess={handleSubmitSuccess}
      videoPath={assignment.video_path}
      resources={assignment.resources}
    />
  )
}
