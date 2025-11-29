/**
 * Custom hooks for report generation and management
 * Story 5.6: Time-Based Reporting & Trend Analysis
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  generateReport,
  getReportStatus,
  downloadReport,
  getReportHistory,
  saveReportTemplate,
  getReportTemplates,
  deleteReportTemplate,
} from "@/services/reportsApi"
import type {
  ReportGenerateRequest,
  ReportStatusResponse,
  SavedReportTemplate,
  SavedReportTemplateCreate,
} from "@/types/reports"

/**
 * Query keys for reports
 */
export const REPORT_HISTORY_QUERY_KEY = ["report-history"] as const
export const REPORT_TEMPLATES_QUERY_KEY = ["report-templates"] as const

/**
 * Query key factory for report status
 */
export const reportStatusQueryKey = (jobId: string) =>
  ["report-status", jobId] as const

/**
 * Hook for generating a new report
 */
export function useGenerateReport() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (config: ReportGenerateRequest) => generateReport(config),
    onSuccess: () => {
      // Invalidate history to show new job
      queryClient.invalidateQueries({ queryKey: REPORT_HISTORY_QUERY_KEY })
    },
  })

  return {
    generateReport: mutation.mutate,
    generateReportAsync: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  }
}

/**
 * Hook for polling report job status
 * Polls every 2 seconds until completed or failed
 */
export function useReportStatus(jobId: string | null) {
  const query = useQuery({
    queryKey: reportStatusQueryKey(jobId ?? ""),
    queryFn: () => getReportStatus(jobId!),
    enabled: !!jobId,
    // Poll every 2 seconds while pending/processing
    refetchInterval: (query) => {
      const data = query.state.data as ReportStatusResponse | undefined
      if (!data) return 2000 // Initial poll
      if (data.status === "completed" || data.status === "failed") {
        return false // Stop polling
      }
      return 2000 // Continue polling
    },
    staleTime: 0, // Always fetch fresh data
  })

  return {
    status: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isPolling:
      !!jobId &&
      query.data?.status !== "completed" &&
      query.data?.status !== "failed",
  }
}

/**
 * Hook for downloading a report
 */
export function useDownloadReport() {
  const mutation = useMutation({
    mutationFn: ({ jobId, filename }: { jobId: string; filename?: string }) =>
      downloadReport(jobId, filename),
  })

  return {
    download: mutation.mutate,
    downloadAsync: mutation.mutateAsync,
    isDownloading: mutation.isPending,
    error: mutation.error,
  }
}

/**
 * Hook for fetching report history
 */
export function useReportHistory() {
  const query = useQuery({
    queryKey: REPORT_HISTORY_QUERY_KEY,
    queryFn: getReportHistory,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    reports: query.data?.reports ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook for saved report templates (CRUD operations)
 */
export function useReportTemplates() {
  const queryClient = useQueryClient()

  // Query for listing templates
  const templatesQuery = useQuery({
    queryKey: REPORT_TEMPLATES_QUERY_KEY,
    queryFn: getReportTemplates,
    staleTime: 5 * 60 * 1000,
  })

  // Mutation for saving a template
  const saveMutation = useMutation({
    mutationFn: (template: SavedReportTemplateCreate) =>
      saveReportTemplate(template),
    onSuccess: (newTemplate) => {
      // Optimistically update the cache
      queryClient.setQueryData<SavedReportTemplate[]>(
        REPORT_TEMPLATES_QUERY_KEY,
        (old) => (old ? [newTemplate, ...old] : [newTemplate])
      )
    },
  })

  // Mutation for deleting a template
  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => deleteReportTemplate(templateId),
    onSuccess: (_, deletedId) => {
      // Optimistically remove from cache
      queryClient.setQueryData<SavedReportTemplate[]>(
        REPORT_TEMPLATES_QUERY_KEY,
        (old) => old?.filter((t) => t.id !== deletedId) ?? []
      )
    },
  })

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
    refetch: templatesQuery.refetch,
    saveTemplate: saveMutation.mutate,
    saveTemplateAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    deleteTemplate: deleteMutation.mutate,
    deleteTemplateAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  }
}

/**
 * Combined hook for complete report workflow
 * Manages generation, status polling, and download
 */
export function useReportWorkflow() {
  const generate = useGenerateReport()
  const download = useDownloadReport()

  // Track the current job ID
  const currentJobId = generate.data?.job_id ?? null
  const status = useReportStatus(currentJobId)

  const startReport = async (config: ReportGenerateRequest) => {
    generate.reset() // Clear any previous state
    return generate.generateReportAsync(config)
  }

  const downloadWhenReady = async () => {
    if (status.status?.download_url && currentJobId) {
      await download.downloadAsync({ jobId: currentJobId })
    }
  }

  return {
    // Generation
    startReport,
    isGenerating: generate.isGenerating,
    generateError: generate.error,

    // Status
    jobId: currentJobId,
    status: status.status,
    isPolling: status.isPolling,
    statusError: status.error,

    // Download
    download: downloadWhenReady,
    isDownloading: download.isDownloading,
    downloadError: download.error,

    // Combined state
    isComplete: status.status?.status === "completed",
    isFailed: status.status?.status === "failed",
    progress: status.status?.progress_percentage ?? 0,
    errorMessage: status.status?.error_message ?? null,

    // Reset to start over
    reset: generate.reset,
  }
}
