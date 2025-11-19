import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Loader2, AlertCircle } from "lucide-react"
import { ActivityPlayer } from "@/components/ActivityPlayers/ActivityPlayer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { startAssignment } from "@/services/assignmentsApi"
import type { ActivityConfig } from "@/lib/mockData"
import type { ActivityStartResponse } from "@/types/assignment"

export const Route = createFileRoute(
  "/_layout/student/assignments/$assignmentId/play",
)({
  component: ActivityPlayerPage,
})

function ActivityPlayerPage() {
  const { assignmentId } = Route.useParams()
  const navigate = useNavigate()

  // Fetch activity data using start endpoint
  const {
    data: activity,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["activities", assignmentId, "play"],
    queryFn: (): Promise<ActivityStartResponse> => startAssignment(assignmentId),
    retry: false,
  })

  const handleExit = () => {
    navigate({ to: "/student/assignments/$assignmentId", params: { assignmentId } })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    )
  }

  // Error states
  if (error) {
    const errorResponse = (error as any)?.response
    const status = errorResponse?.status
    const detail = errorResponse?.data?.detail || "An error occurred"

    let errorTitle = "Error Loading Activity"
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

  if (!activity) {
    return null
  }

  // Parse config_json
  let activityConfig: ActivityConfig
  try {
    activityConfig = typeof activity.config_json === 'string'
      ? JSON.parse(activity.config_json)
      : activity.config_json
  } catch (error) {
    console.error("Failed to parse activity config:", error)
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invalid Activity Configuration</AlertTitle>
            <AlertDescription>Unable to load activity.</AlertDescription>
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
    <ActivityPlayer
      activityConfig={activityConfig}
      assignmentId={assignmentId}
      bookTitle={activity.book_title}
      activityType={activity.activity_type as any}
      timeLimit={activity.time_limit_minutes ?? undefined}
      onExit={handleExit}
    />
  )
}
