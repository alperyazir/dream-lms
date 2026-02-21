/**
 * SkillSelectionGrid - Grid of skill cards for selection
 * Story 30.9: Skill Selection Step UI - Task 1
 *
 * Displays skill categories as cards with single-select behavior.
 * Includes a "Mix" card alongside API-driven skill cards.
 */

import { Loader2, Sparkles } from "lucide-react"
import { Label } from "@/components/ui/label"
import type { SkillWithFormats } from "@/types/skill"
import { SkillCard } from "./SkillCard"

export interface SkillSelectionGridProps {
  skills: SkillWithFormats[]
  selectedSkillSlug: string | null
  onSelect: (slug: string) => void
  isLoading?: boolean
}

export function SkillSelectionGrid({
  skills,
  selectedSkillSlug,
  onSelect,
  isLoading,
}: SkillSelectionGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading skills...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <Label className="text-base font-semibold">Language Skill</Label>
          <p className="text-sm text-muted-foreground">
            Choose which skill to practice
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
        {/* Active skills from API */}
        {skills.map((item) => (
          <SkillCard
            key={item.skill.slug}
            name={item.skill.name}
            slug={item.skill.slug}
            icon={item.skill.icon}
            color={item.skill.color}
            description={item.skill.description || ""}
            formatCount={item.formats.length}
            isSelected={selectedSkillSlug === item.skill.slug}
            isDisabled={false}
            onClick={() => onSelect(item.skill.slug)}
          />
        ))}

        {/* Mix card — always shown */}
        <SkillCard
          name="Mix"
          slug="mix"
          icon="shuffle"
          color="indigo"
          description="Balanced multi-skill practice covering all areas"
          formatCount={0}
          isSelected={selectedSkillSlug === "mix"}
          isDisabled={false}
          onClick={() => onSelect("mix")}
        />

      </div>
    </div>
  )
}
