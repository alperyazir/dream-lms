/**
 * Skill Profile Card Component
 * Story 30.14: Shows radar chart + per-skill list with proficiency, confidence, trend.
 */

import { ArrowDown, ArrowRight, ArrowUp, Radar } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getMySkillProfile, getStudentSkillProfile } from "@/services/skillsApi"
import type { SkillProfileItem } from "@/types/skill"
import { SkillRadarChart } from "./SkillRadarChart"

const SKILL_COLORS: Record<string, { bg: string; text: string }> = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
  },
  teal: {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-700 dark:text-teal-300",
  },
  rose: {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-300",
  },
}

function getColor(color: string) {
  return SKILL_COLORS[color] || SKILL_COLORS.blue
}

const CONFIDENCE_LABELS: Record<string, string> = {
  insufficient: "Not enough data",
  low: "Low confidence",
  moderate: "Moderate",
  high: "High confidence",
}

interface SkillProfileCardProps {
  /** Pass studentId for teacher view, omit for student self-view */
  studentId?: string
  /** Chart size */
  size?: "sm" | "md" | "lg"
  /** Whether to show the per-skill list below the chart */
  showList?: boolean
}

export function SkillProfileCard({
  studentId,
  size = "md",
  showList = true,
}: SkillProfileCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: studentId
      ? ["student-skill-profile", studentId]
      : ["my-skill-profile"],
    queryFn: () =>
      studentId
        ? getStudentSkillProfile(studentId)
        : getMySkillProfile(),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mx-auto h-48 w-48 rounded-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return null
  }

  if (data.total_ai_assignments_completed === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="h-4 w-4" />
            Skill Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-4">
            No AI assignment data yet. Complete skill-based assignments to see
            your profile.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Radar className="h-4 w-4" />
          Skill Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SkillRadarChart skills={data.skills} size={size} />

        {showList && (
          <div className="space-y-2">
            {data.skills.map((skill) => (
              <SkillRow key={skill.skill_id} skill={skill} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SkillRow({ skill }: { skill: SkillProfileItem }) {
  const colors = getColor(skill.skill_color)

  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`${colors.bg} ${colors.text} border-0 text-xs`}
        >
          {skill.skill_name}
        </Badge>
        {skill.confidence === "insufficient" && (
          <span className="text-xs text-muted-foreground">
            {CONFIDENCE_LABELS.insufficient}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {skill.proficiency !== null ? (
          <>
            <span className="text-sm font-semibold">
              {skill.proficiency.toFixed(1)}%
            </span>
            {skill.trend && <TrendIndicator trend={skill.trend} />}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">--</span>
        )}
      </div>
    </div>
  )
}

function TrendIndicator({
  trend,
}: {
  trend: "improving" | "stable" | "declining"
}) {
  switch (trend) {
    case "improving":
      return <ArrowUp className="h-4 w-4 text-green-600" />
    case "declining":
      return <ArrowDown className="h-4 w-4 text-red-600" />
    case "stable":
      return <ArrowRight className="h-4 w-4 text-gray-400" />
  }
}
