import { createFileRoute } from "@tanstack/react-router"
import { FileText } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { AssignmentRow } from "@/components/dashboard/AssignmentRow"
import { ClassCard } from "@/components/dashboard/ClassCard"
import { DeadlineItem } from "@/components/dashboard/DeadlineItem"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { teacherDashboardData } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/teacher/dashboard")({
  component: () => (
    <ErrorBoundary>
      <TeacherDashboard />
    </ErrorBoundary>
  ),
})

function TeacherDashboard() {
  const {
    classes,
    assignments,
    upcomingDeadlines,
    classPerformance,
    completionTrend,
  } = teacherDashboardData

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Teacher Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your classes and assignments
        </p>
      </div>

      {/* My Classes */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">My Classes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classData) => (
            <ClassCard
              key={classData.id}
              name={classData.name}
              subject={classData.subject}
              studentCount={classData.studentCount}
              averageScore={classData.averageScore}
            />
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Performance Chart */}
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="text-xl">Class Performance</CardTitle>
            <p className="text-sm text-muted-foreground">
              Average scores by class
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={classPerformance}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="#14B8A6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Completion Trend Chart */}
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="text-xl">
              Assignment Completion Trend
            </CardTitle>
            <p className="text-sm text-muted-foreground">Last 4 weeks</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={completionTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#06B6D4"
                  strokeWidth={3}
                  dot={{ fill: "#06B6D4", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assignments */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Recent Assignments
        </h2>
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <AssignmentRow
              key={assignment.id}
              name={assignment.name}
              className={assignment.className}
              dueDate={assignment.dueDate}
              completionRate={assignment.completionRate}
            />
          ))}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upcoming Deadlines
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Keep track of your assignment due dates
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingDeadlines.map((deadline) => (
              <DeadlineItem
                key={deadline.id}
                assignmentName={deadline.assignmentName}
                className={deadline.className}
                dueDate={deadline.dueDate}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
