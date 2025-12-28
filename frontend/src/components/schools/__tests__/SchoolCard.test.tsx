import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SchoolCard } from "../SchoolCard"

describe("SchoolCard", () => {
  const mockSchool = {
    id: "school-1",
    name: "Central High School",
    address: "123 Main St",
    teacher_count: 15,
    student_count: 300,
    book_count: 25,
  }

  it("renders school name and address", () => {
    render(<SchoolCard school={mockSchool} />)

    expect(screen.getByText("Central High School")).toBeInTheDocument()
    expect(screen.getByText("123 Main St")).toBeInTheDocument()
  })

  it("renders all count statistics", () => {
    render(<SchoolCard school={mockSchool} />)

    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.getByText("Teachers")).toBeInTheDocument()
    expect(screen.getByText("300")).toBeInTheDocument()
    expect(screen.getByText("Students")).toBeInTheDocument()
    expect(screen.getByText("25")).toBeInTheDocument()
    expect(screen.getByText("Books")).toBeInTheDocument()
  })

  it("renders with default counts when not provided", () => {
    const schoolWithoutCounts = {
      id: "school-2",
      name: "Test School",
    }

    render(<SchoolCard school={schoolWithoutCounts} />)

    const zeroElements = screen.getAllByText("0")
    expect(zeroElements.length).toBeGreaterThanOrEqual(3)
  })

  it("calls onEdit when edit button is clicked", () => {
    const onEdit = vi.fn()
    render(<SchoolCard school={mockSchool} onEdit={onEdit} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    editButton.click()

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it("calls onViewDetails when view details button is clicked", () => {
    const onViewDetails = vi.fn()
    render(<SchoolCard school={mockSchool} onViewDetails={onViewDetails} />)

    const viewButton = screen.getByRole("button", { name: /view details/i })
    viewButton.click()

    expect(onViewDetails).toHaveBeenCalledTimes(1)
  })

  it("does not render action buttons when handlers are not provided", () => {
    render(<SchoolCard school={mockSchool} />)

    expect(
      screen.queryByRole("button", { name: /edit/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /view details/i }),
    ).not.toBeInTheDocument()
  })
})
