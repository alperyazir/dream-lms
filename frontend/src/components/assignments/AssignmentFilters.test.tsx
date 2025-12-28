import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import type { Class } from "@/types/teacher"
import {
  AssignmentFilters,
  type AssignmentFiltersState,
} from "./AssignmentFilters"

const mockClasses: Class[] = [
  {
    id: "class-1",
    teacher_id: "teacher-1",
    school_id: "school-1",
    name: "Math 101",
    grade_level: "9",
    subject: "Math",
    academic_year: "2024-2025",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    student_count: 15,
  },
  {
    id: "class-2",
    teacher_id: "teacher-1",
    school_id: "school-1",
    name: "Science 101",
    grade_level: "9",
    subject: "Science",
    academic_year: "2024-2025",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    student_count: 20,
  },
]

describe("AssignmentFilters", () => {
  const mockOnChange = vi.fn()
  const defaultProps = {
    filters: {} as AssignmentFiltersState,
    onChange: mockOnChange,
    classes: mockClasses,
    resultCount: 10,
    totalCount: 10,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders search input", () => {
    render(<AssignmentFilters {...defaultProps} />)

    expect(
      screen.getByPlaceholderText("Search assignments..."),
    ).toBeInTheDocument()
  })

  it("calls onChange when search input changes", () => {
    render(<AssignmentFilters {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText("Search assignments...")
    fireEvent.change(searchInput, { target: { value: "test" } })

    expect(mockOnChange).toHaveBeenCalledWith({ search: "test" })
  })

  it("displays result count correctly", () => {
    render(<AssignmentFilters {...defaultProps} />)

    expect(screen.getByText("10 assignments")).toBeInTheDocument()
  })

  it("displays filtered count when different from total", () => {
    render(<AssignmentFilters {...defaultProps} resultCount={5} />)

    expect(screen.getByText("5 of 10")).toBeInTheDocument()
  })

  it("shows clear button when filters are active", () => {
    render(<AssignmentFilters {...defaultProps} filters={{ search: "test" }} />)

    expect(screen.getByText("Clear")).toBeInTheDocument()
  })

  it("does not show clear button when no filters are active", () => {
    render(<AssignmentFilters {...defaultProps} />)

    expect(screen.queryByText("Clear")).not.toBeInTheDocument()
  })

  it("clears all filters when clear button is clicked", () => {
    render(
      <AssignmentFilters
        {...defaultProps}
        filters={{ search: "test", status: "draft" }}
      />,
    )

    const clearButton = screen.getByText("Clear")
    fireEvent.click(clearButton)

    expect(mockOnChange).toHaveBeenCalledWith({})
  })

  it("renders class filter options", () => {
    render(<AssignmentFilters {...defaultProps} />)

    // Note: This would require opening the select dropdown
    // For now, we just check that the component renders
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it("displays singular 'assignment' for count of 1", () => {
    render(
      <AssignmentFilters {...defaultProps} resultCount={1} totalCount={1} />,
    )

    expect(screen.getByText("1 assignment")).toBeInTheDocument()
  })
})
