import { createFileRoute } from "@tanstack/react-router"
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
import { AssignmentDueCard } from "@/components/dashboard/AssignmentDueCard"
import { FeedbackItem } from "@/components/dashboard/FeedbackItem"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { studentDashboardData } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/student/dashboard")({
  component: () => (
    <ErrorBoundary>
      <StudentDashboard />
    </ErrorBoundary>
  ),
})

function StudentDashboard() {
  const { assignmentsDue, scoreHistory, recentFeedback, achievements, stats } =
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
            Assignments Due
          </h2>
        </div>
        {assignmentsDue.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-muted-foreground">No assignments due</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your assignments will appear here when your teacher assigns them
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {assignmentsDue.map((assignment) => (
              <AssignmentDueCard
                key={assignment.id}
                id={assignment.id}
                name={assignment.name}
                subject={assignment.subject}
                dueDate={assignment.dueDate}
                status={assignment.status}
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
