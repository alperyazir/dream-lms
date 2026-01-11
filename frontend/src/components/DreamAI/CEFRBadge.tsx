/**
 * CEFR Level Badge Component
 * Story 27.18: Vocabulary Explorer with Audio Player
 *
 * Displays color-coded CEFR proficiency level badges.
 */

import { Badge } from "@/components/ui/badge"
import type { CEFRLevel } from "@/types/vocabulary-explorer"

export interface CEFRBadgeProps {
  level: CEFRLevel
  size?: "sm" | "default" | "lg"
}

/**
 * Color configuration for CEFR levels
 */
const CEFR_CONFIG: Record<
  CEFRLevel,
  {
    label: string
    className: string
  }
> = {
  A1: {
    label: "A1",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  A2: {
    label: "A2",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  B1: {
    label: "B1",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  B2: {
    label: "B2",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  C1: {
    label: "C1",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  C2: {
    label: "C2",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  },
}

/**
 * CEFR Level Badge
 *
 * Displays a color-coded badge for CEFR proficiency levels.
 * Colors range from green (A1 - beginner) to dark red (C2 - proficient).
 */
export function CEFRBadge({ level, size = "default" }: CEFRBadgeProps) {
  const config = CEFR_CONFIG[level]

  return (
    <Badge
      variant="outline"
      className={`${config.className} border-none font-semibold ${
        size === "sm"
          ? "text-xs px-1.5 py-0.5"
          : size === "lg"
            ? "text-base px-3 py-1"
            : ""
      }`}
    >
      {config.label}
    </Badge>
  )
}
