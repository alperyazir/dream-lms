/**
 * AI Usage Dashboard Page (Admin Only)
 */

import { createFileRoute } from "@tanstack/react-router"
import { subDays } from "date-fns"
import { useState } from "react"
import { DateRangeFilter } from "@/components/Admin/AIUsage/DateRangeFilter"
import { ExportButton } from "@/components/Admin/AIUsage/ExportButton"
import { UsageByTeacherTable } from "@/components/Admin/AIUsage/UsageByTeacherTable"
import { UsageSummaryCards } from "@/components/Admin/AIUsage/UsageSummaryCards"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useAIUsageByProvider,
  useAIUsageByTeacher,
  useAIUsageByType,
  useAIUsageErrors,
  useAIUsageSummary,
} from "@/hooks/useAIUsage"
import type { DateRange } from "@/types/ai-usage"

export const Route = createFileRoute("/_layout/admin/ai-usage")({
  component: AIUsageDashboard,
})

function AIUsageDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  // Fetch all data
  const { data: summary, isLoading: summaryLoading } =
    useAIUsageSummary(dateRange)
  const { data: byType, isLoading: byTypeLoading } = useAIUsageByType(dateRange)
  const { data: byTeacher, isLoading: byTeacherLoading } =
    useAIUsageByTeacher(dateRange)
  const { data: byProvider, isLoading: byProviderLoading } =
    useAIUsageByProvider(dateRange)
  const { data: errors, isLoading: errorsLoading } = useAIUsageErrors(dateRange)

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI Usage Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor AI generation costs and usage patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <ExportButton dateRange={dateRange} />
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <UsageSummaryCards summary={summary} isLoading={summaryLoading} />
      )}

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Usage by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Usage by Activity Type</CardTitle>
          </CardHeader>
          <CardContent>
            {byTypeLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : byType && byType.length > 0 ? (
              <div className="space-y-3">
                {byType.map((item) => (
                  <div
                    key={item.activity_type}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {item.activity_type}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.count} generations • ${item.cost.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {item.percentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.success_rate.toFixed(1)}% success
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center">
                No data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Provider Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {byProviderLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : byProvider ? (
              <div className="space-y-4">
                {byProvider.llm_providers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">LLM Providers</h4>
                    <div className="space-y-2">
                      {byProvider.llm_providers.map((provider) => (
                        <div
                          key={provider.provider}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{provider.provider}</span>
                          <div className="text-right">
                            <div className="font-medium">{provider.count}</div>
                            <div className="text-xs text-muted-foreground">
                              ${provider.cost.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {byProvider.tts_providers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">TTS Providers</h4>
                    <div className="space-y-2">
                      {byProvider.tts_providers.map((provider) => (
                        <div
                          key={provider.provider}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{provider.provider}</span>
                          <div className="text-right">
                            <div className="font-medium">{provider.count}</div>
                            <div className="text-xs text-muted-foreground">
                              ${provider.cost.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center">
                No data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Teacher Usage Table */}
      {byTeacher && (
        <UsageByTeacherTable data={byTeacher} isLoading={byTeacherLoading} />
      )}

      {/* Error Monitor */}
      <Card>
        <CardHeader>
          <CardTitle>Error Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          {errorsLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : errors ? (
            <div className="space-y-4">
              {/* Error Statistics */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Requests
                  </div>
                  <div className="text-2xl font-bold">
                    {errors.error_statistics.total_requests}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Errors
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {errors.error_statistics.total_errors}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Error Rate
                  </div>
                  <div className="text-2xl font-bold">
                    {errors.error_statistics.error_rate_percentage.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Success Rate
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {errors.error_statistics.success_rate_percentage.toFixed(2)}
                    %
                  </div>
                </div>
              </div>

              {/* Recent Errors */}
              {errors.recent_errors.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Errors</h4>
                  <div className="space-y-2">
                    {errors.recent_errors.slice(0, 5).map((error) => (
                      <div
                        key={error.id}
                        className="p-3 border rounded-lg text-sm"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-medium">{error.provider}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(error.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-muted-foreground text-xs mb-1">
                          {error.teacher_name} • {error.activity_type}
                        </div>
                        <div className="text-red-600 text-xs">
                          {error.error_message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm">
                  No errors in this period
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center">
              No error data available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
