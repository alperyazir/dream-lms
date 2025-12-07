/**
 * BadgeSelector Component - Story 6.5
 *
 * Allows teachers to select multiple badges to award to students.
 * Uses checkboxes for multi-select functionality (AC: 3).
 */

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { PREDEFINED_BADGES } from "@/types/feedback"

interface BadgeSelectorProps {
  selectedBadges: string[]
  onBadgesChange: (badges: string[]) => void
  disabled?: boolean
}

export function BadgeSelector({
  selectedBadges,
  onBadgesChange,
  disabled = false,
}: BadgeSelectorProps) {
  const handleBadgeToggle = (slug: string, checked: boolean) => {
    if (checked) {
      onBadgesChange([...selectedBadges, slug])
    } else {
      onBadgesChange(selectedBadges.filter((b) => b !== slug))
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Award Badges</Label>
      <div className="grid grid-cols-2 gap-3">
        {PREDEFINED_BADGES.map((badge) => (
          <div
            key={badge.slug}
            className={`flex items-center space-x-3 rounded-lg border p-3 transition-colors ${
              selectedBadges.includes(badge.slug)
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            onClick={() =>
              !disabled &&
              handleBadgeToggle(
                badge.slug,
                !selectedBadges.includes(badge.slug),
              )
            }
          >
            <Checkbox
              id={`badge-${badge.slug}`}
              checked={selectedBadges.includes(badge.slug)}
              onCheckedChange={(checked) =>
                handleBadgeToggle(badge.slug, checked as boolean)
              }
              disabled={disabled}
              className="pointer-events-none"
            />
            <div className="flex items-center space-x-2">
              <span className="text-xl">{badge.icon}</span>
              <Label
                htmlFor={`badge-${badge.slug}`}
                className="text-sm font-normal cursor-pointer"
              >
                {badge.label}
              </Label>
            </div>
          </div>
        ))}
      </div>
      {selectedBadges.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedBadges.length} badge{selectedBadges.length !== 1 ? "s" : ""}{" "}
          selected
        </p>
      )}
    </div>
  )
}
