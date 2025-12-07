/**
 * Multi-Activity Analytics Table Component
 * Story 8.4: Multi-Activity Assignment Analytics
 *
 * Displays per-activity analytics with expandable rows for per-student details.
 */

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Users,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAssignmentAnalytics } from "@/hooks/useAssignmentAnalytics"
import type {
  ActivityAnalyticsItem,
  StudentActivityScore,
} from "@/types/assignment"
import { exportMultiActivityAnalytics } from "@/utils/exportAnalytics"

interface MultiActivityAnalyticsTableProps {
  assignmentId: string
}

/**
 * Format activity type for display
 */
function formatActivityType(type: string): string {
  const typeMap: Record<string, string> = {
    circle: "Circle",
    drag_drop_picture: "Drag & Drop Picture",
    drag_drop_word: "Drag & Drop Word",
    fill_blank: "Fill in the Blank",
    match_words: "Match the Words",
    multiple_choice: "Multiple Choice",
    coloring: "Coloring",
    drawing: "Drawing",
  }
  return (
    typeMap[type] ||
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

/**
 * Format score for display (percentage or N/A)
 */
function formatScore(score: number | null, maxScore?: number): string {
  if (score === null) return "N/A"
  if (maxScore && maxScore > 0) {
    return `${Math.round((score / maxScore) * 100)}%`
  }
  return `${Math.round(score)}%`
}

/**
 * Get status badge variant
 */
function getStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "completed":
      return "default"
    case "in_progress":
      return "secondary"
    default:
      return "outline"
  }
}

/**
 * Expanded row showing per-student scores
 */
function StudentScoresRow({
  students,
  isLoading,
}: {
  students: StudentActivityScore[] | null
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <TableRow className="bg-muted/30">
        <TableCell colSpan={6} className="py-4">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading student scores...</span>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  if (!students || students.length === 0) {
    return (
      <TableRow className="bg-muted/30">
        <TableCell
          colSpan={6}
          className="py-4 text-center text-muted-foreground"
        >
          No student submissions yet
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      <TableRow className="bg-muted/30 hover:bg-muted/40">
        <TableCell />
        <TableCell colSpan={5}>
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground py-2">
            <span>Student Name</span>
            <span>Status</span>
            <span>Score</span>
            <span>Time Spent</span>
          </div>
        </TableCell>
      </TableRow>
      {students.map((student) => (
        <TableRow
          key={student.student_id}
          className="bg-muted/30 hover:bg-muted/40"
        >
          <TableCell />
          <TableCell colSpan={5}>
            <div className="grid grid-cols-4 gap-4 text-sm py-1">
              <span className="font-medium">{student.student_name}</span>
              <span>
                <Badge variant={getStatusBadgeVariant(student.status)}>
                  {student.status.replace("_", " ")}
                </Badge>
              </span>
              <span>
                {formatScore(student.score, student.max_score)}
                {student.score !== null && (
                  <span className="text-muted-foreground ml-1">
                    ({student.score}/{student.max_score})
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">
                {Math.floor(student.time_spent_seconds / 60)}m{" "}
                {student.time_spent_seconds % 60}s
              </span>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

/**
 * Single activity row with expand capability
 */
function ActivityRow({
  activity,
  isExpanded,
  onToggleExpand,
  expandedStudents,
  isLoadingStudents,
}: {
  activity: ActivityAnalyticsItem
  isExpanded: boolean
  onToggleExpand: () => void
  expandedStudents: StudentActivityScore[] | null
  isLoadingStudents: boolean
}) {
  const completionPercent = Math.round(activity.completion_rate * 100)

  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggleExpand}>
        <TableCell className="w-10">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {activity.activity_title ||
                `Activity on Page ${activity.page_number}`}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">
            {formatActivityType(activity.activity_type)}
          </Badge>
        </TableCell>
        <TableCell className="text-center">{activity.page_number}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Progress value={completionPercent} className="w-20" />
            <span className="text-sm text-muted-foreground w-12">
              {completionPercent}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({activity.completed_count}/{activity.total_assigned_count})
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right font-medium">
          {activity.class_average_score !== null
            ? `${Math.round(activity.class_average_score)}%`
            : "N/A"}
        </TableCell>
      </TableRow>
      {isExpanded && (
        <StudentScoresRow
          students={expandedStudents}
          isLoading={isLoadingStudents}
        />
      )}
    </>
  )
}

/**
 * Loading skeleton for the table
 */
function TableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

/**
 * Main analytics table component
 */
export function MultiActivityAnalyticsTable({
  assignmentId,
}: MultiActivityAnalyticsTableProps) {
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(
    null,
  )

  // Fetch base analytics
  const {
    data: analytics,
    isLoading,
    error,
  } = useAssignmentAnalytics(assignmentId)

  // Fetch expanded student data when an activity is expanded
  const { data: expandedData, isLoading: isLoadingExpanded } =
    useAssignmentAnalytics(
      assignmentId,
      expandedActivityId || undefined,
      Boolean(expandedActivityId),
    )

  const handleToggleExpand = (activityId: string) => {
    setExpandedActivityId((prev) => (prev === activityId ? null : activityId))
  }

  if (isLoading) {
    return <TableSkeleton />
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Failed to load analytics. Please try again.
      </div>
    )
  }

  if (!analytics || analytics.activities.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No activities found for this assignment.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {analytics.submitted_count} of {analytics.total_students} students
              submitted
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{analytics.activities.length} activities</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportMultiActivityAnalytics(analytics)}
        >
          Export Results
        </Button>
      </div>

      {/* Analytics table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Activity</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Page</TableHead>
            <TableHead>Completion</TableHead>
            <TableHead className="text-right">Class Avg</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {analytics.activities.map((activity) => (
            <ActivityRow
              key={activity.activity_id}
              activity={activity}
              isExpanded={expandedActivityId === activity.activity_id}
              onToggleExpand={() => handleToggleExpand(activity.activity_id)}
              expandedStudents={
                expandedActivityId === activity.activity_id
                  ? expandedData?.expanded_students || null
                  : null
              }
              isLoadingStudents={
                expandedActivityId === activity.activity_id && isLoadingExpanded
              }
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
