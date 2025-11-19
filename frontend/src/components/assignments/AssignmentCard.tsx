import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { useCountdown } from "@/hooks/useCountdown"
import { useNavigate } from "@tanstack/react-router"
import type { AssignmentFull, AssignmentStudent, Book } from "@/lib/mockData"
import type { StudentAssignmentResponse } from "@/types/assignment"

export interface AssignmentCardProps {
  assignment: AssignmentFull
  book: Book
  submission?: AssignmentStudent
}

export interface StudentAssignmentCardProps {
  assignment: StudentAssignmentResponse
}

/**
 * AssignmentCard Component
 *
 * Displays an assignment card for students with status, countdown timer, and action button.
 */
export function AssignmentCard({
  assignment,
  book,
  submission,
}: AssignmentCardProps) {
  const { timeLeft, isPastDue } = useCountdown(assignment.due_date)

  const status = submission?.status || "not_started"
  const score = submission?.score

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
    <Card className="shadow-neuro hover:shadow-neuro-lg transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1 line-clamp-2">
              {assignment.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {book.title}
            </p>
          </div>
          <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>
        </div>

        <div className="space-y-2">
          {/* Due Date / Countdown */}
          {status !== "completed" && !isPastDue && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Due in:</span>
              <span className="font-semibold text-teal-600">{timeLeft}</span>
            </div>
          )}

          {status !== "completed" && isPastDue && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-red-600">Past Due</span>
            </div>
          )}

          {/* Score for completed assignments */}
          {status === "completed" && score !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Score:</span>
              <span className="font-semibold text-green-600">{score}%</span>
            </div>
          )}

          {/* Due Date */}
          <div className="text-sm text-muted-foreground">
            Due: {new Date(assignment.due_date).toLocaleDateString()}{" "}
            {new Date(assignment.due_date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          {/* Time Limit */}
          {assignment.time_limit_minutes && (
            <div className="text-sm text-muted-foreground">
              Time limit: {assignment.time_limit_minutes} min
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        {status === "not_started" && (
          <Button
            className="w-full bg-teal-600 hover:bg-teal-700"
            aria-label={`Start assignment ${assignment.name}`}
            disabled
            title="Activity player coming in future story"
          >
            Start Assignment
          </Button>
        )}
        {status === "in_progress" && (
          <Button
            variant="secondary"
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            aria-label={`Resume assignment ${assignment.name}`}
            disabled
            title="Activity player coming in future story"
          >
            Resume Assignment
          </Button>
        )}
        {status === "completed" && (
          <Button
            variant="outline"
            className="w-full"
            aria-label={`Review assignment ${assignment.name}`}
            disabled
            title="Review feature coming in future story"
          >
            Review
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

/**
 * StudentAssignmentCard Component
 * Story 3.9: Student Assignment View & Dashboard
 *
 * Displays an assignment card for students using real API data.
 */
export function StudentAssignmentCard({
  assignment,
}: StudentAssignmentCardProps) {
  const { timeLeft } = useCountdown(assignment.due_date || "")
  const navigate = useNavigate()

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

  const handleCardClick = () => {
    navigate({
      to: "/student/assignments/$assignmentId",
      params: { assignmentId: assignment.assignment_id },
    })
  }

  return (
    <Card
      className="shadow-neuro hover:shadow-neuro-lg transition-all duration-300 cursor-pointer flex flex-col h-full"
      onClick={handleCardClick}
    >
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-1 line-clamp-2">
              {assignment.assignment_name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {assignment.book_title}
            </p>
          </div>
          <Badge className={`${statusColors[assignment.status]} flex-shrink-0 ml-2`}>
            {statusLabels[assignment.status]}
          </Badge>
        </div>

        <div className="space-y-2 flex-1">
          {/* Due Date / Countdown */}
          {assignment.status !== "completed" && assignment.due_date && !assignment.is_past_due && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Due in:</span>
              <span className="font-semibold text-teal-600">{timeLeft}</span>
            </div>
          )}

          {assignment.status !== "completed" && assignment.is_past_due && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-red-600">Past Due</span>
            </div>
          )}

          {/* Score for completed assignments */}
          {assignment.status === "completed" && assignment.score !== null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Score:</span>
              <span className="font-semibold text-green-600">{assignment.score}%</span>
            </div>
          )}

          {/* Due Date */}
          {assignment.due_date && (
            <div className="text-sm text-muted-foreground">
              Due: {new Date(assignment.due_date).toLocaleDateString()}{" "}
              {new Date(assignment.due_date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}

          {/* Time Limit */}
          {assignment.time_limit_minutes && (
            <div className="text-sm text-muted-foreground">
              Time limit: {assignment.time_limit_minutes} min
            </div>
          )}

          {/* Activity Info */}
          <div className="text-sm text-muted-foreground line-clamp-1">
            Activity: {assignment.activity_title}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 mt-auto">
        {assignment.status === "not_started" && (
          <Button
            className="w-full bg-teal-600 hover:bg-teal-700"
            aria-label={`Start assignment ${assignment.assignment_name}`}
            onClick={(e) => {
              e.stopPropagation()
              navigate({
                to: "/student/assignments/$assignmentId/play",
                params: { assignmentId: assignment.assignment_id },
              })
            }}
          >
            Start Assignment
          </Button>
        )}
        {assignment.status === "in_progress" && (
          <Button
            variant="secondary"
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            aria-label={`Resume assignment ${assignment.assignment_name}`}
            onClick={(e) => {
              e.stopPropagation()
              navigate({
                to: "/student/assignments/$assignmentId/play",
                params: { assignmentId: assignment.assignment_id },
              })
            }}
          >
            Resume Assignment
          </Button>
        )}
        {assignment.status === "completed" && (
          <Button
            variant="outline"
            className="w-full"
            aria-label={`Review assignment ${assignment.assignment_name}`}
            disabled
            title="Review feature coming in future story"
            onClick={(e) => e.stopPropagation()}
          >
            View Feedback
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
