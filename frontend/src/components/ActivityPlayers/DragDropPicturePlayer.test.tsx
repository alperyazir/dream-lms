/**
 * DragDropPicturePlayer Tests
 * Story 2.5 - Phase 9: Testing & Verification
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { DragDropPictureActivity } from "@/lib/mockData"
import { DragDropPicturePlayer } from "./DragDropPicturePlayer"

const mockActivity: DragDropPictureActivity = {
  id: "activity-1",
  bookId: "book-1",
  type: "dragdroppicture",
  section_path: "https://via.placeholder.com/1200x800?text=Activity+Background",
  words: ["apple", "banana", "cherry"],
  answer: [
    { no: 1, coords: { x: 100, y: 100, w: 80, h: 40 }, text: "apple" },
    { no: 2, coords: { x: 200, y: 100, w: 80, h: 40 }, text: "banana" },
    { no: 3, coords: { x: 300, y: 100, w: 80, h: 40 }, text: "cherry" },
  ],
}

describe("DragDropPicturePlayer", () => {
  it("renders activity with word bank and drop zones", () => {
    const onAnswersChange = vi.fn()

    render(
      <DragDropPicturePlayer
        activity={mockActivity}
        onAnswersChange={onAnswersChange}
      />,
    )

    // Check word bank renders all words
    expect(screen.getByText("apple")).toBeInTheDocument()
    expect(screen.getByText("banana")).toBeInTheDocument()
    expect(screen.getByText("cherry")).toBeInTheDocument()

    // Check completion counter
    expect(screen.getByText("Completed: 0 / 3")).toBeInTheDocument()

    // Check drop zones are rendered (by data-testid)
    const dropZones = screen.getAllByTestId("drop-zone")
    expect(dropZones).toHaveLength(3)

    // Check background image is rendered
    const img = screen.getByAltText("Activity background")
    expect(img).toHaveAttribute("src", mockActivity.section_path)
  })

  it("tracks answers correctly and calls onAnswersChange when word is clicked and zone clicked", () => {
    const onAnswersChange = vi.fn()

    render(
      <DragDropPicturePlayer
        activity={mockActivity}
        onAnswersChange={onAnswersChange}
      />,
    )

    // Select a word (mobile interaction)
    const appleWord = screen.getByText("apple")
    fireEvent.click(appleWord)

    // Word should show as selected (via classes)
    expect(appleWord).toHaveClass("border-blue-500")

    // Click a drop zone
    const dropZones = screen.getAllByTestId("drop-zone")
    fireEvent.click(dropZones[0])

    // onAnswersChange should be called with Map containing the placement
    expect(onAnswersChange).toHaveBeenCalled()
    const callArg = onAnswersChange.mock.calls[0][0]
    expect(callArg).toBeInstanceOf(Map)
    expect(callArg.get("100-100")).toBe("apple")

    // Word should now show as used
    expect(appleWord).toHaveClass("opacity-30")

    // Completion counter should update
    expect(screen.getByText("Completed: 1 / 3")).toBeInTheDocument()
  })

  it("shows results with correct/incorrect indicators when showResults is true", () => {
    const onAnswersChange = vi.fn()
    const correctAnswers = new Set(["100-100", "200-100"]) // apple and banana correct

    const initialAnswers = new Map([
      ["100-100", "apple"], // correct
      ["200-100", "banana"], // correct
      ["300-100", "wrong"], // incorrect
    ])

    render(
      <DragDropPicturePlayer
        activity={mockActivity}
        onAnswersChange={onAnswersChange}
        showResults={true}
        correctAnswers={correctAnswers}
        initialAnswers={initialAnswers}
      />,
    )

    // Check that drop zones show correct/incorrect styling
    const dropZones = screen.getAllByTestId("drop-zone")

    // First two should have correct styling (green)
    expect(dropZones[0]).toHaveClass("border-green-500")
    expect(dropZones[1]).toHaveClass("border-green-500")

    // Third should have incorrect styling (red)
    expect(dropZones[2]).toHaveClass("border-red-500")

    // Check that placed words are visible (words appear both in bank and drop zones)
    const appleElements = screen.getAllByText("apple")
    expect(appleElements.length).toBeGreaterThanOrEqual(1)

    const bananaElements = screen.getAllByText("banana")
    expect(bananaElements.length).toBeGreaterThanOrEqual(1)

    const wrongElements = screen.getAllByText("wrong")
    expect(wrongElements.length).toBeGreaterThanOrEqual(1)

    // Check that result indicators (✓ and ✗) are shown
    const checkmarks = screen.getAllByText("✓")
    expect(checkmarks).toHaveLength(2) // apple and banana

    const crosses = screen.getAllByText("✗")
    expect(crosses).toHaveLength(1) // wrong
  })
})
