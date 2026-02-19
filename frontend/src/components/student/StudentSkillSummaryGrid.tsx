/**
 * Student Skill Summary Grid
 * Story 30.17: Grid of 5 skill summary cards for student dashboard.
 * Fetches data from /me/skill-profile endpoint (Story 30.14).
 */

import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { getMySkillProfile } from "@/services/skillsApi"
import { StudentSkillSummaryCard } from "./StudentSkillSummaryCard"

export function StudentSkillSummaryGrid() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-skill-profile"],
    queryFn: getMySkillProfile,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  // Only show if student has completed at least 1 AI assignment
  if (data.total_ai_assignments_completed === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        My Language Skills
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {data.skills.map((skill) => (
          <StudentSkillSummaryCard
            key={skill.skill_id}
            skillName={skill.skill_name}
            skillIcon={skill.skill_icon}
            skillColor={skill.skill_color}
            proficiency={skill.proficiency}
            confidence={skill.confidence}
          />
        ))}
      </div>
    </div>
  )
}
