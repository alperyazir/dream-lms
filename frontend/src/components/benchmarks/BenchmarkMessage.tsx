/**
 * Benchmark Message Component
 * Story 5.7: Performance Comparison & Benchmarking
 *
 * Displays encouraging or constructive feedback based on benchmark performance
 */

import {
  AlertTriangle,
  BookOpen,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react"
import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { BenchmarkMessage as BenchmarkMessageType } from "@/types/benchmarks"

export interface BenchmarkMessageProps {
  message: BenchmarkMessageType
}

/**
 * Get icon component based on message type
 */
function getMessageIcon(type: BenchmarkMessageType["type"]) {
  switch (type) {
    case "excelling":
      return Trophy
    case "above_average":
      return TrendingUp
    case "at_average":
      return Target
    case "below_average":
      return AlertTriangle
    case "needs_focus":
      return BookOpen
    default:
      return Sparkles
  }
}

/**
 * Get styling based on message type
 */
function getMessageStyles(type: BenchmarkMessageType["type"]): {
  borderColor: string
  bgGradient: string
  iconColor: string
  titleColor: string
} {
  switch (type) {
    case "excelling":
      return {
        borderColor: "border-yellow-300 dark:border-yellow-700",
        bgGradient:
          "bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/20 dark:via-amber-900/20 dark:to-orange-900/20",
        iconColor: "text-yellow-500",
        titleColor: "text-yellow-700 dark:text-yellow-400",
      }
    case "above_average":
      return {
        borderColor: "border-green-300 dark:border-green-700",
        bgGradient:
          "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
        iconColor: "text-green-500",
        titleColor: "text-green-700 dark:text-green-400",
      }
    case "at_average":
      return {
        borderColor: "border-blue-300 dark:border-blue-700",
        bgGradient:
          "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
        iconColor: "text-blue-500",
        titleColor: "text-blue-700 dark:text-blue-400",
      }
    case "below_average":
      return {
        borderColor: "border-orange-300 dark:border-orange-700",
        bgGradient:
          "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20",
        iconColor: "text-orange-500",
        titleColor: "text-orange-700 dark:text-orange-400",
      }
    case "needs_focus":
      return {
        borderColor: "border-red-300 dark:border-red-700",
        bgGradient:
          "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20",
        iconColor: "text-red-500",
        titleColor: "text-red-700 dark:text-red-400",
      }
    default:
      return {
        borderColor: "border-gray-300 dark:border-gray-700",
        bgGradient:
          "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20",
        iconColor: "text-gray-500",
        titleColor: "text-gray-700 dark:text-gray-400",
      }
  }
}

export const BenchmarkMessage = React.memo(
  ({ message }: BenchmarkMessageProps) => {
    const Icon = getMessageIcon(message.type)
    const styles = getMessageStyles(message.type)

    return (
      <Card
        className={`shadow-neuro ${styles.borderColor} ${styles.bgGradient} overflow-hidden`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={`flex-shrink-0 p-3 rounded-full bg-white/60 dark:bg-black/20 ${styles.iconColor}`}
            >
              <Icon className="w-6 h-6" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-lg ${styles.titleColor}`}>
                {message.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {message.description}
              </p>

              {/* Focus area if provided */}
              {message.focus_area && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 dark:bg-black/20 text-sm">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Focus area:</span>
                  <span className="text-muted-foreground">
                    {message.focus_area}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
)

BenchmarkMessage.displayName = "BenchmarkMessage"
