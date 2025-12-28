import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TeacherFilters } from "../TeacherFilters"

describe("TeacherFilters", () => {
  const mockSchools = [
    { id: "school-1", name: "Central High School" },
    { id: "school-2", name: "North Elementary" },
  ]

  const defaultFilters = {
    search: "",
    school: "",
  }

  it("renders search input", () => {
    const onChange = vi.fn()
    render(
      <TeacherFilters
        filters={defaultFilters}
        onChange={onChange}
        schools={mockSchools}
      />,
    )

    expect(
      screen.getByPlaceholderText("Search teachers..."),
    ).toBeInTheDocument()
  })

  it("renders school dropdown with all options", () => {
    const onChange = vi.fn()
    render(
      <TeacherFilters
        filters={defaultFilters}
        onChange={onChange}
        schools={mockSchools}
      />,
    )

    // Click the select to open it
    const selectTrigger = screen.getByRole("combobox")
    fireEvent.click(selectTrigger)

    expect(screen.getByText("All Schools")).toBeInTheDocument()
    expect(screen.getByText("Central High School")).toBeInTheDocument()
    expect(screen.getByText("North Elementary")).toBeInTheDocument()
  })

  it("calls onChange when search input changes", () => {
    const onChange = vi.fn()
    render(
      <TeacherFilters
        filters={defaultFilters}
        onChange={onChange}
        schools={mockSchools}
      />,
    )

    const searchInput = screen.getByPlaceholderText("Search teachers...")
    fireEvent.change(searchInput, { target: { value: "john" } })

    expect(onChange).toHaveBeenCalledWith({ search: "john", school: "" })
  })

  it("shows clear button when filters are active", () => {
    const onChange = vi.fn()
    const activeFilters = {
      search: "john",
      school: "",
    }

    render(
      <TeacherFilters
        filters={activeFilters}
        onChange={onChange}
        schools={mockSchools}
      />,
    )

    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument()
  })

  it("does not show clear button when no filters are active", () => {
    const onChange = vi.fn()
    render(
      <TeacherFilters
        filters={defaultFilters}
        onChange={onChange}
        schools={mockSchools}
      />,
    )

    expect(
      screen.queryByRole("button", { name: /clear/i }),
    ).not.toBeInTheDocument()
  })

  it("calls onChange with empty filters when clear is clicked", () => {
    const onChange = vi.fn()
    const activeFilters = {
      search: "john",
      school: "school-1",
    }

    render(
      <TeacherFilters
        filters={activeFilters}
        onChange={onChange}
        schools={mockSchools}
      />,
    )

    const clearButton = screen.getByRole("button", { name: /clear/i })
    fireEvent.click(clearButton)

    expect(onChange).toHaveBeenCalledWith({ search: "", school: "" })
  })
})
