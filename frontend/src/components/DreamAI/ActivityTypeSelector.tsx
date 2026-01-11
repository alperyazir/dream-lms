/**
 * ActivityTypeSelector - Select AI activity type
 * Story 27.17: Question Generator UI - Task 3
 *
 * Displays available activity types as selectable cards with icons and descriptions.
 */

import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  type LucideIcon,
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
  },
  {
    id: "word_builder",
    name: "Word Builder",
    icon: Type,
    description: "Spell words from scrambled letters",
    options: ["word_count", "include_audio"],
    defaultOptions: { word_count: 10, include_audio: true },
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
      <div>
        <Label className="text-base font-semibold">Activity Type</Label>
        <p className="text-sm text-muted-foreground">
          Choose what type of content to generate
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ACTIVITY_TYPES.map((activityType) => (
          <button
            key={activityType.id}
            onClick={() =>
              onSelect(activityType.id, activityType.defaultOptions)
            }
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all",
              "hover:border-primary/50 hover:bg-accent/50",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              selectedType === activityType.id
                ? "border-primary bg-primary/5"
                : "border-muted bg-card",
            )}
          >
            <activityType.icon className="h-8 w-8 mb-2" />
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
