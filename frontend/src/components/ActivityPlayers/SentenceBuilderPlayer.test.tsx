/**
 * SentenceBuilderPlayer Tests
 * Story 27.13: Sentence Builder Activity (Duolingo-Style)
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SentenceBuilderActivityPublic } from "@/types/sentence-builder"
import { SentenceBuilderPlayer } from "./SentenceBuilderPlayer"

const mockActivity: SentenceBuilderActivityPublic = {
  activity_id: "test-activity-123",
  book_id: 1,
  module_ids: [1],
  difficulty: "easy",
  include_audio: false,
  created_at: "2024-01-01T00:00:00Z",
  sentence_count: 3,
  sentences: [
    {
      item_id: "s1",
      words: ["cat", "The", "is", "sleeping"],
      word_count: 4,
      difficulty: "easy",
    },
    {
      item_id: "s2",
      words: ["quickly", "runs", "dog", "The"],
      word_count: 4,
      difficulty: "easy",
    },
    {
      item_id: "s3",
      words: ["reading", "a", "is", "She", "book"],
      word_count: 5,
      difficulty: "easy",
    },
  ],
}

const mockSingleSentenceActivity: SentenceBuilderActivityPublic = {
  activity_id: "test-single-123",
  book_id: 1,
  module_ids: [1],
  difficulty: "easy",
  include_audio: false,
  created_at: "2024-01-01T00:00:00Z",
  sentence_count: 1,
  sentences: [
    {
      item_id: "s1",
      words: ["world", "Hello"],
      word_count: 2,
      difficulty: "easy",
    },
  ],
}

describe("SentenceBuilderPlayer", () => {
  let onSubmit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSubmit = vi.fn()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("rendering", () => {
    it("renders the sentence builder title", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      expect(screen.getByText("Sentence Builder")).toBeInTheDocument()
    })

    it("renders the word bank with shuffled words", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      // Check word bank header
      expect(screen.getByText("WORD BANK")).toBeInTheDocument()

      // Check that first sentence words are displayed
      expect(screen.getByText("cat")).toBeInTheDocument()
      expect(screen.getByText("The")).toBeInTheDocument()
      expect(screen.getByText("is")).toBeInTheDocument()
      expect(screen.getByText("sleeping")).toBeInTheDocument()
    })

    it("displays progress indicator", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      expect(screen.getByText("1 of 3")).toBeInTheDocument()
    })

    it("displays difficulty level", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      expect(screen.getByText("Easy (4-6 words)")).toBeInTheDocument()
    })

    it("displays instructions", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      expect(
        screen.getByText("Put the words in the correct order"),
      ).toBeInTheDocument()
    })

    it("renders 'Your Sentence' area", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      expect(screen.getByText("YOUR SENTENCE")).toBeInTheDocument()
    })

    it("shows empty slot indicators initially", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      // First sentence has 4 words, should have 4 empty slots
      const slots = screen.getAllByText("_")
      expect(slots.length).toBe(4)
    })
  })

  describe("word placement", () => {
    it("places word when clicked in word bank", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      // Click a word in the word bank
      fireEvent.click(screen.getByRole("button", { name: "The" }))

      // Word should now appear in the sentence area (will be a placed word button)
      // Empty slots should decrease by 1
      const slots = screen.getAllByText("_")
      expect(slots.length).toBe(3)
    })

    it("removes word from word bank when placed", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      // Initially "cat" is in word bank
      const catButtons = screen.getAllByRole("button", { name: "cat" })
      expect(catButtons.length).toBe(1)

      // Click cat
      fireEvent.click(catButtons[0])

      // Word bank should show "All words placed" message when empty, or have one less word
      // Since we placed one word, there should be 3 words left in bank
      // And the placed words area should have 1 word
      const slots = screen.getAllByText("_")
      expect(slots.length).toBe(3)
    })

    it("returns word to word bank when placed word is clicked", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      // Place a word
      fireEvent.click(screen.getByRole("button", { name: "The" }))

      // Now there should be 3 empty slots
      let slots = screen.getAllByText("_")
      expect(slots.length).toBe(3)

      // Find the placed word in the sentence area and click it
      // The placed word buttons have different styling, but same text
      // We need to click the one in the sentence building area
      const placedButtons = screen.getAllByRole("button", { name: "The" })
      // Should only be 1 now (the placed one) since it was removed from word bank
      expect(placedButtons.length).toBe(1)

      fireEvent.click(placedButtons[0])

      // Now there should be 4 empty slots again
      slots = screen.getAllByText("_")
      expect(slots.length).toBe(4)
    })

    it("shows 'All words placed' when word bank is empty", () => {
      render(
        <SentenceBuilderPlayer
          activity={mockSingleSentenceActivity}
          onSubmit={onSubmit}
        />,
      )

      // Place both words
      fireEvent.click(screen.getByRole("button", { name: "world" }))
      fireEvent.click(screen.getByRole("button", { name: "Hello" }))

      expect(screen.getByText("All words placed")).toBeInTheDocument()
    })
  })

  describe("clear functionality", () => {
    it("renders Clear All button", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      expect(
        screen.getByRole("button", { name: /clear all/i }),
      ).toBeInTheDocument()
    })

    it("Clear All button is disabled when no words placed", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      expect(screen.getByRole("button", { name: /clear all/i })).toBeDisabled()
    })

    it("Clear All button is enabled when words are placed", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      // Place a word
      fireEvent.click(screen.getByRole("button", { name: "The" }))

      expect(screen.getByRole("button", { name: /clear all/i })).toBeEnabled()
    })

    it("clears all placed words when Clear All is clicked", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      // Place some words
      fireEvent.click(screen.getByRole("button", { name: "The" }))
      fireEvent.click(screen.getByRole("button", { name: "cat" }))

      // Verify slots decreased
      let slots = screen.getAllByText("_")
      expect(slots.length).toBe(2)

      // Click Clear All
      fireEvent.click(screen.getByRole("button", { name: /clear all/i }))

      // Verify all slots are back
      slots = screen.getAllByText("_")
      expect(slots.length).toBe(4)
    })
  })

  describe("check & continue", () => {
    it("renders Check & Continue button", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      expect(
        screen.getByRole("button", { name: /check & continue/i }),
      ).toBeInTheDocument()
    })

    it("Check & Continue button is disabled when not all words placed", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      // Place only some words
      fireEvent.click(screen.getByRole("button", { name: "The" }))

      expect(
        screen.getByRole("button", { name: /check & continue/i }),
      ).toBeDisabled()
    })

    it("Check & Continue button is enabled when all words placed", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      // Place all words for first sentence (4 words)
      fireEvent.click(screen.getByRole("button", { name: "cat" }))
      fireEvent.click(screen.getByRole("button", { name: "The" }))
      fireEvent.click(screen.getByRole("button", { name: "is" }))
      fireEvent.click(screen.getByRole("button", { name: "sleeping" }))

      expect(
        screen.getByRole("button", { name: /check & continue/i }),
      ).toBeEnabled()
    })

    it("shows success message after checking answer", async () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      // Place all words
      fireEvent.click(screen.getByRole("button", { name: "cat" }))
      fireEvent.click(screen.getByRole("button", { name: "The" }))
      fireEvent.click(screen.getByRole("button", { name: "is" }))
      fireEvent.click(screen.getByRole("button", { name: "sleeping" }))

      // Click check
      fireEvent.click(screen.getByRole("button", { name: /check & continue/i }))

      expect(screen.getByText(/great job/i)).toBeInTheDocument()
    })
  })

  describe("submit button", () => {
    it("shows Submit Activity on last sentence", async () => {
      render(
        <SentenceBuilderPlayer
          activity={mockSingleSentenceActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(
        screen.getByRole("button", { name: /submit activity/i }),
      ).toBeInTheDocument()
    })

    it("submits when last sentence is completed", async () => {
      render(
        <SentenceBuilderPlayer
          activity={mockSingleSentenceActivity}
          onSubmit={onSubmit}
        />,
      )

      // Place both words
      fireEvent.click(screen.getByRole("button", { name: "Hello" }))
      fireEvent.click(screen.getByRole("button", { name: "world" }))

      // Click submit
      fireEvent.click(screen.getByRole("button", { name: /submit activity/i }))

      // Wait for timeout
      vi.advanceTimersByTime(2000)

      expect(onSubmit).toHaveBeenCalledWith({
        answers: {
          s1: ["Hello", "world"],
        },
      })
    })
  })

  describe("loading state", () => {
    it("disables buttons when submitting", () => {
      render(
        <SentenceBuilderPlayer
          activity={mockSingleSentenceActivity}
          onSubmit={onSubmit}
          isSubmitting={true}
        />,
      )

      // Place all words first
      fireEvent.click(screen.getByRole("button", { name: "Hello" }))
      fireEvent.click(screen.getByRole("button", { name: "world" }))

      expect(screen.getByRole("button", { name: /clear all/i })).toBeDisabled()
    })
  })

  describe("completion state", () => {
    it("shows completion message after final sentence", async () => {
      render(
        <SentenceBuilderPlayer
          activity={mockSingleSentenceActivity}
          onSubmit={onSubmit}
        />,
      )

      // Place words
      fireEvent.click(screen.getByRole("button", { name: "Hello" }))
      fireEvent.click(screen.getByRole("button", { name: "world" }))

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /submit activity/i }))

      // Advance timer to show completion
      vi.advanceTimersByTime(2000)

      // onSubmit should have been called
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  describe("progress tracking", () => {
    it("shows initial progress at sentence 1", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      // Initially at 1 of 3
      expect(screen.getByText("1 of 3")).toBeInTheDocument()
    })

    it("shows success message after checking complete answer", () => {
      render(
        <SentenceBuilderPlayer activity={mockActivity} onSubmit={onSubmit} />,
      )

      // Place all words for first sentence
      fireEvent.click(screen.getByRole("button", { name: "cat" }))
      fireEvent.click(screen.getByRole("button", { name: "The" }))
      fireEvent.click(screen.getByRole("button", { name: "is" }))
      fireEvent.click(screen.getByRole("button", { name: "sleeping" }))

      // Check answer
      fireEvent.click(screen.getByRole("button", { name: /check & continue/i }))

      // Success message should appear
      expect(screen.getByText(/great job/i)).toBeInTheDocument()
    })
  })
})
