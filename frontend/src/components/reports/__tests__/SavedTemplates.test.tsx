/**
 * Tests for SavedTemplates component
 * Story 5.6: Time-Based Reporting & Trend Analysis
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  ReportGenerateRequest,
  SavedReportTemplate,
} from "@/types/reports"
import { SavedTemplates } from "../SavedTemplates"

const mockTemplates: SavedReportTemplate[] = [
  {
    id: "template-1",
    name: "Weekly Class Report",
    config: {
      report_type: "class",
      period: "week",
      target_id: "class-123",
      format: "pdf",
    },
    created_at: "2025-11-28T12:00:00Z",
  },
  {
    id: "template-2",
    name: "Monthly Student Summary",
    config: {
      report_type: "student",
      period: "month",
      target_id: "student-456",
      format: "excel",
    },
    created_at: "2025-11-27T10:00:00Z",
  },
]

const mockCurrentConfig: ReportGenerateRequest = {
  report_type: "class",
  period: "semester",
  target_id: "class-789",
  format: "pdf",
}

describe("SavedTemplates", () => {
  const mockOnUseTemplate = vi.fn()
  const mockOnSaveTemplate = vi.fn()
  const mockOnDeleteTemplate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders loading state correctly", () => {
    render(
      <SavedTemplates
        templates={[]}
        isLoading={true}
        onUseTemplate={mockOnUseTemplate}
        onSaveTemplate={mockOnSaveTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
      />,
    )

    expect(screen.getByText("Saved Templates")).toBeInTheDocument()
  })

  it("renders empty state when no templates", () => {
    render(
      <SavedTemplates
        templates={[]}
        isLoading={false}
        onUseTemplate={mockOnUseTemplate}
        onSaveTemplate={mockOnSaveTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
      />,
    )

    expect(screen.getByText("No saved templates")).toBeInTheDocument()
    expect(
      screen.getByText("Configure a report and save it for quick reuse"),
    ).toBeInTheDocument()
  })

  it("renders template list", () => {
    render(
      <SavedTemplates
        templates={mockTemplates}
        isLoading={false}
        onUseTemplate={mockOnUseTemplate}
        onSaveTemplate={mockOnSaveTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
      />,
    )

    expect(screen.getByText("Weekly Class Report")).toBeInTheDocument()
    expect(screen.getByText("Monthly Student Summary")).toBeInTheDocument()
  })

  it("shows Save Current button when currentConfig is provided", () => {
    render(
      <SavedTemplates
        templates={mockTemplates}
        isLoading={false}
        onUseTemplate={mockOnUseTemplate}
        onSaveTemplate={mockOnSaveTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        currentConfig={mockCurrentConfig}
      />,
    )

    expect(screen.getByText("Save Current")).toBeInTheDocument()
  })

  it("does not show Save Current button when currentConfig is null", () => {
    render(
      <SavedTemplates
        templates={mockTemplates}
        isLoading={false}
        onUseTemplate={mockOnUseTemplate}
        onSaveTemplate={mockOnSaveTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
        currentConfig={null}
      />,
    )

    expect(screen.queryByText("Save Current")).not.toBeInTheDocument()
  })

  it("calls onUseTemplate when play button is clicked", () => {
    render(
      <SavedTemplates
        templates={mockTemplates}
        isLoading={false}
        onUseTemplate={mockOnUseTemplate}
        onSaveTemplate={mockOnSaveTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
      />,
    )

    // Find play buttons (first button in each template row)
    const buttons = screen.getAllByRole("button")
    fireEvent.click(buttons[0]) // First play button

    expect(mockOnUseTemplate).toHaveBeenCalledWith(mockTemplates[0].config)
  })

  it("opens delete confirmation dialog when delete button is clicked", () => {
    render(
      <SavedTemplates
        templates={mockTemplates}
        isLoading={false}
        onUseTemplate={mockOnUseTemplate}
        onSaveTemplate={mockOnSaveTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
      />,
    )

    // Click delete button (second button in each template row)
    const buttons = screen.getAllByRole("button")
    fireEvent.click(buttons[1]) // First delete button

    expect(screen.getByText("Delete Template?")).toBeInTheDocument()
    expect(screen.getByText(/This will permanently delete/)).toBeInTheDocument()
  })

  it("calls onDeleteTemplate when delete is confirmed", () => {
    render(
      <SavedTemplates
        templates={mockTemplates}
        isLoading={false}
        onUseTemplate={mockOnUseTemplate}
        onSaveTemplate={mockOnSaveTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
      />,
    )

    // Click delete button
    const buttons = screen.getAllByRole("button")
    fireEvent.click(buttons[1])

    // Click confirm delete button in dialog
    const deleteButton = screen.getByRole("button", { name: "Delete" })
    fireEvent.click(deleteButton)

    expect(mockOnDeleteTemplate).toHaveBeenCalledWith("template-1")
  })

  it("disables delete button when isDeleting is true", () => {
    render(
      <SavedTemplates
        templates={mockTemplates}
        isLoading={false}
        isDeleting={true}
        onUseTemplate={mockOnUseTemplate}
        onSaveTemplate={mockOnSaveTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
      />,
    )

    // Find delete buttons
    const buttons = screen.getAllByRole("button")
    // Delete buttons should be disabled
    expect(buttons[1]).toBeDisabled()
  })

  it("displays report type and period labels", () => {
    render(
      <SavedTemplates
        templates={mockTemplates}
        isLoading={false}
        onUseTemplate={mockOnUseTemplate}
        onSaveTemplate={mockOnSaveTemplate}
        onDeleteTemplate={mockOnDeleteTemplate}
      />,
    )

    // Check that template metadata is displayed using actual label values
    expect(screen.getByText("Class Report")).toBeInTheDocument()
    expect(screen.getByText("Last 7 Days")).toBeInTheDocument()
    expect(screen.getByText("Student Report")).toBeInTheDocument()
    expect(screen.getByText("Last 30 Days")).toBeInTheDocument()
  })
})
