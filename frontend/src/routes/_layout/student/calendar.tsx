/**
 * Student Calendar Page
 *
 * Calendar view for students to see their assignments by due date with:
 * - Monthly calendar view with assignment display
 * - Assignment popover details
 * - List view alternative
 * - Status indicators (not_started, in_progress, completed)
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  addMonths,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import {
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Grid,
  List,
  PlayCircle,
} from "lucide-react"
import { useMemo, useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getStudentCalendarAssignments,
  type StudentCalendarFilters,
} from "@/services/assignmentsApi"
import type {
  AssignmentStatus,
  StudentCalendarAssignmentItem,
} from "@/types/assignment"

export const Route = createFileRoute("/_layout/student/calendar")({
  component: () => (
    <ErrorBoundary>
      <StudentCalendarPage />
    </ErrorBoundary>
  ),
})

type ViewMode = "calendar" | "list"

function StudentCalendarPage() {
  const navigate = useNavigate()

  // State for current month
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("calendar")

  // Calculate date range for current month view
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  // Build filter params
  const filterParams: StudentCalendarFilters = useMemo(
    () => ({
      startDate: format(subMonths(monthStart, 1), "yyyy-MM-dd"),
      endDate: format(addMonths(monthEnd, 1), "yyyy-MM-dd"),
    }),
    [monthStart, monthEnd],
  )

  // Fetch calendar assignments
  const {
    data: calendarData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["student-calendar-assignments", filterParams],
    queryFn: () => getStudentCalendarAssignments(filterParams),
  })

  // Navigate to previous/next month
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const days: Date[] = []
    const start = startOfWeek(monthStart, { weekStartsOn: 0 }) // Start on Sunday

    // Generate 6 weeks (42 days) to ensure full coverage
    for (let i = 0; i < 42; i++) {
      days.push(new Date(start.getTime() + i * 24 * 60 * 60 * 1000))
    }

    return days
  }, [monthStart])

  // Get assignments for a specific date
  const getAssignmentsForDate = (
    date: Date,
  ): StudentCalendarAssignmentItem[] => {
    if (!calendarData?.assignments_by_date) return []
    const dateKey = format(date, "yyyy-MM-dd")
    return calendarData.assignments_by_date[dateKey] || []
  }

  // Get all assignments as flat list
  const allAssignments = useMemo(() => {
    if (!calendarData?.assignments_by_date) return []
    const assignments: (StudentCalendarAssignmentItem & { dateKey: string })[] =
      []
    for (const [dateKey, dateAssignments] of Object.entries(
      calendarData.assignments_by_date,
    )) {
      for (const assignment of dateAssignments) {
        assignments.push({ ...assignment, dateKey })
      }
    }
    // Sort by date
    return assignments.sort(
      (a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime(),
    )
  }, [calendarData])

  // Get badge styles for status
  const getStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case "completed":
        return {
          className:
            "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
          label: "Completed",
          Icon: CheckCircle,
        }
      case "in_progress":
        return {
          className:
            "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
          label: "In Progress",
          Icon: PlayCircle,
        }
      case "not_started":
      default:
        return {
          className:
            "border-gray-400 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800",
          label: "Not Started",
          Icon: Clock,
        }
    }
  }

  // Render assignment item (used in both calendar cell and list view)
  const renderAssignmentItem = (
    assignment: StudentCalendarAssignmentItem,
    isCompact = false,
  ) => {
    const statusBadge = getStatusBadge(assignment.status)

    if (isCompact) {
      // Compact pill for calendar cell
      return (
        <Popover key={assignment.id}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate ${
                assignment.status === "completed"
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : assignment.status === "in_progress"
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                    : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
              } hover:opacity-80 cursor-pointer`}
            >
              {assignment.name}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <AssignmentPopoverContent assignment={assignment} />
          </PopoverContent>
        </Popover>
      )
    }

    // Full card for list view
    return (
      <Card
        key={assignment.id}
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() =>
          navigate({
            to: "/student/assignments/$assignmentId",
            params: { assignmentId: assignment.id },
          })
        }
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{assignment.name}</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="truncate">{assignment.book_title}</span>
              </div>
            </div>
            <Badge variant="outline" className={statusBadge.className}>
              <statusBadge.Icon className="w-3 h-3 mr-1" />
              {statusBadge.label}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {assignment.due_date && (
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                Due {format(new Date(assignment.due_date), "MMM d, h:mm a")}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {assignment.activity_count}{" "}
              {assignment.activity_count === 1 ? "activity" : "activities"}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">My Calendar</h1>
        <p className="text-muted-foreground">
          Track your assignments and due dates
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousMonth}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[180px] text-center">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>

            {/* View Toggle */}
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode("calendar")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar / List View */}
      {isLoading ? (
        <CalendarSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center text-red-600">
            <p>Error loading calendar: {(error as Error).message}</p>
          </CardContent>
        </Card>
      ) : viewMode === "calendar" ? (
        /* Calendar Grid View */
        <Card>
          <CardContent className="p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const dayAssignments = getAssignmentsForDate(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isDayToday = isToday(day)

                return (
                  <div
                    key={index}
                    className={`min-h-[100px] border rounded-md p-1 ${
                      isCurrentMonth
                        ? "bg-background"
                        : "bg-muted/30 text-muted-foreground"
                    } ${isDayToday ? "ring-2 ring-teal-500" : ""}`}
                  >
                    {/* Day Number */}
                    <div
                      className={`text-right text-sm mb-1 ${
                        isDayToday
                          ? "font-bold text-teal-600 dark:text-teal-400"
                          : ""
                      }`}
                    >
                      {format(day, "d")}
                    </div>

                    {/* Assignments */}
                    <div className="space-y-0.5">
                      {dayAssignments.slice(0, 3).map((assignment) =>
                        renderAssignmentItem(assignment, true),
                      )}
                      {dayAssignments.length > 3 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
                            >
                              +{dayAssignments.length - 3} more
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="start">
                            <div className="space-y-2">
                              <h4 className="font-medium">
                                {format(day, "MMMM d, yyyy")}
                              </h4>
                              <div className="space-y-1 max-h-[300px] overflow-auto">
                                {dayAssignments.map((assignment) => (
                                  <div
                                    key={assignment.id}
                                    className="p-2 rounded border hover:bg-muted cursor-pointer"
                                    onClick={() =>
                                      navigate({
                                        to: "/student/assignments/$assignmentId",
                                        params: { assignmentId: assignment.id },
                                      })
                                    }
                                  >
                                    <div className="font-medium text-sm truncate">
                                      {assignment.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {assignment.book_title}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Assignments in {format(currentDate, "MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allAssignments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No assignments due this month.</p>
                <p className="text-sm mt-2">
                  Check your assignments page for more details.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Group by date */}
                {Object.entries(
                  allAssignments.reduce(
                    (acc, assignment) => {
                      const dateLabel = format(
                        new Date(assignment.dateKey),
                        "EEEE, MMMM d",
                      )
                      if (!acc[dateLabel]) acc[dateLabel] = []
                      acc[dateLabel].push(assignment)
                      return acc
                    },
                    {} as Record<string, StudentCalendarAssignmentItem[]>,
                  ),
                ).map(([dateLabel, assignments]) => (
                  <div key={dateLabel}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {dateLabel}
                    </h4>
                    <div className="space-y-2">
                      {assignments.map((assignment) =>
                        renderAssignmentItem(assignment),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Assignment Popover Content Component
function AssignmentPopoverContent({
  assignment,
}: {
  assignment: StudentCalendarAssignmentItem
}) {
  const navigate = useNavigate()
  const statusBadge = getStatusBadgeHelper(assignment.status)

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">{assignment.name}</h4>
        <Badge variant="outline" className={statusBadge.className}>
          <statusBadge.Icon className="w-3 h-3 mr-1" />
          {statusBadge.label}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          {assignment.book_title}
        </div>

        {assignment.due_date && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="w-4 h-4" />
            Due: {format(new Date(assignment.due_date), "PPp")}
          </div>
        )}

        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          {assignment.activity_count}{" "}
          {assignment.activity_count === 1 ? "activity" : "activities"}
        </div>
      </div>

      <Button
        size="sm"
        className="w-full bg-teal-600 hover:bg-teal-700"
        onClick={() =>
          navigate({
            to: "/student/assignments/$assignmentId",
            params: { assignmentId: assignment.id },
          })
        }
      >
        {assignment.status === "completed"
          ? "View Results"
          : assignment.status === "in_progress"
            ? "Continue"
            : "Start Assignment"}
      </Button>
    </div>
  )
}

// Helper function for status badge (to avoid code duplication)
function getStatusBadgeHelper(status: AssignmentStatus) {
  switch (status) {
    case "completed":
      return {
        className:
          "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
        label: "Completed",
        Icon: CheckCircle,
      }
    case "in_progress":
      return {
        className:
          "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
        label: "In Progress",
        Icon: PlayCircle,
      }
    case "not_started":
    default:
      return {
        className:
          "border-gray-400 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800",
        label: "Not Started",
        Icon: Clock,
      }
  }
}

// Loading Skeleton
function CalendarSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
