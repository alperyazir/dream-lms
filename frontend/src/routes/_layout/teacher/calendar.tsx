/**
 * Teacher Calendar Page - Story 9.6: Calendar-Based Assignment Scheduling
 *
 * Full-featured calendar view for managing assignments with:
 * - Monthly and weekly calendar views with assignment display
 * - Assignment popover details with Publish Now action
 * - Filter by class, status, and book
 * - List view alternative
 * - Click-to-create on calendar dates
 * - Past due visual indication
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns"
import {
  AlertCircle,
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Filter,
  Grid,
  List,
  Plus,
  Send,
  Sparkles,
  Timer,
  Trash2,
  Users,
} from "lucide-react"
import { useMemo, useState } from "react"
import { FiCalendar } from "react-icons/fi"
import { TeachersService } from "@/client"
import { AssignmentWizardSheet } from "@/components/assignments/AssignmentWizardSheet"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  type CalendarFilters,
  deleteAssignment,
  getCalendarAssignments,
  updateAssignment,
} from "@/services/assignmentsApi"
import * as booksApi from "@/services/booksApi"
import type {
  AssignmentPublishStatus,
  CalendarAssignmentItem,
} from "@/types/assignment"

export const Route = createFileRoute("/_layout/teacher/calendar")({
  component: () => (
    <ErrorBoundary>
      <TeacherCalendarPage />
    </ErrorBoundary>
  ),
})

type ViewMode = "month" | "week" | "list"

function TeacherCalendarPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { toast } = useToast()

  // State for current date and filters
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [bookFilter, setBookFilter] = useState<string>("all")
  // State for delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<CalendarAssignmentItem | null>(null)
  // State for wizard sheet
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [wizardPublishDate, setWizardPublishDate] = useState<string | null>(null)

  // Calculate date range for current view
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })

  // Fetch classes for filter
  const { data: classes = [] } = useQuery({
    queryKey: ["teacherClasses"],
    queryFn: () => TeachersService.listMyClasses(),
  })

  // Fetch books for filter
  const { data: booksData } = useQuery({
    queryKey: ["teacherBooks"],
    queryFn: () => booksApi.getBooks({ limit: 100 }),
  })
  const books = booksData?.items ?? []

  // Build filter params
  const filterParams: CalendarFilters = useMemo(
    () => ({
      startDate: format(subMonths(monthStart, 1), "yyyy-MM-dd"),
      endDate: format(addMonths(monthEnd, 1), "yyyy-MM-dd"),
      classId: classFilter !== "all" ? classFilter : undefined,
      statusFilter:
        statusFilter !== "all"
          ? (statusFilter as AssignmentPublishStatus)
          : undefined,
      bookId: bookFilter !== "all" ? bookFilter : undefined,
    }),
    [monthStart, monthEnd, classFilter, statusFilter, bookFilter],
  )

  // Fetch calendar assignments
  const {
    data: calendarData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["calendar-assignments", filterParams],
    queryFn: () => getCalendarAssignments(filterParams),
  })

  // Publish Now mutation
  const publishNowMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return updateAssignment(assignmentId, { status: "published" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return deleteAssignment(assignmentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      })
      setIsDeleteDialogOpen(false)
      setAssignmentToDelete(null)
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete assignment"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    },
  })

  // Handle edit click
  const handleEdit = (assignment: CalendarAssignmentItem) => {
    navigate({
      to: "/teacher/assignments/$assignmentId",
      params: { assignmentId: assignment.id },
    })
  }

  // Handle delete click
  const handleDeleteClick = (assignment: CalendarAssignmentItem) => {
    setAssignmentToDelete(assignment)
    setIsDeleteDialogOpen(true)
  }

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (assignmentToDelete) {
      deleteMutation.mutate(assignmentToDelete.id)
    }
  }

  // Navigate to previous/next period
  const goToPrevious = () => {
    if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1))
    } else {
      setCurrentDate(subMonths(currentDate, 1))
    }
  }
  const goToNext = () => {
    if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1))
    } else {
      setCurrentDate(addMonths(currentDate, 1))
    }
  }
  const goToToday = () => setCurrentDate(new Date())

  // Generate calendar grid days for month view
  const calendarDays = useMemo(() => {
    const days: Date[] = []
    const start = startOfWeek(monthStart, { weekStartsOn: 0 })

    // Generate 6 weeks (42 days) to ensure full coverage
    for (let i = 0; i < 42; i++) {
      days.push(new Date(start.getTime() + i * 24 * 60 * 60 * 1000))
    }

    return days
  }, [monthStart])

  // Generate week days for week view
  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i))
    }
    return days
  }, [weekStart])

  // Get assignments for a specific date
  const getAssignmentsForDate = (date: Date): CalendarAssignmentItem[] => {
    if (!calendarData?.assignments_by_date) return []
    const dateKey = format(date, "yyyy-MM-dd")
    return calendarData.assignments_by_date[dateKey] || []
  }

  // Get all assignments as flat list
  const allAssignments = useMemo(() => {
    if (!calendarData?.assignments_by_date) return []
    const assignments: (CalendarAssignmentItem & { dateKey: string })[] = []
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

  // Check if assignment is past due
  const isPastDue = (assignment: CalendarAssignmentItem): boolean => {
    if (!assignment.due_date || assignment.status !== "published") return false
    return isBefore(new Date(assignment.due_date), new Date())
  }

  // Get badge variant for status with past due detection
  const getStatusBadge = (
    assignment: CalendarAssignmentItem,
  ): { className: string; label: string; icon?: React.ReactNode } => {
    // Check for past due first (only for published assignments)
    if (isPastDue(assignment)) {
      return {
        className:
          "border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
        label: "Past Due",
        icon: <AlertCircle className="w-3 h-3" />,
      }
    }

    switch (assignment.status) {
      case "scheduled":
        return {
          className:
            "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
          label: "Scheduled",
          icon: <Timer className="w-3 h-3" />,
        }
      case "draft":
        return {
          className:
            "border-gray-400 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-neutral-800",
          label: "Draft",
        }
      case "published":
        return {
          className:
            "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
          label: "Active",
          icon: <CheckCircle2 className="w-3 h-3" />,
        }
      case "archived":
        return {
          className:
            "border-gray-400 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800",
          label: "Archived",
        }
      default:
        return { className: "", label: assignment.status }
    }
  }

  // Get assignment pill color for calendar cell
  const getAssignmentPillColor = (assignment: CalendarAssignmentItem) => {
    if (isPastDue(assignment)) {
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
    }
    switch (assignment.status) {
      case "scheduled":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
      case "published":
        return "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
      default:
        return "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300"
    }
  }

  // Render assignment item (used in both calendar cell and list view)
  const renderAssignmentItem = (
    assignment: CalendarAssignmentItem,
    isCompact = false,
  ) => {
    const statusBadge = getStatusBadge(assignment)

    if (isCompact) {
      // Compact pill for calendar cell
      return (
        <Popover key={assignment.id}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate ${getAssignmentPillColor(assignment)} hover:opacity-80 cursor-pointer`}
            >
              {assignment.name}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <AssignmentPopoverContent
              assignment={assignment}
              onPublishNow={() => publishNowMutation.mutate(assignment.id)}
              isPublishing={publishNowMutation.isPending}
              onEdit={() => handleEdit(assignment)}
              onDelete={() => handleDeleteClick(assignment)}
            />
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
            to: "/teacher/assignments/$assignmentId",
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
              {assignment.class_names.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="truncate">
                    {assignment.class_names.join(", ")}
                  </span>
                </div>
              )}
            </div>
            <Badge
              variant="outline"
              className={`${statusBadge.className} flex items-center gap-1`}
            >
              {statusBadge.icon}
              {statusBadge.label}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {assignment.due_date && (
              <div
                className={`flex items-center gap-1 ${isPastDue(assignment) ? "text-red-600 dark:text-red-400" : ""}`}
              >
                <CalendarIcon className="w-3 h-3" />
                Due {format(new Date(assignment.due_date), "MMM d")}
              </div>
            )}
            {assignment.scheduled_publish_date &&
              assignment.status === "scheduled" && (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Timer className="w-3 h-3" />
                  Publishes{" "}
                  {format(new Date(assignment.scheduled_publish_date), "MMM d")}
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

  // Clear all filters
  const clearFilters = () => {
    setClassFilter("all")
    setStatusFilter("all")
    setBookFilter("all")
  }

  const hasActiveFilters =
    classFilter !== "all" || statusFilter !== "all" || bookFilter !== "all"

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        icon={FiCalendar}
        title="Assignment Calendar"
        description="View and manage your assignment schedule"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Assignment
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                { setIsWizardOpen(true) }
              }
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Book Assignment
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate({ to: "/dreamai/generator" })}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Generated Assignment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Period Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[180px] text-center">
                {viewMode === "week"
                  ? `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
                  : format(currentDate, "MMMM yyyy")}
              </h2>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>

            {/* Filters and View Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Class Filter */}
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Active</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              {/* Book Filter */}
              <Select value={bookFilter} onValueChange={setBookFilter}>
                <SelectTrigger className="w-[150px]">
                  <BookOpen className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Books" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Books</SelectItem>
                  {books.map((book) => (
                    <SelectItem key={book.id} value={String(book.id)}>
                      {book.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                >
                  Clear
                </Button>
              )}

              {/* View Toggle */}
              <div className="flex rounded-md border">
                <Button
                  variant={viewMode === "month" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode("month")}
                  title="Month view"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "week" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-none border-x"
                  onClick={() => setViewMode("week")}
                  title="Week view"
                >
                  <CalendarIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode("list")}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar / List View */}
      {isLoading ? (
        <CalendarSkeleton viewMode={viewMode} />
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center text-red-600">
            <p>Error loading calendar: {(error as Error).message}</p>
          </CardContent>
        </Card>
      ) : viewMode === "month" ? (
        /* Month Calendar Grid View */
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
                        ? "bg-background hover:bg-muted/50"
                        : "bg-muted/30 text-muted-foreground"
                    } ${isDayToday ? "ring-2 ring-teal-500" : ""} transition-colors`}
                  >
                    {/* Day Number */}
                    <div
                      className={`day-number text-right text-sm mb-1 ${
                        isDayToday
                          ? "font-bold text-teal-600 dark:text-teal-400"
                          : ""
                      }`}
                    >
                      {format(day, "d")}
                    </div>

                    {/* Assignments */}
                    <div
                      className="space-y-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {dayAssignments
                        .slice(0, 3)
                        .map((assignment) =>
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
                                        to: "/teacher/assignments/$assignmentId",
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
      ) : viewMode === "week" ? (
        /* Week View */
        <Card>
          <CardContent className="p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`text-center py-2 rounded-md ${
                    isToday(day)
                      ? "bg-teal-100 dark:bg-teal-900/30 font-semibold text-teal-700 dark:text-teal-300"
                      : ""
                  }`}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(day, "EEE")}
                  </div>
                  <div className="text-lg">{format(day, "d")}</div>
                </div>
              ))}
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayAssignments = getAssignmentsForDate(day)
                const isDayToday = isToday(day)

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[200px] border rounded-md p-2 ${
                      isDayToday ? "ring-2 ring-teal-500" : ""
                    } hover:bg-muted/50 transition-colors`}
                  >
                    <div className="space-y-1">
                      {dayAssignments.map((assignment) =>
                        renderAssignmentItem(assignment, true),
                      )}
                      {dayAssignments.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-4">
                          No assignments
                        </div>
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
                <p>No assignments found for this month.</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Assignment
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() =>
                        { setIsWizardOpen(true) }
                      }
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Book Assignment
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate({ to: "/dreamai/generator" })}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Generated Assignment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                    {} as Record<string, CalendarAssignmentItem[]>,
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

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-teal-100 dark:bg-teal-900/30" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
          <span>Past Due</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-100 dark:bg-neutral-800" />
          <span>Draft/Archived</span>
        </div>
      </div>

      {/* Assignment Wizard Sheet */}
      <AssignmentWizardSheet
        open={isWizardOpen}
        onOpenChange={(open) => {
          setIsWizardOpen(open)
          if (!open) setWizardPublishDate(null)
        }}
        mode="create"
        prefilledPublishDate={wizardPublishDate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setAssignmentToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-foreground">
                    &quot;{assignmentToDelete?.name}&quot;
                  </span>
                  ?
                </p>
                <p className="text-red-600 dark:text-red-400 font-medium">
                  This action cannot be undone. Students will lose access to
                  this assignment and all their progress.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}

// Assignment Popover Content Component
function AssignmentPopoverContent({
  assignment,
  onPublishNow,
  isPublishing,
  onEdit,
  onDelete,
}: {
  assignment: CalendarAssignmentItem
  onPublishNow: () => void
  isPublishing: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const navigate = useNavigate()

  // Check if assignment is past due
  const isPastDue =
    assignment.due_date &&
    assignment.status === "published" &&
    isBefore(new Date(assignment.due_date), new Date())

  // Get status badge info
  const getStatusInfo = () => {
    if (isPastDue) {
      return {
        className:
          "border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
        label: "Past Due",
        icon: <AlertCircle className="w-3 h-3" />,
      }
    }
    switch (assignment.status) {
      case "scheduled":
        return {
          className:
            "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
          label: "Scheduled",
          icon: <Timer className="w-3 h-3" />,
        }
      case "published":
        return {
          className:
            "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
          label: "Active",
          icon: <CheckCircle2 className="w-3 h-3" />,
        }
      case "draft":
        return {
          className:
            "border-gray-400 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-neutral-800",
          label: "Draft",
        }
      default:
        return {
          className:
            "border-gray-400 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800",
          label: assignment.status,
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">{assignment.name}</h4>
        <Badge
          variant="outline"
          className={`${statusInfo.className} flex items-center gap-1`}
        >
          {statusInfo.icon}
          {statusInfo.label}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          {assignment.book_title}
        </div>

        {assignment.class_names.length > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            {assignment.class_names.join(", ")}
          </div>
        )}

        {assignment.due_date && (
          <div
            className={`flex items-center gap-2 ${isPastDue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
          >
            <CalendarIcon className="w-4 h-4" />
            Due: {format(new Date(assignment.due_date), "PPp")}
            {isPastDue && <span className="text-xs">(overdue)</span>}
          </div>
        )}

        {assignment.scheduled_publish_date &&
          assignment.status === "scheduled" && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Timer className="w-4 h-4" />
              Publishes:{" "}
              {format(new Date(assignment.scheduled_publish_date), "PPp")}
            </div>
          )}

        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          {assignment.activity_count}{" "}
          {assignment.activity_count === 1 ? "activity" : "activities"}
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        {/* Publish Now button for scheduled assignments */}
        {assignment.status === "scheduled" && (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-amber-600 border-amber-500 hover:bg-amber-50"
            onClick={onPublishNow}
            disabled={isPublishing}
          >
            <Send className="w-3 h-3 mr-1" />
            {isPublishing ? "Publishing..." : "Publish Now"}
          </Button>
        )}

        {/* Main action buttons row */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-teal-600 hover:bg-teal-700"
            onClick={() =>
              navigate({
                to: "/teacher/assignments/$assignmentId",
                params: { assignmentId: assignment.id },
              })
            }
          >
            View Details
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            title="Edit assignment"
          >
            <Edit className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete assignment"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Loading Skeleton
function CalendarSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "week") {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-[200px]" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

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
