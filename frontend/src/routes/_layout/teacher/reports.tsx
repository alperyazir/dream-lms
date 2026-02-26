/**
 * Teacher Reports Page
 * Story 5.6: Time-Based Reporting & Trend Analysis
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ClockIcon, FileText } from "lucide-react"
import { useState } from "react"
import { FiBarChart2 } from "react-icons/fi"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { ReportBuilder } from "@/components/reports/ReportBuilder"
import { ReportHistory } from "@/components/reports/ReportHistory"
import { ReportProgress } from "@/components/reports/ReportProgress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useDeleteReportHistory,
  useDownloadReport,
  useReportHistory,
  useReportWorkflow,
} from "@/hooks/useReports"
import { getMyClasses, getMyStudents } from "@/services/teachersApi"
import type {
  ReportGenerateRequest,
  ReportHistoryItem,
} from "@/types/reports"

export const Route = createFileRoute("/_layout/teacher/reports")({
  component: () => (
    <ErrorBoundary>
      <TeacherReportsPage />
    </ErrorBoundary>
  ),
})

type PageView = "builder" | "progress"

function TeacherReportsPage() {
  const [activeTab, setActiveTab] = useState<"build" | "history">("build")
  const [pageView, setPageView] = useState<PageView>("builder")
  const [currentConfig, setCurrentConfig] =
    useState<ReportGenerateRequest | null>(null)

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["teacher-classes"],
    queryFn: getMyClasses,
  })

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["teacher-students"],
    queryFn: getMyStudents,
  })

  const workflow = useReportWorkflow()
  const history = useReportHistory()
  const { download: downloadHistoryReport } = useDownloadReport()
  const { deleteReport, isDeleting: isDeletingReport } =
    useDeleteReportHistory()

  const handleGenerate = async (config: ReportGenerateRequest) => {
    setCurrentConfig(config)
    setPageView("progress")
    try {
      await workflow.startReport(config)
    } catch {
      // Error handled by workflow
    }
  }

  const handleProgressDownload = () => workflow.download()

  const handleRetry = () => {
    if (currentConfig) {
      handleGenerate(currentConfig)
    }
  }

  const handleCancel = () => {
    workflow.reset()
    setPageView("builder")
  }

  const handleHistoryDownload = (report: ReportHistoryItem) => {
    if (report.download_url) {
      downloadHistoryReport({
        jobId: report.id,
        filename: `${report.report_type}_report.${report.format}`,
      })
    }
  }

  const handleHistoryDelete = (report: ReportHistoryItem) => {
    deleteReport(report.id)
  }

  const isDataLoading = classesLoading || studentsLoading

  if (isDataLoading) {
    return <ReportsPageSkeleton />
  }

  if (pageView === "progress") {
    return (
      <PageContainer>
        <ReportsPageHeader />
        <div
          className={
            workflow.status?.status === "completed"
              ? "max-w-full"
              : "max-w-xl mx-auto"
          }
        >
          <ReportProgress
            status={workflow.status?.status ?? null}
            progress={workflow.progress}
            errorMessage={workflow.errorMessage}
            jobId={workflow.jobId}
            onDownload={handleProgressDownload}
            onRetry={handleRetry}
            onCancel={handleCancel}
            isDownloading={workflow.isDownloading}
          />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <ReportsPageHeader />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList>
          <TabsTrigger value="build" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Build Report
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            History ({history.reports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="build" className="mt-6">
          <div className="max-w-lg">
            <ReportBuilder
              classes={classes.map((c) => ({ id: c.id, name: c.name }))}
              students={students.map((s) => ({
                id: s.id,
                name: s.user_full_name,
              }))}
              onGenerate={handleGenerate}
              isGenerating={workflow.isGenerating}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ReportHistory
            reports={history.reports}
            isLoading={history.isLoading}
            onDownload={handleHistoryDownload}
            onDelete={handleHistoryDelete}
            isDeleting={isDeletingReport}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

function ReportsPageHeader() {
  return (
    <PageHeader
      icon={FiBarChart2}
      title="Reports"
      description="Generate and download performance reports for students and classes."
    />
  )
}

function ReportsPageSkeleton() {
  return (
    <PageContainer>
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 max-w-lg" />
      </div>
    </PageContainer>
  )
}
