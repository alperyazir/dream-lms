/**
 * Tests for ActivitySelectionTabs Component - Story 9.5
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Book, BookStructureResponse } from "@/types/book"
import { ActivitySelectionTabs } from "./ActivitySelectionTabs"

// Mock the booksApi
vi.mock("@/services/booksApi", () => ({
  getBookStructure: vi.fn(),
}))

// Mock PageViewer to simplify tests
vi.mock("./PageViewer", () => ({
  PageViewer: ({
    selectedActivityIds,
  }: {
    selectedActivityIds: Set<string>
    onActivityToggle: (id: string, activity: unknown) => void
  }) => (
    <div data-testid="page-viewer">
      PageViewer - {selectedActivityIds.size} selected
    </div>
  ),
}))

// Mock PageSelectionGrid
vi.mock("./PageSelectionGrid", () => ({
  PageSelectionGrid: ({
    selectedActivityIds,
    onPageToggle,
  }: {
    selectedActivityIds: Set<string>
    onPageToggle: (
      pageNumber: number,
      ids: string[],
      moduleName: string,
    ) => void
  }) => (
    <div data-testid="page-selection-grid">
      <button
        type="button"
        onClick={() => onPageToggle(1, ["act-1", "act-2"], "Module 1")}
        data-testid="select-page-1"
      >
        Select Page 1
      </button>
      <span>PageSelectionGrid - {selectedActivityIds.size} selected</span>
    </div>
  ),
}))

// Mock ModuleSelectionList
vi.mock("./ModuleSelectionList", () => ({
  ModuleSelectionList: ({
    selectedActivityIds,
    onModuleToggle,
  }: {
    selectedActivityIds: Set<string>
    onModuleToggle: (module: { name: string; activity_ids: string[] }) => void
  }) => (
    <div data-testid="module-selection-list">
      <button
        type="button"
        onClick={() =>
          onModuleToggle({
            name: "Module 1",
            activity_ids: ["act-1", "act-2", "act-3"],
          })
        }
        data-testid="select-module-1"
      >
        Select Module 1
      </button>
      <span>ModuleSelectionList - {selectedActivityIds.size} selected</span>
    </div>
  ),
}))

const mockBook: Book = {
  id: "book-1",
  dream_storage_id: "dream-1",
  title: "Test Book",
  publisher_name: "Test Publisher",
  description: "A test book",
  cover_image_url: null,
  activity_count: 10,
}

const mockBookStructure: BookStructureResponse = {
  book_id: "book-1",
  modules: [
    {
      name: "Module 1",
      page_start: 1,
      page_end: 5,
      activity_count: 5,
      activity_ids: ["act-1", "act-2", "act-3", "act-4", "act-5"],
      pages: [
        {
          page_number: 1,
          thumbnail_url: "/thumb1.png",
          activity_count: 2,
          activity_ids: ["act-1", "act-2"],
        },
        {
          page_number: 2,
          thumbnail_url: "/thumb2.png",
          activity_count: 3,
          activity_ids: ["act-3", "act-4", "act-5"],
        },
      ],
    },
  ],
  total_pages: 2,
  total_activities: 5,
}

describe("ActivitySelectionTabs", () => {
  let queryClient: QueryClient
  let onActivityIdsChange: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
      },
    })
    onActivityIdsChange = vi.fn()

    // Pre-populate the query cache to avoid async fetching
    queryClient.setQueryData(["bookStructure", "book-1"], mockBookStructure)

    // Also set up the mock for any direct calls
    const { getBookStructure } = await import("@/services/booksApi")
    vi.mocked(getBookStructure).mockResolvedValue(mockBookStructure)
  })

  afterEach(() => {
    queryClient.clear()
  })

  const renderComponent = (selectedActivityIds: string[] = []) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ActivitySelectionTabs
          bookId="book-1"
          book={mockBook}
          selectedActivityIds={selectedActivityIds}
          onActivityIdsChange={onActivityIdsChange}
        />
      </QueryClientProvider>,
    )
  }

  it("renders book info and tabs", () => {
    renderComponent()

    // Check book info is displayed
    expect(screen.getByText("Test Book")).toBeInTheDocument()
    expect(screen.getByText("Test Publisher")).toBeInTheDocument()
    expect(screen.getByText("10 activities")).toBeInTheDocument()

    // Check all three tabs are present
    expect(screen.getByRole("tab", { name: /individual/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /by page/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /by module/i })).toBeInTheDocument()
  })

  it("shows Individual tab by default", () => {
    renderComponent()

    // Individual tab should be active
    const individualTab = screen.getByRole("tab", { name: /individual/i })
    expect(individualTab).toHaveAttribute("aria-selected", "true")

    // PageViewer should be visible
    expect(screen.getByTestId("page-viewer")).toBeInTheDocument()
  })

  it("switches to By Page tab when clicked", async () => {
    const user = userEvent.setup()
    renderComponent()

    // Click By Page tab
    const byPageTab = screen.getByRole("tab", { name: /by page/i })
    await user.click(byPageTab)

    // Data is pre-populated, so component should appear immediately
    expect(screen.getByTestId("page-selection-grid")).toBeInTheDocument()
  })

  it("switches to By Module tab when clicked", async () => {
    const user = userEvent.setup()
    renderComponent()

    // Click By Module tab
    const byModuleTab = screen.getByRole("tab", { name: /by module/i })
    await user.click(byModuleTab)

    // Data is pre-populated, so component should appear immediately
    expect(screen.getByTestId("module-selection-list")).toBeInTheDocument()
  })

  it("shows selected count badge when activities are selected", () => {
    renderComponent(["act-1", "act-2"])

    expect(screen.getByText("2 selected")).toBeInTheDocument()
  })

  it("shows empty state in summary panel when no activities selected", () => {
    renderComponent([])

    expect(
      screen.getByText(/click activities, pages, or modules to select/i),
    ).toBeInTheDocument()
  })

  it("calls onActivityIdsChange when activities are selected via page", async () => {
    const user = userEvent.setup()
    renderComponent()

    // Switch to By Page tab
    await user.click(screen.getByRole("tab", { name: /by page/i }))
    expect(screen.getByTestId("page-selection-grid")).toBeInTheDocument()

    // Click to select page
    await user.click(screen.getByTestId("select-page-1"))

    // Should call onActivityIdsChange with the activity IDs
    expect(onActivityIdsChange).toHaveBeenCalledWith(
      expect.arrayContaining(["act-1", "act-2"]),
    )
  })

  it("calls onActivityIdsChange when activities are selected via module", async () => {
    const user = userEvent.setup()
    renderComponent()

    // Switch to By Module tab
    await user.click(screen.getByRole("tab", { name: /by module/i }))
    expect(screen.getByTestId("module-selection-list")).toBeInTheDocument()

    // Click to select module
    await user.click(screen.getByTestId("select-module-1"))

    // Should call onActivityIdsChange with the activity IDs
    expect(onActivityIdsChange).toHaveBeenCalledWith(
      expect.arrayContaining(["act-1", "act-2", "act-3"]),
    )
  })

  it("clears all selections when Clear button is clicked", async () => {
    const user = userEvent.setup()
    renderComponent(["act-1", "act-2"])

    // Find and click Clear button
    const clearButton = screen.getByRole("button", { name: /clear/i })
    await user.click(clearButton)

    // Should call onActivityIdsChange with empty array
    expect(onActivityIdsChange).toHaveBeenCalledWith([])
  })

  it("syncs internal state when selectedActivityIds prop changes", async () => {
    const { rerender } = renderComponent([])

    // Initially no selection
    expect(screen.getByText("Selected (0)")).toBeInTheDocument()

    // Rerender with new selectedActivityIds (simulating edit mode)
    rerender(
      <QueryClientProvider client={queryClient}>
        <ActivitySelectionTabs
          bookId="book-1"
          book={mockBook}
          selectedActivityIds={["act-1", "act-2", "act-3"]}
          onActivityIdsChange={onActivityIdsChange}
        />
      </QueryClientProvider>,
    )

    // Should update to show 3 selected
    await waitFor(() => {
      expect(screen.getByText("3 selected")).toBeInTheDocument()
    })
  })

  it("persists selections when switching tabs", async () => {
    const user = userEvent.setup()
    renderComponent(["act-1"])

    // Should show 1 selected initially
    expect(screen.getByText("1 selected")).toBeInTheDocument()

    // Switch to By Page tab
    await user.click(screen.getByRole("tab", { name: /by page/i }))
    expect(screen.getByTestId("page-selection-grid")).toBeInTheDocument()

    // Should still show 1 selected
    expect(screen.getByText("1 selected")).toBeInTheDocument()

    // Switch to By Module tab
    await user.click(screen.getByRole("tab", { name: /by module/i }))
    expect(screen.getByTestId("module-selection-list")).toBeInTheDocument()

    // Should still show 1 selected
    expect(screen.getByText("1 selected")).toBeInTheDocument()

    // Switch back to Individual tab
    await user.click(screen.getByRole("tab", { name: /individual/i }))
    expect(screen.getByTestId("page-viewer")).toBeInTheDocument()

    // Should still show 1 selected
    expect(screen.getByText("1 selected")).toBeInTheDocument()
  })

  // Story 20.4: Eye icon removal tests
  it("does not show preview/eye icon on selected activities", () => {
    renderComponent(["act-1", "act-2"])

    // Should not find any eye/preview buttons in the selected activities panel
    const eyeButtons = screen.queryAllByTitle(/preview activity/i)
    expect(eyeButtons).toHaveLength(0)
  })

  // Story 20.4: Time Planning mode indicator
  it("shows Time Planning mode indicator when enabled", () => {
    const onTimePlanningChange = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <ActivitySelectionTabs
          bookId="book-1"
          book={mockBook}
          selectedActivityIds={[]}
          onActivityIdsChange={onActivityIdsChange}
          timePlanningEnabled={true}
          onTimePlanningChange={onTimePlanningChange}
        />
      </QueryClientProvider>,
    )

    // Should show Time Planning mode indicator
    expect(screen.getByText(/Time Planning Mode/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Activities will be selected based on time sessions/i),
    ).toBeInTheDocument()
  })

  it("does not show Time Planning mode indicator when disabled", () => {
    renderComponent()

    // Should not show Time Planning mode indicator
    expect(screen.queryByText(/Time Planning Mode/i)).not.toBeInTheDocument()
  })
})
