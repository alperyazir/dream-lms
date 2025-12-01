/**
 * ActivityNavigationBar Tests
 * Story 8.3: Student Multi-Activity Assignment Player
 *
 * Tests for the activity navigation bar component.
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ActivityState, ActivityWithConfig } from "@/types/assignment"
import { ActivityNavigationBar } from "./ActivityNavigationBar"

// Mock activities
const mockActivities: ActivityWithConfig[] = [
  {
    id: "activity-1",
    title: "Drag and Drop",
    activity_type: "dragdroppicture",
    config_json: {},
    order_index: 0,
  },
  {
    id: "activity-2",
    title: "Match Words",
    activity_type: "matchTheWords",
    config_json: {},
    order_index: 1,
  },
  {
    id: "activity-3",
    title: "Circle Activity",
    activity_type: "circle",
    config_json: {},
    order_index: 2,
  },
]

// Helper to create activity states
function createActivityStates(
  statuses: ("not_started" | "in_progress" | "completed")[],
): Map<string, ActivityState> {
  const states = new Map<string, ActivityState>()
  mockActivities.forEach((activity, index) => {
    states.set(activity.id, {
      activityId: activity.id,
      status: statuses[index] || "not_started",
      isDirty: false,
      responseData: null,
      score: statuses[index] === "completed" ? 85 : null,
      timeSpentSeconds: 0,
    })
  })
  return states
}

describe("ActivityNavigationBar", () => {
  it("renders all activity buttons", () => {
    const states = createActivityStates(["not_started", "not_started", "not_started"])
    const onNavigate = vi.fn()

    render(
      <ActivityNavigationBar
        activities={mockActivities}
        currentIndex={0}
        activityStates={states}
        onNavigate={onNavigate}
      />,
    )

    // Check all activities are rendered
    expect(screen.getByText("Drag and Drop")).toBeInTheDocument()
    expect(screen.getByText("Match Words")).toBeInTheDocument()
    expect(screen.getByText("Circle Activity")).toBeInTheDocument()
  })

  it("highlights current activity", () => {
    const states = createActivityStates(["in_progress", "not_started", "not_started"])
    const onNavigate = vi.fn()

    render(
      <ActivityNavigationBar
        activities={mockActivities}
        currentIndex={0}
        activityStates={states}
        onNavigate={onNavigate}
      />,
    )

    // Current activity should have aria-current
    const currentButton = screen.getByRole("button", { name: /Activity 1/i })
    expect(currentButton).toHaveAttribute("aria-current", "step")
  })

  it("calls onNavigate when clicking an activity", () => {
    const states = createActivityStates(["not_started", "not_started", "not_started"])
    const onNavigate = vi.fn()

    render(
      <ActivityNavigationBar
        activities={mockActivities}
        currentIndex={0}
        activityStates={states}
        onNavigate={onNavigate}
      />,
    )

    // Click second activity
    fireEvent.click(screen.getByText("Match Words"))

    expect(onNavigate).toHaveBeenCalledWith(1)
  })

  it("shows correct status for completed activities", () => {
    const states = createActivityStates(["completed", "in_progress", "not_started"])
    const onNavigate = vi.fn()

    render(
      <ActivityNavigationBar
        activities={mockActivities}
        currentIndex={1}
        activityStates={states}
        onNavigate={onNavigate}
      />,
    )

    // First activity should show completed (checkmark icon)
    const firstButton = screen.getByRole("button", { name: /Activity 1.*completed/i })
    expect(firstButton).toBeInTheDocument()
  })

  it("disables navigation when disabled prop is true", () => {
    const states = createActivityStates(["not_started", "not_started", "not_started"])
    const onNavigate = vi.fn()

    render(
      <ActivityNavigationBar
        activities={mockActivities}
        currentIndex={0}
        activityStates={states}
        onNavigate={onNavigate}
        disabled
      />,
    )

    // All buttons should be disabled
    const buttons = screen.getAllByRole("button")
    for (const button of buttons) {
      expect(button).toBeDisabled()
    }

    // Clicking should not call onNavigate
    fireEvent.click(screen.getByText("Match Words"))
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it("shows progress bar based on completed activities", () => {
    const states = createActivityStates(["completed", "completed", "not_started"])
    const onNavigate = vi.fn()

    const { container } = render(
      <ActivityNavigationBar
        activities={mockActivities}
        currentIndex={2}
        activityStates={states}
        onNavigate={onNavigate}
      />,
    )

    // Progress bar should show 66.67% (2 of 3 completed)
    const progressBar = container.querySelector('[class*="bg-teal-500"]')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveStyle({ width: "66.66666666666666%" })
  })

  it("handles activities without titles", () => {
    const activitiesNoTitles: ActivityWithConfig[] = [
      {
        id: "activity-1",
        title: null,
        activity_type: "dragdroppicture",
        config_json: {},
        order_index: 0,
      },
      {
        id: "activity-2",
        title: null,
        activity_type: "matchTheWords",
        config_json: {},
        order_index: 1,
      },
    ]

    const states = new Map<string, ActivityState>([
      [
        "activity-1",
        {
          activityId: "activity-1",
          status: "not_started",
          isDirty: false,
          responseData: null,
          score: null,
          timeSpentSeconds: 0,
        },
      ],
      [
        "activity-2",
        {
          activityId: "activity-2",
          status: "not_started",
          isDirty: false,
          responseData: null,
          score: null,
          timeSpentSeconds: 0,
        },
      ],
    ])

    render(
      <ActivityNavigationBar
        activities={activitiesNoTitles}
        currentIndex={0}
        activityStates={states}
        onNavigate={vi.fn()}
      />,
    )

    // Should show "Activity 1" and "Activity 2" fallbacks
    expect(screen.getByText("Activity 1")).toBeInTheDocument()
    expect(screen.getByText("Activity 2")).toBeInTheDocument()
  })
})
