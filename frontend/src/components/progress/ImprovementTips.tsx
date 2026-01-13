/**
 * Improvement Tips Component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 *
 * Displays personalized improvement tips for the student
 */

import { Lightbulb, Sparkles } from "lucide-react"
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface ImprovementTipsProps {
  tips: string[]
}

export const ImprovementTips = React.memo(({ tips }: ImprovementTipsProps) => {
  if (tips.length === 0) {
    return null
  }

  return (
    <Card className="shadow-neuro border-teal-100 dark:border-teal-900 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-900/10 dark:to-yellow-900/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Tips for You
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tips.map((tip, index) => (
            <div
              key={index}
              className="flex gap-3 p-3 rounded-lg bg-white/80 dark:bg-neutral-900/50 border border-amber-100 dark:border-amber-900/30"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})

ImprovementTips.displayName = "ImprovementTips"
