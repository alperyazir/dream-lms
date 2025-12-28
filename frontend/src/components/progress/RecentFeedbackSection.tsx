/**
 * Recent Feedback Section Component
 * Story 22.2: My Progress Page Enhancement
 *
 * Displays recent teacher feedback on student assignments
 */

import { Link } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import { ExternalLink, MessageSquare } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { ProgressRecentAssignment } from "@/types/analytics"

export interface RecentFeedbackSectionProps {
  recentAssignments: ProgressRecentAssignment[]
  limit?: number
}

export function RecentFeedbackSection({
  recentAssignments,
  limit = 5,
}: RecentFeedbackSectionProps) {
  // Filter for only assignments with feedback and limit the results
  const assignmentsWithFeedback = recentAssignments
    .filter((assignment) => assignment.has_feedback)
    .slice(0, limit)

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Recent Feedback</h2>

      {assignmentsWithFeedback.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No feedback yet!</p>
            <p className="text-sm">
              Complete assignments to receive teacher feedback.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignmentsWithFeedback.map((assignment) => (
            <FeedbackCard key={assignment.id} assignment={assignment} />
          ))}
        </div>
      )}
    </section>
  )
}

function FeedbackCard({
  assignment,
}: {
  assignment: ProgressRecentAssignment
}) {
  const timeAgo = formatDistanceToNow(new Date(assignment.completed_at), {
    addSuffix: true,
  })

  // Get initials for avatar (assuming teacher name might be in metadata)
  // For now, using "T" for Teacher as we don't have teacher name in the data
  const teacherInitials = "T"

  return (
    <Link
      to="/student/assignments/$assignmentId"
      params={{ assignmentId: assignment.id }}
      className="block"
    >
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                {teacherInitials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-2">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{assignment.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {assignment.book_title} • Completed {timeAgo}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {assignment.score !== null && (
                    <Badge
                      variant={assignment.score >= 80 ? "default" : "secondary"}
                      className="whitespace-nowrap"
                    >
                      {assignment.score}%
                    </Badge>
                  )}
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Feedback preview */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>Teacher feedback available</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
