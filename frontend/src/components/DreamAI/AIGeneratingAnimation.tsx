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
    <Card className="h-full min-h-[400px]">
      <CardContent className="h-full flex flex-col items-center justify-center p-8">
        {/* Simple animated icon */}
        <div className="mb-6">
          <Sparkles className="w-12 h-12 text-purple-500 animate-pulse" />
        </div>

        {/* Text content */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium text-muted-foreground">
            {getActivityMessage()}
            <span className="inline-block w-6 text-left">{dots}</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            This may take a few seconds
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
