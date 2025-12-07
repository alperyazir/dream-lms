/**
 * MatchTheWordsPlayer Tests
 * Story 2.5 - Phase 9: Testing & Verification
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { MatchTheWordsActivity } from "@/lib/mockData"
import { MatchTheWordsPlayer } from "./MatchTheWordsPlayer"

const mockActivity: MatchTheWordsActivity = {
  id: "activity-1",
  bookId: "book-1",
  type: "matchTheWords",
  headerText: "Match the definitions with the correct words",
  match_words: [{ word: "Apple" }, { word: "Banana" }, { word: "Cherry" }],
  sentences: [
    { sentence: "A red or green fruit", word: "Apple" },
    { sentence: "A yellow tropical fruit", word: "Banana" },
    { sentence: "A small red stone fruit", word: "Cherry" },
  ],
}

describe("MatchTheWordsPlayer", () => {
  it("renders sentences and words correctly", () => {
    const onAnswersChange = vi.fn()

    render(
      <MatchTheWordsPlayer
        activity={mockActivity}
        bookId="test-book-id"
        onAnswersChange={onAnswersChange}
      />,
    )

    // Check header text is rendered
    expect(
      screen.getByText("Match the definitions with the correct words"),
    ).toBeInTheDocument()

    // Check all sentences are rendered
    expect(screen.getByText("A red or green fruit")).toBeInTheDocument()
    expect(screen.getByText("A yellow tropical fruit")).toBeInTheDocument()
    expect(screen.getByText("A small red stone fruit")).toBeInTheDocument()

    // Check all words are rendered (should appear twice: once in sentence list, once in word list)
    const appleElements = screen.getAllByText("Apple")
    expect(appleElements.length).toBeGreaterThan(0)

    const bananaElements = screen.getAllByText("Banana")
    expect(bananaElements.length).toBeGreaterThan(0)

    const cherryElements = screen.getAllByText("Cherry")
    expect(cherryElements.length).toBeGreaterThan(0)

    // Check completion counter
    expect(screen.getByText("Matched: 0 / 3")).toBeInTheDocument()
  })

  it("validates matches correctly and calls onAnswersChange", () => {
    const onAnswersChange = vi.fn()

    render(
      <MatchTheWordsPlayer
        activity={mockActivity}
        bookId="test-book-id"
        onAnswersChange={onAnswersChange}
      />,
    )

    // Click on first sentence
    const sentence = screen.getByText("A red or green fruit")
    fireEvent.click(sentence)

    // Sentence should show as selected (via classes)
    expect(sentence.parentElement).toHaveClass("border-blue-500")

    // Click on correct word "Apple"
    const wordElements = screen.getAllByText("Apple")
    const wordCard = wordElements.find((el) =>
      el.parentElement?.classList.contains("border-gray-300"),
    )
    if (wordCard) {
      fireEvent.click(wordCard)
    }

    // onAnswersChange should be called
    expect(onAnswersChange).toHaveBeenCalled()

    // Get the matches from the call
    const callArg =
      onAnswersChange.mock.calls[onAnswersChange.mock.calls.length - 1][0]
    expect(callArg).toBeInstanceOf(Map)
    expect(callArg.get("A red or green fruit")).toBe("Apple")

    // Check completion counter updates
    expect(screen.getByText("Matched: 1 / 3")).toBeInTheDocument()

    // Matched sentence should show success styling (teal for matched pairs)
    expect(sentence.parentElement).toHaveClass("border-teal-500")
  })
})
