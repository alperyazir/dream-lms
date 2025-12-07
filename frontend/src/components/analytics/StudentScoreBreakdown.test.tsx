/**
 * StudentScoreBreakdown Component Tests
 * Story 8.4: Multi-Activity Assignment Analytics
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StudentAssignmentResultResponse } from "@/types/assignment"
import { StudentScoreBreakdown } from "./StudentScoreBreakdown"

// Mock the analytics hook
vi.mock("@/hooks/useAssignmentAnalytics", () => ({
  useStudentAssignmentResult: vi.fn(),
}))

import { useStudentAssignmentResult } from "@/hooks/useAssignmentAnalytics"

const mockResult: StudentAssignmentResultResponse = {
  assignment_id: "assignment-1",
  assignment_name: "Math Test",
  total_score: 87.5,
  completed_at: "2024-01-15T10:30:00Z",
  activity_scores: [
    {
      activity_id: "activity-1",
      activity_title: "Addition Problems",
      activity_type: "multiple_choice",
      score: 90,
      max_score: 100,
      status: "completed",
    },
    {
      activity_id: "activity-2",
      activity_title: "Subtraction Problems",
      activity_type: "fill_blank",
      score: 85,
      max_score: 100,
      status: "completed",
    },
    {
      activity_id: "activity-3",
      activity_title: null,
      activity_type: "drag_drop_picture",
      score: null,
      max_score: 100,
      status: "not_started",
    },
  ],
  total_activities: 3,
  completed_activities: 2,
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
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe("StudentScoreBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders loading state", () => {
    vi.mocked(useStudentAssignmentResult).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    const { container } = renderWithQueryClient(
      <StudentScoreBreakdown assignmentId="1" />,
    )

    // Should show loading skeleton (skeleton uses animate-pulse class)
    const skeletonElements = container.querySelectorAll(
      '[class*="animate-pulse"]',
    )
    expect(skeletonElements.length).toBeGreaterThan(0)
  })

  it("renders error state", () => {
    vi.mocked(useStudentAssignmentResult).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to fetch"),
    } as any)

    renderWithQueryClient(<StudentScoreBreakdown assignmentId="1" />)

    expect(screen.getByText(/failed to load your results/i)).toBeInTheDocument()
  })

  it("renders empty state when no result", () => {
    vi.mocked(useStudentAssignmentResult).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any)

    renderWithQueryClient(<StudentScoreBreakdown assignmentId="1" />)

    expect(screen.getByText(/no results available/i)).toBeInTheDocument()
  })

  it("renders student score breakdown correctly", () => {
    vi.mocked(useStudentAssignmentResult).mockReturnValue({
      data: mockResult,
      isLoading: false,
      error: null,
    } as any)

    renderWithQueryClient(<StudentScoreBreakdown assignmentId="1" />)

    // Check assignment name
    expect(screen.getByText("Math Test")).toBeInTheDocument()

    // Check total score
    expect(screen.getByText("88%")).toBeInTheDocument() // 87.5 rounded

    // Check completion info
    expect(screen.getByText("2 of 3")).toBeInTheDocument()

    // Check activity titles
    expect(screen.getByText("Addition Problems")).toBeInTheDocument()
    expect(screen.getByText("Subtraction Problems")).toBeInTheDocument()
    expect(screen.getByText("Untitled Activity")).toBeInTheDocument()
  })

  it("displays activity types correctly", () => {
    vi.mocked(useStudentAssignmentResult).mockReturnValue({
      data: mockResult,
      isLoading: false,
      error: null,
    } as any)

    renderWithQueryClient(<StudentScoreBreakdown assignmentId="1" />)

    expect(screen.getByText("Multiple Choice")).toBeInTheDocument()
    expect(screen.getByText("Fill in the Blank")).toBeInTheDocument()
    expect(screen.getByText("Drag & Drop Picture")).toBeInTheDocument()
  })

  it("shows individual activity scores", () => {
    vi.mocked(useStudentAssignmentResult).mockReturnValue({
      data: mockResult,
      isLoading: false,
      error: null,
    } as any)

    renderWithQueryClient(<StudentScoreBreakdown assignmentId="1" />)

    // Check percentage scores
    expect(screen.getByText("90%")).toBeInTheDocument()
    expect(screen.getByText("85%")).toBeInTheDocument()

    // Check raw scores
    expect(screen.getByText("90 / 100")).toBeInTheDocument()
    expect(screen.getByText("85 / 100")).toBeInTheDocument()

    // Check not completed activity
    expect(screen.getByText("Not completed")).toBeInTheDocument()
  })

  it("displays completion date correctly", () => {
    vi.mocked(useStudentAssignmentResult).mockReturnValue({
      data: mockResult,
      isLoading: false,
      error: null,
    } as any)

    renderWithQueryClient(<StudentScoreBreakdown assignmentId="1" />)

    // Check that date is displayed (format depends on locale)
    expect(screen.getByText(/completed on/i)).toBeInTheDocument()
  })
})
