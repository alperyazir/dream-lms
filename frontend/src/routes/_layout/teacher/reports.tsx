/**
 * Teacher Reports Page
 * Story 5.6: Time-Based Reporting & Trend Analysis
 *
 * Full page for generating, downloading, and managing reports.
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, Clock, FileText } from "lucide-react"
import { useState } from "react"
import { FiBarChart2 } from "react-icons/fi"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { ReportBuilder } from "@/components/reports/ReportBuilder"
import { ReportHistory } from "@/components/reports/ReportHistory"
import { ReportProgress } from "@/components/reports/ReportProgress"
import { ReportTemplateGrid } from "@/components/reports/ReportTemplateCard"
import { SavedTemplates } from "@/components/reports/SavedTemplates"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useDownloadReport,
  useReportHistory,
  useReportTemplates,
  useReportWorkflow,
} from "@/hooks/useReports"
import { getMyClasses, getMyStudents } from "@/services/teachersApi"
import type {
  ReportGenerateRequest,
  ReportHistoryItem,
  ReportTemplateInfo,
} from "@/types/reports"
import { PREDEFINED_TEMPLATES } from "@/types/reports"

export const Route = createFileRoute("/_layout/teacher/reports")({
  component: () => (
    <ErrorBoundary>
      <TeacherReportsPage />
    </ErrorBoundary>
  ),
})

type PageView = "builder" | "progress"

function TeacherReportsPage() {
  const [activeTab, setActiveTab] = useState<"build" | "history" | "templates">(
    "build",
  )
  const [pageView, setPageView] = useState<PageView>("builder")
  const [currentConfig, setCurrentConfig] =
    useState<ReportGenerateRequest | null>(null)

  // Fetch teacher's classes and students for the report builder
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["teacher-classes"],
    queryFn: getMyClasses,
  })

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["teacher-students"],
    queryFn: getMyStudents,
  })

  // Report workflow (generate, status polling, download)
  const workflow = useReportWorkflow()

  // Report history
  const history = useReportHistory()

  // Saved templates
  const templates = useReportTemplates()

  // Download hook for history items
  const { download: downloadHistoryReport } = useDownloadReport()

  // Handle starting a new report
  const handleGenerate = async (config: ReportGenerateRequest) => {
    setCurrentConfig(config)
    setPageView("progress")
    try {
      await workflow.startReport(config)
    } catch {
      // Error handled by workflow
    }
  }

  // Handle quick generate from template
  const handleQuickGenerate = (template: ReportTemplateInfo) => {
    // Convert template to config - for quick generate we need a default target
    const defaultTarget =
      template.reportType === "class"
        ? classes[0]?.id
        : template.reportType === "student"
          ? students[0]?.id
          : "all"

    if (!defaultTarget) {
      // No targets available, switch to builder tab
      setActiveTab("build")
      return
    }

    const config: ReportGenerateRequest = {
      report_type: template.reportType,
      period: template.defaultPeriod,
      target_id: defaultTarget,
      format: "pdf",
      template_type: template.type,
    }

    handleGenerate(config)
  }

  // Handle template selection (navigate to builder with prefilled config)
  const handleTemplateSelect = (_template: ReportTemplateInfo) => {
    // Pre-fill the form would require lifting form state - for now just switch to build tab
    setActiveTab("build")
  }

  // Handle download from progress view
  const handleProgressDownload = () => {
    workflow.download()
  }

  // Handle retry from progress view
  const handleRetry = () => {
    if (currentConfig) {
      handleGenerate(currentConfig)
    }
  }

  // Handle cancel/new report from progress view
  const handleCancel = () => {
    workflow.reset()
    setPageView("builder")
  }

  // Handle download from history
  const handleHistoryDownload = (report: ReportHistoryItem) => {
    if (report.download_url) {
      downloadHistoryReport({
        jobId: report.id,
        filename: `${report.report_type}_report.${report.format}`,
      })
    }
  }

  // Handle using a saved template
  const handleUseTemplate = (config: ReportGenerateRequest) => {
    handleGenerate(config)
  }

  // Handle saving current config as template
  const handleSaveTemplate = (name: string, config: ReportGenerateRequest) => {
    templates.saveTemplate({ name, config })
  }

  const isDataLoading = classesLoading || studentsLoading

  if (isDataLoading) {
    return <ReportsPageSkeleton />
  }

  // Show progress view when generating
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={<FileText className="w-5 h-5" />}
          label="Reports Generated"
          value={history.reports.length}
          color="teal"
        />
        <SummaryCard
          icon={<BookOpen className="w-5 h-5" />}
          label="Saved Templates"
          value={templates.templates.length}
          color="blue"
        />
        <SummaryCard
          icon={<Clock className="w-5 h-5" />}
          label="Available Downloads"
          value={history.reports.filter((r) => !r.is_expired).length}
          color="green"
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList>
          <TabsTrigger value="build">Build Report</TabsTrigger>
          <TabsTrigger value="history">
            History ({history.reports.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            Templates ({templates.templates.length})
          </TabsTrigger>
        </TabsList>

        {/* Build Tab */}
        <TabsContent value="build" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Report Builder Form */}
            <ReportBuilder
              classes={classes.map((c) => ({ id: c.id, name: c.name }))}
              students={students.map((s) => ({
                id: s.id,
                name: s.user_full_name,
              }))}
              onGenerate={handleGenerate}
              isGenerating={workflow.isGenerating}
            />

            {/* Quick Templates */}
            <div className="space-y-6">
              <ReportTemplateGrid
                templates={PREDEFINED_TEMPLATES}
                onSelect={handleTemplateSelect}
                onQuickGenerate={handleQuickGenerate}
                disabled={workflow.isGenerating || classes.length === 0}
              />
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <ReportHistory
            reports={history.reports}
            isLoading={history.isLoading}
            onDownload={handleHistoryDownload}
          />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <SavedTemplates
            templates={templates.templates}
            isLoading={templates.isLoading}
            isSaving={templates.isSaving}
            isDeleting={templates.isDeleting}
            onUseTemplate={handleUseTemplate}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={templates.deleteTemplate}
            currentConfig={currentConfig}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function ReportsPageHeader() {
  return (
    <PageHeader
      icon={FiBarChart2}
      title="Reports"
      description="Generate and download performance reports for students, classes, and assignments."
    />
  )
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: "teal" | "blue" | "green"
}) {
  const colorClasses = {
    teal: "from-teal-500 to-cyan-500",
    blue: "from-blue-500 to-indigo-500",
    green: "from-green-500 to-emerald-500",
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

function ReportsPageSkeleton() {
  return (
    <PageContainer>
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </PageContainer>
  )
}
