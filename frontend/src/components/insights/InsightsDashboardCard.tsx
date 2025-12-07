/**
 * Insights Dashboard Card Component
 * Story 5.4: Error Pattern Detection & Insights
 *
 * Displays a summary of insights on the teacher dashboard with links to full view.
 */

import { Link } from "@tanstack/react-router"
import { ChevronRight, Lightbulb, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useDismissInsight,
  useTeacherInsights,
} from "@/hooks/useTeacherInsights"
import { InsightCard } from "./InsightCard"

export interface InsightsDashboardCardProps {
  /** Maximum number of insights to show */
  maxInsights?: number
  /** Route to navigate for viewing all insights */
  viewAllRoute?: string
  /** Callback when insight details are requested */
  onViewInsightDetails?: (insightId: string) => void
}

export function InsightsDashboardCard({
  maxInsights = 3,
  viewAllRoute = "/teacher/insights",
  onViewInsightDetails,
}: InsightsDashboardCardProps) {
  const { insights, lastRefreshed, isLoading, error, refreshInsights } =
    useTeacherInsights()

  const { dismissInsight, isDismissing } = useDismissInsight()

  // Sort insights: critical first, then moderate
  const sortedInsights = [...insights].sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1
    if (b.severity === "critical" && a.severity !== "critical") return 1
    return 0
  })

  const displayedInsights = sortedInsights.slice(0, maxInsights)
  const remainingCount = Math.max(0, insights.length - maxInsights)
  const criticalCount = insights.filter((i) => i.severity === "critical").length

  const handleRefresh = async () => {
    try {
      await refreshInsights()
    } catch {
      // Error is handled by the hook
    }
  }

  if (isLoading) {
    return (
      <Card className="shadow-neuro">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="shadow-neuro border-red-200 dark:border-red-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-teal-500" />
            Insights
          </CardTitle>
          <CardDescription className="text-red-500">
            Failed to load insights. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className="shadow-neuro hover:shadow-neuro-lg transition-shadow"
      role="region"
      aria-label="Teacher insights summary"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-teal-500" aria-hidden="true" />
            Insights
            {criticalCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {criticalCount}
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            aria-label="Refresh insights"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <CardDescription>
          {insights.length === 0
            ? "No insights available"
            : `${insights.length} insight${insights.length !== 1 ? "s" : ""} detected`}
          {lastRefreshed && (
            <span className="text-xs ml-2">
              · Updated {new Date(lastRefreshed).toLocaleTimeString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {displayedInsights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No patterns or issues detected.</p>
            <p className="text-sm">Keep up the great work!</p>
          </div>
        ) : (
          <>
            {displayedInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onViewDetails={onViewInsightDetails}
                onDismiss={(id) => dismissInsight(id)}
                isDismissing={isDismissing}
              />
            ))}

            {remainingCount > 0 && (
              <Link to={viewAllRoute}>
                <Button
                  variant="ghost"
                  className="w-full justify-center text-teal-600 hover:text-teal-700 dark:text-teal-400"
                >
                  View {remainingCount} more insight
                  {remainingCount !== 1 ? "s" : ""}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
