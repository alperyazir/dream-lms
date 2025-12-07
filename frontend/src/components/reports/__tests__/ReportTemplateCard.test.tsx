/**
 * Tests for ReportTemplateCard component
 * Story 5.6: Time-Based Reporting & Trend Analysis
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReportTemplateInfo } from "@/types/reports"
import { ReportTemplateCard, ReportTemplateGrid } from "../ReportTemplateCard"

const mockTemplate: ReportTemplateInfo = {
  type: "weekly_class_summary",
  name: "Weekly Class Summary",
  description: "Generate a weekly summary of class performance",
  icon: "calendar-days",
  reportType: "class",
  defaultPeriod: "week",
}

const mockTemplates: ReportTemplateInfo[] = [
  mockTemplate,
  {
    type: "student_progress_report",
    name: "Student Progress Report",
    description: "Detailed progress report for individual students",
    icon: "user-circle",
    reportType: "student",
    defaultPeriod: "month",
  },
  {
    type: "monthly_assignment_overview",
    name: "Monthly Assignment Overview",
    description: "Overview of all assignments for the month",
    icon: "clipboard-list",
    reportType: "assignment",
    defaultPeriod: "month",
  },
]

describe("ReportTemplateCard", () => {
  const mockOnSelect = vi.fn()
  const mockOnQuickGenerate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders template information correctly", () => {
    render(
      <ReportTemplateCard template={mockTemplate} onSelect={mockOnSelect} />,
    )

    expect(screen.getByText("Weekly Class Summary")).toBeInTheDocument()
    expect(
      screen.getByText("Generate a weekly summary of class performance"),
    ).toBeInTheDocument()
    expect(screen.getByText("class")).toBeInTheDocument()
    expect(screen.getByText("Default: week")).toBeInTheDocument()
  })

  it("calls onSelect when card is clicked", () => {
    render(
      <ReportTemplateCard template={mockTemplate} onSelect={mockOnSelect} />,
    )

    // Click the card
    const card = screen
      .getByText("Weekly Class Summary")
      .closest("div[class*='card']")
    if (card) {
      fireEvent.click(card)
    }

    expect(mockOnSelect).toHaveBeenCalledWith(mockTemplate)
  })

  it("shows Quick button when onQuickGenerate is provided", () => {
    render(
      <ReportTemplateCard
        template={mockTemplate}
        onSelect={mockOnSelect}
        onQuickGenerate={mockOnQuickGenerate}
      />,
    )

    expect(screen.getByRole("button", { name: /Quick/i })).toBeInTheDocument()
  })

  it("does not show Quick button when onQuickGenerate is not provided", () => {
    render(
      <ReportTemplateCard template={mockTemplate} onSelect={mockOnSelect} />,
    )

    expect(
      screen.queryByRole("button", { name: /Quick/i }),
    ).not.toBeInTheDocument()
  })

  it("calls onQuickGenerate when Quick button is clicked", () => {
    render(
      <ReportTemplateCard
        template={mockTemplate}
        onSelect={mockOnSelect}
        onQuickGenerate={mockOnQuickGenerate}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Quick/i }))

    expect(mockOnQuickGenerate).toHaveBeenCalledWith(mockTemplate)
    // Should not call onSelect
    expect(mockOnSelect).not.toHaveBeenCalled()
  })

  it("does not call handlers when disabled", () => {
    render(
      <ReportTemplateCard
        template={mockTemplate}
        onSelect={mockOnSelect}
        onQuickGenerate={mockOnQuickGenerate}
        disabled={true}
      />,
    )

    // Click the card
    const card = screen
      .getByText("Weekly Class Summary")
      .closest("div[class*='card']")
    if (card) {
      fireEvent.click(card)
    }

    expect(mockOnSelect).not.toHaveBeenCalled()
  })

  it("disables Quick button when disabled prop is true", () => {
    render(
      <ReportTemplateCard
        template={mockTemplate}
        onSelect={mockOnSelect}
        onQuickGenerate={mockOnQuickGenerate}
        disabled={true}
      />,
    )

    expect(screen.getByRole("button", { name: /Quick/i })).toBeDisabled()
  })
})

describe("ReportTemplateGrid", () => {
  const mockOnSelect = vi.fn()
  const mockOnQuickGenerate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders grid title", () => {
    render(
      <ReportTemplateGrid templates={mockTemplates} onSelect={mockOnSelect} />,
    )

    expect(screen.getByText("Quick Templates")).toBeInTheDocument()
  })

  it("renders all templates", () => {
    render(
      <ReportTemplateGrid templates={mockTemplates} onSelect={mockOnSelect} />,
    )

    expect(screen.getByText("Weekly Class Summary")).toBeInTheDocument()
    expect(screen.getByText("Student Progress Report")).toBeInTheDocument()
    expect(screen.getByText("Monthly Assignment Overview")).toBeInTheDocument()
  })

  it("passes props to individual cards", () => {
    render(
      <ReportTemplateGrid
        templates={mockTemplates}
        onSelect={mockOnSelect}
        onQuickGenerate={mockOnQuickGenerate}
      />,
    )

    // All templates should have Quick buttons
    const quickButtons = screen.getAllByRole("button", { name: /Quick/i })
    expect(quickButtons).toHaveLength(mockTemplates.length)
  })

  it("disables all cards when disabled prop is true", () => {
    render(
      <ReportTemplateGrid
        templates={mockTemplates}
        onSelect={mockOnSelect}
        onQuickGenerate={mockOnQuickGenerate}
        disabled={true}
      />,
    )

    const quickButtons = screen.getAllByRole("button", { name: /Quick/i })
    quickButtons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })
})
