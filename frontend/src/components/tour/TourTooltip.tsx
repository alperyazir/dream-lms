/**
 * TourTooltip - Custom tooltip component for React Joyride
 * Styled to match Shadcn UI design system
 */

import { X } from "lucide-react"
import type { TooltipRenderProps } from "react-joyride"
import { Button } from "@/components/ui/button"

export interface TourTooltipProps extends TooltipRenderProps {
  /** Additional class names */
  className?: string
}

export function TourTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
  isLastStep,
}: TourTooltipProps) {
  return (
    <div
      {...tooltipProps}
      className="rounded-lg border bg-card text-card-foreground shadow-lg p-4 max-w-sm z-[10000]"
      role="dialog"
      aria-labelledby="tour-tooltip-title"
      aria-describedby="tour-tooltip-content"
    >
      {/* Header with title and close button */}
      <div className="flex items-start justify-between gap-2 mb-2">
        {step.title && (
          <h3
            id="tour-tooltip-title"
            className="font-semibold text-lg leading-tight"
          >
            {step.title}
          </h3>
        )}
        <button
          {...closeProps}
          className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div
        id="tour-tooltip-content"
        className="text-sm text-muted-foreground mb-4"
      >
        {step.content}
      </div>

      {/* Progress indicator */}
      <div className="text-xs text-muted-foreground mb-3">
        Step {index + 1} of {size}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-2">
        {/* Skip button on the left */}
        <Button {...skipProps} variant="ghost" size="sm" aria-label="Skip tour">
          Skip
        </Button>

        {/* Navigation buttons on the right */}
        <div className="flex gap-2">
          {index > 0 && (
            <Button
              {...backProps}
              variant="outline"
              size="sm"
              aria-label="Previous step"
            >
              Back
            </Button>
          )}
          {continuous && (
            <Button
              {...primaryProps}
              size="sm"
              aria-label={isLastStep ? "Finish tour" : "Next step"}
            >
              {isLastStep ? "Finish" : "Next"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
