import { createFileRoute } from "@tanstack/react-router"
import {
  BookOpen,
  FileText,
  GraduationCap,
  School,
  UserCheck,
  Users,
} from "lucide-react"
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
import { ActivityFeedItem } from "@/components/dashboard/ActivityFeedItem"
import { StatCard } from "@/components/dashboard/StatCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminDashboardData } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/admin/dashboard")({
  component: () => (
    <ErrorBoundary>
      <AdminDashboard />
    </ErrorBoundary>
  ),
})

function AdminDashboard() {
  const { stats, activityFeed, userGrowth, activityByType } = adminDashboardData

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          System overview and recent activity
        </p>
      </div>

      {/* Stats Cards - Comprehensive Overview */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          System Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Users"
            value={stats.totalUsers}
          />
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            label="Publishers"
            value={stats.totalPublishers}
          />
          <StatCard
            icon={<UserCheck className="w-6 h-6" />}
            label="Teachers"
            value={stats.totalTeachers}
          />
          <StatCard
            icon={<GraduationCap className="w-6 h-6" />}
            label="Students"
            value={stats.totalStudents}
          />
        </div>
      </div>

      {/* Secondary Stats */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Content & Activity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={<School className="w-6 h-6" />}
            label="Active Schools"
            value={stats.activeSchools}
          />
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            label="Total Books"
            value={stats.totalBooks}
          />
          <StatCard
            icon={<FileText className="w-6 h-6" />}
            label="Total Assignments"
            value={stats.totalAssignments}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="text-xl">User Growth</CardTitle>
            <p className="text-sm text-muted-foreground">Last 6 months</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowth}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                  stroke="#14B8A6"
                  strokeWidth={3}
                  dot={{ fill: "#14B8A6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity by Type Chart */}
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="text-xl">Activity by Type</CardTitle>
            <p className="text-sm text-muted-foreground">Current statistics</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityByType}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="#06B6D4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl">Recent Activity</CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest actions across the platform
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activityFeed.map((activity) => (
              <ActivityFeedItem
                key={activity.id}
                user={activity.user}
                avatar={activity.avatar}
                action={activity.action}
                timestamp={activity.timestamp}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
