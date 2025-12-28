/**
 * DragDropPicturePlayer Tests
 * Story 2.5 - Phase 9: Testing & Verification
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"
import type { DragDropPictureActivity } from "@/lib/mockData"
import { DragDropPicturePlayer } from "./DragDropPicturePlayer"

// Mock ResizeObserver (Story 23.1: Required for drag-drop components)
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
})

// Mock the booksApi service
vi.mock("@/services/booksApi", () => ({
  getActivityImageUrl: vi
    .fn()
    .mockResolvedValue("https://via.placeholder.com/1200x800"),
}))

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
  it("renders activity with word bank and drop zones", async () => {
    const onAnswersChange = vi.fn()

    render(
      <DragDropPicturePlayer
        activity={mockActivity}
        bookId="book-1"
        onAnswersChange={onAnswersChange}
      />,
    )

    // Check word bank renders all words
    expect(screen.getByText("apple")).toBeInTheDocument()
    expect(screen.getByText("banana")).toBeInTheDocument()
    expect(screen.getByText("cherry")).toBeInTheDocument()

    // Wait for image to load
    await screen.findByAltText("Activity background")

    // Check drop zones are rendered (by role and aria-label)
    const dropZones = screen.getAllByRole("button", { name: /Drop zone/i })
    expect(dropZones.length).toBeGreaterThanOrEqual(3)
  })

  it("tracks answers correctly and calls onAnswersChange when word is clicked and zone clicked", async () => {
    const onAnswersChange = vi.fn()

    render(
      <DragDropPicturePlayer
        activity={mockActivity}
        bookId="book-1"
        onAnswersChange={onAnswersChange}
      />,
    )

    // Wait for image and drop zones to load
    await screen.findByAltText("Activity background")

    // Select a word (mobile interaction)
    const appleWord = screen.getByRole("button", { name: /Word: apple/i })
    fireEvent.click(appleWord)

    // Word should show as selected (via classes)
    expect(appleWord).toHaveClass("border-blue-500")

    // Click a drop zone
    const dropZones = screen.getAllByRole("button", { name: /Drop zone/i })
    fireEvent.click(dropZones[0])

    // onAnswersChange should be called with Map containing the placement
    expect(onAnswersChange).toHaveBeenCalled()
    const callArg = onAnswersChange.mock.calls[0][0]
    expect(callArg).toBeInstanceOf(Map)
    // Story 23.1: Now stores item IDs instead of text
    expect(callArg.get("100-100")).toBe("item-0") // apple is first word, so item-0

    // Story 23.1: Placed items are removed from available items, not shown with opacity
    // Check that apple is no longer in the available word bank
    const remainingWords = screen.getAllByRole("button", { name: /Word:/i })
    expect(remainingWords).toHaveLength(2) // banana and cherry remain
  })

  it("shows results with correct/incorrect indicators when showResults is true", async () => {
    const onAnswersChange = vi.fn()
    const correctAnswers = new Set(["100-100", "200-100"]) // apple and banana correct

    // Story 23.1: initialAnswers now uses item IDs instead of text
    const initialAnswers = new Map([
      ["100-100", "item-0"], // apple - correct
      ["200-100", "item-1"], // banana - correct
      ["300-100", "item-2"], // cherry - incorrect placement (wrong zone)
    ])

    render(
      <DragDropPicturePlayer
        activity={mockActivity}
        bookId="book-1"
        onAnswersChange={onAnswersChange}
        showResults={true}
        correctAnswers={correctAnswers}
        initialAnswers={initialAnswers}
      />,
    )

    // Wait for image to load
    await screen.findByAltText("Activity background")

    // Check that drop zones show correct/incorrect styling
    const dropZones = screen.getAllByRole("button", { name: /Drop zone/i })

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

    const cherryElements = screen.getAllByText("cherry")
    expect(cherryElements.length).toBeGreaterThanOrEqual(1)

    // Check that result indicators (✓ and ✗) are shown
    const checkmarks = screen.getAllByText("✓")
    expect(checkmarks).toHaveLength(2) // apple and banana

    const crosses = screen.getAllByText("✗")
    expect(crosses).toHaveLength(1) // cherry in wrong position
  })
})
