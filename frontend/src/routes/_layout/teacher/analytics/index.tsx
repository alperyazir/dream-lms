import { createFileRoute } from "@tanstack/react-router"
import { Download, Filter } from "lucide-react"
import { useId, useMemo, useState } from "react"
import { ActivityBreakdownChart } from "@/components/charts/ActivityBreakdownChart"
import { ErrorPatternsCard } from "@/components/charts/ErrorPatternsCard"
import { PerformanceChart } from "@/components/charts/PerformanceChart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { mockAnalyticsData, mockClasses, mockStudents } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/teacher/analytics/")({
  component: AnalyticsDashboard,
})

function AnalyticsDashboard() {
  // Generate unique IDs
  const dateRangeId = useId()
  const classFilterId = useId()
  const studentFilterId = useId()

  // Filter state
  const [dateRange, setDateRange] = useState<string>("30")
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [selectedStudent, setSelectedStudent] = useState<string>("all")

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    let data = [...mockAnalyticsData]

    // Date range filter
    const daysAgo = Number.parseInt(dateRange, 10)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

    data = data.filter((point) => new Date(point.date) >= cutoffDate)

    // Student filter
    if (selectedStudent !== "all") {
      data = data.filter((point) => point.student_id === selectedStudent)
    }

    return data
  }, [dateRange, selectedStudent])

  // Prepare performance chart data (average scores by date)
  const performanceData = useMemo(() => {
    const dateScoreMap = new Map<string, { total: number; count: number }>()

    for (const point of filteredData) {
      const existing = dateScoreMap.get(point.date) || { total: 0, count: 0 }
      dateScoreMap.set(point.date, {
        total: existing.total + point.score,
        count: existing.count + 1,
      })
    }

    return Array.from(dateScoreMap.entries())
      .map(([date, { total, count }]) => ({
        date,
        score: Math.round(total / count),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [filteredData])

  // Prepare activity breakdown data
  const activityBreakdownData = useMemo(() => {
    const activityCountMap = new Map<string, number>()

    for (const point of filteredData) {
      const count = activityCountMap.get(point.activity_type) || 0
      activityCountMap.set(point.activity_type, count + 1)
    }

    return Array.from(activityCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [filteredData])

  // Generate error patterns (mock - identify low scoring activities)
  const errorPatterns = useMemo(() => {
    const lowScores = filteredData.filter((point) => point.score < 70)
    const activityErrorMap = new Map<
      string,
      { count: number; students: Set<string> }
    >()

    for (const point of lowScores) {
      const existing = activityErrorMap.get(point.activity_type) || {
        count: 0,
        students: new Set(),
      }
      existing.count += 1
      existing.students.add(point.student_id)
      activityErrorMap.set(point.activity_type, existing)
    }

    const errorDescriptions: Record<string, string> = {
      dragdroppicture: "Students frequently place items in incorrect positions",
      dragdroppicturegroup: "Difficulty grouping items into correct categories",
      matchTheWords: "Confusion between similar vocabulary terms",
      circle: "Incorrect selections or missing correct answers",
      markwithx: "Difficulty identifying errors in text",
      puzzleFindWords: "Trouble locating hidden words in the grid",
    }

    return Array.from(activityErrorMap.entries())
      .map(([activity_type, { count, students }]) => ({
        activity_type,
        error_description:
          errorDescriptions[activity_type] || "Low performance detected",
        frequency: count,
        student_ids: Array.from(students),
      }))
      .sort((a, b) => b.frequency - a.frequency)
  }, [filteredData])

  // Handle export (mock CSV download)
  const handleExport = () => {
    // Create CSV content
    const headers = [
      "Date",
      "Student ID",
      "Activity Type",
      "Score",
      "Time Spent",
    ]
    const rows = filteredData.map((point) => [
      point.date,
      point.student_id,
      point.activity_type,
      point.score.toString(),
      point.time_spent_minutes.toString(),
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")

    // Create download
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `analytics-export-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor student performance and identify patterns
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range Filter */}
            <div className="space-y-2">
              <label
                htmlFor={dateRangeId}
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Date Range
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id={dateRangeId} aria-label="Select date range">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Class Filter */}
            <div className="space-y-2">
              <label
                htmlFor={classFilterId}
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Class
              </label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger id={classFilterId} aria-label="Select class">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {mockClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student Filter */}
            <div className="space-y-2">
              <label
                htmlFor={studentFilterId}
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Student
              </label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger id={studentFilterId} aria-label="Select student">
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {mockStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Over Time Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceChart data={performanceData} filters={{ dateRange }} />
          </CardContent>
        </Card>

        {/* Activity Type Breakdown Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Activity Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityBreakdownChart data={activityBreakdownData} />
          </CardContent>
        </Card>
      </div>

      {/* Error Patterns Display */}
      <ErrorPatternsCard
        patterns={errorPatterns}
        onViewDetails={(studentId) => {
          // Navigate to student analytics detail page
          window.location.href = `/teacher/analytics/${studentId}`
        }}
      />
    </div>
  )
}
