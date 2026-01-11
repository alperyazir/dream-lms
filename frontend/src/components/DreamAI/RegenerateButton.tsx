/**
 * Regenerate Button Component (Story 27.19)
 *
 * Button to regenerate a single question/item in a quiz/activity.
 * Shows a loading spinner during regeneration.
 */

import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

export interface RegenerateButtonProps {
  onClick: () => void
  isLoading?: boolean
  size?: "default" | "sm" | "lg" | "icon"
}

export function RegenerateButton({
  onClick,
  isLoading = false,
  size = "icon",
}: RegenerateButtonProps) {
  return (
    <Button
      variant="ghost"
      size={size}
      onClick={onClick}
      disabled={isLoading}
      className="h-8 w-8"
      aria-label="Regenerate question"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
    </Button>
  )
}
