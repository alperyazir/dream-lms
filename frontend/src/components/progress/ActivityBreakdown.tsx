/**
 * Activity Breakdown Component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 *
 * Displays performance breakdown by activity type with user-friendly labels
 */

import React from "react"
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart } from "lucide-react"
import type { ActivityTypeScore } from "@/types/analytics"

export interface ActivityBreakdownProps {
  data: ActivityTypeScore[]
}

// Colors for different score ranges
const getScoreColor = (score: number): string => {
  if (score >= 90) return "#10B981" // green-500
  if (score >= 80) return "#14B8A6" // teal-500
  if (score >= 70) return "#F59E0B" // amber-500
  if (score >= 60) return "#F97316" // orange-500
  return "#EF4444" // red-500
}

export const ActivityBreakdown = React.memo(
  ({ data }: ActivityBreakdownProps) => {
    if (data.length === 0) {
      return (
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PieChart className="w-5 h-5 text-teal-500" />
              Activity Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-48">
            <p className="text-muted-foreground text-center">
              Complete different activities to see your breakdown!
            </p>
          </CardContent>
        </Card>
      )
    }

    // Sort by score (highest first)
    const sortedData = [...data].sort((a, b) => b.avg_score - a.avg_score)

    return (
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PieChart className="w-5 h-5 text-teal-500" />
            Activity Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64" role="img" aria-label="Activity breakdown chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "8px",
                  }}
                  formatter={(value: number, _name: string, props: any) => [
                    `${value}% (${props.payload.total_completed} completed)`,
                    "Average Score",
                  ]}
                />
                <Bar dataKey="avg_score" radius={[0, 4, 4, 0]}>
                  {sortedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getScoreColor(entry.avg_score)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance summary */}
          <div className="mt-4 space-y-2">
            {sortedData.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Best activity:
                </span>
                <span className="font-medium text-green-500">
                  {sortedData[0].label} ({Math.round(sortedData[0].avg_score)}%)
                </span>
              </div>
            )}
            {sortedData.length > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Needs practice:
                </span>
                <span className="font-medium text-amber-500">
                  {sortedData[sortedData.length - 1].label} (
                  {Math.round(sortedData[sortedData.length - 1].avg_score)}%)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  },
)

ActivityBreakdown.displayName = "ActivityBreakdown"
