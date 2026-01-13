/**
 * AIGeneratingAnimation - Simple loading state for AI generation
 * Story 27.17: Question Generator UI
 *
 * Displays a simple Sparkles animation while AI content is being generated.
 */

import { Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface AIGeneratingAnimationProps {
  /** Activity type being generated */
  activityType?: string | null
  /** Custom message to display */
  message?: string
}

export function AIGeneratingAnimation({
  activityType,
  message,
}: AIGeneratingAnimationProps) {
  const [dots, setDots] = useState("")

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : `${prev}.`))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Get activity-specific message
  const getActivityMessage = () => {
    if (message) return message

    switch (activityType) {
      case "ai_quiz":
        return "Generating quiz questions"
      case "vocabulary_quiz":
        return "Creating vocabulary exercises"
      case "reading_comprehension":
        return "Crafting comprehension questions"
      case "sentence_builder":
        return "Preparing sentence exercises"
      case "word_builder":
        return "Creating spelling challenges"
      default:
        return "Generating content"
    }
  }

  return (
    <Card className="h-full min-h-[400px] border-purple-200 dark:border-purple-800/50">
      <CardContent className="h-full flex flex-col items-center justify-center p-8">
        {/* Animated icon with glow */}
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full blur-xl opacity-40 animate-pulse" />
          <div className="relative p-4 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/40">
            <Sparkles className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>

        {/* Text content */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
            {getActivityMessage()}
            <span className="inline-block w-6 text-left text-muted-foreground">{dots}</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            This may take a few seconds
          </p>
        </div>

        {/* Animated progress bar */}
        <div className="mt-6 w-48 h-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
        </div>
      </CardContent>
    </Card>
  )
}
