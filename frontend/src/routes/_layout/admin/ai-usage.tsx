/**
 * AI Usage Dashboard Page (Admin Only)
 */

import { createFileRoute } from "@tanstack/react-router"
import { subDays } from "date-fns"
import { AlertCircle, Loader2 } from "lucide-react"
import { useState } from "react"
import { FiActivity } from "react-icons/fi"
import { DateRangeFilter } from "@/components/Admin/AIUsage/DateRangeFilter"
import { ExportButton } from "@/components/Admin/AIUsage/ExportButton"
import { UsageByTeacherTable } from "@/components/Admin/AIUsage/UsageByTeacherTable"
import { UsageSummaryCards } from "@/components/Admin/AIUsage/UsageSummaryCards"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { Alert, AlertDescription } from "@/components/ui/alert"
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

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useAIUsageSummary(dateRange)
  const {
    data: byType,
    isLoading: byTypeLoading,
    error: byTypeError,
  } = useAIUsageByType(dateRange)
  const {
    data: byTeacher,
    isLoading: byTeacherLoading,
    error: byTeacherError,
  } = useAIUsageByTeacher(dateRange)
  const {
    data: byProvider,
    isLoading: byProviderLoading,
    error: byProviderError,
  } = useAIUsageByProvider(dateRange)
  const {
    data: errors,
    isLoading: errorsLoading,
    error: errorsError,
  } = useAIUsageErrors(dateRange)

  const hasAnyError =
    summaryError || byTypeError || byTeacherError || byProviderError || errorsError

  return (
    <PageContainer>
      <PageHeader
        icon={FiActivity}
        title="AI Usage Dashboard"
        description="Monitor AI generation costs and usage patterns"
      >
        <div className="flex items-center gap-2">
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <ExportButton dateRange={dateRange} />
        </div>
      </PageHeader>

      {/* API Error Banner */}
      {hasAnyError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load some usage data. Make sure you are logged in as an
            admin.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <UsageSummaryCards
        summary={
          summary ?? {
            total_generations: 0,
            total_cost: 0,
            success_rate: 0,
            total_llm_generations: 0,
            total_tts_generations: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            total_audio_characters: 0,
            average_duration_ms: 0,
            date_range: { from: null, to: null },
          }
        }
        isLoading={summaryLoading}
      />

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Usage by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage by Activity Type</CardTitle>
          </CardHeader>
          <CardContent>
            {byTypeLoading ? (
              <LoadingSpinner />
            ) : byType && byType.length > 0 ? (
              <div className="space-y-3">
                {byType.map((item) => {
                  const label = item.activity_type
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())
                  return (
                    <div
                      key={item.activity_type}
                      className="flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {label}
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div
                            className="bg-purple-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-sm">
                          {item.count}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState message="No activity data for this period" />
            )}
          </CardContent>
        </Card>

        {/* Provider Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {byProviderLoading ? (
              <LoadingSpinner />
            ) : byProvider &&
              (byProvider.llm_providers.length > 0 ||
                byProvider.tts_providers.length > 0) ? (
              <div className="space-y-5">
                {byProvider.llm_providers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      LLM Providers
                    </h4>
                    <div className="space-y-2">
                      {byProvider.llm_providers.map((provider) => (
                        <div
                          key={provider.provider}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <span className="text-sm font-medium">
                            {provider.provider}
                          </span>
                          <div className="text-right">
                            <div className="font-semibold text-sm">
                              {provider.count}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ${provider.cost.toFixed(4)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {byProvider.tts_providers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      TTS Providers
                    </h4>
                    <div className="space-y-2">
                      {byProvider.tts_providers.map((provider) => (
                        <div
                          key={provider.provider}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <span className="text-sm font-medium">
                            {provider.provider}
                          </span>
                          <div className="text-right">
                            <div className="font-semibold text-sm">
                              {provider.count}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ${provider.cost.toFixed(4)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState message="No provider data for this period" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Teacher Usage Table */}
      <UsageByTeacherTable
        data={byTeacher ?? []}
        isLoading={byTeacherLoading}
      />

      {/* Error Monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Error Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          {errorsLoading ? (
            <LoadingSpinner />
          ) : errors ? (
            <div className="space-y-4">
              {/* Error Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <StatBlock
                  label="Total Requests"
                  value={errors.error_statistics.total_requests.toLocaleString()}
                />
                <StatBlock
                  label="Total Errors"
                  value={errors.error_statistics.total_errors.toLocaleString()}
                  className="text-red-500"
                />
                <StatBlock
                  label="Error Rate"
                  value={`${errors.error_statistics.error_rate_percentage.toFixed(2)}%`}
                />
                <StatBlock
                  label="Success Rate"
                  value={`${errors.error_statistics.success_rate_percentage.toFixed(2)}%`}
                  className="text-green-500"
                />
              </div>

              {/* Recent Errors */}
              {errors.recent_errors.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Errors</h4>
                  <div className="space-y-2">
                    {errors.recent_errors.slice(0, 10).map((error) => (
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
                          {error.teacher_name} &middot;{" "}
                          {error.activity_type.replace(/_/g, " ")}
                        </div>
                        <div className="text-red-500 text-xs font-mono">
                          {error.error_message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No errors in this period
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="No error data available" />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
}

function LoadingSpinner() {
  return (
    <div className="h-48 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}

function StatBlock({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold mt-1 ${className ?? ""}`}>{value}</div>
    </div>
  )
}
