/**
 * LibraryBookCard Component Tests
 * Story 29.2: Create DCS Library Browser Page
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { LibraryBook } from "@/types/library"
import { LibraryBookCard } from "../LibraryBookCard"

// Mock BookCover component
vi.mock("@/components/books/BookCover", () => ({
  BookCover: ({ title, coverUrl }: { title: string; coverUrl?: string }) => (
    <div data-testid="book-cover" data-title={title} data-url={coverUrl}>
      {title} cover
    </div>
  ),
}))

const mockBook: LibraryBook = {
  id: 1,
  dream_storage_id: "dcs-123",
  title: "Mathematics Grade 5",
  book_name: "Math Book 5",
  publisher_id: 1,
  publisher_name: "Dream Publisher",
  cover_image_url: "https://example.com/cover.jpg",
  activity_count: 8,
}

describe("LibraryBookCard", () => {
  it("renders book card with title and publisher", () => {
    render(<LibraryBookCard book={mockBook} />)

    expect(screen.getByText("Mathematics Grade 5")).toBeInTheDocument()
    expect(screen.getByText("Dream Publisher")).toBeInTheDocument()
  })

  it("renders book cover component", () => {
    render(<LibraryBookCard book={mockBook} />)

    const bookCover = screen.getByTestId("book-cover")
    expect(bookCover).toBeInTheDocument()
    expect(bookCover).toHaveAttribute("data-title", "Mathematics Grade 5")
  })

  it("displays activity count badge when activities exist", () => {
    render(<LibraryBookCard book={mockBook} />)

    expect(screen.getByText("8 Activities")).toBeInTheDocument()
  })

  it("displays singular activity text for one activity", () => {
    const bookWithOneActivity: LibraryBook = {
      ...mockBook,
      activity_count: 1,
    }

    render(<LibraryBookCard book={bookWithOneActivity} />)

    expect(screen.getByText("1 Activity")).toBeInTheDocument()
  })

  it("does not display activity badge when activity count is 0", () => {
    const bookWithNoActivities: LibraryBook = {
      ...mockBook,
      activity_count: 0,
    }

    render(<LibraryBookCard book={bookWithNoActivities} />)

    expect(screen.queryByText(/Activities?/)).not.toBeInTheDocument()
  })

  it("calls onPreview when preview button is clicked", () => {
    const mockOnPreview = vi.fn()
    render(<LibraryBookCard book={mockBook} onPreview={mockOnPreview} />)

    const previewButton = screen.getByRole("button", { name: /preview/i })
    fireEvent.click(previewButton)

    expect(mockOnPreview).toHaveBeenCalledWith(mockBook)
  })

  it("does not render footer actions when showActions is false", () => {
    render(<LibraryBookCard book={mockBook} showActions={false} />)

    expect(screen.queryByRole("button", { name: /preview/i })).not.toBeInTheDocument()
  })

  it("renders preview button in footer by default", () => {
    render(<LibraryBookCard book={mockBook} />)

    const previewButton = screen.getByRole("button", { name: /preview/i })
    expect(previewButton).toBeInTheDocument()
  })

  it("handles book without cover image", () => {
    const bookWithoutCover: LibraryBook = {
      ...mockBook,
      cover_image_url: null,
    }

    render(<LibraryBookCard book={bookWithoutCover} />)

    const bookCover = screen.getByTestId("book-cover")
    expect(bookCover).toBeInTheDocument()
  })

  it("shows title attribute for long book titles", () => {
    const bookWithLongTitle: LibraryBook = {
      ...mockBook,
      title: "Very Long Book Title That Should Be Truncated in the UI",
    }

    render(<LibraryBookCard book={bookWithLongTitle} />)

    const titleElement = screen.getByText(bookWithLongTitle.title)
    expect(titleElement).toHaveAttribute("title", bookWithLongTitle.title)
  })
})
