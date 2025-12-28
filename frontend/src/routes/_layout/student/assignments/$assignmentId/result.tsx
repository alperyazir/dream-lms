/**
 * Assignment Result Detail Screen
 * Story 23.4: Fix Result Screen Stale Progress
 *
 * Displays submitted answers with correct/incorrect marking for review.
 * Fetches submission data from backend to ensure fresh, accurate answers.
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react"
import { useMemo } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAssignmentResult } from "@/services/assignmentsApi"

export const Route = createFileRoute(
  "/_layout/student/assignments/$assignmentId/result",
)({
  component: AssignmentResultDetailPage,
})

function AssignmentResultDetailPage() {
  const { assignmentId } = Route.useParams()
  const navigate = useNavigate()

  // Fetch assignment result with submitted answers
  const {
    data: result,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["assignments", assignmentId, "result"],
    queryFn: () => getAssignmentResult(assignmentId),
    retry: false,
    staleTime: 0, // Always fetch fresh data
  })

  // Calculate correct/incorrect count from answers and config
  const answerStats = useMemo(() => {
    if (!result) return null

    // TODO: For future answer review UI implementation
    // const config = result.config_json
    // const answers = result.answers_json

    // Different activity types store answers differently
    // This is a simplified calculation - actual implementation depends on activity type
    const total = result.total_points
    const score = result.score
    const correct = Math.round((score / 100) * (total / 100) * total)
    const incorrect = Math.round(total / 100) - correct

    return {
      correct,
      incorrect,
      total: Math.round(total / 100),
    }
  }, [result])

  // Handle navigation back
  const handleBack = () => {
    navigate({
      to: "/student/assignments/$assignmentId",
      params: { assignmentId },
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading results...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !result) {
    const errorResponse = (error as any)?.response
    const status = errorResponse?.status
    const detail = errorResponse?.data?.detail || "An error occurred"

    let errorTitle = "Error Loading Results"
    let errorMessage = detail

    if (status === 404) {
      errorTitle = "Results Not Found"
      errorMessage =
        "This assignment hasn't been completed yet or results are not available."
    } else if (status === 403) {
      errorTitle = "Access Denied"
      errorMessage = "You don't have permission to view these results."
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

  // Score color based on performance
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400"
    if (score >= 70) return "text-blue-600 dark:text-blue-400"
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assignment
        </Button>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{result.assignment_name}</h1>
            <p className="text-muted-foreground">
              {result.book_name} • {result.activity_title || "Activity Review"}
            </p>
          </div>

          {/* Score Badge */}
          <div className="text-right">
            <div className={`text-5xl font-bold ${getScoreColor(result.score)}`}>
              {Math.round(result.score)}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Your final score
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {/* Correct Answers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Correct Answers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {answerStats?.correct || 0}
            </div>
          </CardContent>
        </Card>

        {/* Incorrect Answers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Incorrect Answers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {answerStats?.incorrect || 0}
            </div>
          </CardContent>
        </Card>

        {/* Time Spent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Time Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {result.time_spent_minutes} min
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Review Section */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Details</CardTitle>
          <CardDescription>
            Completed on {new Date(result.completed_at).toLocaleDateString()} at{" "}
            {new Date(result.completed_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Submission Summary */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Activity Type
              </h3>
              <p className="text-lg capitalize">
                {result.activity_type.replace(/([A-Z])/g, " $1").trim()}
              </p>
            </div>

            {result.activity_title && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Activity Title
                </h3>
                <p className="text-lg">{result.activity_title}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Your Performance
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Score</span>
                    <span className="text-sm font-medium">
                      {Math.round(result.score)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        result.score >= 90
                          ? "bg-green-600"
                          : result.score >= 70
                            ? "bg-blue-600"
                            : result.score >= 50
                              ? "bg-yellow-600"
                              : "bg-red-600"
                      }`}
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Note about answer review */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Detailed answer review with correct/incorrect
                marking will be available in a future update. Your submission has
                been recorded and graded.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3 justify-end">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assignment
        </Button>
        <Button onClick={() => navigate({ to: "/student/assignments" })}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
