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
  listening_quiz: 10,
  listening_fill_blank: 10,
  grammar_fill_blank: 10,
  writing_fill_blank: 10,
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
        <Button
          onClick={onGenerate}
          disabled
          className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/30"
          size="lg"
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </Button>

        {showEstimate && (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              This may take up to {estimatedTime} seconds
            </p>
            <Progress
              value={undefined}
              className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-violet-500"
            />
          </div>
        )}

        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            className="w-full border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/50"
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
        className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:from-gray-400 disabled:to-gray-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 transition-all duration-200 hover:-translate-y-0.5"
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
