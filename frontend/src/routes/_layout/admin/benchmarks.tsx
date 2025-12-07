/**
 * Admin Benchmarks Dashboard
 * Story 5.7: Performance Comparison & Benchmarking
 *
 * System-wide benchmark overview and settings management for admins
 */

import { createFileRoute } from "@tanstack/react-router"
import {
  BarChart3,
  Building2,
  CheckCircle2,
  School,
  Settings,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"
import { useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useAdminBenchmarks,
  useUpdateSchoolBenchmarkSettings,
} from "@/hooks/useBenchmarks"

export const Route = createFileRoute("/_layout/admin/benchmarks")({
  component: AdminBenchmarksPage,
})

function AdminBenchmarksPage() {
  const { overview, isLoading, error, refetch } = useAdminBenchmarks()
  const updateSchoolSettings = useUpdateSchoolBenchmarkSettings()
  const [updatingSchoolId, setUpdatingSchoolId] = useState<string | null>(null)

  // Handle toggling school benchmark setting
  const handleToggleBenchmarking = async (
    schoolId: string,
    currentValue: boolean,
  ) => {
    setUpdatingSchoolId(schoolId)
    try {
      await updateSchoolSettings.mutateAsync({
        schoolId,
        settings: { benchmarking_enabled: !currentValue },
      })
      refetch()
    } catch (err) {
      console.error("Failed to update school settings:", err)
    } finally {
      setUpdatingSchoolId(null)
    }
  }

  // Transform activity type stats for chart
  const activityChartData =
    overview?.activity_type_stats.map((stat) => ({
      name: stat.activity_label,
      average: stat.system_average,
      completions: stat.total_completions,
    })) ?? []

  // Performance status badge
  const getPerformanceBadge = (
    status: "above_average" | "average" | "below_average" | null,
  ) => {
    switch (status) {
      case "above_average":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <TrendingUp className="w-3 h-3 mr-1" />
            Above Average
          </Badge>
        )
      case "below_average":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <TrendingDown className="w-3 h-3 mr-1" />
            Below Average
          </Badge>
        )
      case "average":
        return (
          <Badge variant="secondary">
            <BarChart3 className="w-3 h-3 mr-1" />
            Average
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            No Data
          </Badge>
        )
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-full p-6">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            Loading benchmark overview...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !overview) {
    return (
      <div className="max-w-full p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error Loading Benchmarks
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error instanceof Error
              ? error.message
              : "Unable to load benchmark overview."}
          </p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-teal-500" />
          Benchmark Dashboard
        </h1>
        <p className="text-muted-foreground">
          System-wide performance benchmarks and school settings
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Last calculated: {new Date(overview.last_calculated).toLocaleString()}
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_schools}</div>
            <p className="text-xs text-muted-foreground">
              {overview.schools_with_benchmarking} with benchmarking enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              System Average
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.system_average_score.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">across all schools</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Above Average</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {overview.schools_above_average}
            </div>
            <p className="text-xs text-muted-foreground">
              schools performing well
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Needs Attention
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overview.schools_below_average}
            </div>
            <p className="text-xs text-muted-foreground">
              schools below average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Type Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            System-Wide Activity Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toFixed(1)}%`,
                    "Avg Score",
                  ]}
                />
                <Bar dataKey="average" name="Average Score">
                  {activityChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.average >= 80
                          ? "#22c55e"
                          : entry.average >= 60
                            ? "#eab308"
                            : "#ef4444"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No activity data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* School Management Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-500" />
            School Benchmark Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overview.school_summaries.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead className="text-center">Classes</TableHead>
                    <TableHead className="text-center">Avg Score</TableHead>
                    <TableHead className="text-center">Performance</TableHead>
                    <TableHead className="text-center">Benchmarking</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.school_summaries.map((school) => (
                    <TableRow key={school.school_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <School className="w-4 h-4 text-muted-foreground" />
                          {school.school_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {school.class_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {school.average_score !== null ? (
                          <span className="font-medium">
                            {school.average_score.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getPerformanceBadge(school.performance_status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={school.benchmarking_enabled}
                            disabled={updatingSchoolId === school.school_id}
                            onCheckedChange={() =>
                              handleToggleBenchmarking(
                                school.school_id,
                                school.benchmarking_enabled,
                              )
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            {school.benchmarking_enabled
                              ? "Enabled"
                              : "Disabled"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No schools registered yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
