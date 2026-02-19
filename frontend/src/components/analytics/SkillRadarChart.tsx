/**
 * Skill Radar Chart Component
 * Story 30.14: Renders a 5-axis radar chart showing student skill proficiency.
 *
 * Confidence levels:
 * - insufficient (< 3 data points): greyed out
 * - low (3-5): dashed line
 * - moderate (6-10): solid line
 * - high (10+): solid line + trend indicator
 */

import React from "react"
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import type { SkillProfileItem } from "@/types/skill"

const SKILL_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  purple: "#a855f7",
  orange: "#f97316",
  teal: "#14b8a6",
  rose: "#f43f5e",
}

interface SkillRadarChartProps {
  skills: SkillProfileItem[]
  size?: "sm" | "md" | "lg"
}

const SIZE_MAP = {
  sm: 200,
  md: 300,
  lg: 400,
}

export const SkillRadarChart = React.memo(function SkillRadarChart({
  skills,
  size = "md",
}: SkillRadarChartProps) {
  const height = SIZE_MAP[size]

  const chartData = skills.map((s) => ({
    skill: s.skill_name,
    proficiency: s.confidence === "insufficient" ? 0 : (s.proficiency ?? 0),
    fullMark: 100,
    isInsufficient: s.confidence === "insufficient",
    dataPoints: s.data_points,
    confidence: s.confidence,
    trend: s.trend,
    color: SKILL_COLORS[s.skill_color] || SKILL_COLORS.blue,
  }))

  // All insufficient - show empty state
  const allInsufficient = chartData.every((d) => d.isInsufficient)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={chartData} cx="50%" cy="50%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fontSize: size === "sm" ? 10 : 12 }}
          />
          <Radar
            dataKey="proficiency"
            stroke="#14b8a6"
            fill="#14b8a6"
            fillOpacity={allInsufficient ? 0.05 : 0.3}
            strokeWidth={2}
            strokeDasharray={
              skills.some((s) => s.confidence === "low") ? "5 5" : undefined
            }
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null
              const data = payload[0].payload
              return (
                <div className="rounded-md border bg-white px-3 py-2 text-sm shadow-md dark:bg-gray-800">
                  <p className="font-medium">{data.skill}</p>
                  {data.isInsufficient ? (
                    <p className="text-muted-foreground">Not enough data</p>
                  ) : (
                    <>
                      <p>
                        Proficiency:{" "}
                        <span className="font-semibold">
                          {data.proficiency.toFixed(1)}%
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        {data.dataPoints} data point
                        {data.dataPoints !== 1 ? "s" : ""} ({data.confidence})
                      </p>
                      {data.trend && (
                        <p
                          className={
                            data.trend === "improving"
                              ? "text-green-600"
                              : data.trend === "declining"
                                ? "text-red-600"
                                : "text-gray-500"
                          }
                        >
                          {data.trend === "improving"
                            ? "Improving"
                            : data.trend === "declining"
                              ? "Declining"
                              : "Stable"}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )
            }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Screen reader accessible table */}
      <table className="sr-only">
        <caption>Student Skill Proficiency</caption>
        <thead>
          <tr>
            <th>Skill</th>
            <th>Proficiency</th>
            <th>Confidence</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((s) => (
            <tr key={s.skill_id}>
              <td>{s.skill_name}</td>
              <td>
                {s.proficiency !== null ? `${s.proficiency}%` : "No data"}
              </td>
              <td>{s.confidence}</td>
              <td>{s.trend || "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})
