import { Link } from "@tanstack/react-router"
import { Award, BookOpen, ExternalLink, TrendingUp, Users } from "lucide-react"
import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useClassAnalytics } from "@/hooks/useClassAnalytics"

const BUCKET_COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
]

interface ClassAnalyticsPanelProps {
  classId: string | null
  className?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClassAnalyticsPanel({
  classId,
  className: classDisplayName,
  open,
  onOpenChange,
}: ClassAnalyticsPanelProps) {
  const { analytics, isLoading } = useClassAnalytics({
    classId: classId ?? "",
    period: "monthly",
  })

  const scoreDistributionData = useMemo(() => {
    if (!analytics) return []
    return analytics.score_distribution.map((bucket, idx) => ({
      name: bucket.range_label,
      count: bucket.count,
      fill: BUCKET_COLORS[idx],
    }))
  }, [analytics])

  const activityTypeData = useMemo(() => {
    if (!analytics) return []
    return analytics.activity_type_performance.map((item) => ({
      name: item.activity_type,
      avgScore: item.avg_score,
    }))
  }, [analytics])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>
            {analytics
              ? classDisplayName ?? "Classroom"
              : classDisplayName ?? "Classroom"}
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
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Avg Score
                  </CardTitle>
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-xl font-bold">
                    {analytics.summary.avg_score.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Completion Rate
                  </CardTitle>
                  <Award className="h-3.5 w-3.5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-xl font-bold">
                    {(analytics.summary.completion_rate * 100).toFixed(0)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Assignments
                  </CardTitle>
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-xl font-bold">
                    {analytics.summary.total_assignments}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Active Students
                  </CardTitle>
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-xl font-bold">
                    {analytics.summary.active_students}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Score Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {scoreDistributionData.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={scoreDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" name="Students">
                        {scoreDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-6 text-sm">
                    No score data available yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Performance by Skill */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Performance by Skill</CardTitle>
              </CardHeader>
              <CardContent>
                {activityTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={activityTypeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} fontSize={12} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={90}
                        fontSize={12}
                      />
                      <Tooltip />
                      <Bar dataKey="avgScore" name="Avg Score" fill="#14B8A6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-6 text-sm">
                    No skill data available yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* View Full Details */}
            <Link
              to="/teacher/classrooms/$classId"
              params={{ classId: classId! }}
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
