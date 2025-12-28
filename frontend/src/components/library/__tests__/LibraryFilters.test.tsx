import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LibraryFilters, type LibraryFiltersState } from "../LibraryFilters"

describe("LibraryFilters", () => {
  const emptyFilters: LibraryFiltersState = {
    search: "",
    publisher: "",
    activityType: "",
  }

  const mockOnChange = vi.fn()

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders search input", () => {
    render(
      <LibraryFilters
        filters={emptyFilters}
        onChange={mockOnChange}
        publishers={[]}
      />,
    )

    expect(screen.getByPlaceholderText("Search books...")).toBeInTheDocument()
  })

  it("calls onChange when search input changes", () => {
    render(
      <LibraryFilters
        filters={emptyFilters}
        onChange={mockOnChange}
        publishers={[]}
      />,
    )

    const searchInput = screen.getByPlaceholderText("Search books...")
    fireEvent.change(searchInput, { target: { value: "test query" } })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...emptyFilters,
      search: "test query",
    })
  })

  it("shows clear button when filters are active", () => {
    const activeFilters: LibraryFiltersState = {
      search: "test",
      publisher: "",
      activityType: "",
    }

    render(
      <LibraryFilters
        filters={activeFilters}
        onChange={mockOnChange}
        publishers={[]}
      />,
    )

    expect(screen.getByText("Clear")).toBeInTheDocument()
  })

  it("does not show clear button when no filters are active", () => {
    render(
      <LibraryFilters
        filters={emptyFilters}
        onChange={mockOnChange}
        publishers={[]}
      />,
    )

    expect(screen.queryByText("Clear")).not.toBeInTheDocument()
  })

  it("calls onChange with empty filters when clear button is clicked", () => {
    const activeFilters: LibraryFiltersState = {
      search: "test",
      publisher: "Publisher A",
      activityType: "dragdroppicture",
    }

    render(
      <LibraryFilters
        filters={activeFilters}
        onChange={mockOnChange}
        publishers={["Publisher A"]}
        showPublisherFilter={true}
      />,
    )

    const clearButton = screen.getByText("Clear")
    fireEvent.click(clearButton)

    expect(mockOnChange).toHaveBeenCalledWith(emptyFilters)
  })

  it("displays result count correctly", () => {
    render(
      <LibraryFilters
        filters={emptyFilters}
        onChange={mockOnChange}
        publishers={[]}
        resultCount={5}
        totalCount={10}
      />,
    )

    expect(screen.getByText("5 of 10 books")).toBeInTheDocument()
  })

  it("displays total count when result equals total", () => {
    render(
      <LibraryFilters
        filters={emptyFilters}
        onChange={mockOnChange}
        publishers={[]}
        resultCount={10}
        totalCount={10}
      />,
    )

    expect(screen.getByText("10 books")).toBeInTheDocument()
  })
})
