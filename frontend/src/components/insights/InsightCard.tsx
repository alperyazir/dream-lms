/**
 * Insight Card Component
 * Story 5.4: Error Pattern Detection & Insights
 *
 * Displays a single insight with severity indicator, description, and actions.
 */

import { AlertCircle, AlertTriangle, ChevronRight, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { InsightCard as InsightCardType } from "@/types/analytics"

export interface InsightCardProps {
  insight: InsightCardType
  onViewDetails?: (insightId: string) => void
  onDismiss?: (insightId: string) => void
  isDismissing?: boolean
}

/**
 * Get the icon for an insight severity
 */
function getSeverityIcon(severity: InsightCardType["severity"]) {
  switch (severity) {
    case "critical":
      return <AlertCircle className="w-5 h-5" aria-hidden="true" />
    case "moderate":
      return <AlertTriangle className="w-5 h-5" aria-hidden="true" />
    default:
      return <AlertTriangle className="w-5 h-5" aria-hidden="true" />
  }
}

/**
 * Get styling classes for severity
 */
function getSeverityStyles(severity: InsightCardType["severity"]) {
  switch (severity) {
    case "critical":
      return {
        badge: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        icon: "text-red-500",
        border: "border-l-red-500",
      }
    case "moderate":
      return {
        badge: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
        icon: "text-amber-500",
        border: "border-l-amber-500",
      }
    default:
      return {
        badge: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
        icon: "text-blue-500",
        border: "border-l-blue-500",
      }
  }
}

export function InsightCard({
  insight,
  onViewDetails,
  onDismiss,
  isDismissing = false,
}: InsightCardProps) {
  const styles = getSeverityStyles(insight.severity)

  return (
    <Card
      className={`border-l-4 ${styles.border} shadow-neuro hover:shadow-neuro-lg transition-shadow`}
      role="article"
      aria-label={`${insight.severity} insight: ${insight.title}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Severity Icon */}
          <div className={`mt-0.5 ${styles.icon}`}>
            {getSeverityIcon(insight.severity)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={styles.badge}>
                {insight.severity === "critical" ? "Critical" : "Moderate"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {insight.affected_count} affected
              </span>
            </div>

            <h3 className="font-semibold text-foreground mb-1">
              {insight.title}
            </h3>

            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {insight.description}
            </p>

            <p className="text-xs text-muted-foreground italic">
              Recommended: {insight.recommended_action}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(insight.id)}
                aria-label={`View details for ${insight.title}`}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(insight.id)}
                disabled={isDismissing}
                aria-label={`Dismiss ${insight.title}`}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
