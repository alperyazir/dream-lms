import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Award, Clock, Target } from "lucide-react"
import { useMemo } from "react"
import { ActivityHistoryTable } from "@/components/charts/ActivityHistoryTable"
import { StrengthsWeaknessesCard } from "@/components/charts/StrengthsWeaknessesCard"
import { StudentProgressChart } from "@/components/charts/StudentProgressChart"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { mockAnalyticsData, mockStudentAnalytics } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/teacher/analytics/$studentId")({
  component: StudentAnalyticsDetail,
})

function StudentAnalyticsDetail() {
  const { studentId } = Route.useParams()

  // Find student analytics data
  const studentData = useMemo(
    () => mockStudentAnalytics.find((s) => s.student_id === studentId),
    [studentId],
  )

  // Get student activity history
  const studentActivities = useMemo(
    () =>
      mockAnalyticsData
        .filter((point) => point.student_id === studentId)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [studentId],
  )

  // Prepare activity history table data
  const activityHistory = useMemo(
    () =>
      studentActivities.map((activity) => ({
        date: activity.date,
        activity_name: `Assignment ${activity.assignment_id}`,
        activity_type: activity.activity_type,
        score: activity.score,
        time_spent_minutes: activity.time_spent_minutes,
        status: "completed" as const,
        assignment_id: activity.assignment_id,
      })),
    [studentActivities],
  )

  // Calculate stats
  const totalTimeSpent = useMemo(
    () =>
      studentActivities.reduce(
        (sum, activity) => sum + activity.time_spent_minutes,
        0,
      ),
    [studentActivities],
  )

  if (!studentData) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Student Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The requested student analytics data could not be found.
          </p>
          <Link to="/teacher/analytics">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Get initials for avatar
  const initials = studentData.student_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Back Button */}
      <Link to="/teacher/analytics">
        <Button variant="ghost" className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analytics
        </Button>
      </Link>

      {/* Student Header */}
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-teal-600 text-white text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Student Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {studentData.student_name}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Student ID:</span>{" "}
                  {studentData.student_id}
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Class:</span> Math 101
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Average Score */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
              <Award className="h-5 w-5 text-teal-600" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">
              {studentData.avg_score}%
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Across all assignments
            </p>
          </CardContent>
        </Card>

        {/* Completed Assignments */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
              <Target className="h-5 w-5 text-teal-600" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">
              {studentData.completed_count}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Assignments completed
            </p>
          </CardContent>
        </Card>

        {/* Total Time Spent */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
              <Clock className="h-5 w-5 text-teal-600" />
              Time Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">
              {Math.round(totalTimeSpent / 60)}h
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalTimeSpent} minutes total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Progress Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentProgressChart
            scores={studentData.recent_scores}
            dates={studentActivities.map((a) => a.date).slice(-10)}
          />
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <StrengthsWeaknessesCard
        strengths={studentData.strengths}
        weaknesses={studentData.weaknesses}
      />

      {/* Activity History */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityHistoryTable
            entries={activityHistory}
            onRowClick={(assignmentId) => {
              // Navigate to assignment detail page
              console.log("Navigate to assignment:", assignmentId)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
