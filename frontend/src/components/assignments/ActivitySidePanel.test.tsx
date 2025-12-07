/**
 * ActivitySidePanel Component Tests - Story 8.2
 *
 * Tests for the activity side panel that shows activities for selected pages
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { PageActivity, PageInfo } from "@/types/book"
import { ActivitySidePanel } from "./ActivitySidePanel"

// Mock the booksApi
vi.mock("@/services/booksApi", () => ({
  booksApi: {
    getPageActivities: vi.fn(),
  },
}))

// Import the mocked module
import { booksApi } from "@/services/booksApi"

const mockActivities: PageActivity[] = [
  {
    id: "act-1",
    title: "Circle the Words",
    activity_type: "circle",
    section_index: 0,
    order_index: 1000,
  },
  {
    id: "act-2",
    title: "Match Exercise",
    activity_type: "match_the_words",
    section_index: 1,
    order_index: 1001,
  },
]

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
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe("ActivitySidePanel", () => {
  const defaultProps = {
    bookId: "book-123",
    selectedPages: new Map<string, PageInfo>(),
    selectedActivityIds: new Set<string>(),
    onActivityToggle: vi.fn(),
    onSelectAllOnPage: vi.fn(),
    onDeselectAllOnPage: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(booksApi.getPageActivities).mockResolvedValue(mockActivities)
  })

  it("shows empty state when no pages selected", () => {
    renderWithClient(<ActivitySidePanel {...defaultProps} />)

    expect(
      screen.getByText(/select pages from the left to see activities/i),
    ).toBeInTheDocument()
  })

  it("shows activities when pages are selected", async () => {
    const selectedPages = new Map<string, PageInfo>([
      [
        "Module 1:5",
        { page_number: 5, activity_count: 2, thumbnail_url: "/thumb/5" },
      ],
    ])

    renderWithClient(
      <ActivitySidePanel {...defaultProps} selectedPages={selectedPages} />,
    )

    await waitFor(() => {
      expect(screen.getByText("Circle the Words")).toBeInTheDocument()
    })

    expect(screen.getByText("Match Exercise")).toBeInTheDocument()
  })

  it("shows selected count badge", async () => {
    const selectedPages = new Map<string, PageInfo>([
      [
        "Module 1:5",
        { page_number: 5, activity_count: 2, thumbnail_url: "/thumb/5" },
      ],
    ])
    const selectedActivityIds = new Set(["act-1"])

    renderWithClient(
      <ActivitySidePanel
        {...defaultProps}
        selectedPages={selectedPages}
        selectedActivityIds={selectedActivityIds}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("1 selected")).toBeInTheDocument()
    })
  })

  it("calls onActivityToggle when checkbox clicked", async () => {
    const onActivityToggle = vi.fn()
    const selectedPages = new Map<string, PageInfo>([
      [
        "Module 1:5",
        { page_number: 5, activity_count: 2, thumbnail_url: "/thumb/5" },
      ],
    ])

    renderWithClient(
      <ActivitySidePanel
        {...defaultProps}
        selectedPages={selectedPages}
        onActivityToggle={onActivityToggle}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Circle the Words")).toBeInTheDocument()
    })

    // Find checkboxes and click one
    const checkboxes = screen.getAllByRole("checkbox")
    fireEvent.click(checkboxes[0])

    expect(onActivityToggle).toHaveBeenCalled()
  })

  it("shows Select All button", async () => {
    const selectedPages = new Map<string, PageInfo>([
      [
        "Module 1:5",
        { page_number: 5, activity_count: 2, thumbnail_url: "/thumb/5" },
      ],
    ])

    renderWithClient(
      <ActivitySidePanel {...defaultProps} selectedPages={selectedPages} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/select all/i)).toBeInTheDocument()
    })
  })

  it("shows Deselect All when all activities selected", async () => {
    const selectedPages = new Map<string, PageInfo>([
      [
        "Module 1:5",
        { page_number: 5, activity_count: 2, thumbnail_url: "/thumb/5" },
      ],
    ])
    const selectedActivityIds = new Set(["act-1", "act-2"])

    renderWithClient(
      <ActivitySidePanel
        {...defaultProps}
        selectedPages={selectedPages}
        selectedActivityIds={selectedActivityIds}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/deselect all/i)).toBeInTheDocument()
    })
  })

  it("shows page header with module and page number", async () => {
    const selectedPages = new Map<string, PageInfo>([
      [
        "Module 1:5",
        { page_number: 5, activity_count: 2, thumbnail_url: "/thumb/5" },
      ],
    ])

    renderWithClient(
      <ActivitySidePanel {...defaultProps} selectedPages={selectedPages} />,
    )

    await waitFor(() => {
      expect(screen.getByText("Module 1 - Page 5")).toBeInTheDocument()
    })
  })

  it("handles empty activities for a page", async () => {
    vi.mocked(booksApi.getPageActivities).mockResolvedValue([])

    const selectedPages = new Map<string, PageInfo>([
      [
        "Module 1:5",
        { page_number: 5, activity_count: 0, thumbnail_url: "/thumb/5" },
      ],
    ])

    renderWithClient(
      <ActivitySidePanel {...defaultProps} selectedPages={selectedPages} />,
    )

    await waitFor(() => {
      expect(
        screen.getByText(/no interactive activities on this page/i),
      ).toBeInTheDocument()
    })
  })

  it("shows activity type badges", async () => {
    const selectedPages = new Map<string, PageInfo>([
      [
        "Module 1:5",
        { page_number: 5, activity_count: 2, thumbnail_url: "/thumb/5" },
      ],
    ])

    renderWithClient(
      <ActivitySidePanel {...defaultProps} selectedPages={selectedPages} />,
    )

    await waitFor(() => {
      // Should show activity type labels/badges
      expect(screen.getByText("Circle the Words")).toBeInTheDocument()
    })
  })
})
