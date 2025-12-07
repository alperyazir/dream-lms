import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  BarChart3,
  BookOpen,
  Clock,
  Minus,
  TrendingUp,
  Users,
} from "lucide-react"
import { useMemo, useState } from "react"
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
import { type StudentPublic, TeachersService } from "@/client"
import {
  ActivityBenchmarkTable,
  BenchmarkCard,
  BenchmarkComparisonChart,
  BenchmarkDisabledMessage,
  BenchmarkMessage,
} from "@/components/benchmarks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useClassBenchmarks } from "@/hooks/useBenchmarks"
import { useClassAnalytics } from "@/hooks/useClassAnalytics"
import type { ClassPeriodType, TrendData } from "@/types/analytics"
import type { BenchmarkPeriod } from "@/types/benchmarks"

export const Route = createFileRoute("/_layout/teacher/classrooms_/$classId")({
  component: ClassDetailPage,
})

// Period options for the selector
const periodOptions: { value: ClassPeriodType; label: string }[] = [
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "semester", label: "This Semester" },
  { value: "ytd", label: "Year to Date" },
]

// Colors for score distribution buckets
const BUCKET_COLORS = [
  "#EF4444", // Red for 0-59%
  "#F97316", // Orange for 60-69%
  "#EAB308", // Yellow for 70-79%
  "#22C55E", // Green for 80-89%
  "#14B8A6", // Teal for 90-100%
]

function TrendIndicator({ trend }: { trend: TrendData }) {
  const Icon =
    trend.trend === "up" ? ArrowUp : trend.trend === "down" ? ArrowDown : Minus
  const colorClass =
    trend.trend === "up"
      ? "text-green-600"
      : trend.trend === "down"
        ? "text-red-600"
        : "text-gray-500"

  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">
        {trend.change_percent > 0 ? "+" : ""}
        {trend.change_percent.toFixed(1)}%
      </span>
    </div>
  )
}

function ClassDetailPage() {
  const params = useParams({ from: "/_layout/teacher/classrooms_/$classId" })
  const classId = params.classId
  const [period, setPeriod] = useState<ClassPeriodType>("monthly")
  const [benchmarkPeriod, setBenchmarkPeriod] =
    useState<BenchmarkPeriod>("monthly")
  const [activeTab, setActiveTab] = useState("analytics")

  // Fetch class details
  const { data: classDetail, isLoading: isLoadingClass } = useQuery({
    queryKey: ["classDetail", classId],
    queryFn: () => TeachersService.getClassDetails({ classId }),
  })

  // Fetch benchmarks
  const {
    benchmarks,
    isLoading: isLoadingBenchmarks,
    isDisabled: isBenchmarkingDisabled,
    disabledMessage,
  } = useClassBenchmarks({
    classId,
    period: benchmarkPeriod,
    enabled: activeTab === "benchmarks",
  })

  // Fetch class students separately
  const { data: classStudents = [] } = useQuery<StudentPublic[]>({
    queryKey: ["classStudents", classId],
    queryFn: () => TeachersService.getClassStudents({ classId }),
    enabled: !!classId,
  })

  // Fetch class analytics
  const {
    analytics,
    isLoading: isLoadingAnalytics,
    error,
  } = useClassAnalytics({
    classId,
    period,
  })

  // Transform score distribution for chart
  const scoreDistributionData = useMemo(() => {
    if (!analytics) return []
    return analytics.score_distribution.map((bucket, idx) => ({
      name: bucket.range_label,
      count: bucket.count,
      fill: BUCKET_COLORS[idx],
    }))
  }, [analytics])

  // Transform activity type performance for chart
  const activityTypeData = useMemo(() => {
    if (!analytics) return []
    return analytics.activity_type_performance.map((item) => ({
      name: item.activity_type.replace(/([A-Z])/g, " $1").trim(), // CamelCase to spaces
      avgScore: item.avg_score,
      count: item.count,
    }))
  }, [analytics])

  // Find trends
  const scoreTrend = analytics?.trends.find(
    (t) => t.metric_name === "Average Score",
  )
  const completionTrend = analytics?.trends.find(
    (t) => t.metric_name === "Completions",
  )

  // Loading state
  if (isLoadingClass || isLoadingAnalytics) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            Loading class details...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !analytics || !classDetail) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error Loading Class
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error instanceof Error
              ? error.message
              : "Unable to load class analytics."}
          </p>
          <Link to="/teacher/classrooms">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Classrooms
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/teacher/classrooms">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {classDetail.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {classDetail.grade_level && `Grade ${classDetail.grade_level}`}
              {classDetail.grade_level && classDetail.subject && " • "}
              {classDetail.subject}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="benchmarks" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Benchmarks
          </TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
            </CardHeader>
            <CardContent>
              {classStudents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classStudents.map((student: StudentPublic) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          <Link
                            to="/teacher/analytics/$studentId"
                            params={{ studentId: student.id }}
                            className="hover:underline text-teal-600"
                          >
                            {student.user_full_name || "N/A"}
                          </Link>
                        </TableCell>
                        <TableCell>{student.user_email}</TableCell>
                        <TableCell>{student.grade_level || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No students enrolled in this class yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.assignment_performance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead className="text-right">Avg Score</TableHead>
                      <TableHead className="text-right">Completion</TableHead>
                      <TableHead className="text-right">Avg Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.assignment_performance.map((assignment) => (
                      <TableRow key={assignment.assignment_id}>
                        <TableCell className="font-medium">
                          {assignment.name}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              assignment.avg_score >= 80
                                ? "default"
                                : assignment.avg_score >= 60
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {assignment.avg_score.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {(assignment.completion_rate * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {assignment.avg_time_spent.toFixed(0)} min
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No assignments created for this class yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6 space-y-6">
          {/* Period Selector */}
          <div className="flex justify-end">
            <Select
              value={period}
              onValueChange={(value) => setPeriod(value as ClassPeriodType)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Score
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.summary.avg_score.toFixed(1)}%
                </div>
                {scoreTrend && <TrendIndicator trend={scoreTrend} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completion Rate
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics.summary.completion_rate * 100).toFixed(0)}%
                </div>
                {completionTrend && <TrendIndicator trend={completionTrend} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Assignments
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.summary.total_assignments}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Students
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.summary.active_students}
                </div>
                <p className="text-xs text-muted-foreground">this period</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {scoreDistributionData.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={scoreDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Students">
                        {scoreDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-12">
                    No score data available yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Activity Type Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Performance by Activity Type</CardTitle>
              </CardHeader>
              <CardContent>
                {activityTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={activityTypeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="avgScore" name="Avg Score" fill="#14B8A6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-12">
                    No activity data available yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard and Struggling Students */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.leaderboard.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-right">Avg Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.leaderboard.slice(0, 5).map((student) => (
                        <TableRow key={student.student_id}>
                          <TableCell>
                            <Badge
                              variant={
                                student.rank === 1
                                  ? "default"
                                  : student.rank <= 3
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              #{student.rank}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              to="/teacher/analytics/$studentId"
                              params={{ studentId: student.student_id }}
                              className="hover:underline text-teal-600"
                            >
                              {student.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right">
                            {student.avg_score.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No performance data available yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Struggling Students */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Students Needing Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.struggling_students.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-right">Avg Score</TableHead>
                        <TableHead>Alert</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.struggling_students.map((student) => (
                        <TableRow key={student.student_id}>
                          <TableCell className="font-medium">
                            <Link
                              to="/teacher/analytics/$studentId"
                              params={{ studentId: student.student_id }}
                              className="hover:underline text-teal-600"
                            >
                              {student.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">
                              {student.avg_score.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-amber-600 dark:text-amber-400">
                              {student.alert_reason}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No struggling students identified.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Assignment Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Assignment Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.assignment_performance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead className="text-right">Avg Score</TableHead>
                      <TableHead className="text-right">Completion</TableHead>
                      <TableHead className="text-right">Avg Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.assignment_performance.map((assignment) => (
                      <TableRow key={assignment.assignment_id}>
                        <TableCell className="font-medium">
                          {assignment.name}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              assignment.avg_score >= 80
                                ? "default"
                                : assignment.avg_score >= 60
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {assignment.avg_score.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {(assignment.completion_rate * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {assignment.avg_time_spent.toFixed(0)} min
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No assignments created for this class yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="mt-6 space-y-6">
          {/* Loading state */}
          {isLoadingBenchmarks && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent" />
              <p className="text-gray-600 dark:text-gray-400 mt-4">
                Loading benchmark data...
              </p>
            </div>
          )}

          {/* Disabled state */}
          {!isLoadingBenchmarks && isBenchmarkingDisabled && (
            <BenchmarkDisabledMessage message={disabledMessage} />
          )}

          {/* Benchmark data */}
          {!isLoadingBenchmarks && !isBenchmarkingDisabled && benchmarks && (
            <>
              {/* Period selector */}
              <div className="flex justify-end">
                <Select
                  value={benchmarkPeriod}
                  onValueChange={(value) =>
                    setBenchmarkPeriod(value as BenchmarkPeriod)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="semester">Semester</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Performance Message */}
              {benchmarks.message && (
                <BenchmarkMessage message={benchmarks.message} />
              )}

              {/* Benchmark Comparison Card */}
              <BenchmarkCard
                classMetrics={benchmarks.class_metrics}
                schoolBenchmark={benchmarks.school_benchmark}
                publisherBenchmark={benchmarks.publisher_benchmark}
              />

              {/* Charts Row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Trend Chart */}
                <BenchmarkComparisonChart
                  trendData={benchmarks.comparison_over_time}
                  periodType={
                    benchmarkPeriod === "weekly" ? "weekly" : "monthly"
                  }
                />

                {/* Activity Type Table */}
                <ActivityBenchmarkTable
                  activityBenchmarks={benchmarks.activity_benchmarks}
                  showSchoolBenchmark={
                    benchmarks.school_benchmark?.is_available ?? false
                  }
                />
              </div>
            </>
          )}

          {/* No data state */}
          {!isLoadingBenchmarks && !isBenchmarkingDisabled && !benchmarks && (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Benchmark Data Available
                </h3>
                <p className="text-muted-foreground">
                  Benchmark comparisons will appear once enough data is
                  collected from assignments.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
