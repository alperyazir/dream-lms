/**
 * Skill Category & Activity Format Types (Epic 30 - Story 30.9)
 */

export interface SkillCategory {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  description: string | null
  is_active: boolean
}

export interface ActivityFormat {
  id: string
  name: string
  slug: string
  description: string | null
  coming_soon?: boolean
}

export interface SkillWithFormats {
  skill: SkillCategory
  formats: ActivityFormat[]
}

// Story 30.13: Skill Breakdown types
export interface SkillBreakdownItem {
  skill_id: string
  skill_name: string
  skill_slug: string
  skill_color: string
  average_score: number
  student_count: number
  min_score: number
  max_score: number
  is_weakest: boolean
}

export interface AssignmentSkillBreakdownResponse {
  assignment_id: string
  primary_skill: SkillCategory | null
  activity_format: ActivityFormat | null
  is_mix_mode: boolean
  skill_breakdown: SkillBreakdownItem[]
}

// Story 30.14: Student Skill Profile types
export interface SkillProfileItem {
  skill_id: string
  skill_name: string
  skill_slug: string
  skill_color: string
  skill_icon: string
  proficiency: number | null
  data_points: number
  confidence: "insufficient" | "low" | "moderate" | "high"
  trend: "improving" | "stable" | "declining" | null
}

export interface StudentSkillProfileResponse {
  student_id: string
  student_name: string
  skills: SkillProfileItem[]
  total_ai_assignments_completed: number
}

// Story 30.15: Class Skill Heatmap types
export interface StudentSkillCell {
  proficiency: number | null
  data_points: number
  confidence: "insufficient" | "low" | "moderate" | "high"
}

export interface StudentSkillRow {
  student_id: string
  student_name: string
  skills: Record<string, StudentSkillCell>
}

// Story 30.16: Skill Trend types
export interface SkillTrendPoint {
  date: string
  score: number
  assignment_name: string | null
  cefr_level: string | null
}

export interface SkillTrendLine {
  skill_id: string
  skill_name: string
  skill_slug: string
  skill_color: string
  data_points: SkillTrendPoint[]
  has_sufficient_data: boolean
}

export interface StudentSkillTrendsResponse {
  student_id: string
  period: string
  trends: SkillTrendLine[]
}

export interface ClassSkillHeatmapResponse {
  class_id: string
  class_name: string
  skill_columns: SkillCategory[]
  students: StudentSkillRow[]
  class_averages: Record<string, number | null>
}
