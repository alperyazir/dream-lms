/**
 * Assignment Success Screen Tests
 * Story 4.7: Assignment Submission & Result Storage - QA Fixes
 */

import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Import the component function directly
import { Route as SuccessRoute } from "./success"

// Mock react-confetti
vi.mock("react-confetti", () => ({
  default: ({ width, height, recycle }: { width: number; height: number; recycle: boolean }) => (
    <div data-testid="confetti" data-width={width} data-height={height} data-recycle={recycle}>
      Confetti
    </div>
  ),
}))

// Mock useWindowSize hook
vi.mock("@/hooks/useWindowSize", () => ({
  useWindowSize: () => ({ width: 1920, height: 1080 }),
}))

describe("AssignmentSuccessScreen", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const renderSuccessScreen = (score: number, completedAt: string) => {
    // Create a root route
    const rootRoute = createRootRoute()

    // Create the layout route
    const layoutRoute = createRoute({
      getParentRoute: () => rootRoute,
      id: "_layout",
    })

    // Create student route
    const studentRoute = createRoute({
      getParentRoute: () => layoutRoute,
      path: "student",
    })

    // Create assignments route
    const assignmentsRoute = createRoute({
      getParentRoute: () => studentRoute,
      path: "assignments",
    })

    // Create assignment detail route
    const assignmentIdRoute = createRoute({
      getParentRoute: () => assignmentsRoute,
      path: "$assignmentId",
    })

    // Attach the success route
    const successRoute = SuccessRoute.update({
      getParentRoute: () => assignmentIdRoute,
    })

    const routeTree = rootRoute.addChildren([
      layoutRoute.addChildren([
        studentRoute.addChildren([
          assignmentsRoute.addChildren([
            assignmentIdRoute.addChildren([successRoute]),
          ]),
        ]),
      ]),
    ])

    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: [
          `/student/assignments/test-assignment-id/success?score=${score}&completedAt=${encodeURIComponent(completedAt)}`,
        ],
      }),
    })

    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
  }

  describe("Score Color Coding", () => {
    it("displays green color and 'Excellent!' for scores 90-100", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(95, completedAt)

      const scoreText = screen.getByText("95%")
      const messageText = screen.getByText("Excellent!")

      // Check that both have green color classes
      expect(scoreText.className).toContain("text-green-600")
      expect(messageText.className).toContain("text-green-600")
    })

    it("displays blue color and 'Good Job!' for scores 70-89", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(75, completedAt)

      const scoreText = screen.getByText("75%")
      const messageText = screen.getByText("Good Job!")

      expect(scoreText.className).toContain("text-blue-600")
      expect(messageText.className).toContain("text-blue-600")
    })

    it("displays yellow color and 'Keep Practicing!' for scores 50-69", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(60, completedAt)

      const scoreText = screen.getByText("60%")
      const messageText = screen.getByText("Keep Practicing!")

      expect(scoreText.className).toContain("text-yellow-600")
      expect(messageText.className).toContain("text-yellow-600")
    })

    it("displays red color and 'Nice Try!' for scores 0-49", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(30, completedAt)

      const scoreText = screen.getByText("30%")
      const messageText = screen.getByText("Nice Try!")

      expect(scoreText.className).toContain("text-red-600")
      expect(messageText.className).toContain("text-red-600")
    })
  })

  describe("Confetti Animation", () => {
    it("renders confetti on initial load", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(85, completedAt)

      const confetti = screen.getByTestId("confetti")
      expect(confetti).toBeInTheDocument()
      expect(confetti).toHaveAttribute("data-width", "1920")
      expect(confetti).toHaveAttribute("data-height", "1080")
      expect(confetti).toHaveAttribute("data-recycle", "false")
    })

    it("hides confetti after 5 seconds", async () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(85, completedAt)

      // Confetti should be visible initially
      expect(screen.getByTestId("confetti")).toBeInTheDocument()

      // Fast-forward time by 5 seconds
      vi.advanceTimersByTime(5000)

      // Confetti should be removed
      await waitFor(() => {
        expect(screen.queryByTestId("confetti")).not.toBeInTheDocument()
      })
    })
  })

  describe("Content Display", () => {
    it("displays success title", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(80, completedAt)

      expect(screen.getByText("Assignment Completed!")).toBeInTheDocument()
    })

    it("displays score label and percentage", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(88, completedAt)

      expect(screen.getByText("Your Score:")).toBeInTheDocument()
      expect(screen.getByText("88%")).toBeInTheDocument()
    })

    it("displays completion timestamp in localized format", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(75, completedAt)

      const dateObject = new Date(completedAt)
      const expectedText = `Completed on ${dateObject.toLocaleString()}`

      expect(screen.getByText(expectedText)).toBeInTheDocument()
    })
  })

  describe("Navigation Buttons", () => {
    it("renders 'View Results' button", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(70, completedAt)

      const viewResultsButton = screen.getByRole("button", {
        name: /view results/i,
      })
      expect(viewResultsButton).toBeInTheDocument()
    })

    it("renders 'Back to Dashboard' button", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(70, completedAt)

      const backButton = screen.getByRole("button", {
        name: /back to dashboard/i,
      })
      expect(backButton).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("handles score of exactly 90 as Excellent", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(90, completedAt)

      expect(screen.getByText("Excellent!")).toBeInTheDocument()
      expect(screen.getByText("90%").className).toContain("text-green-600")
    })

    it("handles score of exactly 70 as Good Job", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(70, completedAt)

      expect(screen.getByText("Good Job!")).toBeInTheDocument()
      expect(screen.getByText("70%").className).toContain("text-blue-600")
    })

    it("handles score of exactly 50 as Keep Practicing", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(50, completedAt)

      expect(screen.getByText("Keep Practicing!")).toBeInTheDocument()
      expect(screen.getByText("50%").className).toContain("text-yellow-600")
    })

    it("handles score of 0 as Nice Try", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(0, completedAt)

      expect(screen.getByText("Nice Try!")).toBeInTheDocument()
      expect(screen.getByText("0%").className).toContain("text-red-600")
    })

    it("handles score of 100 as Excellent", () => {
      const completedAt = "2025-11-25T10:30:00Z"
      renderSuccessScreen(100, completedAt)

      expect(screen.getByText("Excellent!")).toBeInTheDocument()
      expect(screen.getByText("100%").className).toContain("text-green-600")
    })
  })
})
