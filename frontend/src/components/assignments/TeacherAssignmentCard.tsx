import { Link } from "@tanstack/react-router"
import { Calendar, ClipboardCheck, Eye, Pencil, Trash2, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { AssignmentListItem } from "@/types/assignment"
import { AssignmentStatusBadge } from "./AssignmentStatusBadge"

interface TeacherAssignmentCardProps {
  assignment: AssignmentListItem
  onView: () => void
  onEdit?: () => void
  onDelete: () => void
}

export function TeacherAssignmentCard({
  assignment,
  onView,
  onEdit,
  onDelete,
}: TeacherAssignmentCardProps) {
  const completionPercent =
    assignment.total_students > 0
      ? Math.round((assignment.completed / assignment.total_students) * 100)
      : 0

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No due date"
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2 flex-1">
            {assignment.name}
          </CardTitle>
          <AssignmentStatusBadge
            status={assignment.status}
            dueDate={assignment.due_date}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>
              {assignment.total_students}{" "}
              {assignment.total_students === 1 ? "student" : "students"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(assignment.due_date)}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>
              {assignment.completed}/{assignment.total_students}
            </span>
          </div>
          <Progress value={completionPercent} className="h-2" />
        </div>

        {(assignment.pending_reviews_count ?? 0) > 0 && (
          <Link
            to="/teacher/assignments/$assignmentId"
            params={{ assignmentId: assignment.id }}
            search={{ tab: "students", openGrade: true, gradeStudentId: undefined }}
            onClick={(e) => e.stopPropagation()}
          >
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400 gap-1 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40"
            >
              <ClipboardCheck className="h-3 w-3" />
              {assignment.pending_reviews_count} awaiting review
            </Badge>
          </Link>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" onClick={onView}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
