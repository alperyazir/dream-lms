/**
 * Assignment Detail Page
 * Story 3.9: Student Assignment View & Dashboard
 *
 * Displays detailed information about a specific assignment including:
 * - Assignment name, instructions, due date
 * - Book and activity information
 * - Student's progress (status, score, time spent)
 * - Action buttons (Start Assignment, View Feedback)
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { getStudentAssignments } from "@/services/assignmentsApi"
import { Clock, Calendar, Activity as ActivityIcon, CheckCircle2, AlertCircle } from "lucide-react"

export const Route = createFileRoute("/_layout/student/assignments/$assignmentId/")({
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
  const { data: assignments = [], isLoading, error } = useQuery({
    queryKey: ["studentAssignments"],
    queryFn: () => getStudentAssignments(),
  })

  const assignment = assignments.find((a) => a.assignment_id === assignmentId)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Loading assignment details...</p>
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
              The assignment you're looking for doesn't exist or you don't have access to it.
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
            <h1 className="text-3xl font-bold mb-2">{assignment.assignment_name}</h1>
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
                <ActivityIcon className="h-5 w-5" />
                Activity Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Activity</p>
                <p className="text-lg">{assignment.activity_title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="text-lg capitalize">{assignment.activity_type.replace(/([A-Z])/g, ' $1').trim()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Book</p>
                <p className="text-lg">{assignment.book_title}</p>
              </div>
            </CardContent>
          </Card>

          {/* Progress Information (if started or completed) */}
          {(assignment.status !== "not_started") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-lg">{statusLabels[assignment.status]}</p>
                </div>
                {assignment.score !== null && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Score</p>
                    <p className="text-2xl font-bold text-green-600">{assignment.score}%</p>
                  </div>
                )}
                {assignment.time_spent_minutes > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Time Spent</p>
                    <p className="text-lg">{assignment.time_spent_minutes} minutes</p>
                  </div>
                )}
                {assignment.started_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Started At</p>
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
                    <p className="text-sm font-medium text-muted-foreground">Completed At</p>
                    <p className="text-lg">
                      {new Date(assignment.completed_at).toLocaleDateString()} at{" "}
                      {new Date(assignment.completed_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Due Date Card */}
          {assignment.due_date && (
            <Card className={assignment.is_past_due && assignment.status !== "completed" ? "border-red-500" : ""}>
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
                {assignment.days_until_due !== null && assignment.status !== "completed" && (
                  <p className={`text-sm mt-2 ${assignment.is_past_due ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
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
                  onClick={() => navigate({
                    to: "/student/assignments/$assignmentId/play",
                    params: { assignmentId },
                  })}
                >
                  Start Assignment
                </Button>
              )}
              {assignment.status === "in_progress" && (
                <Button
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                  size="lg"
                  onClick={() => navigate({
                    to: "/student/assignments/$assignmentId/play",
                    params: { assignmentId },
                  })}
                >
                  Resume Assignment
                </Button>
              )}
              {assignment.status === "completed" && (
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled
                  title="Feedback feature coming in future story"
                >
                  View Feedback
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
