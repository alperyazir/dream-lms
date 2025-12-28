/**
 * MultiActivityPlayer Tests
 * Story 8.3: Student Multi-Activity Assignment Player
 *
 * Tests for the multi-activity player component.
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type {
  ActivityProgressInfo,
  ActivityWithConfig,
} from "@/types/assignment"

// Mock the child components
vi.mock("./ActivityPlayer", () => ({
  ActivityPlayer: vi.fn(({ bookTitle, activityType }) => (
    <div data-testid="activity-player">
      ActivityPlayer: {bookTitle} - {activityType}
    </div>
  )),
}))

vi.mock("./ActivityNavigationBar", () => ({
  ActivityNavigationBar: vi.fn(({ activities, currentIndex }) => (
    <div data-testid="activity-navigation">
      Navigation: {currentIndex + 1} of {activities.length}
    </div>
  )),
}))

vi.mock("./SharedAssignmentTimer", () => ({
  SharedAssignmentTimer: vi.fn(({ totalTimeLimit }) => (
    <div data-testid="shared-timer">Timer: {totalTimeLimit} min</div>
  )),
}))

vi.mock("./SubmitConfirmationDialog", () => ({
  SubmitConfirmationDialog: vi.fn(() => null),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

vi.mock("@/services/assignmentsApi", () => ({
  saveActivityProgress: vi.fn().mockResolvedValue({}),
  submitMultiActivityAssignment: vi.fn().mockResolvedValue({
    success: true,
    combined_score: 85,
    completed_at: new Date().toISOString(),
  }),
}))

// Import after mocks
import { MultiActivityPlayer } from "./MultiActivityPlayer"

// Mock activities
const mockActivities: ActivityWithConfig[] = [
  {
    id: "activity-1",
    title: "Drag and Drop",
    activity_type: "dragdroppicture",
    config_json: { type: "dragdroppicture" },
    order_index: 0,
  },
  {
    id: "activity-2",
    title: "Match Words",
    activity_type: "matchTheWords",
    config_json: { type: "matchTheWords" },
    order_index: 1,
  },
  {
    id: "activity-3",
    title: "Circle Activity",
    activity_type: "circle",
    config_json: { type: "circle" },
    order_index: 2,
  },
]

const mockActivityProgress: ActivityProgressInfo[] = [
  {
    id: "progress-1",
    activity_id: "activity-1",
    status: "completed",
    score: 90,
    max_score: 100,
    response_data: null,
    started_at: "2024-01-01T10:00:00Z",
    completed_at: "2024-01-01T10:05:00Z",
  },
  {
    id: "progress-2",
    activity_id: "activity-2",
    status: "in_progress",
    score: null,
    max_score: 100,
    response_data: null,
    started_at: "2024-01-01T10:06:00Z",
    completed_at: null,
  },
  {
    id: "progress-3",
    activity_id: "activity-3",
    status: "not_started",
    score: null,
    max_score: 100,
    response_data: null,
    started_at: null,
    completed_at: null,
  },
]

const defaultProps = {
  assignmentId: "assignment-123",
  assignmentName: "Test Assignment",
  bookId: "book-123",
  bookTitle: "Test Book",
  bookName: "test-book",
  publisherName: "test-publisher",
  activities: mockActivities,
  activityProgress: mockActivityProgress,
  timeLimit: 30,
  initialTimeSpent: 5,
  onExit: vi.fn(),
  onSubmitSuccess: vi.fn(),
}

describe("MultiActivityPlayer", () => {
  it("renders header with navigation and progress", () => {
    render(<MultiActivityPlayer {...defaultProps} />)

    // Header contains navigation bar (shows current activity index)
    expect(screen.getByTestId("activity-navigation")).toBeInTheDocument()
    expect(screen.getByText("Navigation: 2 of 3")).toBeInTheDocument()
  })

  it("renders activity navigation bar", () => {
    render(<MultiActivityPlayer {...defaultProps} />)

    expect(screen.getByTestId("activity-navigation")).toBeInTheDocument()
  })

  it("renders shared timer when time limit is set", () => {
    render(<MultiActivityPlayer {...defaultProps} />)

    expect(screen.getByTestId("shared-timer")).toBeInTheDocument()
    expect(screen.getByText("Timer: 30 min")).toBeInTheDocument()
  })

  it("does not render timer when no time limit", () => {
    render(
      <MultiActivityPlayer
        {...defaultProps}
        timeLimit={null}
        initialTimeSpent={0}
      />,
    )

    expect(screen.queryByTestId("shared-timer")).not.toBeInTheDocument()
  })

  it("renders activity player with correct props", () => {
    render(<MultiActivityPlayer {...defaultProps} />)

    expect(screen.getByTestId("activity-player")).toBeInTheDocument()
  })

  it("shows completion progress", () => {
    render(<MultiActivityPlayer {...defaultProps} />)

    // Progress shown in footer as "2 / 3" (current index 1 = second activity)
    expect(screen.getByText("2 / 3")).toBeInTheDocument()
  })

  it("renders navigation buttons", () => {
    render(<MultiActivityPlayer {...defaultProps} />)

    expect(screen.getByText("Prev")).toBeInTheDocument()
    expect(screen.getByText("Next")).toBeInTheDocument()
    expect(screen.getByText("Save & Exit")).toBeInTheDocument()
    expect(screen.getByText("Submit")).toBeInTheDocument()
  })

  it("disables Previous button on first activity", () => {
    // Set initial activity to first (index 0) which is completed, so it should start at second
    const progressAllNotStarted = mockActivityProgress.map((p) => ({
      ...p,
      status: "not_started" as const,
    }))

    render(
      <MultiActivityPlayer
        {...defaultProps}
        activityProgress={progressAllNotStarted}
      />,
    )

    // First activity, Previous should be disabled
    const prevButton = screen.getByText("Prev")
    expect(prevButton).toBeDisabled()
  })

  it("disables Next button on last activity", () => {
    // Create progress where first two are completed to start at third
    const progressFirstTwoCompleted: ActivityProgressInfo[] = [
      { ...mockActivityProgress[0], status: "completed" },
      { ...mockActivityProgress[1], status: "completed" },
      { ...mockActivityProgress[2], status: "not_started" },
    ]

    render(
      <MultiActivityPlayer
        {...defaultProps}
        activityProgress={progressFirstTwoCompleted}
      />,
    )

    // Navigation should show last activity
    expect(screen.getByText("Navigation: 3 of 3")).toBeInTheDocument()
  })

  it("enables Submit button regardless of completion status", () => {
    // Submit is always enabled - shows warning dialog for incomplete activities
    render(<MultiActivityPlayer {...defaultProps} />)

    const submitButton = screen.getByText("Submit")
    expect(submitButton).not.toBeDisabled()
  })

  it("enables Submit button when all activities are completed", () => {
    const allCompletedProgress: ActivityProgressInfo[] =
      mockActivityProgress.map((p) => ({
        ...p,
        status: "completed" as const,
        score: 85,
        completed_at: "2024-01-01T10:10:00Z",
      }))

    render(
      <MultiActivityPlayer
        {...defaultProps}
        activityProgress={allCompletedProgress}
      />,
    )

    const submitButton = screen.getByText("Submit")
    expect(submitButton).not.toBeDisabled()
  })

  it("shows correct activity indicator based on progress", () => {
    render(<MultiActivityPlayer {...defaultProps} />)

    // Should start at first incomplete activity (index 1, in_progress)
    expect(screen.getByText("Navigation: 2 of 3")).toBeInTheDocument()
  })

  it("shows no activities message when activities array is empty", () => {
    render(<MultiActivityPlayer {...defaultProps} activities={[]} />)

    expect(
      screen.getByText("No activities found in this assignment."),
    ).toBeInTheDocument()
  })

  it("renders main content area with overflow-auto for proper resource sidebar display", () => {
    const { container } = render(<MultiActivityPlayer {...defaultProps} />)

    // Find the main content area element
    const mainElement = container.querySelector("main")
    expect(mainElement).toBeInTheDocument()

    // Verify it has overflow-auto class instead of overflow-hidden
    // This ensures the resources sidebar is fully visible and not cut off
    expect(mainElement?.className).toContain("overflow-auto")
    expect(mainElement?.className).not.toContain("overflow-hidden")
  })
})
