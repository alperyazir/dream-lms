/**
 * ActivityTypeSelector - Select AI activity type
 * Story 27.17: Question Generator UI - Task 3
 *
 * Displays available activity types as selectable cards with icons and descriptions.
 * Uses neon purple gradient theme for AI-generated content.
 */

import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  type LucideIcon,
  Sparkles,
  Type,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import type { ActivityType } from "@/hooks/useGenerationState"
import { cn } from "@/lib/utils"

export interface ActivityTypeConfig {
  id: ActivityType
  name: string
  icon: LucideIcon
  description: string
  options: string[]
  defaultOptions: Record<string, any>
  gradient: string // Neon gradient colors
}

export const ACTIVITY_TYPES: ActivityTypeConfig[] = [
  {
    id: "vocabulary_quiz",
    name: "Vocabulary Quiz",
    icon: ClipboardList,
    description: "Definition, synonym, or antonym quiz",
    options: ["quiz_mode", "quiz_length", "include_audio"],
    defaultOptions: {
      quiz_mode: "mixed",
      quiz_length: 10,
      include_audio: true,
    },
    gradient: "from-violet-500 to-purple-600",
  },
  {
    id: "ai_quiz",
    name: "Quiz",
    icon: CheckCircle2,
    description: "AI-generated multiple choice questions",
    options: ["question_count", "difficulty", "include_explanations"],
    defaultOptions: {
      question_count: 10,
      difficulty: "medium",
      include_explanations: true,
    },
    gradient: "from-purple-500 to-violet-600",
  },
  {
    id: "reading_comprehension",
    name: "Reading Comprehension",
    icon: BookOpen,
    description: "AI-generated passage with comprehension questions",
    options: ["passage_length", "question_count", "difficulty"],
    defaultOptions: {
      passage_length: 200,
      question_count: 5,
    },
    gradient: "from-fuchsia-500 to-purple-600",
  },
  {
    id: "sentence_builder",
    name: "Sentence Builder",
    icon: FileEdit,
    description: "Arrange words into correct sentences",
    options: ["sentence_count", "difficulty", "include_audio"],
    defaultOptions: {
      sentence_count: 10,
      difficulty: "medium",
      include_audio: true,
    },
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    id: "word_builder",
    name: "Word Builder",
    icon: Type,
    description: "Spell words from scrambled letters",
    options: ["word_count", "include_audio"],
    defaultOptions: { word_count: 10, include_audio: true },
    gradient: "from-pink-500 to-purple-600",
  },
]

interface ActivityTypeSelectorProps {
  selectedType: ActivityType | null
  onSelect: (type: ActivityType, defaultOptions: Record<string, any>) => void
}

export function ActivityTypeSelector({
  selectedType,
  onSelect,
}: ActivityTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <Label className="text-base font-semibold">Activity Type</Label>
          <p className="text-sm text-muted-foreground">
            Choose what type of AI content to generate
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ACTIVITY_TYPES.map((activityType) => (
          <button
            key={activityType.id}
            onClick={() =>
              onSelect(activityType.id, activityType.defaultOptions)
            }
            className={cn(
              "group flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
              "hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5",
              "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
              selectedType === activityType.id
                ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20"
                : "border-muted bg-card hover:border-purple-400/50",
            )}
          >
            <div
              className={cn(
                "p-2.5 rounded-lg bg-gradient-to-br mb-2 transition-all duration-200",
                activityType.gradient,
                "shadow-md group-hover:shadow-lg",
                selectedType === activityType.id
                  ? "shadow-purple-500/40"
                  : "shadow-purple-500/20 group-hover:shadow-purple-500/30"
              )}
            >
              <activityType.icon className="h-6 w-6 text-white" />
            </div>
            <div className="text-sm font-medium text-center">
              {activityType.name}
            </div>
            <div className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
              {activityType.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Get activity type configuration by ID
 */
export function getActivityTypeConfig(
  id: ActivityType,
): ActivityTypeConfig | undefined {
  return ACTIVITY_TYPES.find((type) => type.id === id)
}
