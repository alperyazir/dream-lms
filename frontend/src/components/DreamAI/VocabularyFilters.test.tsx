/**
 * Vocabulary Filters Component Tests
 * Story 27.18: Vocabulary Explorer with Audio Player
 */

import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { BookWithVocabulary } from "@/types/vocabulary-explorer"
import { VocabularyFilters } from "./VocabularyFilters"

describe("VocabularyFilters", () => {
  const mockBooks: BookWithVocabulary[] = [
    {
      id: 1,
      title: "English Book 1",
      publisher_name: "Publisher A",
      has_ai_data: true,
      processing_status: "completed",
      vocabulary_count: 100,
      modules: [
        { id: "m1", name: "Module 1", vocabulary_count: 50 },
        { id: "m2", name: "Module 2", vocabulary_count: 50 },
      ],
    },
    {
      id: 2,
      title: "English Book 2",
      publisher_name: "Publisher B",
      has_ai_data: true,
      processing_status: "completed",
      vocabulary_count: 80,
      modules: [{ id: "m3", name: "Module 3", vocabulary_count: 80 }],
    },
  ]

  const mockOnFiltersChange = vi.fn()

  it("renders book selector", () => {
    render(
      <VocabularyFilters
        books={mockBooks}
        selectedBookId={null}
        filters={null}
        onFiltersChange={mockOnFiltersChange}
      />,
    )

    expect(screen.getByLabelText("Book")).toBeInTheDocument()
  })

  it("renders module selector", () => {
    render(
      <VocabularyFilters
        books={mockBooks}
        selectedBookId={null}
        filters={null}
        onFiltersChange={mockOnFiltersChange}
      />,
    )

    expect(screen.getByLabelText("Module")).toBeInTheDocument()
  })

  it("renders search input", () => {
    render(
      <VocabularyFilters
        books={mockBooks}
        selectedBookId={null}
        filters={null}
        onFiltersChange={mockOnFiltersChange}
      />,
    )

    expect(
      screen.getByPlaceholderText("Search vocabulary..."),
    ).toBeInTheDocument()
  })

  it("renders CEFR level checkboxes", () => {
    render(
      <VocabularyFilters
        books={mockBooks}
        selectedBookId={null}
        filters={null}
        onFiltersChange={mockOnFiltersChange}
      />,
    )

    expect(screen.getByLabelText("A1")).toBeInTheDocument()
    expect(screen.getByLabelText("A2")).toBeInTheDocument()
    expect(screen.getByLabelText("B1")).toBeInTheDocument()
    expect(screen.getByLabelText("B2")).toBeInTheDocument()
    expect(screen.getByLabelText("C1")).toBeInTheDocument()
    expect(screen.getByLabelText("C2")).toBeInTheDocument()
  })

  it("disables module selector when no book selected", () => {
    render(
      <VocabularyFilters
        books={mockBooks}
        selectedBookId={null}
        filters={null}
        onFiltersChange={mockOnFiltersChange}
      />,
    )

    const moduleSelect = screen.getByLabelText("Module")
    expect(moduleSelect).toBeDisabled()
  })

  it("disables search input when no book selected", () => {
    render(
      <VocabularyFilters
        books={mockBooks}
        selectedBookId={null}
        filters={null}
        onFiltersChange={mockOnFiltersChange}
      />,
    )

    const searchInput = screen.getByPlaceholderText("Search vocabulary...")
    expect(searchInput).toBeDisabled()
  })

  it("disables CEFR checkboxes when no book selected", () => {
    render(
      <VocabularyFilters
        books={mockBooks}
        selectedBookId={null}
        filters={null}
        onFiltersChange={mockOnFiltersChange}
      />,
    )

    const a1Checkbox = screen.getByLabelText("A1")
    expect(a1Checkbox).toBeDisabled()
  })

  it("calls onFiltersChange when CEFR level is toggled", async () => {
    const user = userEvent.setup()

    render(
      <VocabularyFilters
        books={mockBooks}
        selectedBookId={1}
        filters={{ bookId: 1 }}
        onFiltersChange={mockOnFiltersChange}
      />,
    )

    const a1Checkbox = screen.getByLabelText("A1")
    await user.click(a1Checkbox)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      bookId: 1,
      cefrLevels: ["A1"],
    })
  })

  it("debounces search input (300ms)", async () => {
    vi.useFakeTimers()
    const newMock = vi.fn()

    render(
      <VocabularyFilters
        books={mockBooks}
        selectedBookId={1}
        filters={{ bookId: 1 }}
        onFiltersChange={newMock}
      />,
    )

    const searchInput = screen.getByPlaceholderText("Search vocabulary...")

    // Type into the input
    fireEvent.change(searchInput, { target: { value: "hello" } })

    // Should not call immediately
    expect(newMock).not.toHaveBeenCalled()

    // Advance timers by 300ms
    vi.advanceTimersByTime(300)

    // Now it should have been called
    expect(newMock).toHaveBeenCalled()

    vi.useRealTimers()
  })

  it("shows active filters summary when filters applied", () => {
    render(
      <VocabularyFilters
        books={mockBooks}
        selectedBookId={1}
        filters={{ bookId: 1, search: "test", moduleId: "m1" }}
        onFiltersChange={mockOnFiltersChange}
      />,
    )

    expect(screen.getByText("Active filters:")).toBeInTheDocument()
    // Use getAllByText since book name and module appear in both dropdown and badge
    expect(screen.getAllByText("English Book 1").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Module 1").length).toBeGreaterThan(0)
    expect(screen.getByText("Search: test")).toBeInTheDocument()
  })
})
