/**
 * FormatSelectionPanel - Shows available activity formats for selected skill
 * Story 30.10: Format Selection & Configuration Step - Task 1
 */

import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  type LucideIcon,
  Puzzle,
  Type,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ActivityFormat } from "@/types/skill"

/** Map format slug to icon + description */
const FORMAT_META: Record<
  string,
  { icon: LucideIcon; description: string; gradient: string }
> = {
  multiple_choice: {
    icon: CheckCircle2,
    description: "Answer multiple choice questions",
    gradient: "from-violet-500 to-purple-600",
  },
  word_builder: {
    icon: Type,
    description: "Spell words from scrambled letters",
    gradient: "from-pink-500 to-purple-600",
  },
  matching: {
    icon: Puzzle,
    description: "Match pairs of related items",
    gradient: "from-amber-500 to-orange-600",
  },
  fill_blank: {
    icon: ClipboardList,
    description: "Complete sentences with missing words",
    gradient: "from-cyan-500 to-blue-600",
  },
  sentence_builder: {
    icon: FileEdit,
    description: "Arrange words into correct sentences",
    gradient: "from-indigo-500 to-purple-600",
  },
  comprehension: {
    icon: BookOpen,
    description: "Read a passage and answer questions",
    gradient: "from-fuchsia-500 to-purple-600",
  },
}

const DEFAULT_META = {
  icon: ClipboardList,
  description: "Generate practice activities",
  gradient: "from-gray-500 to-gray-600",
}

interface FormatSelectionPanelProps {
  formats: ActivityFormat[]
  selectedFormatSlug: string | null
  onSelect: (slug: string) => void
}

export function FormatSelectionPanel({
  formats,
  selectedFormatSlug,
  onSelect,
}: FormatSelectionPanelProps) {
  if (formats.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No formats available for this skill.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base font-semibold">Activity Format</Label>
        <p className="text-sm text-muted-foreground">
          Choose the type of activity to generate
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-1">
        {formats.map((format) => {
          const meta = FORMAT_META[format.slug] || DEFAULT_META
          const IconComp = meta.icon
          const isSelected = selectedFormatSlug === format.slug

          return (
            <button
              key={format.slug}
              onClick={() => onSelect(format.slug)}
              className={cn(
                "group flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
                "hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
                isSelected
                  ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20"
                  : "border-muted bg-card hover:border-purple-400/50",
              )}
            >
              <div
                className={cn(
                  "p-2.5 rounded-lg bg-gradient-to-br mb-2 transition-all duration-200 shadow-md",
                  meta.gradient,
                  isSelected
                    ? "shadow-purple-500/40"
                    : "shadow-purple-500/20 group-hover:shadow-purple-500/30",
                )}
              >
                <IconComp className="h-6 w-6 text-white" />
              </div>
              <div className="text-sm font-medium text-center">
                {format.name}
              </div>
              <div className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
                {format.description || meta.description}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
