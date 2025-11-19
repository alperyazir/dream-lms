import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { FileText, MessageSquare, TrendingUp, Trophy } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { AchievementBadge } from "@/components/dashboard/AchievementBadge"
import { StudentAssignmentCard } from "@/components/assignments/AssignmentCard"
import { FeedbackItem } from "@/components/dashboard/FeedbackItem"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getStudentAssignments } from "@/services/assignmentsApi"
import { studentDashboardData } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/student/dashboard")({
  component: () => (
    <ErrorBoundary>
      <StudentDashboard />
    </ErrorBoundary>
  ),
})

function StudentDashboard() {
  // Fetch real assignments from API
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["studentAssignments"],
    queryFn: () => getStudentAssignments(),
  })

  // Filter and sort assignments to show only incomplete and not past due (upcoming)
  const upcomingAssignments = assignments
    .filter(
      (assignment: any) =>
        assignment.status !== "completed" && !assignment.is_past_due
    )
    .sort((a: any, b: any) => {
      // Sort by due date (earliest first), assignments without due dates go to the end
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })

  // Use mock data for other sections (not implemented yet)
  const { scoreHistory, recentFeedback, achievements, stats } =
    studentDashboardData

  // Calculate average score
  const averageScore = stats.averageScore

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Student Dashboard
        </h1>
        <p className="text-muted-foreground">
          Track your progress and upcoming assignments
        </p>
      </div>

      {/* Assignments Due */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-6 h-6 text-teal-500" />
          <h2 className="text-2xl font-bold text-foreground">
            Upcoming Assignments
          </h2>
        </div>
        {isLoadingAssignments ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Loading assignments...</p>
          </div>
        ) : upcomingAssignments.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-muted-foreground">No upcoming assignments</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your assignments will appear here when your teacher assigns them
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
            {upcomingAssignments.map((assignment: any) => (
              <StudentAssignmentCard
                key={assignment.assignment_id}
                assignment={assignment}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress Chart */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-500" />
                Your Progress
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Score history for last 7 assignments
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Average Score</p>
              <p className="text-3xl font-bold text-teal-500">
                {averageScore}%
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scoreHistory}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="assignmentName"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
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
                formatter={(value: number) => [`${value}%`, "Score"]}
              />
              <ReferenceLine
                y={averageScore}
                stroke="#14B8A6"
                strokeDasharray="3 3"
                label={{
                  value: `Avg: ${averageScore}%`,
                  fill: "#14B8A6",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#06B6D4"
                strokeWidth={3}
                dot={{ fill: "#06B6D4", r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-6 h-6 text-teal-500" />
          <h2 className="text-2xl font-bold text-foreground">
            Recent Feedback
          </h2>
        </div>
        {recentFeedback.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-muted-foreground">No feedback yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Feedback from your teachers will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentFeedback.map((feedback) => (
              <FeedbackItem
                key={feedback.id}
                assignmentName={feedback.assignmentName}
                teacherName={feedback.teacherName}
                comment={feedback.comment}
                score={feedback.score}
                date={feedback.date}
              />
            ))}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-teal-500" />
          <h2 className="text-2xl font-bold text-foreground">Achievements</h2>
        </div>
        {achievements.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-muted-foreground">No achievements yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Complete assignments and reach milestones to earn achievements
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {achievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                title={achievement.title}
                description={achievement.description}
                icon={achievement.icon}
                earnedDate={achievement.earnedDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
