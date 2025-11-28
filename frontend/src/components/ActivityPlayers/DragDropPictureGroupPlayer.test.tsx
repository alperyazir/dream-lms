/**
 * DragDropPictureGroupPlayer Tests
 * Tests for category-based drag and drop activity
 * Each drop zone accepts multiple correct answers from a group
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { DragDropPictureGroupActivity } from "@/lib/mockData"
import { DragDropPictureGroupPlayer } from "./DragDropPictureGroupPlayer"

// Mock the booksApi service
vi.mock("@/services/booksApi", () => ({
  getActivityImageUrl: vi.fn().mockResolvedValue("https://via.placeholder.com/1200x800"),
}))

const mockActivity: DragDropPictureGroupActivity = {
  id: "activity-1",
  bookId: "book-1",
  type: "dragdroppicturegroup",
  section_path: "/images/activity-bg.png",
  words: ["apple", "banana", "cat", "dog", "car", "bus"],
  answer: [
    // Fruits category
    { no: 1, coords: { x: 100, y: 100, w: 120, h: 60 }, group: ["apple", "banana", "orange"] },
    // Animals category
    { no: 2, coords: { x: 300, y: 100, w: 120, h: 60 }, group: ["cat", "dog", "bird"] },
    // Vehicles category
    { no: 3, coords: { x: 500, y: 100, w: 120, h: 60 }, group: ["car", "bus", "train"] },
  ],
}

describe("DragDropPictureGroupPlayer", () => {
  it("renders activity with word bank and category zones", async () => {
    const onAnswersChange = vi.fn()

    render(
      <DragDropPictureGroupPlayer
        activity={mockActivity}
        bookId="book-1"
        onAnswersChange={onAnswersChange}
      />,
    )

    // Wait for image to load
    await waitFor(() => {
      expect(screen.getByAltText("Activity background")).toBeInTheDocument()
    })

    // Check word bank renders all words
    expect(screen.getByText("apple")).toBeInTheDocument()
    expect(screen.getByText("banana")).toBeInTheDocument()
    expect(screen.getByText("cat")).toBeInTheDocument()
    expect(screen.getByText("dog")).toBeInTheDocument()
    expect(screen.getByText("car")).toBeInTheDocument()
    expect(screen.getByText("bus")).toBeInTheDocument()

    // Check completion counter
    expect(screen.getByText("Completed: 0 / 3")).toBeInTheDocument()

    // Check header text mentions categories
    expect(screen.getByText("Word Bank - Drag to Categories")).toBeInTheDocument()
  })

  it("tracks answers correctly when placing words in category zones", async () => {
    const onAnswersChange = vi.fn()

    render(
      <DragDropPictureGroupPlayer
        activity={mockActivity}
        bookId="book-1"
        onAnswersChange={onAnswersChange}
      />,
    )

    await waitFor(() => {
      expect(screen.getByAltText("Activity background")).toBeInTheDocument()
    })

    // Select a word (mobile interaction)
    const appleWord = screen.getByRole("button", { name: /Word: apple/i })
    fireEvent.click(appleWord)

    // Word should show as selected
    expect(appleWord).toHaveClass("border-blue-500")

    // Click a drop zone (fruits category)
    const dropZones = screen.getAllByRole("button", { name: /Drop zone/i })
    fireEvent.click(dropZones[0])

    // onAnswersChange should be called with Map containing the placement
    expect(onAnswersChange).toHaveBeenCalled()
    const callArg = onAnswersChange.mock.calls[0][0]
    expect(callArg).toBeInstanceOf(Map)
    expect(callArg.get("100-100")).toBe("apple")

    // Completion counter should update
    await waitFor(() => {
      expect(screen.getByText("Completed: 1 / 3")).toBeInTheDocument()
    })
  })

  it("accepts any word from the correct group as valid answer", async () => {
    const onAnswersChange = vi.fn()

    // Both "apple" and "banana" should be correct for the fruits zone
    const correctAnswers1 = new Set(["100-100"]) // apple in fruits zone
    const initialAnswers1 = new Map([["100-100", "apple"]])

    const { rerender } = render(
      <DragDropPictureGroupPlayer
        activity={mockActivity}
        bookId="book-1"
        onAnswersChange={onAnswersChange}
        showResults={true}
        correctAnswers={correctAnswers1}
        initialAnswers={initialAnswers1}
      />,
    )

    await waitFor(() => {
      expect(screen.getByAltText("Activity background")).toBeInTheDocument()
    })

    // Check that fruits zone shows correct styling (green)
    const dropZones1 = screen.getAllByRole("button", { name: /Drop zone/i })
    expect(dropZones1[0]).toHaveClass("border-green-500")

    // Now test with "banana" instead - should also be correct
    const correctAnswers2 = new Set(["100-100"]) // banana in fruits zone
    const initialAnswers2 = new Map([["100-100", "banana"]])

    rerender(
      <DragDropPictureGroupPlayer
        activity={mockActivity}
        bookId="book-1"
        onAnswersChange={onAnswersChange}
        showResults={true}
        correctAnswers={correctAnswers2}
        initialAnswers={initialAnswers2}
      />,
    )

    // Should still show correct styling
    const dropZones2 = screen.getAllByRole("button", { name: /Drop zone/i })
    expect(dropZones2[0]).toHaveClass("border-green-500")
  })

  it("shows incorrect styling when word is placed in wrong category", async () => {
    const onAnswersChange = vi.fn()

    // "cat" (animal) placed in fruits zone - should be incorrect
    const correctAnswers = new Set([]) // Empty - cat is not in fruits group
    const initialAnswers = new Map([
      ["100-100", "cat"], // wrong - cat not in fruits
      ["300-100", "dog"], // correct - dog in animals
    ])

    render(
      <DragDropPictureGroupPlayer
        activity={mockActivity}
        bookId="book-1"
        onAnswersChange={onAnswersChange}
        showResults={true}
        correctAnswers={correctAnswers}
        initialAnswers={initialAnswers}
      />,
    )

    await waitFor(() => {
      expect(screen.getByAltText("Activity background")).toBeInTheDocument()
    })

    const dropZones = screen.getAllByRole("button", { name: /Drop zone/i })

    // First zone (fruits) should be incorrect (red) - cat doesn't belong
    expect(dropZones[0]).toHaveClass("border-red-500")

    // Second zone (animals) should be correct (green) - dog belongs
    // This would need the correctAnswers to include "300-100"
  })

  it("allows resetting all placements", async () => {
    const onAnswersChange = vi.fn()

    render(
      <DragDropPictureGroupPlayer
        activity={mockActivity}
        bookId="book-1"
        onAnswersChange={onAnswersChange}
      />,
    )

    await waitFor(() => {
      expect(screen.getByAltText("Activity background")).toBeInTheDocument()
    })

    // Place a word
    const appleWord = screen.getByRole("button", { name: /Word: apple/i })
    fireEvent.click(appleWord)

    const dropZones = screen.getAllByRole("button", { name: /Drop zone/i })
    fireEvent.click(dropZones[0])

    await waitFor(() => {
      expect(screen.getByText("Completed: 1 / 3")).toBeInTheDocument()
    })

    // Click reset button
    const resetButton = screen.getByRole("button", { name: /Reset/i })
    fireEvent.click(resetButton)

    // onAnswersChange should be called with empty Map
    await waitFor(() => {
      const lastCall = onAnswersChange.mock.calls[onAnswersChange.mock.calls.length - 1][0]
      expect(lastCall).toBeInstanceOf(Map)
      expect(lastCall.size).toBe(0)
    })

    // Completion counter should reset
    expect(screen.getByText("Completed: 0 / 3")).toBeInTheDocument()
  })

  it("disables interactions when showResults is true", async () => {
    const onAnswersChange = vi.fn()
    const correctAnswers = new Set(["100-100"])
    const initialAnswers = new Map([["100-100", "apple"]])

    render(
      <DragDropPictureGroupPlayer
        activity={mockActivity}
        bookId="book-1"
        onAnswersChange={onAnswersChange}
        showResults={true}
        correctAnswers={correctAnswers}
        initialAnswers={initialAnswers}
      />,
    )

    await waitFor(() => {
      expect(screen.getByAltText("Activity background")).toBeInTheDocument()
    })

    // Reset button should not be visible in results mode
    expect(screen.queryByRole("button", { name: /Reset/i })).not.toBeInTheDocument()

    // Word buttons should be disabled or not draggable
    const words = screen.getAllByRole("button", { name: /Word:/i })
    words.forEach(word => {
      if (!word.textContent?.includes("apple")) { // apple is used, others are available
        expect(word).toHaveAttribute("tabIndex", "-1")
      }
    })
  })
})
