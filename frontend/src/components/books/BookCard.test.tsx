import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Book } from "@/types/book"
import { BookCard } from "./BookCard"

// Mock booksApi
vi.mock("@/services/booksApi", () => ({
  getAuthenticatedCoverUrl: vi.fn().mockResolvedValue("blob:test-cover-url"),
}))

const mockBook: Book = {
  id: 1,
  dream_storage_id: "123",
  title: "Mathematics Grade 3",
  publisher_id: 1,
  publisher_name: "Dream Publisher",
  cover_image_url: "https://via.placeholder.com/200x300?text=Math+Book",
  description: "Elementary mathematics for grade 3 students",
  activity_count: 12,
}

describe("BookCard", () => {
  it("renders book card with title, publisher, and activity count", () => {
    render(<BookCard book={mockBook} />)

    // Check book title is rendered
    expect(screen.getByText("Mathematics Grade 3")).toBeInTheDocument()

    // Check publisher is rendered
    expect(screen.getByText("Dream Publisher")).toBeInTheDocument()

    // Check activity count badge is rendered
    expect(screen.getByText("12 activities")).toBeInTheDocument()
  })

  it("handles singular activity count correctly", () => {
    const bookWithOneActivity: Book = {
      ...mockBook,
      activity_count: 1,
    }

    render(<BookCard book={bookWithOneActivity} />)

    // Check activity count badge shows singular "activity"
    expect(screen.getByText("1 activity")).toBeInTheDocument()
  })

  it("shows cover image after loading", async () => {
    render(<BookCard book={mockBook} />)

    // Wait for cover image to load
    await waitFor(() => {
      const coverImage = screen.getByAltText("Mathematics Grade 3 cover")
      expect(coverImage).toBeInTheDocument()
    })
  })

  it("shows action buttons on hover when onPreview provided", async () => {
    const mockOnPreview = vi.fn()
    const { container } = render(<BookCard book={mockBook} onPreview={mockOnPreview} />)

    // Card should render
    expect(screen.getByText("Mathematics Grade 3")).toBeInTheDocument()

    // Simulate hover by firing mouseEnter on the card element
    const card = container.querySelector(".shadow-md")!
    fireEvent.mouseEnter(card)

    // Hover overlay should now show the preview button
    await waitFor(() => {
      const buttons = screen.getAllByRole("button")
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  it("shows description when provided", () => {
    render(<BookCard book={mockBook} />)

    expect(screen.getByText("Elementary mathematics for grade 3 students")).toBeInTheDocument()
  })

  it("handles book without description", () => {
    const bookWithoutDescription: Book = {
      ...mockBook,
      description: undefined,
    }

    render(<BookCard book={bookWithoutDescription} />)

    expect(screen.getByText("Mathematics Grade 3")).toBeInTheDocument()
    expect(screen.queryByText("Elementary mathematics")).not.toBeInTheDocument()
  })
})
