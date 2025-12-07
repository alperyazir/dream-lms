/**
 * Assignment Detail Page
 * Story 3.9: Student Assignment View & Dashboard
 * Story 8.3: Multi-Activity Assignment Support
 * Story 6.4: Teacher Feedback on Assignments
 * Story 6.5: Feedback Enhancements (Badges & Emoji Reactions)
 *
 * Displays detailed information about a specific assignment including:
 * - Assignment name, instructions, due date
 * - Book and activity information
 * - Student's progress (status, score, time spent)
 * - Action buttons (Start Assignment, View Feedback)
 * - Activity list for multi-activity assignments
 * - Teacher feedback (if available and published)
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  Activity as ActivityIcon,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ListTodo,
  MessageSquare,
  Reply,
} from "lucide-react"
import { StudentScoreBreakdown } from "@/components/analytics/StudentScoreBreakdown"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { BadgeDisplay } from "@/components/feedback/BadgeDisplay"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useMyFeedback } from "@/hooks/useFeedback"
import {
  getStudentAssignments,
  startMultiActivityAssignment,
} from "@/services/assignmentsApi"
import { EMOJI_DISPLAY, isFeedbackStudentView } from "@/types/feedback"

export const Route = createFileRoute(
  "/_layout/student/assignments/$assignmentId/",
)({
  component: AssignmentDetailPage,
})

function AssignmentDetailPage() {
  return (
    <ErrorBoundary>
      <AssignmentDetailContent />
    </ErrorBoundary>
  )
}

function AssignmentDetailContent() {
  const { assignmentId } = Route.useParams()
  const navigate = useNavigate()

  // Fetch all student assignments and find the specific one
  const {
    data: assignments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["studentAssignments"],
    queryFn: () => getStudentAssignments(),
  })

  const assignment = assignments.find((a) => a.assignment_id === assignmentId)

  // Fetch feedback for completed assignments (Story 6.4)
  const {
    feedback,
    isLoading: isFeedbackLoading,
    hasFeedback,
  } = useMyFeedback(assignment?.status === "completed" ? assignmentId : null)

  // Get activity count from assignment data
  const activityCount = assignment?.activity_count || 1
  const isMultiActivity = activityCount > 1

  // Optionally fetch multi-activity details for UI display (progress per activity)
  // Only fetch if this IS a multi-activity assignment and not completed
  const { data: multiActivityData } = useQuery({
    queryKey: ["assignments", assignmentId, "multi-activity-details"],
    queryFn: () => startMultiActivityAssignment(assignmentId),
    enabled: isMultiActivity && assignment?.status !== "completed",
    retry: false,
    staleTime: 30000, // Cache for 30 seconds
  })

  // Get completed activities count from multi-activity data if available
  const completedActivities = multiActivityData?.completed_activities_count || 0

  // Debug: Log routing decision - now always routes to play-multi
  console.log("Assignment routing:", {
    assignmentId,
    activityCount,
    isMultiActivity,
    status: assignment?.status,
    willRouteTo: "/play-multi", // Always use unified player
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            Loading assignment details...
          </p>
        </div>
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Assignment Not Found</CardTitle>
            <CardDescription>
              The assignment you're looking for doesn't exist or you don't have
              access to it.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => navigate({ to: "/student/assignments" })}
              className="w-full"
            >
              Back to Assignments
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const statusColors = {
    not_started: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
  }

  const statusLabels = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/student/assignments" })}
          className="mb-4"
        >
          ← Back to Assignments
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {assignment.assignment_name}
            </h1>
            <p className="text-muted-foreground">{assignment.book_title}</p>
          </div>
          <Badge className={statusColors[assignment.status]}>
            {statusLabels[assignment.status]}
          </Badge>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Assignment Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Instructions */}
          {assignment.instructions && (
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {assignment.instructions}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Activity Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isMultiActivity ? (
                  <>
                    <ListTodo className="h-5 w-5" />
                    Activities ({activityCount})
                  </>
                ) : (
                  <>
                    <ActivityIcon className="h-5 w-5" />
                    Activity Details
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Multi-activity progress summary */}
              {isMultiActivity && multiActivityData && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Progress
                    </span>
                    <span className="text-sm font-medium">
                      {completedActivities} of {activityCount} completed
                    </span>
                  </div>
                  <Progress
                    value={(completedActivities / activityCount) * 100}
                    className="h-2"
                  />
                </div>
              )}

              {/* Activity list for multi-activity */}
              {isMultiActivity && multiActivityData?.activities && (
                <div className="space-y-2">
                  {multiActivityData.activities.map((activity, index) => {
                    const progress = multiActivityData.activity_progress.find(
                      (p) => p.activity_id === activity.id,
                    )
                    const status = progress?.status || "not_started"

                    return (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          {/* Status icon */}
                          <div className="flex-shrink-0">
                            {status === "completed" ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : status === "in_progress" ? (
                              <div className="h-4 w-4 rounded-full border-2 border-yellow-500 bg-yellow-100" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                            )}
                          </div>
                          {/* Activity info */}
                          <div>
                            <p className="font-medium">
                              {index + 1}.{" "}
                              {activity.title || `Activity ${index + 1}`}
                            </p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {activity.activity_type
                                .replace(/([A-Z])/g, " $1")
                                .trim()}
                            </p>
                          </div>
                        </div>
                        {/* Score if completed */}
                        {progress?.score !== null &&
                          progress?.score !== undefined && (
                            <span className="text-sm font-medium text-green-600">
                              {Math.round(progress.score)}%
                            </span>
                          )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Single activity details */}
              {!isMultiActivity && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Activity
                    </p>
                    <p className="text-lg">{assignment.activity_title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Type
                    </p>
                    <p className="text-lg capitalize">
                      {assignment.activity_type
                        .replace(/([A-Z])/g, " $1")
                        .trim()}
                    </p>
                  </div>
                </>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Book
                </p>
                <p className="text-lg">{assignment.book_title}</p>
              </div>
            </CardContent>
          </Card>

          {/* Progress Information (if started or completed) */}
          {assignment.status !== "not_started" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <p className="text-lg">{statusLabels[assignment.status]}</p>
                </div>
                {assignment.score !== null && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Score
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {assignment.score}%
                    </p>
                  </div>
                )}
                {assignment.time_spent_minutes > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Time Spent
                    </p>
                    <p className="text-lg">
                      {assignment.time_spent_minutes} minutes
                    </p>
                  </div>
                )}
                {assignment.started_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Started At
                    </p>
                    <p className="text-lg">
                      {new Date(assignment.started_at).toLocaleDateString()} at{" "}
                      {new Date(assignment.started_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
                {assignment.completed_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Completed At
                    </p>
                    <p className="text-lg">
                      {new Date(assignment.completed_at).toLocaleDateString()}{" "}
                      at{" "}
                      {new Date(assignment.completed_at).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Score Breakdown for completed multi-activity assignments (Story 8.4) */}
          {assignment.status === "completed" && isMultiActivity && (
            <StudentScoreBreakdown assignmentId={assignmentId} />
          )}

          {/* Teacher Feedback Card (Story 6.4) */}
          {assignment.status === "completed" && (
            <Card id="feedback-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Teacher Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isFeedbackLoading ? (
                  <div className="py-4 text-center text-muted-foreground">
                    Loading feedback...
                  </div>
                ) : hasFeedback &&
                  feedback &&
                  isFeedbackStudentView(feedback) ? (
                  <div className="space-y-4">
                    {/* Badges display (Story 6.5, AC: 8) */}
                    {feedback.badges && feedback.badges.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Badges Awarded
                        </p>
                        <BadgeDisplay
                          badges={feedback.badges}
                          size="md"
                          showLabels
                        />
                      </div>
                    )}

                    {/* Feedback text with emoji reaction (Story 6.5, AC: 7) */}
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="flex items-start gap-3">
                        {/* Emoji reaction displayed prominently */}
                        {feedback.emoji_reactions &&
                          feedback.emoji_reactions.length > 0 && (
                            <span className="text-3xl flex-shrink-0">
                              {EMOJI_DISPLAY[feedback.emoji_reactions[0]] ||
                                feedback.emoji_reactions[0]}
                            </span>
                          )}
                        <p className="whitespace-pre-wrap text-muted-foreground flex-1">
                          {feedback.feedback_text}
                        </p>
                      </div>
                    </div>

                    {feedback.teacher_name && (
                      <p className="text-sm text-muted-foreground">
                        — {feedback.teacher_name}
                      </p>
                    )}
                    {feedback.updated_at && (
                      <p className="text-xs text-muted-foreground">
                        Posted on{" "}
                        {new Date(feedback.updated_at).toLocaleDateString()} at{" "}
                        {new Date(feedback.updated_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    {/* Reply to Teacher button (AC: 13) */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() =>
                        navigate({
                          to: "/messaging",
                          search: { user: feedback.teacher_user_id },
                        })
                      }
                    >
                      <Reply className="mr-2 h-4 w-4" />
                      Reply to Teacher
                    </Button>
                  </div>
                ) : (
                  <p className="py-4 text-center text-muted-foreground">
                    No feedback yet. Your teacher may provide feedback after
                    reviewing your work.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Due Date Card */}
          {assignment.due_date && (
            <Card
              className={
                assignment.is_past_due && assignment.status !== "completed"
                  ? "border-red-500"
                  : ""
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Due Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {new Date(assignment.due_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(assignment.due_date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {assignment.days_until_due !== null &&
                  assignment.status !== "completed" && (
                    <p
                      className={`text-sm mt-2 ${assignment.is_past_due ? "text-red-600 font-semibold" : "text-muted-foreground"}`}
                    >
                      {assignment.is_past_due ? (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Past Due
                        </span>
                      ) : (
                        `${assignment.days_until_due} day${assignment.days_until_due === 1 ? "" : "s"} remaining`
                      )}
                    </p>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Time Limit Card */}
          {assignment.time_limit_minutes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Time Limit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {assignment.time_limit_minutes} minutes
                </p>
                <p className="text-sm text-muted-foreground">
                  Complete within this time once started
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              {assignment.status === "not_started" && (
                <Button
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  size="lg"
                  onClick={() =>
                    navigate({
                      to: "/student/assignments/$assignmentId/play-multi",
                      params: { assignmentId },
                    })
                  }
                >
                  Start Assignment
                  {isMultiActivity && ` (${activityCount} activities)`}
                </Button>
              )}
              {assignment.status === "in_progress" && (
                <Button
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                  size="lg"
                  onClick={() =>
                    navigate({
                      to: "/student/assignments/$assignmentId/play-multi",
                      params: { assignmentId },
                    })
                  }
                >
                  {isMultiActivity
                    ? `Continue (${completedActivities}/${activityCount} done)`
                    : "Resume Assignment"}
                </Button>
              )}
              {assignment.status === "completed" && (
                <Button
                  variant={hasFeedback ? "default" : "outline"}
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    document
                      .getElementById("feedback-section")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      })
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {hasFeedback ? "View Feedback" : "No Feedback Yet"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
