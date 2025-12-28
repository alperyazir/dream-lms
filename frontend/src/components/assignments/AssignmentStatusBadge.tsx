import { Badge } from "@/components/ui/badge"
import type { AssignmentPublishStatus } from "@/types/assignment"

interface AssignmentStatusBadgeProps {
  status: AssignmentPublishStatus
  dueDate?: string | null
  className?: string
}

export function AssignmentStatusBadge({
  status,
  dueDate,
  className,
}: AssignmentStatusBadgeProps) {
  // Check if past due (only for published assignments)
  const isPastDue =
    status === "published" && dueDate && new Date(dueDate) < new Date()

  if (isPastDue) {
    return (
      <Badge variant="destructive" className={className}>
        Past Due
      </Badge>
    )
  }

  switch (status) {
    case "draft":
      return (
        <Badge
          variant="outline"
          className={`border-gray-400 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 ${className || ""}`}
        >
          Draft
        </Badge>
      )
    case "scheduled":
      return (
        <Badge
          variant="outline"
          className={`border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 ${className || ""}`}
        >
          Scheduled
        </Badge>
      )
    case "published":
      return (
        <Badge
          variant="outline"
          className={`border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 ${className || ""}`}
        >
          Active
        </Badge>
      )
    case "archived":
      return (
        <Badge variant="secondary" className={className}>
          Archived
        </Badge>
      )
    default:
      return null
  }
}
