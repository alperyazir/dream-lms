import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAuthenticatedCoverUrl } from "@/services/booksApi"
import { BookCover } from "../BookCover"

// Mock the booksApi service
vi.mock("@/services/booksApi", () => ({
  getAuthenticatedCoverUrl: vi.fn(),
}))

describe("BookCover", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading skeleton initially when cover URL is provided", async () => {
    vi.mocked(getAuthenticatedCoverUrl).mockResolvedValue("blob:test-url")

    render(<BookCover coverUrl="/test.jpg" title="Test Book" />)

    // Should show skeleton initially
    expect(
      screen.getByRole("img", { name: "Test Book cover" }),
    ).toBeInTheDocument()

    // Wait for the cover to load
    await waitFor(() => {
      expect(getAuthenticatedCoverUrl).toHaveBeenCalledWith("/test.jpg")
    })
  })

  it("shows placeholder when no URL provided", async () => {
    render(<BookCover coverUrl={null} title="Test Book" />)

    await waitFor(() => {
      const placeholder = screen.getByLabelText("Test Book cover")
      expect(placeholder).toBeInTheDocument()
    })
  })

  it("shows placeholder on authentication error", async () => {
    vi.mocked(getAuthenticatedCoverUrl).mockResolvedValue(null)

    render(<BookCover coverUrl="/invalid.jpg" title="Test Book" />)

    await waitFor(() => {
      expect(screen.getByLabelText("Test Book cover")).toBeInTheDocument()
    })
  })

  it("applies correct size classes for sm", () => {
    render(<BookCover coverUrl={null} title="Test" size="sm" />)
    const container = screen.getByLabelText("Test cover")
    expect(container).toHaveClass("w-12", "h-16")
  })

  it("applies correct size classes for md (default)", () => {
    render(<BookCover coverUrl={null} title="Test" />)
    const container = screen.getByLabelText("Test cover")
    expect(container).toHaveClass("w-24", "h-32")
  })

  it("applies correct size classes for lg", () => {
    render(<BookCover coverUrl={null} title="Test" size="lg" />)
    const container = screen.getByLabelText("Test cover")
    expect(container).toHaveClass("w-36", "h-48")
  })

  it("fetches authenticated cover URL when coverUrl changes", async () => {
    vi.mocked(getAuthenticatedCoverUrl).mockResolvedValue("blob:test-url-1")

    const { rerender } = render(
      <BookCover coverUrl="/test1.jpg" title="Test Book" />,
    )

    await waitFor(() => {
      expect(getAuthenticatedCoverUrl).toHaveBeenCalledWith("/test1.jpg")
    })

    vi.mocked(getAuthenticatedCoverUrl).mockResolvedValue("blob:test-url-2")

    rerender(<BookCover coverUrl="/test2.jpg" title="Test Book" />)

    await waitFor(() => {
      expect(getAuthenticatedCoverUrl).toHaveBeenCalledWith("/test2.jpg")
    })
  })

  it("applies custom className", () => {
    render(<BookCover coverUrl={null} title="Test" className="custom-class" />)
    const container = screen.getByLabelText("Test cover")
    expect(container).toHaveClass("custom-class")
  })
})
