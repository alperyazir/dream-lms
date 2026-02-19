/**
 * Skill Trend Chart Component
 * Story 30.16: Line chart showing per-skill proficiency trends over time.
 */

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  getMySkillTrends,
  getStudentSkillTrends,
} from "@/services/skillsApi"

const SKILL_HEX: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  purple: "#a855f7",
  orange: "#f97316",
  teal: "#14b8a6",
  rose: "#f43f5e",
}

const PERIODS = [
  { value: "30d", label: "30 Days" },
  { value: "3m", label: "3 Months" },
  { value: "semester", label: "Semester" },
  { value: "all", label: "All Time" },
]

interface SkillTrendChartProps {
  /** Pass studentId for teacher view, omit for student self-view */
  studentId?: string
}

export function SkillTrendChart({ studentId }: SkillTrendChartProps) {
  const [period, setPeriod] = useState("3m")

  const { data, isLoading, error } = useQuery({
    queryKey: studentId
      ? ["student-skill-trends", studentId, period]
      : ["my-skill-trends", period],
    queryFn: () =>
      studentId
        ? getStudentSkillTrends(studentId, period)
        : getMySkillTrends(period),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return null
  }

  const sufficientTrends = data.trends.filter((t) => t.has_sufficient_data)
  const insufficientTrends = data.trends.filter((t) => !t.has_sufficient_data)

  // Merge all data points into a single dataset keyed by date
  const dateMap = new Map<string, Record<string, number | null>>()
  for (const trend of sufficientTrends) {
    for (const point of trend.data_points) {
      if (!dateMap.has(point.date)) {
        dateMap.set(point.date, { date: point.date as unknown as number })
      }
      const entry = dateMap.get(point.date)!
      entry[trend.skill_slug] = point.score
    }
  }

  // Sort by date
  const chartData = Array.from(dateMap.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Skill Trends</CardTitle>
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(v) => v && setPeriod(v)}
            size="sm"
          >
            {PERIODS.map((p) => (
              <ToggleGroupItem key={p.value} value={p.value}>
                {p.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {sufficientTrends.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Not enough data to show trends. Complete more skill-based
            assignments to see progress over time.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v)
                    return `${d.getMonth() + 1}/${d.getDate()}`
                  }}
                />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip
                  labelFormatter={(label: string) => {
                    const d = new Date(label)
                    return d.toLocaleDateString()
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    name,
                  ]}
                />
                <Legend />
                {sufficientTrends.map((trend) => (
                  <Line
                    key={trend.skill_slug}
                    type="monotone"
                    dataKey={trend.skill_slug}
                    name={trend.skill_name}
                    stroke={
                      SKILL_HEX[trend.skill_color] || SKILL_HEX.blue
                    }
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {insufficientTrends.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Not enough data for:{" "}
                {insufficientTrends.map((t) => t.skill_name).join(", ")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
