/**
 * Teacher Insights Page
 * Story 5.4: Error Pattern Detection & Insights
 *
 * Full page view of all detected patterns and issues across student work.
 */

import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Users,
  BookOpen,
  HelpCircle,
} from "lucide-react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { InsightCard } from "@/components/insights/InsightCard"
import {
  useTeacherInsights,
  useInsightDetail,
  useDismissInsight,
} from "@/hooks/useTeacherInsights"
import type { InsightCard as InsightCardType } from "@/types/analytics"

export const Route = createFileRoute("/_layout/teacher/insights")({
  component: () => (
    <ErrorBoundary>
      <TeacherInsightsPage />
    </ErrorBoundary>
  ),
})

function TeacherInsightsPage() {
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(
    null
  )
  const [activeTab, setActiveTab] = useState<"all" | "critical" | "moderate">(
    "all"
  )

  const { insights, lastRefreshed, isLoading, refreshInsights } =
    useTeacherInsights()
  const { dismissInsight, isDismissing } = useDismissInsight()

  // Filter insights by severity
  const filteredInsights = insights.filter((insight) => {
    if (activeTab === "all") return true
    return insight.severity === activeTab
  })

  // Sort: critical first
  const sortedInsights = [...filteredInsights].sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1
    if (b.severity === "critical" && a.severity !== "critical") return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const criticalCount = insights.filter(
    (i) => i.severity === "critical"
  ).length
  const moderateCount = insights.filter(
    (i) => i.severity === "moderate"
  ).length

  const handleRefresh = async () => {
    try {
      await refreshInsights()
    } catch {
      // Error handled by hook
    }
  }

  const handleDismiss = (insightId: string) => {
    dismissInsight(insightId)
    if (selectedInsightId === insightId) {
      setSelectedInsightId(null)
    }
  }

  if (isLoading) {
    return <InsightsPageSkeleton />
  }

  return (
    <div className="max-w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Lightbulb className="w-8 h-8 text-teal-500" />
            Insights & Patterns
          </h1>
          <p className="text-muted-foreground">
            Automatically detected patterns and issues across your students'
            work.
            {lastRefreshed && (
              <span className="text-xs ml-2">
                Last updated: {new Date(lastRefreshed).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Lightbulb className="w-5 h-5" />}
          label="Total Insights"
          value={insights.length}
          color="teal"
        />
        <SummaryCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="Critical Issues"
          value={criticalCount}
          color="red"
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Moderate Issues"
          value={moderateCount}
          color="amber"
        />
      </div>

      {/* Tabs and Content */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList>
          <TabsTrigger value="all">All ({insights.length})</TabsTrigger>
          <TabsTrigger value="critical">
            Critical ({criticalCount})
          </TabsTrigger>
          <TabsTrigger value="moderate">
            Moderate ({moderateCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {sortedInsights.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="space-y-4">
              {sortedInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onViewDetails={setSelectedInsightId}
                  onDismiss={handleDismiss}
                  isDismissing={isDismissing}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <InsightDetailModal
        insightId={selectedInsightId}
        onClose={() => setSelectedInsightId(null)}
        onDismiss={handleDismiss}
      />
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: "teal" | "red" | "amber"
}) {
  const colorClasses = {
    teal: "from-teal-500 to-cyan-500",
    red: "from-red-500 to-rose-500",
    amber: "from-amber-500 to-orange-500",
  }

  return (
    <Card className="shadow-neuro">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white`}
          >
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ tab }: { tab: string }) {
  return (
    <Card className="shadow-neuro">
      <CardContent className="py-12 text-center">
        <Lightbulb className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
        <h3 className="text-lg font-semibold mb-2">
          {tab === "all"
            ? "No insights detected"
            : `No ${tab} issues found`}
        </h3>
        <p className="text-muted-foreground">
          {tab === "all"
            ? "Great job! No patterns or issues have been detected in your students' work."
            : `There are no ${tab} issues requiring your attention right now.`}
        </p>
      </CardContent>
    </Card>
  )
}

function InsightsPageSkeleton() {
  return (
    <div className="max-w-full p-6 space-y-6">
      <div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  )
}

// ============================================================================
// Insight Detail Modal
// ============================================================================

interface InsightDetailModalProps {
  insightId: string | null
  onClose: () => void
  onDismiss: (insightId: string) => void
}

function InsightDetailModal({
  insightId,
  onClose,
  onDismiss,
}: InsightDetailModalProps) {
  const { detail, isLoading, error } = useInsightDetail(insightId)

  if (!insightId) return null

  return (
    <Dialog open={!!insightId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {isLoading ? (
          <InsightDetailSkeleton />
        ) : error ? (
          <InsightDetailError />
        ) : detail ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <SeverityBadge severity={detail.insight.severity} />
                <TypeBadge type={detail.insight.type} />
              </div>
              <DialogTitle>{detail.insight.title}</DialogTitle>
              <DialogDescription>
                {detail.insight.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Recommended Action */}
              <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-teal-700 dark:text-teal-300 mb-1">
                    Recommended Action
                  </h4>
                  <p className="text-sm text-teal-600 dark:text-teal-400">
                    {detail.insight.recommended_action}
                  </p>
                </CardContent>
              </Card>

              {/* Affected Students */}
              {detail.affected_students.length > 0 && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4" />
                    Affected Students ({detail.affected_students.length})
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.affected_students.map((student) => (
                        <TableRow key={student.student_id}>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.relevant_metric}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Related Assignments */}
              {detail.related_assignments.length > 0 && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4" />
                    Related Assignments ({detail.related_assignments.length})
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Avg Score</TableHead>
                        <TableHead>Completion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.related_assignments.map((assignment) => (
                        <TableRow key={assignment.assignment_id}>
                          <TableCell>{assignment.name}</TableCell>
                          <TableCell>{assignment.avg_score.toFixed(1)}%</TableCell>
                          <TableCell>
                            {assignment.completion_rate.toFixed(0)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Related Questions (for misconceptions) */}
              {detail.related_questions && detail.related_questions.length > 0 && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <HelpCircle className="w-4 h-4" />
                    Common Mistakes ({detail.related_questions.length})
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Correct Answer</TableHead>
                        <TableHead>Common Wrong Answer</TableHead>
                        <TableHead>Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.related_questions.map((question) => (
                        <TableRow key={question.question_id}>
                          <TableCell className="max-w-xs truncate">
                            {question.question_text}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {question.correct_answer}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {question.common_wrong_answer}
                          </TableCell>
                          <TableCell>{question.wrong_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDismiss(insightId)
                    onClose()
                  }}
                >
                  Dismiss Insight
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function InsightDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

function InsightDetailError() {
  return (
    <div className="text-center py-8">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
      <p className="text-lg font-semibold">Failed to load insight details</p>
      <p className="text-muted-foreground">Please try again later.</p>
    </div>
  )
}

function SeverityBadge({
  severity,
}: {
  severity: InsightCardType["severity"]
}) {
  if (severity === "critical") {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400">
        Critical
      </Badge>
    )
  }
  return (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
      Moderate
    </Badge>
  )
}

function TypeBadge({ type }: { type: InsightCardType["type"] }) {
  const typeLabels: Record<InsightCardType["type"], string> = {
    struggling_topic: "Struggling Topic",
    common_misconception: "Common Misconception",
    time_management: "Time Management",
    review_recommended: "Review Recommended",
    struggling_students: "Struggling Students",
    activity_type_struggle: "Activity Struggle",
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      {typeLabels[type] ?? type}
    </Badge>
  )
}
