import { Link } from "@tanstack/react-router"
import { Award, Clock, ExternalLink, Target } from "lucide-react"
import { useMemo } from "react"
import { SkillProfileCard } from "@/components/analytics/SkillProfileCard"
import { StudentProgressChart } from "@/components/charts/StudentProgressChart"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useStudentAnalytics } from "@/hooks/useStudentAnalytics"

interface StudentAnalyticsPanelProps {
  studentId: string | null
  studentName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StudentAnalyticsPanel({
  studentId,
  studentName,
  open,
  onOpenChange,
}: StudentAnalyticsPanelProps) {
  const { analytics, isLoading } = useStudentAnalytics({
    studentId: studentId ?? "",
    period: "30d",
  })

  const chartData = useMemo(() => {
    if (!analytics) return null
    return {
      scores: analytics.performance_trend.map((p) => p.score),
      dates: analytics.performance_trend.map((p) => p.date),
    }
  }, [analytics])

  const initials = (analytics?.student.name ?? studentName ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-teal-600 text-white text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            {analytics?.student.name ?? studentName ?? "Student"}
          </SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-r-transparent" />
          </div>
        )}

        {!isLoading && !analytics && (
          <p className="text-center text-muted-foreground py-12">
            No analytics data available.
          </p>
        )}

        {analytics && (
          <div className="space-y-4 mt-4">
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Award className="h-3.5 w-3.5 text-teal-600" />
                    Avg Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-xl font-bold text-teal-600">
                    {analytics.summary.avg_score}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-teal-600" />
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-xl font-bold text-teal-600">
                    {analytics.summary.total_completed}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {Math.round(analytics.summary.completion_rate * 100)}% rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-teal-600" />
                    This Week
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-xl font-bold text-teal-600">
                    {Math.floor(
                      analytics.time_analytics.total_time_this_week / 60,
                    )}
                    h {analytics.time_analytics.total_time_this_week % 60}m
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Performance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData && chartData.scores.length > 0 ? (
                  <StudentProgressChart
                    scores={chartData.scores}
                    dates={chartData.dates}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-6 text-sm">
                    No performance data available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Skill Profile */}
            <SkillProfileCard studentId={studentId!} size="sm" />

            {/* View Full Details */}
            <Link
              to="/teacher/analytics/$studentId"
              params={{ studentId: studentId! }}
            >
              <Button variant="outline" className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                View Full Details
              </Button>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
