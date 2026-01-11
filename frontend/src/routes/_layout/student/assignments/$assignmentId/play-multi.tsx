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
import { useEffect, useState } from "react"
import { AssignmentIntroScreen } from "@/components/ActivityPlayers/AssignmentIntroScreen"
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

  // Show intro screen before starting (skip for resumed assignments)
  const [showIntro, setShowIntro] = useState(true)

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
    staleTime: Infinity, // Don't consider data stale during this session
    gcTime: 0, // Don't cache for next mount - always fetch fresh on remount
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
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

  // Handle 409 Conflict - redirect to result page when assignment is already completed
  // Must be before any early returns to comply with Rules of Hooks
  const errorStatus = (error as any)?.response?.status
  useEffect(() => {
    if (errorStatus === 409) {
      navigate({
        to: "/student/assignments/$assignmentId/result",
        params: { assignmentId },
        replace: true,
      })
    }
  }, [errorStatus, assignmentId, navigate])

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

    // 409 Conflict = Assignment already completed - show loading while redirecting
    if (status === 409) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">
              Redirecting to results...
            </p>
          </div>
        </div>
      )
    }

    let errorTitle = "Error Loading Assignment"
    let errorMessage = detail

    if (status === 404) {
      errorTitle = "Assignment Not Found"
      errorMessage = "This assignment doesn't exist or is not assigned to you."
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

  // Skip intro for resumed assignments (already started)
  const isResuming = assignment.time_spent_minutes > 0

  // Show intro screen for new assignments
  if (showIntro && !isResuming) {
    return (
      <AssignmentIntroScreen
        assignment={assignment}
        onStart={() => setShowIntro(false)}
        onBack={handleExit}
      />
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
