import { Link } from "@tanstack/react-router"
import { ClipboardCheck, Eye, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AssignmentListItem } from "@/types/assignment"
import { AssignmentStatusBadge } from "./AssignmentStatusBadge"

interface AssignmentTableViewProps {
  assignments: AssignmentListItem[]
  onView: (assignment: AssignmentListItem) => void
  onEdit?: (assignment: AssignmentListItem) => void
  onDelete: (assignment: AssignmentListItem) => void
  sortBy?: string
  onSort?: (column: string) => void
}

export function AssignmentTableView({
  assignments,
  onView,
  onEdit,
  onDelete,
  sortBy,
  onSort,
}: AssignmentTableViewProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead
              className="cursor-pointer hover:bg-accent"
              onClick={() => onSort?.("due_date")}
            >
              Due Date {sortBy === "due_date" && "↓"}
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-muted-foreground"
              >
                No assignments found
              </TableCell>
            </TableRow>
          ) : (
            assignments.map((assignment) => {
              const completionPercent =
                assignment.total_students > 0
                  ? Math.round(
                      (assignment.completed / assignment.total_students) * 100,
                    )
                  : 0

              return (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium max-w-xs">
                    <div className="line-clamp-2">{assignment.name}</div>
                  </TableCell>
                  <TableCell>
                    {assignment.total_students}{" "}
                    {assignment.total_students === 1 ? "student" : "students"}
                  </TableCell>
                  <TableCell>{formatDate(assignment.due_date)}</TableCell>
                  <TableCell>
                    <AssignmentStatusBadge
                      status={assignment.status}
                      dueDate={assignment.due_date}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={completionPercent}
                        className="w-20 h-2"
                      />
                      <span className="text-xs text-muted-foreground min-w-[3rem]">
                        {assignment.completed}/{assignment.total_students}
                      </span>
                      {(assignment.pending_reviews_count ?? 0) > 0 && (
                        <Link
                          to="/teacher/assignments/$assignmentId"
                          params={{ assignmentId: assignment.id }}
                          search={{ tab: "students", openGrade: true, gradeStudentId: undefined }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge
                            variant="outline"
                            className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400 gap-1 text-xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40"
                          >
                            <ClipboardCheck className="h-3 w-3" />
                            {assignment.pending_reviews_count}
                          </Badge>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(assignment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(assignment)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(assignment)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
