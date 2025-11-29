/**
 * Progress Score Chart Component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 *
 * Displays score trend over time with encouraging highlights
 */

import React from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import type { ScoreTrendPoint } from "@/types/analytics"

export interface ProgressScoreChartProps {
  data: ScoreTrendPoint[]
  avgScore?: number
}

export const ProgressScoreChart = React.memo(
  ({ data, avgScore }: ProgressScoreChartProps) => {
    if (data.length === 0) {
      return (
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-500" />
              Score Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground text-center">
              Complete some assignments to see your progress chart!
            </p>
          </CardContent>
        </Card>
      )
    }

    // Calculate average if not provided
    const average =
      avgScore ??
      data.reduce((sum, point) => sum + point.score, 0) / data.length

    // Find best score for highlighting
    const bestScore = Math.max(...data.map((d) => d.score))

    // Format date for display
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }

    const chartData = data.map((point) => ({
      ...point,
      displayDate: formatDate(point.date),
    }))

    return (
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-500" />
            Score Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64" role="img" aria-label="Score trend chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="opacity-30"
                  vertical={false}
                />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "8px",
                  }}
                  formatter={(value: number) => [`${value}%`, "Score"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <ReferenceLine
                  y={average}
                  stroke="#F59E0B"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#14B8A6"
                  strokeWidth={3}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props
                    const isBest = payload.score === bestScore
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isBest ? 6 : 4}
                        fill={isBest ? "#10B981" : "#14B8A6"}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )
                  }}
                  activeDot={{ r: 7, fill: "#14B8A6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal-500" />
              <span className="text-muted-foreground">Your Scores</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-amber-500" style={{ borderStyle: "dashed" }} />
              <span className="text-muted-foreground">
                Average ({Math.round(average)}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">
                Best ({bestScore}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
)

ProgressScoreChart.displayName = "ProgressScoreChart"
