/**
 * BadgeDisplay Component - Story 6.5
 *
 * Displays awarded badges as visual icons/labels (AC: 8).
 * Used in student assignment results page and feedback views.
 */

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BADGE_ICONS, BADGE_LABELS } from "@/types/feedback"

interface BadgeDisplayProps {
  badges: string[]
  size?: "sm" | "md" | "lg"
  showLabels?: boolean
}

export function BadgeDisplay({
  badges,
  size = "md",
  showLabels = true,
}: BadgeDisplayProps) {
  if (!badges || badges.length === 0) {
    return null
  }

  const sizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  }

  const badgeSizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  }

  return (
    <div className="flex flex-wrap gap-2">
      <TooltipProvider>
        {badges.map((slug) => {
          const icon = BADGE_ICONS[slug] || "🏆"
          const label = BADGE_LABELS[slug] || slug

          if (showLabels) {
            return (
              <Badge
                key={slug}
                variant="secondary"
                className={`${badgeSizeClasses[size]} flex items-center gap-1.5`}
              >
                <span className={sizeClasses[size]}>{icon}</span>
                <span>{label}</span>
              </Badge>
            )
          }

          return (
            <Tooltip key={slug}>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className={`${badgeSizeClasses[size]} cursor-default`}
                >
                  <span className={sizeClasses[size]}>{icon}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{label}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </TooltipProvider>
    </div>
  )
}
