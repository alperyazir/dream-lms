import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  BookOpen,
  ClipboardCheck,
  Clock,
  Eye,
  TrendingUp,
  Users,
} from "lucide-react"
import { FiHome } from "react-icons/fi"
import { TeachersService } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { StatCard } from "@/components/dashboard/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePendingReviews } from "@/hooks/useTeacherGrading"

export const Route = createFileRoute("/_layout/teacher/dashboard")({
  component: () => (
    <ErrorBoundary>
      <TeacherDashboard />
    </ErrorBoundary>
  ),
})

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  writing_free_response: "Free Writing",
  speaking_open_response: "Speaking",
}

function TeacherDashboard() {
  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ["teacherClasses"],
    queryFn: () => TeachersService.listMyClasses(),
  })

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ["teacherStudents"],
    queryFn: () => TeachersService.listMyStudents(),
  })

  // Fetch pending reviews
  const { pendingReviews, isLoading: pendingLoading } = usePendingReviews()

  return (
    <PageContainer>
      <PageHeader
        icon={FiHome}
        title="Teacher Dashboard 👋"
        description="Overview of your classes and students"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Total Classes"
          value={classes.length}
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Total Students"
          value={students.length}
        />
        <StatCard
          icon={<BookOpen className="w-6 h-6" />}
          label="Assignments"
          value={0}
        />
        <StatCard
          icon={<ClipboardCheck className="w-6 h-6" />}
          label="Pending Reviews"
          value={pendingReviews?.total ?? 0}
        />
      </div>

      {/* Pending Reviews Card */}
      <PendingReviewsCard
        items={pendingReviews?.items ?? []}
        total={pendingReviews?.total ?? 0}
        isLoading={pendingLoading}
      />
    </PageContainer>
  )
}

function PendingReviewsCard({
  items,
  total,
  isLoading,
}: {
  items: Array<{
    assignment_id: string
    assignment_name: string
    activity_type: string
    student_id: string
    student_name: string
    completed_at: string | null
  }>
  total: number
  isLoading: boolean
}) {
  const displayItems = items.slice(0, 10)

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-amber-500" />
            Pending Reviews
            {total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {total}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent" />
            <p className="text-sm text-muted-foreground mt-2">Loading...</p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No pending reviews</p>
            <p className="text-xs mt-1">
              All writing and speaking submissions have been graded.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map((item) => (
                  <TableRow key={`${item.assignment_id}-${item.student_id}`}>
                    <TableCell className="font-medium">
                      {item.student_name}
                    </TableCell>
                    <TableCell>{item.assignment_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ACTIVITY_TYPE_LABELS[item.activity_type] ??
                          item.activity_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {item.completed_at
                          ? new Date(item.completed_at).toLocaleDateString()
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          to="/teacher/assignments/$assignmentId"
                          params={{ assignmentId: item.assignment_id }}
                          search={{ gradeStudentId: item.student_id, tab: undefined, openGrade: undefined }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Grade
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {total > 10 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Showing 10 of {total} pending reviews
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
