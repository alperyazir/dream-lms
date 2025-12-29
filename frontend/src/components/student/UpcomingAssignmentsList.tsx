/**
 * Upcoming Assignments List Component
 * Story 22.1: Dashboard Layout Refactor
 * Displays next 3-5 upcoming assignments ordered by due date
 */

import { Link } from "@tanstack/react-router"
import { format, isPast, isToday, isTomorrow } from "date-fns"
import { Calendar, ChevronRight, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { StudentAssignmentResponse } from "@/types/assignment"

export interface UpcomingAssignmentsListProps {
  assignments: StudentAssignmentResponse[]
  limit?: number
}

export function UpcomingAssignmentsList({
  assignments,
  limit = 5,
}: UpcomingAssignmentsListProps) {
  // Filter to only upcoming (not completed)
  const upcomingAssignments = assignments
    .filter((a) => a.status !== "completed")
    .sort((a, b) => {
      // Sort by due date (earliest first), assignments without due date go to end
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1 // a goes after b
      if (!b.due_date) return -1 // a goes before b
      const dateA = new Date(a.due_date).getTime()
      const dateB = new Date(b.due_date).getTime()
      return dateA - dateB
    })
    .slice(0, limit)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Upcoming Assignments</CardTitle>
          <Button variant="link" size="sm" asChild>
            <Link to="/student/assignments">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {upcomingAssignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No upcoming assignments!</p>
            <p className="text-sm">You're all caught up. 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingAssignments.map((assignment) => (
              <AssignmentRow
                key={assignment.assignment_id}
                assignment={assignment}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AssignmentRowProps {
  assignment: StudentAssignmentResponse
}

function AssignmentRow({ assignment }: AssignmentRowProps) {
  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null
  const isOverdue = dueDate ? isPast(dueDate) : false
  const isDueToday = dueDate ? isToday(dueDate) : false
  const isDueTomorrow = dueDate ? isTomorrow(dueDate) : false

  const getDueDateLabel = () => {
    if (!dueDate) return "No due date"
    if (isOverdue) return "Overdue"
    if (isDueToday) return "Due Today"
    if (isDueTomorrow) return "Due Tomorrow"
    return format(dueDate, "MMM d, h:mm a")
  }

  const getDueDateVariant = (): "destructive" | "default" | "secondary" => {
    if (!dueDate) return "secondary"
    if (isOverdue) return "destructive"
    if (isDueToday) return "default" // Changed from "warning" to "default" as "warning" might not exist
    return "secondary"
  }

  return (
    <Link
      to="/student/assignments/$assignmentId"
      params={{ assignmentId: assignment.assignment_id }}
      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{assignment.assignment_name}</p>
        {dueDate && (
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{format(dueDate, "h:mm a")}</span>
          </div>
        )}
      </div>
      <Badge variant={getDueDateVariant()} className="ml-3 whitespace-nowrap">
        {getDueDateLabel()}
      </Badge>
    </Link>
  )
}
