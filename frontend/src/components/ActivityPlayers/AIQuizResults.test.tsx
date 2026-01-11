/**
 * AIQuizResults Tests
 * Story 27.9: AI Quiz Generation (MCQ)
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AIQuizResult } from "@/types/ai-quiz"
import { AIQuizResults } from "./AIQuizResults"

const mockPerfectResult: AIQuizResult = {
  quiz_id: "test-quiz-123",
  correct: 3,
  total: 3,
  percentage: 100,
  difficulty: "medium",
  submitted_at: "2024-01-01T12:00:00Z",
  question_results: [
    {
      question_id: "q1",
      question_text: "What is the capital of France?",
      options: ["London", "Paris", "Berlin", "Madrid"],
      correct_index: 1,
      correct_answer: "Paris",
      student_answer_index: 1,
      student_answer: "Paris",
      is_correct: true,
      explanation: "Paris is the capital and largest city of France.",
    },
    {
      question_id: "q2",
      question_text: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correct_index: 1,
      correct_answer: "Mars",
      student_answer_index: 1,
      student_answer: "Mars",
      is_correct: true,
      explanation: "Mars appears red due to iron oxide on its surface.",
    },
    {
      question_id: "q3",
      question_text: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correct_index: 1,
      correct_answer: "4",
      student_answer_index: 1,
      student_answer: "4",
      is_correct: true,
      explanation: "Basic addition: 2 + 2 = 4",
    },
  ],
}

const mockMixedResult: AIQuizResult = {
  quiz_id: "test-quiz-456",
  correct: 1,
  total: 3,
  percentage: 33,
  difficulty: "hard",
  submitted_at: "2024-01-01T12:00:00Z",
  question_results: [
    {
      question_id: "q1",
      question_text: "What is the capital of France?",
      options: ["London", "Paris", "Berlin", "Madrid"],
      correct_index: 1,
      correct_answer: "Paris",
      student_answer_index: 0,
      student_answer: "London",
      is_correct: false,
      explanation: "Paris is the capital and largest city of France.",
    },
    {
      question_id: "q2",
      question_text: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correct_index: 1,
      correct_answer: "Mars",
      student_answer_index: 1,
      student_answer: "Mars",
      is_correct: true,
      explanation: "Mars appears red due to iron oxide on its surface.",
    },
    {
      question_id: "q3",
      question_text: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correct_index: 1,
      correct_answer: "4",
      student_answer_index: 2,
      student_answer: "5",
      is_correct: false,
      explanation: null,
    },
  ],
}

describe("AIQuizResults", () => {
  let onRetry: ReturnType<typeof vi.fn>
  let onBack: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onRetry = vi.fn()
    onBack = vi.fn()
  })

  describe("score display", () => {
    it("displays score summary correctly", () => {
      render(<AIQuizResults result={mockPerfectResult} />)

      expect(screen.getByText("Quiz Complete!")).toBeInTheDocument()
      expect(screen.getByText("3/3")).toBeInTheDocument()
      expect(screen.getByText("100%")).toBeInTheDocument()
    })

    it("shows difficulty level", () => {
      render(<AIQuizResults result={mockPerfectResult} />)

      expect(screen.getByText(/difficulty: medium/i)).toBeInTheDocument()
    })

    it("shows excellent message for high scores", () => {
      render(<AIQuizResults result={mockPerfectResult} />)

      expect(screen.getByText(/excellent work/i)).toBeInTheDocument()
    })

    it("shows encouragement message for low scores", () => {
      render(<AIQuizResults result={mockMixedResult} />)

      expect(screen.getByText(/keep studying/i)).toBeInTheDocument()
    })
  })

  describe("question breakdown", () => {
    it("displays question breakdown section", () => {
      render(<AIQuizResults result={mockMixedResult} />)

      expect(screen.getByText("Question Breakdown")).toBeInTheDocument()
    })

    it("shows question text for each question", () => {
      render(<AIQuizResults result={mockMixedResult} />)

      expect(
        screen.getByText(/what is the capital of france/i),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/which planet is known as the red planet/i),
      ).toBeInTheDocument()
      expect(screen.getByText(/what is 2 \+ 2/i)).toBeInTheDocument()
    })

    it("highlights correct answers in green", () => {
      render(<AIQuizResults result={mockMixedResult} />)

      // The correct answer (Paris) should be highlighted
      const correctAnswerElement = screen.getByText("Paris").closest("div")
      expect(correctAnswerElement).toHaveClass("bg-green-100")
    })

    it("highlights incorrect student answers in red", () => {
      render(<AIQuizResults result={mockMixedResult} />)

      // The incorrect student answer (London) should be highlighted
      const incorrectAnswerElement = screen.getByText("London").closest("div")
      expect(incorrectAnswerElement).toHaveClass("bg-red-100")
    })

    it("shows green border for correct questions", () => {
      render(<AIQuizResults result={mockPerfectResult} />)

      // All questions are correct, cards should have green border
      const cards = document.querySelectorAll(".border-l-green-500")
      expect(cards.length).toBe(3) // All 3 questions correct
    })
  })

  describe("explanations", () => {
    it("shows explanation when available", () => {
      render(<AIQuizResults result={mockMixedResult} />)

      expect(
        screen.getByText(/paris is the capital and largest city of france/i),
      ).toBeInTheDocument()
      expect(screen.getByText(/mars appears red/i)).toBeInTheDocument()
    })

    it("does not show explanation section when explanation is null", () => {
      render(<AIQuizResults result={mockMixedResult} />)

      // Q3 has no explanation, so there shouldn't be an explanation section for it
      // The "Basic addition" explanation from mockPerfectResult should NOT appear
      expect(screen.queryByText(/basic addition/i)).not.toBeInTheDocument()
    })
  })

  describe("action buttons", () => {
    it("shows retry button when onRetry is provided", () => {
      render(<AIQuizResults result={mockPerfectResult} onRetry={onRetry} />)

      expect(
        screen.getByRole("button", { name: /try again/i }),
      ).toBeInTheDocument()
    })

    it("does not show retry button when onRetry is not provided", () => {
      render(<AIQuizResults result={mockPerfectResult} />)

      expect(
        screen.queryByRole("button", { name: /try again/i }),
      ).not.toBeInTheDocument()
    })

    it("calls onRetry when retry button is clicked", () => {
      render(<AIQuizResults result={mockPerfectResult} onRetry={onRetry} />)

      fireEvent.click(screen.getByRole("button", { name: /try again/i }))

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it("shows back button when onBack is provided", () => {
      render(<AIQuizResults result={mockPerfectResult} onBack={onBack} />)

      expect(
        screen.getByRole("button", { name: /back to generator/i }),
      ).toBeInTheDocument()
    })

    it("does not show back button when onBack is not provided", () => {
      render(<AIQuizResults result={mockPerfectResult} />)

      expect(
        screen.queryByRole("button", { name: /back to generator/i }),
      ).not.toBeInTheDocument()
    })

    it("calls onBack when back button is clicked", () => {
      render(<AIQuizResults result={mockPerfectResult} onBack={onBack} />)

      fireEvent.click(
        screen.getByRole("button", { name: /back to generator/i }),
      )

      expect(onBack).toHaveBeenCalledTimes(1)
    })
  })

  describe("score coloring", () => {
    it("uses green color for high scores (80%+)", () => {
      const highScoreResult = { ...mockPerfectResult, percentage: 85 }
      render(<AIQuizResults result={highScoreResult} />)

      const scoreElement = screen.getByText("85%")
      expect(scoreElement).toHaveClass("text-green-600")
    })

    it("uses yellow color for medium scores (60-79%)", () => {
      const mediumScoreResult = {
        ...mockPerfectResult,
        correct: 2,
        percentage: 67,
      }
      render(<AIQuizResults result={mediumScoreResult} />)

      const scoreElement = screen.getByText("67%")
      expect(scoreElement).toHaveClass("text-yellow-600")
    })

    it("uses red color for low scores (<60%)", () => {
      render(<AIQuizResults result={mockMixedResult} />)

      const scoreElement = screen.getByText("33%")
      expect(scoreElement).toHaveClass("text-red-600")
    })
  })

  describe("progress bar", () => {
    it("renders progress bar reflecting score percentage", () => {
      render(<AIQuizResults result={mockPerfectResult} />)

      const progressBar = screen.getByRole("progressbar")
      expect(progressBar).toBeInTheDocument()
      // Progress bar should be present with max value
      expect(progressBar).toHaveAttribute("data-max", "100")
    })
  })

  describe("option display", () => {
    it("shows all options for each question", () => {
      render(<AIQuizResults result={mockMixedResult} />)

      // First question options
      expect(screen.getByText("London")).toBeInTheDocument()
      expect(screen.getByText("Paris")).toBeInTheDocument()
      expect(screen.getByText("Berlin")).toBeInTheDocument()
      expect(screen.getByText("Madrid")).toBeInTheDocument()
    })

    it("shows letter labels for options (A, B, C, D)", () => {
      render(<AIQuizResults result={mockMixedResult} />)

      // Should show A, B, C, D labels
      expect(screen.getAllByText("A").length).toBeGreaterThan(0)
      expect(screen.getAllByText("B").length).toBeGreaterThan(0)
      expect(screen.getAllByText("C").length).toBeGreaterThan(0)
      expect(screen.getAllByText("D").length).toBeGreaterThan(0)
    })
  })
})
