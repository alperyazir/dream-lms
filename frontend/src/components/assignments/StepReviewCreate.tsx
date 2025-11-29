/**
 * Step 4: Review & Create - Story 3.7
 *
 * Displays a summary of all assignment settings before creation
 */

import { format } from "date-fns"
import { BookOpen, Calendar, Clock, FileText, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AssignmentFormData } from "@/types/assignment"
import { ACTIVITY_TYPE_CONFIG, type Activity, type Book } from "@/types/book"

interface StepReviewCreateProps {
  activity: Activity
  book: Book
  formData: AssignmentFormData
}

export function StepReviewCreate({
  activity,
  book,
  formData,
}: StepReviewCreateProps) {
  const activityConfig = ACTIVITY_TYPE_CONFIG[activity.activity_type]

  // Calculate total recipients count
  const totalRecipients =
    formData.class_ids.length + formData.student_ids.length

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Review Assignment</h3>
        <p className="text-sm text-muted-foreground">
          Please review the details below before creating the assignment
        </p>
      </div>

      {/* Activity Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-semibold text-lg text-foreground">
              {activity.title || "Untitled Activity"}
            </p>
            <p className="text-sm text-muted-foreground">{book.title}</p>
          </div>
          <div>
            <Badge variant={activityConfig.badgeVariant}>
              {activityConfig.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Assignment Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Name</p>
            <p className="text-base text-foreground">{formData.name}</p>
          </div>

          {/* Instructions */}
          {formData.instructions && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Instructions
              </p>
              <p className="text-base text-foreground whitespace-pre-wrap">
                {formData.instructions}
              </p>
            </div>
          )}

          {/* Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Due Date
              </p>
              <p className="text-base text-foreground">
                {formData.due_date
                  ? format(formData.due_date, "MMM dd, yyyy")
                  : "No due date"}
              </p>
            </div>

            {/* Time Limit */}
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Time Limit
              </p>
              <p className="text-base text-foreground">
                {formData.time_limit_minutes
                  ? `${formData.time_limit_minutes} minutes`
                  : "No time limit"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Recipients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {totalRecipients} total recipient
              {totalRecipients !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Classes</p>
              <p className="font-medium text-foreground">
                {formData.class_ids.length || "None"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Individual Students</p>
              <p className="font-medium text-foreground">
                {formData.student_ids.length || "None"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
        <p className="text-sm text-center text-teal-900 dark:text-teal-100">
          Click "Create Assignment" to finalize and distribute this assignment
          to all selected recipients.
        </p>
      </div>
    </div>
  )
}
