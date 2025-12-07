/**
 * Tests for useReports hooks
 * Story 5.6: Time-Based Reporting & Trend Analysis
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  ReportGenerateRequest,
  ReportHistoryResponse,
  ReportJobResponse,
  ReportStatusResponse,
  SavedReportTemplate,
} from "@/types/reports"
import {
  useDownloadReport,
  useGenerateReport,
  useReportHistory,
  useReportStatus,
  useReportTemplates,
  useReportWorkflow,
} from "./useReports"

// Mock the API functions
vi.mock("@/services/reportsApi", () => ({
  generateReport: vi.fn(),
  getReportStatus: vi.fn(),
  downloadReport: vi.fn(),
  getReportHistory: vi.fn(),
  saveReportTemplate: vi.fn(),
  getReportTemplates: vi.fn(),
  deleteReportTemplate: vi.fn(),
}))

import {
  deleteReportTemplate,
  downloadReport,
  generateReport,
  getReportHistory,
  getReportStatus,
  getReportTemplates,
  saveReportTemplate,
} from "@/services/reportsApi"

const mockConfig: ReportGenerateRequest = {
  report_type: "class",
  period: "month",
  target_id: "class-123",
  format: "pdf",
}

const mockJobResponse: ReportJobResponse = {
  job_id: "job-123",
  status: "pending",
  created_at: "2025-11-28T12:00:00Z",
}

const mockStatusPending: ReportStatusResponse = {
  job_id: "job-123",
  status: "pending",
  progress_percentage: 0,
  download_url: null,
  error_message: null,
}

const mockStatusProcessing: ReportStatusResponse = {
  job_id: "job-123",
  status: "processing",
  progress_percentage: 50,
  download_url: null,
  error_message: null,
}

const mockStatusCompleted: ReportStatusResponse = {
  job_id: "job-123",
  status: "completed",
  progress_percentage: 100,
  download_url: "/api/v1/reports/job-123/download",
  error_message: null,
}

const mockStatusFailed: ReportStatusResponse = {
  job_id: "job-123",
  status: "failed",
  progress_percentage: 25,
  download_url: null,
  error_message: "Failed to generate report",
}

const mockHistoryResponse: ReportHistoryResponse = {
  reports: [
    {
      id: "report-1",
      job_id: "job-1",
      report_type: "class",
      template_type: null,
      target_name: "Class A",
      format: "pdf",
      created_at: "2025-11-28T12:00:00Z",
      expires_at: "2025-12-05T12:00:00Z",
      is_expired: false,
      download_url: "/api/v1/reports/report-1/download",
    },
  ],
}

const mockSavedTemplate: SavedReportTemplate = {
  id: "template-1",
  name: "Weekly Class Report",
  config: mockConfig,
  created_at: "2025-11-28T12:00:00Z",
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("useGenerateReport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should generate report successfully", async () => {
    vi.mocked(generateReport).mockResolvedValueOnce(mockJobResponse)

    const { result } = renderHook(() => useGenerateReport(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isGenerating).toBe(false)

    await act(async () => {
      result.current.generateReport(mockConfig)
    })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(generateReport).toHaveBeenCalledWith(mockConfig)
    expect(result.current.data?.job_id).toBe("job-123")
  })

  it("should handle generation errors", async () => {
    vi.mocked(generateReport).mockRejectedValueOnce(new Error("Server error"))

    const { result } = renderHook(() => useGenerateReport(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.generateReport(mockConfig)
    })

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })
  })
})

describe("useReportStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch status when jobId is provided", async () => {
    vi.mocked(getReportStatus).mockResolvedValue(mockStatusProcessing)

    const { result } = renderHook(() => useReportStatus("job-123"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.status?.status).toBe("processing")
    })

    expect(result.current.status?.progress_percentage).toBe(50)
  })

  it("should not fetch when jobId is null", async () => {
    const { result } = renderHook(() => useReportStatus(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.status).toBeNull()
    expect(getReportStatus).not.toHaveBeenCalled()
  })

  it("should indicate polling state correctly", async () => {
    vi.mocked(getReportStatus).mockResolvedValueOnce(mockStatusPending)

    const { result } = renderHook(() => useReportStatus("job-123"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.status).toBeDefined()
    })

    expect(result.current.isPolling).toBe(true)
  })

  it("should stop polling when completed", async () => {
    vi.mocked(getReportStatus).mockResolvedValueOnce(mockStatusCompleted)

    const { result } = renderHook(() => useReportStatus("job-123"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.status?.status).toBe("completed")
    })

    expect(result.current.isPolling).toBe(false)
  })

  it("should stop polling when failed", async () => {
    vi.mocked(getReportStatus).mockResolvedValueOnce(mockStatusFailed)

    const { result } = renderHook(() => useReportStatus("job-123"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.status?.status).toBe("failed")
    })

    expect(result.current.isPolling).toBe(false)
  })
})

describe("useDownloadReport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should download report successfully", async () => {
    vi.mocked(downloadReport).mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDownloadReport(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.download({ jobId: "job-123", filename: "report.pdf" })
    })

    await waitFor(() => {
      expect(downloadReport).toHaveBeenCalledWith("job-123", "report.pdf")
    })
  })

  it("should handle download errors", async () => {
    vi.mocked(downloadReport).mockRejectedValueOnce(
      new Error("Download failed"),
    )

    const { result } = renderHook(() => useDownloadReport(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.download({ jobId: "job-123" })
    })

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })
  })
})

describe("useReportHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch history successfully", async () => {
    vi.mocked(getReportHistory).mockResolvedValueOnce(mockHistoryResponse)

    const { result } = renderHook(() => useReportHistory(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.reports).toHaveLength(1)
    expect(result.current.reports[0].id).toBe("report-1")
  })

  it("should return empty array when no history", async () => {
    vi.mocked(getReportHistory).mockResolvedValueOnce({ reports: [] })

    const { result } = renderHook(() => useReportHistory(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.reports).toHaveLength(0)
  })
})

describe("useReportTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch templates successfully", async () => {
    vi.mocked(getReportTemplates).mockResolvedValueOnce([mockSavedTemplate])

    const { result } = renderHook(() => useReportTemplates(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.templates).toHaveLength(1)
    expect(result.current.templates[0].name).toBe("Weekly Class Report")
  })

  it("should save template successfully", async () => {
    vi.mocked(getReportTemplates).mockResolvedValueOnce([])
    vi.mocked(saveReportTemplate).mockResolvedValueOnce(mockSavedTemplate)

    const { result } = renderHook(() => useReportTemplates(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      result.current.saveTemplate({
        name: "Weekly Class Report",
        config: mockConfig,
      })
    })

    await waitFor(() => {
      expect(saveReportTemplate).toHaveBeenCalled()
    })
  })

  it("should delete template successfully", async () => {
    vi.mocked(getReportTemplates).mockResolvedValueOnce([mockSavedTemplate])
    vi.mocked(deleteReportTemplate).mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useReportTemplates(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.templates).toHaveLength(1)
    })

    await act(async () => {
      result.current.deleteTemplate("template-1")
    })

    await waitFor(() => {
      expect(deleteReportTemplate).toHaveBeenCalledWith("template-1")
    })
  })
})

describe("useReportWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should track complete workflow from generation to completion", async () => {
    vi.mocked(generateReport).mockResolvedValueOnce(mockJobResponse)
    vi.mocked(getReportStatus).mockResolvedValueOnce(mockStatusCompleted)

    const { result } = renderHook(() => useReportWorkflow(), {
      wrapper: createWrapper(),
    })

    // Start report generation
    await act(async () => {
      await result.current.startReport(mockConfig)
    })

    // Wait for status to be fetched
    await waitFor(() => {
      expect(result.current.status?.status).toBe("completed")
    })

    expect(result.current.isComplete).toBe(true)
    expect(result.current.progress).toBe(100)
  })

  it("should track failed workflow", async () => {
    vi.mocked(generateReport).mockResolvedValueOnce(mockJobResponse)
    vi.mocked(getReportStatus).mockResolvedValueOnce(mockStatusFailed)

    const { result } = renderHook(() => useReportWorkflow(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.startReport(mockConfig)
    })

    await waitFor(() => {
      expect(result.current.status?.status).toBe("failed")
    })

    expect(result.current.isFailed).toBe(true)
    expect(result.current.errorMessage).toBe("Failed to generate report")
  })

  it("should reset workflow state", async () => {
    vi.mocked(generateReport).mockResolvedValueOnce(mockJobResponse)
    vi.mocked(getReportStatus).mockResolvedValueOnce(mockStatusCompleted)

    const { result } = renderHook(() => useReportWorkflow(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.startReport(mockConfig)
    })

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true)
    })

    act(() => {
      result.current.reset()
    })

    // After reset, the mutation data is cleared so jobId should be null
    await waitFor(() => {
      expect(result.current.jobId).toBeNull()
    })
  })
})
