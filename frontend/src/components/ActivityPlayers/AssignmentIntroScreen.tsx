/**
 * Assignment Introduction Screen
 * Displays assignment summary and navigation rules before starting
 *
 * Shows: assignment name, instructions, activity count, time limit, how to navigate
 */

import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Play,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ActivityWithConfig, MultiActivityStartResponse } from "@/types/assignment"

interface AssignmentIntroScreenProps {
  assignment: MultiActivityStartResponse
  onStart: () => void
  onBack: () => void
}

// Get the number of questions/items from an activity's config
function getActivityItemCount(activity: ActivityWithConfig): number {
  const config = activity.config_json
  if (!config) return 0

  const content = (config.content as Record<string, unknown>) || config

  // Check for different item arrays based on activity type
  if (Array.isArray(content.questions)) return content.questions.length
  if (Array.isArray(content.words)) return content.words.length
  if (Array.isArray(content.sentences)) return content.sentences.length
  if (Array.isArray(content.items)) return content.items.length

  return 0
}

export function AssignmentIntroScreen({
  assignment,
  onStart,
  onBack,
}: AssignmentIntroScreenProps) {
  const totalActivities = assignment.activities.length
  const timeLimit = assignment.time_limit_minutes

  // Calculate total questions/items across all activities
  const totalQuestions = assignment.activities.reduce(
    (sum, activity) => sum + getActivityItemCount(activity),
    0
  )

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{assignment.assignment_name}</CardTitle>
          {assignment.book_title && (
            <CardDescription className="flex items-center justify-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              {assignment.book_title}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Instructions */}
          {assignment.instructions && (
            <div className="rounded-lg bg-muted/50 p-4">
              <h3 className="mb-2 font-medium">Instructions</h3>
              <p className="text-sm text-muted-foreground">
                {assignment.instructions}
              </p>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <ListChecks className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalQuestions || totalActivities}</p>
                <p className="text-sm text-muted-foreground">
                  {totalQuestions > 0
                    ? (totalQuestions === 1 ? "Question" : "Questions")
                    : (totalActivities === 1 ? "Activity" : "Activities")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {timeLimit ? `${timeLimit} min` : "No limit"}
                </p>
                <p className="text-sm text-muted-foreground">Time Limit</p>
              </div>
            </div>
          </div>

          {/* How it works / Navigation rules */}
          <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4">
            <h3 className="mb-3 font-medium text-blue-900 dark:text-blue-100">How It Works</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <ChevronLeft className="h-3 w-3 text-blue-700 dark:text-blue-300" />
                  <ChevronRight className="h-3 w-3 -ml-1 text-blue-700 dark:text-blue-300" />
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Use <strong>Previous</strong> and <strong>Next</strong> buttons to navigate between questions
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <Save className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Your progress is <strong>saved automatically</strong> as you work
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  When all questions are answered, press <strong>Submit</strong> to complete the assignment
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={onStart} className="flex-1">
              <Play className="mr-2 h-4 w-4" />
              Start Assignment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AssignmentIntroScreen
