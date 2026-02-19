/**
 * Assignment Skill Breakdown Component
 * Story 30.13: Shows per-skill score breakdown for AI-generated assignments.
 *
 * For single-skill assignments: skill badge + format badge.
 * For mix mode: horizontal bar chart with per-skill averages.
 */

import { AlertTriangle, BookOpen, Target } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getAssignmentSkillBreakdown } from "@/services/skillsApi"
import type { SkillBreakdownItem } from "@/types/skill"

interface AssignmentSkillBreakdownProps {
  assignmentId: string
}

/** Map skill color keys to Tailwind + Recharts hex colors */
const SKILL_COLORS: Record<string, { bg: string; text: string; hex: string }> =
  {
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-300",
      hex: "#3b82f6",
    },
    green: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-300",
      hex: "#22c55e",
    },
    purple: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-700 dark:text-purple-300",
      hex: "#a855f7",
    },
    orange: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-700 dark:text-orange-300",
      hex: "#f97316",
    },
    teal: {
      bg: "bg-teal-100 dark:bg-teal-900/30",
      text: "text-teal-700 dark:text-teal-300",
      hex: "#14b8a6",
    },
    rose: {
      bg: "bg-rose-100 dark:bg-rose-900/30",
      text: "text-rose-700 dark:text-rose-300",
      hex: "#f43f5e",
    },
  }

function getSkillColor(color: string) {
  return SKILL_COLORS[color] || SKILL_COLORS.blue
}

export function AssignmentSkillBreakdown({
  assignmentId,
}: AssignmentSkillBreakdownProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["assignment-skill-breakdown", assignmentId],
    queryFn: () => getAssignmentSkillBreakdown(assignmentId),
    enabled: !!assignmentId,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return null // Silently hide for non-skill assignments
  }

  // No skill data available
  if (!data.primary_skill && data.skill_breakdown.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          Skill Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Skill & Format badges */}
        <div className="flex flex-wrap gap-2">
          {data.primary_skill && (
            <Badge
              variant="outline"
              className={`${getSkillColor(data.primary_skill.color).bg} ${getSkillColor(data.primary_skill.color).text} border-0`}
            >
              {data.primary_skill.name}
            </Badge>
          )}
          {data.activity_format && (
            <Badge variant="outline" className="border-gray-300">
              <BookOpen className="mr-1 h-3 w-3" />
              {data.activity_format.name}
            </Badge>
          )}
          {data.is_mix_mode && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            >
              Mix Mode
            </Badge>
          )}
        </div>

        {/* Score breakdown */}
        {data.skill_breakdown.length > 0 && (
          <SkillBreakdownChart
            items={data.skill_breakdown}
            isMixMode={data.is_mix_mode}
          />
        )}

        {data.skill_breakdown.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No skill score data available yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function SkillBreakdownChart({
  items,
  isMixMode,
}: {
  items: SkillBreakdownItem[]
  isMixMode: boolean
}) {
  // For single skill, show a simple score display
  if (!isMixMode && items.length === 1) {
    const item = items[0]
    const colors = getSkillColor(item.skill_color)
    return (
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">{item.skill_name}</p>
          <p className="text-xs text-muted-foreground">
            {item.student_count} student{item.student_count !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: colors.hex }}>
            {item.average_score}%
          </p>
          <p className="text-xs text-muted-foreground">
            {item.min_score}% - {item.max_score}%
          </p>
        </div>
      </div>
    )
  }

  // Mix mode: horizontal bar chart
  const chartData = items.map((item) => ({
    name: item.skill_name,
    score: item.average_score,
    color: getSkillColor(item.skill_color).hex,
    isWeakest: item.is_weakest,
    students: item.student_count,
    min: item.min_score,
    max: item.max_score,
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={items.length * 50 + 40}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} unit="%" />
          <YAxis
            type="category"
            dataKey="name"
            width={75}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number, _name: string, props: any) => [
              `${value}% avg (${props.payload.min}%-${props.payload.max}%)`,
              `${props.payload.students} student${props.payload.students !== 1 ? "s" : ""}`,
            ]}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isWeakest ? "#ef4444" : entry.color}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Weakest skill callout */}
      {items.some((i) => i.is_weakest) && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Weakest skill:{" "}
            <strong>{items.find((i) => i.is_weakest)?.skill_name}</strong> (
            {items.find((i) => i.is_weakest)?.average_score}% avg)
          </span>
        </div>
      )}
    </div>
  )
}
