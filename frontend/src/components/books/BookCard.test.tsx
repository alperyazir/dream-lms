import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { BookCard } from "./BookCard"
import type { Book } from "@/lib/mockData"

// Mock TanStack Router Link component
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, ...props }: any) => (
    <a href={to.replace("$bookId", params?.bookId || "")} {...props}>
      {children}
    </a>
  ),
}))

const mockBook: Book = {
  id: "book-1",
  title: "Mathematics Grade 3",
  publisher: "Dream Publisher",
  publisherId: "pub-1",
  coverUrl: "https://via.placeholder.com/200x300?text=Math+Book",
  description: "Elementary mathematics for grade 3 students",
  grade: "3",
  activityCount: 12,
  created_at: new Date().toISOString(),
}

describe("BookCard", () => {
  it("renders book card with cover, title, publisher, grade, and navigation link", () => {
    render(<BookCard book={mockBook} />)

    // Check cover image is rendered with correct alt text
    const coverImage = screen.getByAltText("Mathematics Grade 3 cover")
    expect(coverImage).toBeInTheDocument()
    expect(coverImage).toHaveAttribute("src", "https://via.placeholder.com/200x300?text=Math+Book")

    // Check book title is rendered
    expect(screen.getByText("Mathematics Grade 3")).toBeInTheDocument()

    // Check publisher is rendered
    expect(screen.getByText("Dream Publisher")).toBeInTheDocument()

    // Check grade badge is rendered
    expect(screen.getByText("3")).toBeInTheDocument()

    // Check activity count badge is rendered
    expect(screen.getByText("12 activities")).toBeInTheDocument()

    // Check "View Activities" link is present
    const viewActivitiesLink = screen.getByRole("link", { name: /view activities/i })
    expect(viewActivitiesLink).toBeInTheDocument()
    expect(viewActivitiesLink).toHaveAttribute("href", "/teacher/books/book-1")
  })

  it("handles singular activity count correctly", () => {
    const bookWithOneActivity: Book = {
      ...mockBook,
      activityCount: 1,
    }

    render(<BookCard book={bookWithOneActivity} />)

    // Check activity count badge shows singular "activity"
    expect(screen.getByText("1 activity")).toBeInTheDocument()
  })
})
