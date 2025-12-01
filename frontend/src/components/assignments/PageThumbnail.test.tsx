/**
 * PageThumbnail Component Tests - Story 8.2
 *
 * Tests for the page thumbnail component used in activity selection
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { PageThumbnail } from "./PageThumbnail"

// Mock IntersectionObserver for Node.js test environment
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  root = null
  rootMargin = ""
  thresholds = []

  constructor(callback: IntersectionObserverCallback) {
    // Immediately trigger the callback with an intersecting entry
    setTimeout(() => {
      callback(
        [
          {
            isIntersecting: true,
            target: document.createElement("div"),
            boundingClientRect: {} as DOMRectReadOnly,
            intersectionRatio: 1,
            intersectionRect: {} as DOMRectReadOnly,
            rootBounds: null,
            time: Date.now(),
          },
        ],
        this
      )
    }, 0)
  }
}

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
})

describe("PageThumbnail", () => {
  const defaultProps = {
    thumbnailUrl: "/api/v1/books/123/pages/1/thumbnail",
    pageNumber: 1,
    activityCount: 3,
    isSelected: false,
    onClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders page number correctly", () => {
    render(<PageThumbnail {...defaultProps} />)
    expect(screen.getByText("Page 1")).toBeInTheDocument()
  })

  it("renders activity count badge with count number", () => {
    render(<PageThumbnail {...defaultProps} />)
    // Badge shows just the number
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("renders singular activity count correctly", () => {
    render(<PageThumbnail {...defaultProps} activityCount={1} />)
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("calls onClick when clicked", () => {
    const onClick = vi.fn()
    render(<PageThumbnail {...defaultProps} onClick={onClick} />)

    // Find the main container and click it
    const container = screen.getByText("Page 1").closest("div")?.parentElement
    if (container) {
      fireEvent.click(container)
      expect(onClick).toHaveBeenCalledTimes(1)
    }
  })

  it("shows selected state with purple border color", () => {
    const { container } = render(<PageThumbnail {...defaultProps} isSelected />)

    // Check for purple border indicating selection
    const thumbnail = container.querySelector(".border-purple-600")
    expect(thumbnail).toBeInTheDocument()
  })

  it("shows unselected state with gray border", () => {
    const { container } = render(
      <PageThumbnail {...defaultProps} isSelected={false} />
    )

    // Check for gray border when not selected
    const thumbnail = container.querySelector(".border-gray-200")
    expect(thumbnail).toBeInTheDocument()
  })

  it("displays checkmark overlay when selected", () => {
    const { container } = render(<PageThumbnail {...defaultProps} isSelected />)

    // The selected overlay should be visible with purple background
    const checkBadge = container.querySelector(".bg-purple-600")
    expect(checkBadge).toBeInTheDocument()
  })

  it("handles high page numbers", () => {
    render(<PageThumbnail {...defaultProps} pageNumber={150} />)
    expect(screen.getByText("Page 150")).toBeInTheDocument()
  })

  it("handles zero activities gracefully", () => {
    render(<PageThumbnail {...defaultProps} activityCount={0} />)
    expect(screen.getByText("0")).toBeInTheDocument()
  })
})
