/**
 * CirclePlayer Tests
 * Story 2.5 - Phase 9: Testing & Verification
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { CircleActivity } from "@/lib/mockData"
import { CirclePlayer } from "./CirclePlayer"

const mockActivity: CircleActivity = {
  id: "activity-1",
  bookId: "book-1",
  type: "circle",
  circleCount: 2,
  section_path: "https://via.placeholder.com/1200x800?text=Circle+Activity",
  answer: [
    { coords: { x: 100, y: 100, w: 50, h: 50 }, isCorrect: true },
    { coords: { x: 200, y: 100, w: 50, h: 50 }, isCorrect: true },
    { coords: { x: 300, y: 100, w: 50, h: 50 }, isCorrect: false },
    { coords: { x: 400, y: 100, w: 50, h: 50 }, isCorrect: false },
  ],
}

describe("CirclePlayer", () => {
  it("renders selectable areas from coords", () => {
    const onAnswersChange = vi.fn()

    render(
      <CirclePlayer
        activity={mockActivity}
        bookId="test-book-id"
        onAnswersChange={onAnswersChange}
      />,
    )

    // Check background image is rendered
    const img = screen.getByAltText("Activity background")
    expect(img).toHaveAttribute("src", mockActivity.section_path)

    // Check selection counter
    expect(screen.getByText("Selected: 0 / 2")).toBeInTheDocument()

    // Check all selectable areas are rendered (by role="checkbox")
    const selectableAreas = screen.getAllByRole("checkbox")
    expect(selectableAreas).toHaveLength(4)
  })

  it("enforces circleCount limit and calls onAnswersChange", () => {
    const onAnswersChange = vi.fn()

    render(
      <CirclePlayer
        activity={mockActivity}
        bookId="test-book-id"
        onAnswersChange={onAnswersChange}
      />,
    )

    const selectableAreas = screen.getAllByRole("checkbox")

    // Select first area
    fireEvent.click(selectableAreas[0])

    // onAnswersChange should be called
    expect(onAnswersChange).toHaveBeenCalled()
    let callArg =
      onAnswersChange.mock.calls[onAnswersChange.mock.calls.length - 1][0]
    expect(callArg).toBeInstanceOf(Set)
    expect(callArg.has("100-100")).toBe(true)

    // Counter should update
    expect(screen.getByText("Selected: 1 / 2")).toBeInTheDocument()

    // Select second area
    fireEvent.click(selectableAreas[1])

    // Counter should update
    expect(screen.getByText("Selected: 2 / 2")).toBeInTheDocument()

    // Select third area (should remove first due to circleCount limit)
    fireEvent.click(selectableAreas[2])

    // onAnswersChange should be called again
    expect(onAnswersChange).toHaveBeenCalled()
    callArg =
      onAnswersChange.mock.calls[onAnswersChange.mock.calls.length - 1][0]

    // Should have exactly 2 selections (circleCount limit)
    expect(callArg.size).toBe(2)

    // First selection should be removed, second and third should remain
    expect(callArg.has("100-100")).toBe(false) // oldest removed
    expect(callArg.has("200-100")).toBe(true)
    expect(callArg.has("300-100")).toBe(true)

    // Counter should still show 2/2
    expect(screen.getByText("Selected: 2 / 2")).toBeInTheDocument()
  })
})
