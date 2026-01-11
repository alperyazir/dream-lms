/**
 * SentenceBuilderResults Tests
 * Story 27.13: Sentence Builder Activity (Duolingo-Style)
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SentenceBuilderResult } from "@/types/sentence-builder"
import { SentenceBuilderResults } from "./SentenceBuilderResults"

const mockResult: SentenceBuilderResult = {
  activity_id: "test-activity-123",
  student_id: "student-1",
  score: 2,
  total: 3,
  percentage: 66.67,
  difficulty: "easy",
  submitted_at: "2024-01-01T00:00:00Z",
  sentence_results: [
    {
      item_id: "s1",
      submitted_words: ["The", "cat", "is", "sleeping"],
      correct_sentence: "The cat is sleeping",
      is_correct: true,
      audio_url: null,
    },
    {
      item_id: "s2",
      submitted_words: ["The", "dog", "runs", "quickly"],
      correct_sentence: "The dog runs quickly",
      is_correct: true,
      audio_url: null,
    },
    {
      item_id: "s3",
      submitted_words: ["She", "reading", "is", "a", "book"],
      correct_sentence: "She is reading a book",
      is_correct: false,
      audio_url: null,
    },
  ],
}

const mockPerfectResult: SentenceBuilderResult = {
  ...mockResult,
  score: 3,
  total: 3,
  percentage: 100,
  sentence_results: mockResult.sentence_results.map((s) => ({
    ...s,
    is_correct: true,
  })),
}

const mockLowResult: SentenceBuilderResult = {
  ...mockResult,
  score: 1,
  total: 3,
  percentage: 33.33,
  sentence_results: mockResult.sentence_results.map((s) => ({
    ...s,
    is_correct: false,
  })),
}

const mockResultWithAudio: SentenceBuilderResult = {
  ...mockResult,
  sentence_results: [
    {
      ...mockResult.sentence_results[0],
      audio_url: "https://example.com/audio1.mp3",
    },
    ...mockResult.sentence_results.slice(1),
  ],
}

describe("SentenceBuilderResults", () => {
  describe("score summary", () => {
    it("displays the score correctly", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      expect(screen.getByText("2/3")).toBeInTheDocument()
    })

    it("displays the percentage correctly", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      expect(screen.getByText("67%")).toBeInTheDocument()
    })

    it("shows completion title", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      expect(screen.getByText("Sentence Builder Complete!")).toBeInTheDocument()
    })

    it("shows difficulty level", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      expect(screen.getByText("Easy (4-6 words)")).toBeInTheDocument()
    })

    it("shows excellent message for high scores", () => {
      render(<SentenceBuilderResults result={mockPerfectResult} />)

      expect(screen.getByText(/excellent work/i)).toBeInTheDocument()
    })

    it("shows good effort message for medium scores", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      expect(screen.getByText(/good effort/i)).toBeInTheDocument()
    })

    it("shows keep studying message for low scores", () => {
      render(<SentenceBuilderResults result={mockLowResult} />)

      expect(screen.getByText(/keep studying/i)).toBeInTheDocument()
    })
  })

  describe("sentence breakdown", () => {
    it("displays Sentence Breakdown header", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      expect(screen.getByText("Sentence Breakdown")).toBeInTheDocument()
    })

    it("displays all sentence results", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      expect(screen.getByText("Sentence #1")).toBeInTheDocument()
      expect(screen.getByText("Sentence #2")).toBeInTheDocument()
      expect(screen.getByText("Sentence #3")).toBeInTheDocument()
    })

    it("shows user answers", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      // Check that submitted words are displayed as joined sentences
      expect(screen.getByText("The cat is sleeping")).toBeInTheDocument()
      expect(screen.getByText("The dog runs quickly")).toBeInTheDocument()
      expect(screen.getByText("She reading is a book")).toBeInTheDocument()
    })

    it("shows correct answer for incorrect sentences", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      // Third sentence was incorrect - should show correct version
      expect(screen.getByText("She is reading a book")).toBeInTheDocument()
    })

    it("does not show correct answer for correct sentences", () => {
      const allCorrect: SentenceBuilderResult = {
        ...mockResult,
        sentence_results: [mockResult.sentence_results[0]], // Only the correct one
      }

      render(<SentenceBuilderResults result={allCorrect} />)

      // "Correct sentence:" label should not appear
      expect(screen.queryByText("Correct sentence:")).not.toBeInTheDocument()
    })
  })

  describe("action buttons", () => {
    it("renders Try Again button when onRetry provided", () => {
      const onRetry = vi.fn()
      render(<SentenceBuilderResults result={mockResult} onRetry={onRetry} />)

      expect(
        screen.getByRole("button", { name: /try again/i }),
      ).toBeInTheDocument()
    })

    it("calls onRetry when Try Again clicked", () => {
      const onRetry = vi.fn()
      render(<SentenceBuilderResults result={mockResult} onRetry={onRetry} />)

      fireEvent.click(screen.getByRole("button", { name: /try again/i }))

      expect(onRetry).toHaveBeenCalled()
    })

    it("renders Back to Generator button when onBack provided", () => {
      const onBack = vi.fn()
      render(<SentenceBuilderResults result={mockResult} onBack={onBack} />)

      expect(
        screen.getByRole("button", { name: /back to generator/i }),
      ).toBeInTheDocument()
    })

    it("calls onBack when Back to Generator clicked", () => {
      const onBack = vi.fn()
      render(<SentenceBuilderResults result={mockResult} onBack={onBack} />)

      fireEvent.click(
        screen.getByRole("button", { name: /back to generator/i }),
      )

      expect(onBack).toHaveBeenCalled()
    })

    it("does not render Try Again button when onRetry not provided", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      expect(
        screen.queryByRole("button", { name: /try again/i }),
      ).not.toBeInTheDocument()
    })

    it("does not render Back button when onBack not provided", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      expect(
        screen.queryByRole("button", { name: /back to generator/i }),
      ).not.toBeInTheDocument()
    })
  })

  describe("audio playback", () => {
    beforeEach(() => {
      // Mock HTMLAudioElement
      window.HTMLAudioElement.prototype.play = vi
        .fn()
        .mockResolvedValue(undefined)
      window.HTMLAudioElement.prototype.pause = vi.fn()
    })

    it("shows Listen button when audio is available", () => {
      render(<SentenceBuilderResults result={mockResultWithAudio} />)

      expect(
        screen.getByRole("button", { name: /play sentence audio/i }),
      ).toBeInTheDocument()
    })

    it("does not show Listen button when no audio", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      expect(
        screen.queryByRole("button", { name: /play sentence audio/i }),
      ).not.toBeInTheDocument()
    })
  })

  describe("visual indicators", () => {
    it("shows check icon for correct sentences", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      // The CheckCircle2 icon should be present for correct sentences
      // We can check by looking at the card styling or the presence of certain classes
      const correctCards = document.querySelectorAll(".border-l-green-500")
      expect(correctCards.length).toBe(2) // Two correct sentences
    })

    it("shows X icon for incorrect sentences", () => {
      render(<SentenceBuilderResults result={mockResult} />)

      const incorrectCards = document.querySelectorAll(".border-l-red-500")
      expect(incorrectCards.length).toBe(1) // One incorrect sentence
    })
  })
})
