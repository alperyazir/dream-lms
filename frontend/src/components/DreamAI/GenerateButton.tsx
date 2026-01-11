/**
 * GenerateButton - Button to trigger AI content generation
 * Story 27.17: Question Generator UI - Task 6
 *
 * Handles different states: idle, loading, disabled
 * Shows estimated time for longer generations
 */

import { Loader2, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { ActivityType } from "@/hooks/useGenerationState"

interface GenerateButtonProps {
  isGenerating: boolean
  isDisabled: boolean
  activityType: ActivityType | null
  onGenerate: () => void
  onCancel?: () => void
}

// Estimated generation times in seconds
const ESTIMATED_TIMES: Record<ActivityType, number> = {
  vocabulary_quiz: 10,
  ai_quiz: 15,
  reading_comprehension: 20,
  sentence_builder: 12,
  word_builder: 10,
}

export function GenerateButton({
  isGenerating,
  isDisabled,
  activityType,
  onGenerate,
  onCancel,
}: GenerateButtonProps) {
  // Get estimated time for current activity type
  const estimatedTime = activityType ? ESTIMATED_TIMES[activityType] : 0
  const showEstimate = estimatedTime > 10

  if (isGenerating) {
    return (
      <div className="space-y-3">
        <Button onClick={onGenerate} disabled className="w-full" size="lg">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </Button>

        {showEstimate && (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              This may take up to {estimatedTime} seconds
            </p>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={onGenerate}
        disabled={isDisabled}
        className="w-full"
        size="lg"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Generate Activity
      </Button>

      {isDisabled && (
        <p className="text-xs text-center text-muted-foreground">
          Select source, activity type, and configure options to generate
        </p>
      )}

      {!isDisabled && showEstimate && (
        <p className="text-xs text-center text-muted-foreground">
          Estimated time: ~{estimatedTime}s
        </p>
      )}
    </div>
  )
}
