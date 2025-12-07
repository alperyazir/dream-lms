/**
 * StudentBadgeSummary Component - Story 6.5
 *
 * Displays a summary of all badges earned by a student (AC: 9, 14).
 * Shows badge counts grouped by type with visual icons.
 * Used on student dashboard/profile.
 */

import { useQuery } from "@tanstack/react-query"
import { LuAward, LuLoader } from "react-icons/lu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BADGE_ICONS, BADGE_LABELS } from "@/types/feedback"

interface StudentBadgeSummaryProps {
  showMonthly?: boolean
  compact?: boolean
}

interface BadgeCountsResponse {
  badge_counts: Record<string, number>
  total: number
  this_month: Record<string, number>
  this_month_total: number
}

export function StudentBadgeSummary({
  showMonthly = true,
  compact = false,
}: StudentBadgeSummaryProps) {
  const { data, isLoading, error } = useQuery<BadgeCountsResponse>({
    queryKey: ["my-badges"],
    queryFn: async () => {
      const response = await fetch("/api/v1/students/me/badges", {
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("Failed to fetch badge counts")
      }
      return response.json()
    },
    staleTime: 60000, // 1 minute
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LuLoader className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return null
  }

  // Get all badge types that have at least one count
  const earnedBadges = Object.entries(data.badge_counts).filter(
    ([_, count]) => count > 0,
  )

  if (earnedBadges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LuAward className="h-5 w-5" />
            My Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            No badges earned yet. Complete assignments to earn badges!
          </p>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {earnedBadges.map(([slug, count]) => (
          <Badge
            key={slug}
            variant="secondary"
            className="px-3 py-1.5 text-sm flex items-center gap-1.5"
          >
            <span className="text-lg">{BADGE_ICONS[slug] || "🏆"}</span>
            <span>
              {BADGE_LABELS[slug] || slug}
              {count > 1 && ` × ${count}`}
            </span>
          </Badge>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <LuAward className="h-5 w-5" />
          My Badges
          <Badge variant="secondary" className="ml-auto">
            {data.total} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Badge grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {earnedBadges.map(([slug, count]) => (
            <div
              key={slug}
              className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30"
            >
              <span className="text-2xl">{BADGE_ICONS[slug] || "🏆"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {BADGE_LABELS[slug] || slug}
                </p>
                <p className="text-xs text-muted-foreground">{count} earned</p>
              </div>
            </div>
          ))}
        </div>

        {/* Monthly summary */}
        {showMonthly && data.this_month_total > 0 && (
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Earned this month: {data.this_month_total}
            </p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(data.this_month)
                .filter(([_, count]) => count > 0)
                .map(([slug, count]) => (
                  <Badge key={slug} variant="outline" className="text-xs">
                    {BADGE_ICONS[slug]} {count}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
