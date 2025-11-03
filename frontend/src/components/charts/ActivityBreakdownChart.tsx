import React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export interface ActivityBreakdownChartProps {
  data: Array<{
    name: string
    count: number
  }>
}

/**
 * Activity Type Breakdown Chart
 * Shows completion counts per activity type using Recharts BarChart
 */
export const ActivityBreakdownChart = React.memo(
  ({ data }: ActivityBreakdownChartProps) => {
    return (
      <div
        className="w-full h-full"
        role="img"
        aria-label="Activity type breakdown showing completion counts"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-20}
              textAnchor="end"
              height={80}
              tickFormatter={(value) => {
                // Format activity type names
                const nameMap: Record<string, string> = {
                  dragdroppicture: "Drag & Drop",
                  dragdroppicturegroup: "Group Sort",
                  matchTheWords: "Matching",
                  circle: "Circle",
                  markwithx: "Mark with X",
                  puzzleFindWords: "Word Search",
                }
                return nameMap[value] || value
              }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{
                value: "Completions",
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
              formatter={(value: number) => [value, "Count"]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="count"
              fill="#14B8A6"
              radius={[8, 8, 0, 0]}
              name="Completions"
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Hidden data table for screen readers */}
        <table className="sr-only">
          <caption>Activity type breakdown</caption>
          <thead>
            <tr>
              <th>Activity Type</th>
              <th>Completions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((activity, index) => (
              <tr key={index}>
                <td>{activity.name}</td>
                <td>{activity.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
)

ActivityBreakdownChart.displayName = "ActivityBreakdownChart"
