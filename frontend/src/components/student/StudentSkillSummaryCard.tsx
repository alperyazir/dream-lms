/**
 * Student Skill Summary Card
 * Story 30.17: Student-facing skill card with star rating and encouraging messages.
 * Designed for younger learners — visual, encouraging, never discouraging.
 */

import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const SKILL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-600 dark:text-blue-400",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-600 dark:text-green-400",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-600 dark:text-purple-400",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-800",
    text: "text-orange-600 dark:text-orange-400",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-900/20",
    border: "border-teal-200 dark:border-teal-800",
    text: "text-teal-600 dark:text-teal-400",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-600 dark:text-rose-400",
  },
}

function getColors(color: string) {
  return SKILL_COLORS[color] || SKILL_COLORS.blue
}

interface SkillLevel {
  stars: number
  message: string
}

function getSkillLevel(
  proficiency: number | null,
  confidence: string,
): SkillLevel {
  if (proficiency === null || confidence === "insufficient") {
    return { stars: 0, message: "Start practicing!" }
  }
  if (proficiency <= 20) return { stars: 1, message: "Keep going!" }
  if (proficiency <= 40) return { stars: 2, message: "Getting better!" }
  if (proficiency <= 60) return { stars: 3, message: "Good progress!" }
  if (proficiency <= 80) return { stars: 4, message: "Well done!" }
  return { stars: 5, message: "Excellent!" }
}

interface StudentSkillSummaryCardProps {
  skillName: string
  skillIcon: string
  skillColor: string
  proficiency: number | null
  confidence: string
}

export function StudentSkillSummaryCard({
  skillName,
  skillIcon,
  skillColor,
  proficiency,
  confidence,
}: StudentSkillSummaryCardProps) {
  const colors = getColors(skillColor)
  const { stars, message } = getSkillLevel(proficiency, confidence)

  return (
    <Card className={`${colors.bg} ${colors.border} border-2`}>
      <CardContent className="flex flex-col items-center gap-2 py-4 px-3">
        <span className="text-2xl" role="img" aria-label={skillName}>
          {skillIcon}
        </span>
        <h3 className={`text-sm font-semibold ${colors.text}`}>{skillName}</h3>

        {/* Star rating */}
        <div
          className="flex gap-0.5"
          role="img"
          aria-label={`${stars} out of 5 stars`}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${
                i <= stars
                  ? `${colors.text} fill-current`
                  : "text-gray-300 dark:text-gray-600"
              }`}
            />
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}
