import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { useCountdown } from "@/hooks/useCountdown"
import type { AssignmentFull, AssignmentStudent, Book } from "@/lib/mockData"

export interface AssignmentCardProps {
  assignment: AssignmentFull
  book: Book
  submission?: AssignmentStudent
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
