/**
 * Benchmark Comparison Chart Component
 * Story 5.7: Performance Comparison & Benchmarking
 *
 * Displays comparison chart showing class performance vs. benchmarks over time
 */

import { TrendingUp } from "lucide-react"
import React, { useState } from "react"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BenchmarkTrendPoint } from "@/types/benchmarks"

export interface BenchmarkComparisonChartProps {
  trendData: BenchmarkTrendPoint[]
  periodType?: "weekly" | "monthly"
  onPeriodChange?: (periodType: "weekly" | "monthly") => void
}

export const BenchmarkComparisonChart = React.memo(
  ({
    trendData,
    periodType = "weekly",
    onPeriodChange,
  }: BenchmarkComparisonChartProps) => {
    const [selectedPeriod, setSelectedPeriod] = useState(periodType)

    const handlePeriodChange = (period: "weekly" | "monthly") => {
      setSelectedPeriod(period)
      onPeriodChange?.(period)
    }

    // Transform data for chart
    const chartData = trendData.map((point) => ({
      name: point.period_label,
      "Your Class": point.class_average,
      "School Average": point.school_benchmark,
      "Publisher Average": point.publisher_benchmark,
    }))

    if (trendData.length === 0) {
      return (
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-500" />
              Performance Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Not enough data to display trends yet
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-500" />
              Performance Over Time
            </CardTitle>
            {onPeriodChange && (
              <div className="flex gap-1">
                <Button
                  variant={selectedPeriod === "weekly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePeriodChange("weekly")}
                >
                  Weekly
                </Button>
                <Button
                  variant={selectedPeriod === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePeriodChange("monthly")}
                >
                  Monthly
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [`${Math.round(value)}%`, ""]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Your Class"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: "#2563eb", r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="School Average"
                  stroke="#16a34a"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "#16a34a", r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="Publisher Average"
                  stroke="#9333ea"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ fill: "#9333ea", r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  },
)

BenchmarkComparisonChart.displayName = "BenchmarkComparisonChart"
