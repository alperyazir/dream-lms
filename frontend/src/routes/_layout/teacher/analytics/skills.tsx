/**
 * Class Skill Heatmap Page
 * Story 30.15: Shows students x skills proficiency matrix for a class.
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FiBarChart2 } from "react-icons/fi"
import { SkillHeatmap } from "@/components/analytics/SkillHeatmap"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getClassSkillHeatmap } from "@/services/skillsApi"
import { getMyClasses } from "@/services/teachersApi"
import { useState } from "react"

export const Route = createFileRoute("/_layout/teacher/analytics/skills")({
  component: () => (
    <ErrorBoundary>
      <SkillsAnalyticsPage />
    </ErrorBoundary>
  ),
})

function SkillsAnalyticsPage() {
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["teacher-classes"],
    queryFn: getMyClasses,
  })

  const [selectedClassId, setSelectedClassId] = useState<string>("")

  // Auto-select first class
  const classId = selectedClassId || classes[0]?.id || ""

  const {
    data: heatmapData,
    isLoading: heatmapLoading,
    error,
  } = useQuery({
    queryKey: ["class-skill-heatmap", classId],
    queryFn: () => getClassSkillHeatmap(classId),
    enabled: !!classId,
  })

  if (classesLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    )
  }

  if (classes.length === 0) {
    return (
      <PageContainer>
        <PageHeader
          icon={FiBarChart2}
          title="Skill Analytics"
          description="View class-wide skill proficiency breakdown."
        />
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No classes found. Create a class to see skill analytics.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        icon={FiBarChart2}
        title="Skill Analytics"
        description="View class-wide skill proficiency breakdown."
      />

      {/* Class selector */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Class:
        </span>
        <Select
          value={classId}
          onValueChange={(v) => setSelectedClassId(v)}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {heatmapData
              ? `${heatmapData.class_name} - Skill Proficiency`
              : "Skill Proficiency Heatmap"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {heatmapLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-500">
              Failed to load skill heatmap data.
            </p>
          ) : heatmapData ? (
            <SkillHeatmap data={heatmapData} />
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  )
}
