/**
 * Step 1: Review Activity - Story 3.7
 *
 * Displays activity details for teacher review before creating assignment
 */

import { BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ACTIVITY_TYPE_CONFIG, type Activity, type Book } from "@/types/book"

interface StepReviewActivityProps {
  activity: Activity
  book: Book
}

export function StepReviewActivity({ activity, book }: StepReviewActivityProps) {
  const activityConfig = ACTIVITY_TYPE_CONFIG[activity.activity_type]

  // Extract description from config_json if available
  const description =
    activity.config_json?.headerText ||
    activity.config_json?.instruction ||
    "No description available"

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          {/* Activity Title */}
          <h3 className="text-2xl font-bold mb-3 text-foreground">
            {activity.title || "Untitled Activity"}
          </h3>

          {/* Book Title */}
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm">{book.title}</span>
          </div>

          {/* Activity Type Badge */}
          <div className="mb-4">
            <Badge variant={activityConfig.badgeVariant}>{activityConfig.label}</Badge>
          </div>

          {/* Description */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
              Description
            </h4>
            <p className="text-sm text-foreground">{description}</p>
          </div>

          {/* Activity Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-muted-foreground">Publisher:</span>{" "}
              <span className="text-foreground">{book.publisher_name}</span>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">Type:</span>{" "}
              <span className="text-foreground">{activityConfig.label}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <p className="text-sm text-muted-foreground text-center">
        Review the activity details above, then click "Next" to select recipients.
      </p>
    </div>
  )
}
