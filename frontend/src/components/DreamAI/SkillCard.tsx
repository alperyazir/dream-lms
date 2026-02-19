/**
 * SkillCard - Individual skill selection card
 * Story 30.9: Skill Selection Step UI - Task 2
 */

import {
  BookOpen,
  Braces,
  Ear,
  type LucideIcon,
  Mic,
  Pencil,
  Shuffle,
  Type,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** Map icon string from API to Lucide component */
const ICON_MAP: Record<string, LucideIcon> = {
  ear: Ear,
  "book-open": BookOpen,
  pencil: Pencil,
  mic: Mic,
  type: Type,
  braces: Braces,
  shuffle: Shuffle,
}

/** Skill color → Tailwind classes */
const COLOR_MAP: Record<string, { bg: string; border: string; ring: string; gradient: string }> = {
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500",
    ring: "ring-blue-500/20",
    gradient: "from-blue-500 to-cyan-500",
  },
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500",
    ring: "ring-green-500/20",
    gradient: "from-green-500 to-emerald-500",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500",
    ring: "ring-amber-500/20",
    gradient: "from-amber-500 to-orange-500",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500",
    ring: "ring-purple-500/20",
    gradient: "from-purple-500 to-violet-500",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500",
    ring: "ring-rose-500/20",
    gradient: "from-rose-500 to-pink-500",
  },
  indigo: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500",
    ring: "ring-indigo-500/20",
    gradient: "from-indigo-500 to-purple-500",
  },
  slate: {
    bg: "bg-slate-500/10",
    border: "border-slate-500",
    ring: "ring-slate-500/20",
    gradient: "from-slate-500 to-gray-500",
  },
}

const DEFAULT_COLORS = COLOR_MAP.purple

export interface SkillCardProps {
  name: string
  slug: string
  icon: string
  color: string
  description: string
  formatCount: number
  isSelected: boolean
  isDisabled: boolean
  disabledLabel?: string
  onClick: () => void
}

export function SkillCard({
  name,
  icon,
  color,
  description,
  formatCount,
  isSelected,
  isDisabled,
  disabledLabel,
  onClick,
}: SkillCardProps) {
  const IconComponent = ICON_MAP[icon] || Type
  const colors = COLOR_MAP[color] || DEFAULT_COLORS

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "group relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        isDisabled
          ? "opacity-50 cursor-not-allowed grayscale border-muted bg-muted/30"
          : isSelected
            ? cn(
                colors.border,
                colors.bg,
                colors.ring,
                "shadow-lg scale-[1.02] ring-2",
              )
            : "border-muted bg-card hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5",
      )}
    >
      {/* Disabled label */}
      {isDisabled && disabledLabel && (
        <Badge
          variant="secondary"
          className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5"
        >
          {disabledLabel}
        </Badge>
      )}

      {/* Icon */}
      <div
        className={cn(
          "p-2.5 rounded-lg bg-gradient-to-br mb-2 transition-all duration-200 shadow-md",
          colors.gradient,
          isSelected
            ? "shadow-lg"
            : "group-hover:shadow-lg",
        )}
      >
        <IconComponent className="h-6 w-6 text-white" />
      </div>

      {/* Name */}
      <div className="text-sm font-medium text-center">{name}</div>

      {/* Description */}
      <div className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
        {description}
      </div>

      {/* Format count */}
      {formatCount > 0 && !isDisabled && (
        <Badge variant="outline" className="mt-2 text-[10px]">
          {formatCount} format{formatCount !== 1 ? "s" : ""}
        </Badge>
      )}
    </button>
  )
}
