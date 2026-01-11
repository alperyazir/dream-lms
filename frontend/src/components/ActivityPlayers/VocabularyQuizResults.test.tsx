/**
 * VocabularyQuizResults Tests
 * Story 27.8: Vocabulary Quiz Generation (Definition-Based)
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { VocabularyQuizResult } from "@/types/vocabulary-quiz"
import { VocabularyQuizResults } from "./VocabularyQuizResults"

const mockResultPerfect: VocabularyQuizResult = {
  quiz_id: "test-quiz-123",
  student_id: "student-1",
  score: 3,
  total: 3,
  percentage: 100,
  submitted_at: "2025-01-02T10:00:00Z",
  results: [
    {
      question_id: "q1",
      definition: "to succeed in doing something",
      correct_answer: "accomplish",
      user_answer: "accomplish",
      is_correct: true,
      audio_url: "https://example.com/audio1.mp3",
    },
    {
      question_id: "q2",
      definition: "to reach a goal or result",
      correct_answer: "achieve",
      user_answer: "achieve",
      is_correct: true,
      audio_url: "https://example.com/audio2.mp3",
    },
    {
      question_id: "q3",
      definition: "to try hard to do something",
      correct_answer: "attempt",
      user_answer: "attempt",
      is_correct: true,
      audio_url: null,
    },
  ],
}

const mockResultPartial: VocabularyQuizResult = {
  quiz_id: "test-quiz-456",
  student_id: "student-1",
  score: 1,
  total: 3,
  percentage: 33,
  submitted_at: "2025-01-02T10:00:00Z",
  results: [
    {
      question_id: "q1",
      definition: "to succeed in doing something",
      correct_answer: "accomplish",
      user_answer: "accomplish",
      is_correct: true,
      audio_url: "https://example.com/audio1.mp3",
    },
    {
      question_id: "q2",
      definition: "to reach a goal or result",
      correct_answer: "achieve",
      user_answer: "attempt",
      is_correct: false,
      audio_url: "https://example.com/audio2.mp3",
    },
    {
      question_id: "q3",
      definition: "to try hard to do something",
      correct_answer: "attempt",
      user_answer: "achieve",
      is_correct: false,
      audio_url: null,
    },
  ],
}

describe("VocabularyQuizResults", () => {
  describe("score display", () => {
    it("displays perfect score correctly", () => {
      render(<VocabularyQuizResults result={mockResultPerfect} />)

      expect(screen.getByText("3/3")).toBeInTheDocument()
      expect(screen.getByText("100%")).toBeInTheDocument()
      expect(
        screen.getByText("Excellent work! You've mastered this vocabulary."),
      ).toBeInTheDocument()
    })

    it("displays partial score correctly", () => {
      render(<VocabularyQuizResults result={mockResultPartial} />)

      expect(screen.getByText("1/3")).toBeInTheDocument()
      expect(screen.getByText("33%")).toBeInTheDocument()
      expect(
        screen.getByText("Keep studying! Practice makes perfect."),
      ).toBeInTheDocument()
    })

    it("displays medium score with appropriate message", () => {
      const mediumResult: VocabularyQuizResult = {
        ...mockResultPartial,
        score: 2,
        percentage: 67,
        results: mockResultPartial.results.map((r, i) => ({
          ...r,
          is_correct: i < 2,
          user_answer: i < 2 ? r.correct_answer : "wrong",
        })),
      }

      render(<VocabularyQuizResults result={mediumResult} />)

      expect(screen.getByText("2/3")).toBeInTheDocument()
      expect(screen.getByText("67%")).toBeInTheDocument()
      expect(
        screen.getByText("Good effort! Keep practicing to improve."),
      ).toBeInTheDocument()
    })
  })

  describe("question breakdown", () => {
    it("displays all question results", () => {
      render(<VocabularyQuizResults result={mockResultPartial} />)

      expect(screen.getByText("Question Breakdown")).toBeInTheDocument()

      // All definitions should be shown
      expect(
        screen.getByText(/to succeed in doing something/i),
      ).toBeInTheDocument()
      expect(screen.getByText(/to reach a goal or result/i)).toBeInTheDocument()
      expect(
        screen.getByText(/to try hard to do something/i),
      ).toBeInTheDocument()
    })

    it("shows correct indicator for correct answers", () => {
      render(<VocabularyQuizResults result={mockResultPerfect} />)

      // All should show check icons (3 correct)
      const checkIcons = document.querySelectorAll('[class*="text-green"]')
      expect(checkIcons.length).toBeGreaterThan(0)
    })

    it("shows incorrect indicator for wrong answers", () => {
      render(<VocabularyQuizResults result={mockResultPartial} />)

      // Should show X icons for incorrect answers
      const xIcons = document.querySelectorAll('[class*="text-red"]')
      expect(xIcons.length).toBeGreaterThan(0)
    })

    it("displays user answer for each question", () => {
      render(<VocabularyQuizResults result={mockResultPartial} />)

      // Check user answers are displayed (using getAllByText since some may appear multiple times)
      expect(screen.getByText("accomplish")).toBeInTheDocument()
      // "attempt" appears twice: as user answer for Q2 and as correct answer for Q3
      const attemptElements = screen.getAllByText("attempt")
      expect(attemptElements.length).toBeGreaterThanOrEqual(1)
    })

    it("displays correct answer for incorrect questions", () => {
      render(<VocabularyQuizResults result={mockResultPartial} />)

      // For incorrect answers, correct answer should be shown
      // Q2: user answered "attempt", correct is "achieve"
      const correctLabels = screen.getAllByText("Correct:")
      expect(correctLabels.length).toBe(2) // 2 incorrect answers
    })
  })

  describe("audio playback", () => {
    it("renders audio buttons for questions with audio", () => {
      render(<VocabularyQuizResults result={mockResultPerfect} />)

      // Q1 and Q2 have audio, Q3 doesn't
      const audioButtons = screen.getAllByRole("button", {
        name: /listen to pronunciation/i,
      })
      expect(audioButtons).toHaveLength(2)
    })
  })

  describe("action buttons", () => {
    it("renders Try Again button when onRetry is provided", () => {
      const onRetry = vi.fn()

      render(
        <VocabularyQuizResults result={mockResultPartial} onRetry={onRetry} />,
      )

      const retryButton = screen.getByRole("button", { name: /try again/i })
      expect(retryButton).toBeInTheDocument()

      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalled()
    })

    it("does not render Try Again button when onRetry is not provided", () => {
      render(<VocabularyQuizResults result={mockResultPartial} />)

      expect(
        screen.queryByRole("button", { name: /try again/i }),
      ).not.toBeInTheDocument()
    })

    it("renders Back to Generator button when onBack is provided", () => {
      const onBack = vi.fn()

      render(
        <VocabularyQuizResults result={mockResultPartial} onBack={onBack} />,
      )

      const backButton = screen.getByRole("button", {
        name: /back to generator/i,
      })
      expect(backButton).toBeInTheDocument()

      fireEvent.click(backButton)
      expect(onBack).toHaveBeenCalled()
    })

    it("does not render Back to Generator button when onBack is not provided", () => {
      render(<VocabularyQuizResults result={mockResultPartial} />)

      expect(
        screen.queryByRole("button", { name: /back to generator/i }),
      ).not.toBeInTheDocument()
    })
  })
})
