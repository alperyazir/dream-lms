/**
 * Audio Button Component
 * Story 10.2: Frontend Audio Player Component
 *
 * Compact icon button to toggle audio player visibility in activity headers.
 */

import { Headphones, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface AudioButtonProps {
  /** Click handler to toggle audio player */
  onClick: () => void
  /** Whether the audio player is currently visible */
  isActive?: boolean
  /** Whether audio is currently loading */
  isLoading?: boolean
}

export function AudioButton({
  onClick,
  isActive = false,
  isLoading = false,
}: AudioButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            disabled={isLoading}
            className={cn(
              "relative h-8 w-8 rounded-full transition-all",
              isActive
                ? "bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900 dark:text-teal-300 dark:hover:bg-teal-800"
                : "text-gray-600 hover:bg-gray-100 hover:text-teal-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-teal-400",
            )}
            aria-label={isActive ? "Hide audio player" : "Listen to audio"}
            aria-expanded={isActive}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isActive ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
            {/* Active indicator dot */}
            {isActive && !isLoading && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-teal-500 dark:bg-teal-400" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {isLoading ? "Loading audio..." : isActive ? "Hide player" : "Listen"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
