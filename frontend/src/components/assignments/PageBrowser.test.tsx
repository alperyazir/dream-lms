/**
 * PageBrowser Component Tests - Story 8.2
 *
 * Tests for the page browser component with module tabs
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import type { BookPagesResponse, PageInfo } from "@/types/book"
import { PageBrowser, getPageKey } from "./PageBrowser"

// Mock IntersectionObserver for Node.js test environment
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  root = null
  rootMargin = ""
  thresholds = []

  constructor(callback: IntersectionObserverCallback) {
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

// Mock the booksApi
vi.mock("@/services/booksApi", () => ({
  booksApi: {
    getBookPages: vi.fn(),
  },
}))

// Import the mocked module
import { booksApi } from "@/services/booksApi"

const mockBookPagesResponse: BookPagesResponse = {
  book_id: "book-123",
  modules: [
    {
      name: "Module 1",
      pages: [
        { page_number: 1, activity_count: 2, thumbnail_url: "/thumb/1" },
        { page_number: 2, activity_count: 3, thumbnail_url: "/thumb/2" },
      ],
    },
    {
      name: "Module 2",
      pages: [
        { page_number: 5, activity_count: 1, thumbnail_url: "/thumb/5" },
      ],
    },
  ],
  total_pages: 3,
  total_activities: 6,
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe("PageBrowser", () => {
  const defaultProps = {
    bookId: "book-123",
    selectedPages: new Map<string, PageInfo>(),
    onTogglePage: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(booksApi.getBookPages).mockResolvedValue(mockBookPagesResponse)
  })

  it("shows loading skeletons while fetching", () => {
    vi.mocked(booksApi.getBookPages).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    const { container } = renderWithClient(<PageBrowser {...defaultProps} />)

    // Check for skeleton elements
    const skeletons = container.querySelectorAll(".animate-pulse")
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("renders module tabs when data loads", async () => {
    renderWithClient(<PageBrowser {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("Module 1")).toBeInTheDocument()
    })

    expect(screen.getByText("Module 2")).toBeInTheDocument()
  })

  it("shows page count in module tabs", async () => {
    renderWithClient(<PageBrowser {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("(2)")).toBeInTheDocument() // Module 1 has 2 pages
    })

    expect(screen.getByText("(1)")).toBeInTheDocument() // Module 2 has 1 page
  })

  it("renders page thumbnails for active module", async () => {
    renderWithClient(<PageBrowser {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("Page 1")).toBeInTheDocument()
    })

    expect(screen.getByText("Page 2")).toBeInTheDocument()
  })

  it("shows empty state when no pages found", async () => {
    vi.mocked(booksApi.getBookPages).mockResolvedValue({
      book_id: "book-123",
      modules: [],
      total_pages: 0,
      total_activities: 0,
    })

    renderWithClient(<PageBrowser {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText(/no pages with activities found/i)
      ).toBeInTheDocument()
    })
  })

  it("shows error state when API fails", async () => {
    vi.mocked(booksApi.getBookPages).mockRejectedValue(new Error("API Error"))

    renderWithClient(<PageBrowser {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load pages/i)).toBeInTheDocument()
    })
  })
})

describe("getPageKey", () => {
  it("generates correct key format", () => {
    expect(getPageKey("Module 1", 5)).toBe("Module 1:5")
  })

  it("handles special characters in module name", () => {
    expect(getPageKey("Module: Test", 10)).toBe("Module: Test:10")
  })
})
