import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Award, Clock, Mail, Target, TrendingUp } from "lucide-react"
import { useMemo, useState } from "react"
import { ActivityBreakdownChart } from "@/components/charts/ActivityBreakdownChart"
import { ActivityHistoryTable } from "@/components/charts/ActivityHistoryTable"
import { StudentProgressChart } from "@/components/charts/StudentProgressChart"
import { ComposeMessageModal } from "@/components/messaging/ComposeMessageModal"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStudentAnalytics } from "@/hooks/useStudentAnalytics"
import type { PeriodType } from "@/types/analytics"

export const Route = createFileRoute("/_layout/teacher/analytics/$studentId")({
  component: StudentAnalyticsDetail,
})

function StudentAnalyticsDetail() {
  const { studentId } = Route.useParams()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<PeriodType>("30d")
  const [showMessageModal, setShowMessageModal] = useState(false)

  // Fetch analytics data from API
  const { analytics, isLoading, error } = useStudentAnalytics({
    studentId,
    period,
  })

  // Transform data for charts
  const chartData = useMemo(() => {
    if (!analytics) return null

    // Transform performance trend for StudentProgressChart
    const scores = analytics.performance_trend.map((point) => point.score)
    const dates = analytics.performance_trend.map((point) => point.date)

    // Transform activity breakdown for ActivityBreakdownChart
    const activityBreakdown = analytics.activity_breakdown.map((item) => ({
      name: item.activity_type,
      count: item.count,
      avgScore: item.avg_score,
    }))

    // Transform recent activity for ActivityHistoryTable
    const activityHistory = analytics.recent_activity.map((item) => ({
      date: item.completed_at,
      activity_name: item.assignment_name,
      activity_type: "assignment", // Default type
      score: item.score,
      time_spent_minutes: item.time_spent_minutes,
      status: "completed" as const,
      assignment_id: item.assignment_id,
    }))

    return {
      scores,
      dates,
      activityBreakdown,
      activityHistory,
    }
  }, [analytics])

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            Loading analytics...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !analytics) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error Loading Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error instanceof Error
              ? error.message
              : "Failed to load student analytics data."}
          </p>
          <Button
            onClick={() => navigate({ to: "/teacher/students" })}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Students
          </Button>
        </div>
      </div>
    )
  }

  // Get initials for avatar
  const initials = analytics.student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <>
      {/* Compose Message Modal */}
      <ComposeMessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
      />

      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Back Button & Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/teacher/students" })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Students
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowMessageModal(true)}
            >
              <Mail className="h-4 w-4" />
              Send Message
            </Button>
          </div>
        </div>

        {/* Student Header with Summary */}
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6 flex-col md:flex-row">
              {/* Avatar */}
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-teal-600 text-white text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Student Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {analytics.student.name}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Student ID:</span>{" "}
                    {analytics.student.id}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Average Score */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Award className="h-4 w-4 text-teal-600" />
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                {analytics.summary.avg_score}%
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Across all assignments
              </p>
            </CardContent>
          </Card>

          {/* Completed Assignments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Target className="h-4 w-4 text-teal-600" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                {analytics.summary.total_completed}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Math.round(analytics.summary.completion_rate * 100)}%
                completion rate
              </p>
            </CardContent>
          </Card>

          {/* Current Streak */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                {analytics.summary.current_streak}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Consecutive days
              </p>
            </CardContent>
          </Card>

          {/* Time This Week */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Clock className="h-4 w-4 text-teal-600" />
                Time This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                {Math.round(analytics.time_analytics.total_time_this_week / 60)}
                h
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {analytics.time_analytics.total_time_this_week} minutes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time Period Selector */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Time Period:
          </span>
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as PeriodType)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Performance Trend */}
          <Card className="shadow-lg md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Performance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData && chartData.scores.length > 0 ? (
                <StudentProgressChart
                  scores={chartData.scores}
                  dates={chartData.dates}
                />
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No performance data available for the selected period
                </p>
              )}
            </CardContent>
          </Card>

          {/* Activity Type Breakdown */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Activity Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData && chartData.activityBreakdown.length > 0 ? (
                <ActivityBreakdownChart data={chartData.activityBreakdown} />
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No activity data available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Assignment Status Summary */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Assignment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Not Started
                  </span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {analytics.status_summary.not_started}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    In Progress
                  </span>
                  <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {analytics.status_summary.in_progress}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Completed
                  </span>
                  <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {analytics.status_summary.completed}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Past Due
                  </span>
                  <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                    {analytics.status_summary.past_due}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Analytics */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Time Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Average Time Per Assignment
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.time_analytics.avg_time_per_assignment} min
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Time This Week
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.time_analytics.total_time_this_week} min
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Time This Month
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.time_analytics.total_time_this_month} min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData && chartData.activityHistory.length > 0 ? (
              <ActivityHistoryTable
                entries={chartData.activityHistory}
                onRowClick={(assignmentId) => {
                  console.log("Navigate to assignment:", assignmentId)
                }}
              />
            ) : (
              <p className="text-center text-gray-500 py-8">
                No recent activity available
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
