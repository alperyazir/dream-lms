/**
 * Tests for ReportBuilder component
 * Story 5.6: Time-Based Reporting & Trend Analysis
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { ReportBuilder } from "../ReportBuilder"

const mockClasses = [
  { id: "class-1", name: "Math 101" },
  { id: "class-2", name: "Science 202" },
]

const mockStudents = [
  { id: "student-1", name: "John Doe" },
  { id: "student-2", name: "Jane Smith" },
]

describe("ReportBuilder", () => {
  const mockOnGenerate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the form with all required fields", () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.getByText("Configure Report")).toBeInTheDocument()
    expect(screen.getByText("Report Type")).toBeInTheDocument()
    expect(screen.getByText("Time Period")).toBeInTheDocument()
    expect(screen.getByText("Output Format")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Generate Report/i })
    ).toBeInTheDocument()
  })

  it("renders report type buttons (Student, Class, Assignment)", () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.getByRole("button", { name: /Student/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Class/i })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Assignment/i })
    ).toBeInTheDocument()
  })

  it("renders format buttons (PDF, Excel)", () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.getByRole("button", { name: /PDF/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Excel/i })).toBeInTheDocument()
  })

  it("shows student selector label by default (student report type)", () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
      />
    )

    // Use getAllByText since label and placeholder both have the same text
    const elements = screen.getAllByText("Select Student")
    expect(elements.length).toBeGreaterThan(0)
  })

  it("switches to class selector when Class report type is selected", async () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /Class/i }))

    await waitFor(() => {
      const elements = screen.getAllByText("Select Class")
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  it("hides target selector for Assignment report type", async () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /Assignment/i }))

    await waitFor(() => {
      expect(screen.queryByText("Select Student")).not.toBeInTheDocument()
      expect(screen.queryByText("Select Class")).not.toBeInTheDocument()
    })
  })

  it("switches format to Excel when Excel button is clicked", async () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
      />
    )

    const excelButton = screen.getByRole("button", { name: /Excel/i })
    fireEvent.click(excelButton)

    // After click, Excel should have the default variant style
    await waitFor(() => {
      expect(excelButton.className).toContain("bg-primary")
    })
  })

  it("disables generate button when isGenerating is true", () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
        isGenerating={true}
      />
    )

    const button = screen.getByRole("button", { name: /Generating/i })
    expect(button).toBeDisabled()
  })

  it("shows 'Generating...' text when isGenerating is true", () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
        isGenerating={true}
      />
    )

    expect(screen.getByText("Generating...")).toBeInTheDocument()
  })

  it("renders with empty classes and students arrays", () => {
    render(
      <ReportBuilder
        classes={[]}
        students={[]}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.getByText("Configure Report")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Generate Report/i })).toBeInTheDocument()
  })

  it("default values are correctly set", () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
      />
    )

    // Student button should be active by default
    const studentButton = screen.getByRole("button", { name: /Student/i })
    expect(studentButton.className).toContain("bg-primary")

    // PDF button should be active by default
    const pdfButton = screen.getByRole("button", { name: /PDF/i })
    expect(pdfButton.className).toContain("bg-primary")
  })

  it("can switch between report types", () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
      />
    )

    // Initially student is selected
    const studentButton = screen.getByRole("button", { name: /Student/i })
    expect(studentButton.className).toContain("bg-primary")

    // Click on Class
    const classButton = screen.getByRole("button", { name: /Class/i })
    fireEvent.click(classButton)

    // Now class should be active
    expect(classButton.className).toContain("bg-primary")
  })

  it("can switch between formats", () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
      />
    )

    // Initially PDF is selected
    const pdfButton = screen.getByRole("button", { name: /PDF/i })
    expect(pdfButton.className).toContain("bg-primary")

    // Click on Excel
    const excelButton = screen.getByRole("button", { name: /Excel/i })
    fireEvent.click(excelButton)

    // Now Excel should be active, PDF should not
    expect(excelButton.className).toContain("bg-primary")
  })

  it("renders generate button that is enabled by default", () => {
    render(
      <ReportBuilder
        classes={mockClasses}
        students={mockStudents}
        onGenerate={mockOnGenerate}
        isGenerating={false}
      />
    )

    const button = screen.getByRole("button", { name: /Generate Report/i })
    expect(button).not.toBeDisabled()
  })
})
