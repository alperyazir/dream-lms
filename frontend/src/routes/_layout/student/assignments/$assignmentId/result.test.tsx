/**
 * Tests for Assignment Result Detail Screen
 * Story 23.4: Fix Result Screen Stale Progress
 *
 * Validates that the result screen fetches and displays submission data correctly.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as assignmentsApi from "@/services/assignmentsApi"

// Import the actual component - adjust path if needed
import { Route } from "./result"

describe("AssignmentResultDetailPage (Story 23.4)", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const mockAssignmentResult = {
    assignment_id: "test-assignment-id",
    assignment_name: "Math Quiz",
    activity_id: "activity-1",
    activity_title: "Addition Practice",
    activity_type: "multipleChoice",
    book_id: 1,
    book_name: "Math Grade 5",
    publisher_name: "Dream Publishers",
    config_json: {
      questions: [
        { id: "q1", text: "What is 2+2?", options: ["3", "4", "5"] },
        { id: "q2", text: "What is 3+3?", options: ["5", "6", "7"] },
      ],
    },
    answers_json: {
      q1: "4",
      q2: "6",
    },
    score: 85.5,
    total_points: 100.0,
    started_at: "2025-12-28T10:15:00Z",
    completed_at: "2025-12-28T10:30:00Z",
    time_spent_minutes: 15,
    time_spent_seconds: 900, // 15 minutes in seconds
  }

  const renderWithRouter = (assignmentId: string) => {
    // Create a minimal router setup for testing
    const rootRoute = createRootRoute()
    const resultRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/student/assignments/$assignmentId/result",
      component: Route.options.component,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([resultRoute]),
      history: createMemoryHistory({
        initialEntries: [`/student/assignments/${assignmentId}/result`],
      }),
    })

    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
  }

  it("fetches submission data from backend API (AC 9, 11)", async () => {
    const getAssignmentResultSpy = vi
      .spyOn(assignmentsApi, "getAssignmentResult")
      .mockResolvedValue(mockAssignmentResult)

    renderWithRouter("test-assignment-id")

    // Verify API is called with correct assignment ID
    await waitFor(() => {
      expect(getAssignmentResultSpy).toHaveBeenCalledWith("test-assignment-id")
    })

    // Verify submission data is fetched (not cached progress data)
    expect(getAssignmentResultSpy).toHaveBeenCalledTimes(1)
  })

  it("uses staleTime: 0 to always fetch fresh data (AC 11)", async () => {
    const getAssignmentResultSpy = vi
      .spyOn(assignmentsApi, "getAssignmentResult")
      .mockResolvedValue(mockAssignmentResult)

    const { unmount } = renderWithRouter("test-assignment-id")

    await waitFor(() => {
      expect(getAssignmentResultSpy).toHaveBeenCalledTimes(1)
    })

    // Unmount and remount to simulate page refresh
    unmount()

    renderWithRouter("test-assignment-id")

    // Should fetch again (not using stale cache)
    await waitFor(() => {
      expect(getAssignmentResultSpy).toHaveBeenCalledTimes(2)
    })
  })

  it("shows error when assignment not completed (AC 9)", async () => {
    vi.spyOn(assignmentsApi, "getAssignmentResult").mockRejectedValue({
      response: {
        status: 404,
        data: { detail: "Assignment has not been completed yet" },
      },
    })

    renderWithRouter("incomplete-assignment")

    await waitFor(() => {
      expect(screen.getByText(/results not found/i)).toBeInTheDocument()
      expect(screen.getByText(/hasn't been completed yet/i)).toBeInTheDocument()
    })
  })

  it("shows error when no submission data found (AC 9)", async () => {
    vi.spyOn(assignmentsApi, "getAssignmentResult").mockRejectedValue({
      response: {
        status: 404,
        data: { detail: "No submission data found" },
      },
    })

    renderWithRouter("no-submission")

    await waitFor(() => {
      expect(screen.getByText(/results not found/i)).toBeInTheDocument()
    })
  })

  it("provides navigation back to assignment (AC 15)", async () => {
    vi.spyOn(assignmentsApi, "getAssignmentResult").mockResolvedValue(
      mockAssignmentResult,
    )

    renderWithRouter("test-assignment-id")

    await waitFor(() => {
      expect(screen.getByText("Math Quiz")).toBeInTheDocument()
    })

    // Should have back button
    const backButtons = screen.getAllByText(/back to assignment/i)
    expect(backButtons.length).toBeGreaterThan(0)
  })

  it("displays submission metadata correctly (AC 3)", async () => {
    vi.spyOn(assignmentsApi, "getAssignmentResult").mockResolvedValue(
      mockAssignmentResult,
    )

    renderWithRouter("test-assignment-id")

    await waitFor(() => {
      expect(screen.getByText("Math Quiz")).toBeInTheDocument()
    })

    // Should show activity type
    expect(screen.getByText(/Multiple Choice/i)).toBeInTheDocument()

    // Should show completion date
    expect(screen.getByText(/12\/28\/2025/i)).toBeInTheDocument()

    // Should show time spent
    expect(screen.getByText(/15 min/i)).toBeInTheDocument()
  })
})
