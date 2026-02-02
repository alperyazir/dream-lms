/**
 * FlowbookViewer Component Tests
 * Story 29.1: Integrate Flowbook-Online Viewer Components
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { BookConfig } from "@/types/flowbook"
import { FlowbookViewer } from "./FlowbookViewer"

// Mock ResizeObserver (required by some components)
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

// Mock Audio element
class MockAudio {
  play = vi.fn().mockResolvedValue(undefined)
  pause = vi.fn()
  load = vi.fn()
  currentTime = 0
  volume = 1
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver)
  vi.stubGlobal("Audio", MockAudio)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

// Test fixture: Sample book configuration
const createTestBookConfig = (
  overrides: Partial<BookConfig> = {},
): BookConfig => ({
  title: "Test Book",
  cover: "/test-cover.jpg",
  version: "1.0.0",
  modules: [
    {
      id: "module-1",
      name: "Module 1",
      startPage: 0,
      endPage: 2,
    },
  ],
  pages: [
    {
      id: "page-1",
      image: "/page-1.jpg",
      audio: [],
      video: [],
      activities: [],
    },
    {
      id: "page-2",
      image: "/page-2.jpg",
      audio: [],
      video: [],
      activities: [],
    },
    {
      id: "page-3",
      image: "/page-3.jpg",
      audio: [],
      video: [],
      activities: [],
    },
  ],
  ...overrides,
})

describe("FlowbookViewer", () => {
  it("renders without crashing", () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    expect(screen.getByText("Test Book")).toBeInTheDocument()
  })

  it("displays book title in header", () => {
    const bookConfig = createTestBookConfig({ title: "My Custom Book" })
    render(<FlowbookViewer bookConfig={bookConfig} />)

    expect(screen.getByText("My Custom Book")).toBeInTheDocument()
  })

  it("displays page counter", () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument()
  })

  it("renders close button when onClose provided", () => {
    const onClose = vi.fn()
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} onClose={onClose} />)

    const closeButton = screen.getByTitle("Close (Esc)")
    expect(closeButton).toBeInTheDocument()
  })

  it("does not render close button when onClose not provided", () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    expect(screen.queryByTitle("Close (Esc)")).not.toBeInTheDocument()
  })

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn()
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} onClose={onClose} />)

    const closeButton = screen.getByTitle("Close (Esc)")
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("applies custom className", () => {
    const bookConfig = createTestBookConfig()
    const { container } = render(
      <FlowbookViewer bookConfig={bookConfig} className="custom-test-class" />,
    )

    expect(container.firstChild).toHaveClass("custom-test-class")
  })
})

describe("FlowbookViewer Navigation", () => {
  it("renders navigation arrows when showNavigation is true", () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} showNavigation={true} />)

    expect(screen.getByTitle("Previous page (←)")).toBeInTheDocument()
    expect(screen.getByTitle("Next page (→)")).toBeInTheDocument()
  })

  it("hides navigation arrows when showNavigation is false", () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} showNavigation={false} />)

    expect(screen.queryByTitle("Previous page (←)")).not.toBeInTheDocument()
    expect(screen.queryByTitle("Next page (→)")).not.toBeInTheDocument()
  })

  it("previous button is disabled on first page", () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    const prevButton = screen.getByTitle("Previous page (←)")
    expect(prevButton).toBeDisabled()
  })

  it("next button navigates to next page", async () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    const nextButton = screen.getByTitle("Next page (→)")
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument()
    })
  })

  it("navigates with ArrowRight key", async () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    fireEvent.keyDown(window, { key: "ArrowRight" })

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument()
    })
  })

  it("navigates with ArrowLeft key", async () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} initialPage={1} />)

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument()
    })

    fireEvent.keyDown(window, { key: "ArrowLeft" })

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument()
    })
  })

  it("goes to first page with Home key", async () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} initialPage={2} />)

    await waitFor(() => {
      expect(screen.getByText(/Page 3 of 3/)).toBeInTheDocument()
    })

    fireEvent.keyDown(window, { key: "Home" })

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument()
    })
  })

  it("goes to last page with End key", async () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    fireEvent.keyDown(window, { key: "End" })

    await waitFor(() => {
      expect(screen.getByText(/Page 3 of 3/)).toBeInTheDocument()
    })
  })

  it("closes with Escape key when onClose provided", async () => {
    const onClose = vi.fn()
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} onClose={onClose} />)

    fireEvent.keyDown(window, { key: "Escape" })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe("FlowbookViewer Zoom Controls", () => {
  it("renders zoom controls", () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    expect(screen.getByTitle("Zoom out")).toBeInTheDocument()
    expect(screen.getByTitle("Zoom in")).toBeInTheDocument()
    expect(screen.getByText("100%")).toBeInTheDocument()
  })

  it("zoom out button is disabled at minimum zoom", () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    const zoomOutButton = screen.getByTitle("Zoom out")
    expect(zoomOutButton).toBeDisabled()
  })

  it("increases zoom level when zoom in clicked", async () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    const zoomInButton = screen.getByTitle("Zoom in")
    fireEvent.click(zoomInButton)

    await waitFor(() => {
      expect(screen.getByText("125%")).toBeInTheDocument()
    })
  })

  it("increases zoom with + key", async () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    fireEvent.keyDown(window, { key: "+" })

    await waitFor(() => {
      expect(screen.getByText("125%")).toBeInTheDocument()
    })
  })

  it("resets zoom with 0 key", async () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    // First zoom in
    fireEvent.keyDown(window, { key: "+" })
    await waitFor(() => {
      expect(screen.getByText("125%")).toBeInTheDocument()
    })

    // Then reset
    fireEvent.keyDown(window, { key: "0" })
    await waitFor(() => {
      expect(screen.getByText("100%")).toBeInTheDocument()
    })
  })
})

describe("FlowbookViewer View Mode", () => {
  it("renders view mode toggle button", () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    const toggleButton = screen.getByTitle(
      /Switch to double page view|Switch to single page view/,
    )
    expect(toggleButton).toBeInTheDocument()
  })
})

describe("FlowbookViewer Initial State", () => {
  it("starts at initialPage when provided", async () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} initialPage={1} />)

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument()
    })
  })

  it("starts at page 1 when initialPage is 0 or not provided", () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} />)

    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument()
  })
})

describe("FlowbookViewer Thumbnail Strip", () => {
  it("renders thumbnail strip when showThumbnails is true", () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} showThumbnails={true} />)

    // ThumbnailStrip has a toggle button with page count
    expect(screen.getByText(/Show thumbnails \(3 pages\)/)).toBeInTheDocument()
  })

  it("hides thumbnail strip when showThumbnails is false", () => {
    const bookConfig = createTestBookConfig()
    render(<FlowbookViewer bookConfig={bookConfig} showThumbnails={false} />)

    // ThumbnailStrip toggle should not be present
    expect(screen.queryByText(/Show thumbnails/)).not.toBeInTheDocument()
  })
})
