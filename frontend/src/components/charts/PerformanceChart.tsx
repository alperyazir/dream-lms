import React from "react"
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

export interface PerformanceChartProps {
  data: Array<{
    date: string
    score: number
    activity_type?: string
  }>
  filters?: {
    dateRange?: string
    classId?: string
    studentId?: string
  }
}

/**
 * Performance Over Time Chart
 * Shows student performance trends using Recharts LineChart
 */
export const PerformanceChart = React.memo(
  ({ data }: PerformanceChartProps) => {
    return (
      <div
        className="w-full h-full"
        role="img"
        aria-label="Performance chart showing student scores over time"
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                // Format date as MM/DD
                const date = new Date(value)
                return `${date.getMonth() + 1}/${date.getDate()}`
              }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              label={{
                value: "Score (%)",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px",
              }}
              labelFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString()
              }}
              formatter={(value: number) => [`${value}%`, "Score"]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="line"
              iconSize={14}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#14B8A6"
              strokeWidth={2}
              dot={{ fill: "#14B8A6", r: 4 }}
              activeDot={{ r: 6 }}
              name="Score"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Hidden data table for screen readers */}
        <table className="sr-only">
          <caption>Performance data over time</caption>
          <thead>
            <tr>
              <th>Date</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point, index) => (
              <tr key={index}>
                <td>{new Date(point.date).toLocaleDateString()}</td>
                <td>{point.score}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
)

PerformanceChart.displayName = "PerformanceChart"
