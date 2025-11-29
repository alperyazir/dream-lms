/**
 * Benchmark Disabled Message Component
 * Story 5.7: Performance Comparison & Benchmarking
 *
 * Displays when benchmarking is disabled at school/publisher level
 */

import React from "react"
import { ShieldOff, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export interface BenchmarkDisabledMessageProps {
  message?: string | null
  variant?: "card" | "alert"
}

const DEFAULT_MESSAGE =
  "Benchmarking has been disabled for your school. Contact your administrator for more information."

export const BenchmarkDisabledMessage = React.memo(
  ({
    message,
    variant = "card",
  }: BenchmarkDisabledMessageProps) => {
    const displayMessage = message ?? DEFAULT_MESSAGE

    if (variant === "alert") {
      return (
        <Alert
          variant="default"
          className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
        >
          <ShieldOff className="h-4 w-4 text-slate-500" />
          <AlertTitle className="text-slate-700 dark:text-slate-300">
            Benchmarking Disabled
          </AlertTitle>
          <AlertDescription className="text-slate-600 dark:text-slate-400">
            {displayMessage}
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <Card className="shadow-neuro border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <ShieldOff className="w-8 h-8 text-slate-500" />
            </div>

            {/* Title */}
            <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300 mb-2">
              Benchmarking Not Available
            </h3>

            {/* Description */}
            <p className="text-sm text-muted-foreground max-w-md">{displayMessage}</p>

            {/* Privacy note */}
            <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-white/50 dark:bg-black/20 px-4 py-2 rounded-lg max-w-md">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Your school may have opted out of benchmarking for privacy
                reasons. Your class performance data remains private.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
)

BenchmarkDisabledMessage.displayName = "BenchmarkDisabledMessage"
