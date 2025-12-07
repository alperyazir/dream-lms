/**
 * Tests for ReportProgress component
 * Story 5.6: Time-Based Reporting & Trend Analysis
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ReportProgress } from "../ReportProgress"

describe("ReportProgress", () => {
  const mockOnDownload = vi.fn()
  const mockOnRetry = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders pending state correctly", () => {
    render(
      <ReportProgress
        status="pending"
        progress={0}
        onDownload={mockOnDownload}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />,
    )

    expect(screen.getByText("Preparing report...")).toBeInTheDocument()
    expect(screen.getByText("0% complete")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
  })

  it("renders processing state with progress", () => {
    render(
      <ReportProgress
        status="processing"
        progress={50}
        onDownload={mockOnDownload}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />,
    )

    expect(screen.getByText("Generating report...")).toBeInTheDocument()
    expect(screen.getByText("50% complete")).toBeInTheDocument()
  })

  it("renders completed state with download button", () => {
    render(
      <ReportProgress
        status="completed"
        progress={100}
        onDownload={mockOnDownload}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />,
    )

    expect(screen.getByText("Report ready!")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Download Report" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "New Report" }),
    ).toBeInTheDocument()
  })

  it("renders failed state with error message and retry button", () => {
    render(
      <ReportProgress
        status="failed"
        progress={25}
        errorMessage="Server error occurred"
        onDownload={mockOnDownload}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />,
    )

    expect(screen.getByText("Report generation failed")).toBeInTheDocument()
    expect(screen.getByText("Server error occurred")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
  })

  it("calls onDownload when download button is clicked", () => {
    render(
      <ReportProgress
        status="completed"
        progress={100}
        onDownload={mockOnDownload}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Download Report" }))
    expect(mockOnDownload).toHaveBeenCalledTimes(1)
  })

  it("calls onRetry when retry button is clicked", () => {
    render(
      <ReportProgress
        status="failed"
        progress={25}
        errorMessage="Failed"
        onDownload={mockOnDownload}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(mockOnRetry).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when cancel button is clicked during processing", () => {
    render(
      <ReportProgress
        status="processing"
        progress={50}
        onDownload={mockOnDownload}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when new report button is clicked after completion", () => {
    render(
      <ReportProgress
        status="completed"
        progress={100}
        onDownload={mockOnDownload}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "New Report" }))
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it("disables download button when isDownloading is true", () => {
    render(
      <ReportProgress
        status="completed"
        progress={100}
        onDownload={mockOnDownload}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        isDownloading={true}
      />,
    )

    expect(
      screen.getByRole("button", { name: /Download Report/i }),
    ).toBeDisabled()
  })

  it("handles null status gracefully", () => {
    render(
      <ReportProgress
        status={null}
        progress={0}
        onDownload={mockOnDownload}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />,
    )

    expect(screen.getByText("Initializing...")).toBeInTheDocument()
  })
})
