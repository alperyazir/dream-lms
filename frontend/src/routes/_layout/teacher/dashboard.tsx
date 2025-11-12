import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, TrendingUp, Users } from "lucide-react"
import { TeachersService } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { StatCard } from "@/components/dashboard/StatCard"

export const Route = createFileRoute("/_layout/teacher/dashboard")({
  component: () => (
    <ErrorBoundary>
      <TeacherDashboard />
    </ErrorBoundary>
  ),
})

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

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Teacher Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of your classes and students
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </div>
    </div>
  )
}
