/**
 * MultiActivityAnalyticsTable Component Tests
 * Story 8.4: Multi-Activity Assignment Analytics
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { MultiActivityAnalyticsResponse } from "@/types/assignment"
import { MultiActivityAnalyticsTable } from "./MultiActivityAnalyticsTable"

// Mock the analytics hook
vi.mock("@/hooks/useAssignmentAnalytics", () => ({
  useAssignmentAnalytics: vi.fn(),
}))

// Mock the export utility
vi.mock("@/utils/exportAnalytics", () => ({
  exportMultiActivityAnalytics: vi.fn(),
}))

import { useAssignmentAnalytics } from "@/hooks/useAssignmentAnalytics"
import { exportMultiActivityAnalytics } from "@/utils/exportAnalytics"

const mockAnalytics: MultiActivityAnalyticsResponse = {
  assignment_id: "assignment-1",
  assignment_name: "Math Test",
  total_students: 10,
  submitted_count: 7,
  activities: [
    {
      activity_id: "activity-1",
      activity_title: "Addition Problems",
      page_number: 1,
      activity_type: "multiple_choice",
      class_average_score: 85.5,
      completion_rate: 0.7,
      completed_count: 7,
      total_assigned_count: 10,
    },
    {
      activity_id: "activity-2",
      activity_title: "Subtraction Problems",
      page_number: 2,
      activity_type: "fill_blank",
      class_average_score: null,
      completion_rate: 0.3,
      completed_count: 3,
      total_assigned_count: 10,
    },
  ],
  expanded_students: null,
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe("MultiActivityAnalyticsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders loading state", () => {
    vi.mocked(useAssignmentAnalytics).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    const { container } = renderWithQueryClient(
      <MultiActivityAnalyticsTable assignmentId="1" />
    )

    // Should show loading skeleton (skeleton uses animate-pulse class)
    const skeletonElements = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })

  it("renders error state", () => {
    vi.mocked(useAssignmentAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to fetch"),
    } as any)

    renderWithQueryClient(<MultiActivityAnalyticsTable assignmentId="1" />)

    expect(screen.getByText(/failed to load analytics/i)).toBeInTheDocument()
  })

  it("renders empty state when no activities", () => {
    vi.mocked(useAssignmentAnalytics).mockReturnValue({
      data: { ...mockAnalytics, activities: [] },
      isLoading: false,
      error: null,
    } as any)

    renderWithQueryClient(<MultiActivityAnalyticsTable assignmentId="1" />)

    expect(screen.getByText(/no activities found/i)).toBeInTheDocument()
  })

  it("renders analytics table with activity data", () => {
    vi.mocked(useAssignmentAnalytics).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
    } as any)

    renderWithQueryClient(<MultiActivityAnalyticsTable assignmentId="1" />)

    // Check summary info
    expect(screen.getByText(/7 of 10 students submitted/i)).toBeInTheDocument()
    expect(screen.getByText(/2 activities/i)).toBeInTheDocument()

    // Check activity titles
    expect(screen.getByText("Addition Problems")).toBeInTheDocument()
    expect(screen.getByText("Subtraction Problems")).toBeInTheDocument()

    // Check activity types are formatted
    expect(screen.getByText("Multiple Choice")).toBeInTheDocument()
    expect(screen.getByText("Fill in the Blank")).toBeInTheDocument()

    // Check class average
    expect(screen.getByText("86%")).toBeInTheDocument() // 85.5 rounded
    expect(screen.getByText("N/A")).toBeInTheDocument() // null average
  })

  it("calls export function when export button clicked", async () => {
    const user = userEvent.setup()

    vi.mocked(useAssignmentAnalytics).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
    } as any)

    renderWithQueryClient(<MultiActivityAnalyticsTable assignmentId="1" />)

    const exportButton = screen.getByRole("button", { name: /export results/i })
    await user.click(exportButton)

    expect(exportMultiActivityAnalytics).toHaveBeenCalledWith(mockAnalytics)
  })

  it("displays completion rate as progress bar", () => {
    vi.mocked(useAssignmentAnalytics).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
    } as any)

    renderWithQueryClient(<MultiActivityAnalyticsTable assignmentId="1" />)

    // Check completion percentages are shown
    expect(screen.getByText("70%")).toBeInTheDocument()
    expect(screen.getByText("30%")).toBeInTheDocument()

    // Check completion counts
    expect(screen.getByText("(7/10)")).toBeInTheDocument()
    expect(screen.getByText("(3/10)")).toBeInTheDocument()
  })
})
