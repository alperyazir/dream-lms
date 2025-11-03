import React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

export interface StudentProgressChartProps {
  scores: number[]
  dates?: string[]
}

/**
 * Individual Student Progress Chart
 * Shows score progression over time with trend line and average indicator
 */
export const StudentProgressChart = React.memo(
  ({ scores, dates }: StudentProgressChartProps) => {
    // Calculate average score
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length

    // Prepare chart data
    const chartData = scores.map((score, index) => ({
      assignment: `A${index + 1}`,
      score,
      date: dates?.[index] || `Assignment ${index + 1}`,
    }))

    // Find best and worst performances
    const maxScore = Math.max(...scores)
    const minScore = Math.min(...scores)

    return (
      <div
        className="w-full h-full"
        role="img"
        aria-label={`Student progress chart showing ${scores.length} assignment scores`}
      >
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="assignment"
              tick={{ fontSize: 12 }}
              height={50}
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
              formatter={(value: number) => [`${value}%`, "Score"]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />

            {/* Average score reference line */}
            <ReferenceLine
              y={averageScore}
              stroke="#F59E0B"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Avg: ${Math.round(averageScore)}%`,
                position: "right",
                fill: "#F59E0B",
                fontSize: 12,
                fontWeight: "bold",
              }}
            />

            {/* Score line with highlights */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="#14B8A6"
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload } = props
                const score = payload.score

                // Highlight best and worst scores
                if (score === maxScore) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="#10B981"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  )
                }
                if (score === minScore) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="#EF4444"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  )
                }
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="#14B8A6"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )
              }}
              activeDot={{ r: 7 }}
              name="Score"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Legend for highlights */}
        <div className="flex items-center justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Best: {maxScore}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Worst: {minScore}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Average: {Math.round(averageScore)}%
            </span>
          </div>
        </div>

        {/* Hidden data table for screen readers */}
        <table className="sr-only">
          <caption>Student progress data</caption>
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((point, index) => (
              <tr key={index}>
                <td>{point.assignment}</td>
                <td>{point.score}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
)

StudentProgressChart.displayName = "StudentProgressChart"
