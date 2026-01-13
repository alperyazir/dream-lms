/**
 * Activity Type Configuration
 * Story 27.20: Unified Activity Player Integration
 *
 * Centralized configuration for activity type icons, labels, and colors.
 * Used for displaying activity cards and assignment lists.
 */

import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  CheckSquare,
  Circle,
  FileQuestion,
  HelpCircle,
  Image,
  Link,
  Palette,
  PenLine,
  Search,
  Sparkles,
  Type,
  X,
} from "lucide-react"

export interface ActivityTypeConfig {
  icon: LucideIcon
  label: string
  color: string
  isAI?: boolean // Flag for AI-generated content
}

/**
 * Activity type configuration map
 * Maps activity type strings to their display configuration
 */
export const ACTIVITY_TYPE_CONFIG: Record<string, ActivityTypeConfig> = {
  // Existing DCS book activity types
  matchTheWords: {
    icon: Link,
    label: "Match the Words",
    color: "blue",
  },
  dragdroppicture: {
    icon: Image,
    label: "Drag & Drop Picture",
    color: "green",
  },
  dragdroppicturegroup: {
    icon: Image,
    label: "Drag & Drop Group",
    color: "teal",
  },
  fillSentencesWithDots: {
    icon: PenLine,
    label: "Fill Sentences",
    color: "indigo",
  },
  fillpicture: {
    icon: Palette,
    label: "Fill Picture",
    color: "pink",
  },
  circle: {
    icon: Circle,
    label: "Circle",
    color: "orange",
  },
  puzzleFindWords: {
    icon: Search,
    label: "Word Search",
    color: "purple",
  },
  markwithx: {
    icon: X,
    label: "Mark with X",
    color: "red",
  },
  // AI-generated activity types (Epic 27) - Neon purple gradient theme
  vocabulary_quiz: {
    icon: FileQuestion,
    label: "Vocabulary Quiz",
    color: "ai-violet",
    isAI: true,
  },
  ai_quiz: {
    icon: CheckSquare,
    label: "Quiz",
    color: "ai-purple",
    isAI: true,
  },
  reading_comprehension: {
    icon: BookOpen,
    label: "Reading Comprehension",
    color: "ai-fuchsia",
    isAI: true,
  },
  sentence_builder: {
    icon: PenLine,
    label: "Sentence Builder",
    color: "ai-indigo",
    isAI: true,
  },
  word_builder: {
    icon: Type,
    label: "Word Builder",
    color: "ai-pink",
    isAI: true,
  },
}

// Default config for unknown activity types
const DEFAULT_CONFIG: ActivityTypeConfig = {
  icon: HelpCircle,
  label: "Unknown Activity",
  color: "gray",
}

/**
 * Get activity type configuration by type string
 * Returns default config if type is not found
 */
export function getActivityTypeConfig(
  activityType: string,
): ActivityTypeConfig {
  return ACTIVITY_TYPE_CONFIG[activityType] || DEFAULT_CONFIG
}

/**
 * Get Tailwind color classes based on color name
 * Used for consistent styling across the app
 */
export function getActivityTypeColorClasses(color: string): {
  bg: string
  text: string
  border: string
  isAI?: boolean
  gradient?: string
} {
  const colorMap: Record<string, { bg: string; text: string; border: string; isAI?: boolean; gradient?: string }> =
    {
      blue: {
        bg: "bg-blue-100 dark:bg-blue-900/20",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-300 dark:border-blue-700",
      },
      green: {
        bg: "bg-green-100 dark:bg-green-900/20",
        text: "text-green-700 dark:text-green-300",
        border: "border-green-300 dark:border-green-700",
      },
      teal: {
        bg: "bg-teal-100 dark:bg-teal-900/20",
        text: "text-teal-700 dark:text-teal-300",
        border: "border-teal-300 dark:border-teal-700",
      },
      indigo: {
        bg: "bg-indigo-100 dark:bg-indigo-900/20",
        text: "text-indigo-700 dark:text-indigo-300",
        border: "border-indigo-300 dark:border-indigo-700",
      },
      pink: {
        bg: "bg-pink-100 dark:bg-pink-900/20",
        text: "text-pink-700 dark:text-pink-300",
        border: "border-pink-300 dark:border-pink-700",
      },
      orange: {
        bg: "bg-orange-100 dark:bg-orange-900/20",
        text: "text-orange-700 dark:text-orange-300",
        border: "border-orange-300 dark:border-orange-700",
      },
      purple: {
        bg: "bg-purple-100 dark:bg-purple-900/20",
        text: "text-purple-700 dark:text-purple-300",
        border: "border-purple-300 dark:border-purple-700",
      },
      red: {
        bg: "bg-red-100 dark:bg-red-900/20",
        text: "text-red-700 dark:text-red-300",
        border: "border-red-300 dark:border-red-700",
      },
      cyan: {
        bg: "bg-cyan-100 dark:bg-cyan-900/20",
        text: "text-cyan-700 dark:text-cyan-300",
        border: "border-cyan-300 dark:border-cyan-700",
      },
      gray: {
        bg: "bg-gray-100 dark:bg-neutral-900/20",
        text: "text-gray-700 dark:text-gray-300",
        border: "border-gray-300 dark:border-gray-700",
      },
      // AI Neon Purple Gradient Colors
      "ai-purple": {
        bg: "bg-gradient-to-br from-purple-500 to-violet-600 dark:from-purple-600 dark:to-violet-700",
        text: "text-white",
        border: "border-purple-400 dark:border-purple-500",
        isAI: true,
        gradient: "from-purple-500 to-violet-600",
      },
      "ai-violet": {
        bg: "bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700",
        text: "text-white",
        border: "border-violet-400 dark:border-violet-500",
        isAI: true,
        gradient: "from-violet-500 to-purple-600",
      },
      "ai-fuchsia": {
        bg: "bg-gradient-to-br from-fuchsia-500 to-purple-600 dark:from-fuchsia-600 dark:to-purple-700",
        text: "text-white",
        border: "border-fuchsia-400 dark:border-fuchsia-500",
        isAI: true,
        gradient: "from-fuchsia-500 to-purple-600",
      },
      "ai-indigo": {
        bg: "bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700",
        text: "text-white",
        border: "border-indigo-400 dark:border-indigo-500",
        isAI: true,
        gradient: "from-indigo-500 to-purple-600",
      },
      "ai-pink": {
        bg: "bg-gradient-to-br from-pink-500 to-purple-600 dark:from-pink-600 dark:to-purple-700",
        text: "text-white",
        border: "border-pink-400 dark:border-pink-500",
        isAI: true,
        gradient: "from-pink-500 to-purple-600",
      },
    }

  return (
    colorMap[color] || {
      bg: "bg-gray-100 dark:bg-neutral-900/20",
      text: "text-gray-700 dark:text-gray-300",
      border: "border-gray-300 dark:border-gray-700",
    }
  )
}
