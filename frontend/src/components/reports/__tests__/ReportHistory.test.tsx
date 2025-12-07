/**
 * Tests for ReportHistory component
 * Story 5.6: Time-Based Reporting & Trend Analysis
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReportHistoryItem } from "@/types/reports"
import { ReportHistory } from "../ReportHistory"

const mockReports: ReportHistoryItem[] = [
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
  {
    id: "report-2",
    job_id: "job-2",
    report_type: "student",
    template_type: null,
    target_name: "John Doe",
    format: "excel",
    created_at: "2025-11-27T10:00:00Z",
    expires_at: "2025-12-04T10:00:00Z",
    is_expired: true,
    download_url: null,
  },
]

describe("ReportHistory", () => {
  const mockOnDownload = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders loading state correctly", () => {
    render(
      <ReportHistory
        reports={[]}
        isLoading={true}
        onDownload={mockOnDownload}
      />,
    )

    expect(screen.getByText("Report History")).toBeInTheDocument()
    // Skeleton elements should be rendered (we can check for the container)
  })

  it("renders empty state when no reports", () => {
    render(
      <ReportHistory
        reports={[]}
        isLoading={false}
        onDownload={mockOnDownload}
      />,
    )

    expect(screen.getByText("No reports generated yet")).toBeInTheDocument()
    expect(
      screen.getByText("Reports are available for 7 days after generation"),
    ).toBeInTheDocument()
  })

  it("renders reports table with data", () => {
    render(
      <ReportHistory
        reports={mockReports}
        isLoading={false}
        onDownload={mockOnDownload}
      />,
    )

    // Check table headers
    expect(screen.getByText("Type")).toBeInTheDocument()
    expect(screen.getByText("Target")).toBeInTheDocument()
    expect(screen.getByText("Format")).toBeInTheDocument()
    expect(screen.getByText("Generated")).toBeInTheDocument()
    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Action")).toBeInTheDocument()

    // Check report data
    expect(screen.getByText("Class A")).toBeInTheDocument()
    expect(screen.getByText("John Doe")).toBeInTheDocument()
  })

  it("displays expired badge for expired reports", () => {
    render(
      <ReportHistory
        reports={mockReports}
        isLoading={false}
        onDownload={mockOnDownload}
      />,
    )

    expect(screen.getByText("Expired")).toBeInTheDocument()
  })

  it("shows download button for non-expired reports", () => {
    render(
      <ReportHistory
        reports={mockReports}
        isLoading={false}
        onDownload={mockOnDownload}
      />,
    )

    // There should be one download button (for the non-expired report)
    const downloadButtons = screen.getAllByRole("button")
    expect(downloadButtons.length).toBeGreaterThan(0)
  })

  it("calls onDownload when download button is clicked", () => {
    render(
      <ReportHistory
        reports={mockReports}
        isLoading={false}
        onDownload={mockOnDownload}
      />,
    )

    // Find and click the download button
    const downloadButton = screen.getAllByRole("button")[0]
    fireEvent.click(downloadButton)

    expect(mockOnDownload).toHaveBeenCalledWith(mockReports[0])
  })

  it("does not show download button for expired reports", () => {
    const expiredOnly: ReportHistoryItem[] = [
      {
        ...mockReports[1],
        is_expired: true,
        download_url: null,
      },
    ]

    render(
      <ReportHistory
        reports={expiredOnly}
        isLoading={false}
        onDownload={mockOnDownload}
      />,
    )

    // Should show dash instead of download button
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("displays correct format labels", () => {
    render(
      <ReportHistory
        reports={mockReports}
        isLoading={false}
        onDownload={mockOnDownload}
      />,
    )

    // Check format labels (component uses uppercase text-xs)
    expect(screen.getByText("pdf")).toBeInTheDocument()
    expect(screen.getByText("excel")).toBeInTheDocument()
  })
})
