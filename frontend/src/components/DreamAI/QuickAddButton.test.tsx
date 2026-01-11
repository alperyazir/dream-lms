/**
 * Quick Add Button Component Tests
 * Story 27.18: Vocabulary Explorer with Audio Player
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useQuizCart } from "@/hooks/useQuizCart"
import type { VocabularyWord } from "@/types/vocabulary-explorer"
import { QuickAddButton } from "./QuickAddButton"

describe("QuickAddButton", () => {
  const mockWord: VocabularyWord = {
    id: "1",
    word: "hello",
    translation: "merhaba",
    definition: "a greeting",
    example_sentence: "Hello, world!",
    cefr_level: "A1",
    part_of_speech: "interjection",
    module_name: "Module 1",
    book_id: 1,
    has_audio: true,
  }

  beforeEach(() => {
    // Clear cart before each test
    sessionStorage.clear()
    const { clearCart } = useQuizCart.getState()
    clearCart()
  })

  it("renders add button when word not in cart", () => {
    render(<QuickAddButton word={mockWord} />)
    expect(
      screen.getByRole("button", { name: /add hello to quiz/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("Add")).toBeInTheDocument()
  })

  it("adds word to cart when clicked", () => {
    render(<QuickAddButton word={mockWord} />)
    const button = screen.getByRole("button")

    fireEvent.click(button)

    const { hasWord } = useQuizCart.getState()
    expect(hasWord("1")).toBe(true)
  })

  it("shows added state when word is in cart", () => {
    // Add word to cart first
    const { addWord } = useQuizCart.getState()
    addWord(mockWord)

    render(<QuickAddButton word={mockWord} />)

    expect(screen.getByText("Added")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /remove hello from quiz/i }),
    ).toBeInTheDocument()
  })

  it("removes word from cart when clicked in added state", () => {
    // Add word to cart first
    const { addWord } = useQuizCart.getState()
    addWord(mockWord)

    render(<QuickAddButton word={mockWord} />)
    const button = screen.getByRole("button")

    fireEvent.click(button)

    const { hasWord } = useQuizCart.getState()
    expect(hasWord("1")).toBe(false)
  })

  it("toggles between add and remove states", () => {
    const { rerender } = render(<QuickAddButton word={mockWord} />)

    // Initially not added
    expect(screen.getByText("Add")).toBeInTheDocument()

    // Click to add
    fireEvent.click(screen.getByRole("button"))
    rerender(<QuickAddButton word={mockWord} />)

    // Should show added state
    expect(screen.getByText("Added")).toBeInTheDocument()

    // Click to remove
    fireEvent.click(screen.getByRole("button"))
    rerender(<QuickAddButton word={mockWord} />)

    // Should show add state again
    expect(screen.getByText("Add")).toBeInTheDocument()
  })

  it("applies emerald styling when added", () => {
    const { addWord } = useQuizCart.getState()
    addWord(mockWord)

    render(<QuickAddButton word={mockWord} />)
    const button = screen.getByRole("button")

    expect(button).toHaveClass("bg-emerald-600")
  })
})
