/**
 * AIQuizPlayer Tests
 * Story 27.9: AI Quiz Generation (MCQ)
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AIQuizPublic } from "@/types/ai-quiz"
import { AIQuizPlayer } from "./AIQuizPlayer"

const mockQuiz: AIQuizPublic = {
  quiz_id: "test-quiz-123",
  book_id: 1,
  module_ids: [1, 2],
  difficulty: "medium",
  language: "en",
  created_at: "2024-01-01T00:00:00Z",
  question_count: 3,
  questions: [
    {
      question_id: "q1",
      question_text: "What is the capital of France?",
      options: ["London", "Paris", "Berlin", "Madrid"],
      source_module_id: 1,
      difficulty: "medium",
    },
    {
      question_id: "q2",
      question_text: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      source_module_id: 1,
      difficulty: "easy",
    },
    {
      question_id: "q3",
      question_text: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      source_module_id: 2,
      difficulty: "easy",
    },
  ],
}

describe("AIQuizPlayer", () => {
  let onSubmit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSubmit = vi.fn()
  })

  describe("rendering", () => {
    it("displays question text prominently", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      expect(
        screen.getByText("What is the capital of France?"),
      ).toBeInTheDocument()
    })

    it("shows 4 options as clickable cards", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      expect(
        screen.getByRole("button", { name: /london/i }),
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /paris/i })).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /berlin/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /madrid/i }),
      ).toBeInTheDocument()
    })

    it("renders progress indicator correctly", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      expect(screen.getByText("Question 1 of 3")).toBeInTheDocument()
      expect(screen.getByText("0 of 3 answered")).toBeInTheDocument()
    })

    it("shows difficulty badge for the current question", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      expect(screen.getByText("Medium")).toBeInTheDocument()
    })

    it("displays navigation buttons", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      expect(
        screen.getByRole("button", { name: /previous/i }),
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
    })

    it("shows submit button", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      expect(
        screen.getByRole("button", { name: /submit quiz/i }),
      ).toBeInTheDocument()
    })

    it("shows keyboard hints", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      expect(
        screen.getByText(/use arrow keys to navigate, 1-4 to select answers/i),
      ).toBeInTheDocument()
    })
  })

  describe("answer selection", () => {
    it("highlights selected option", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      const parisButton = screen.getByRole("button", { name: /paris/i })
      fireEvent.click(parisButton)

      // Check that button has the selected variant (default instead of outline)
      expect(parisButton).toHaveClass("bg-indigo-600")
    })

    it("tracks answered questions", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Initially 0 answered
      expect(screen.getByText("0 of 3 answered")).toBeInTheDocument()

      // Select answer
      fireEvent.click(screen.getByRole("button", { name: /paris/i }))

      // Should be 1 answered
      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()
    })

    it("allows changing answer before submission", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Select first option
      fireEvent.click(screen.getByRole("button", { name: /london/i }))
      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()

      // Change to different option
      fireEvent.click(screen.getByRole("button", { name: /paris/i }))

      // Count should still be 1
      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()
    })

    it("uses initial answers when provided", () => {
      render(
        <AIQuizPlayer
          quiz={mockQuiz}
          onSubmit={onSubmit}
          initialAnswers={{ q1: 1 }}
        />,
      )

      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()
    })
  })

  describe("navigation", () => {
    it("allows navigation between questions", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Navigate forward
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      expect(screen.getByText("Question 2 of 3")).toBeInTheDocument()
      expect(
        screen.getByText("Which planet is known as the Red Planet?"),
      ).toBeInTheDocument()

      // Navigate back
      fireEvent.click(screen.getByRole("button", { name: /previous/i }))
      expect(screen.getByText("Question 1 of 3")).toBeInTheDocument()
    })

    it("disables previous button on first question", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled()
    })

    it("disables next button on last question", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Navigate to last question
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /next/i }))

      expect(screen.getByText("Question 3 of 3")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled()
    })

    it("navigates via question dots", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      const dots = screen.getAllByRole("button", { name: /go to question/i })
      fireEvent.click(dots[2])

      expect(screen.getByText("Question 3 of 3")).toBeInTheDocument()
      expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument()
    })
  })

  describe("submission", () => {
    it("enables submit only when all answered", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Initially disabled
      expect(
        screen.getByRole("button", { name: /submit quiz/i }),
      ).toBeDisabled()

      // Answer all questions
      fireEvent.click(screen.getByRole("button", { name: /paris/i })) // Q1
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /mars/i })) // Q2
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /B.*4/i })) // Q3 (B4)

      // Now enabled
      expect(screen.getByRole("button", { name: /submit quiz/i })).toBeEnabled()
    })

    it("shows confirmation dialog on submit click", () => {
      render(
        <AIQuizPlayer
          quiz={mockQuiz}
          onSubmit={onSubmit}
          initialAnswers={{ q1: 1, q2: 1, q3: 1 }}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: /submit quiz/i }))

      expect(screen.getByText(/submit quiz\?/i)).toBeInTheDocument()
      expect(
        screen.getByText(/you have answered all 3 questions/i),
      ).toBeInTheDocument()
    })

    it("calls onSubmit with answers when confirmed", () => {
      render(
        <AIQuizPlayer
          quiz={mockQuiz}
          onSubmit={onSubmit}
          initialAnswers={{ q1: 1, q2: 1, q3: 1 }}
        />,
      )

      // Open dialog
      fireEvent.click(screen.getByRole("button", { name: /submit quiz/i }))

      // Confirm submission
      fireEvent.click(screen.getByRole("button", { name: /^submit$/i }))

      expect(onSubmit).toHaveBeenCalledWith({
        q1: 1,
        q2: 1,
        q3: 1,
      })
    })

    it("does not submit when dialog is cancelled", () => {
      render(
        <AIQuizPlayer
          quiz={mockQuiz}
          onSubmit={onSubmit}
          initialAnswers={{ q1: 1, q2: 1, q3: 1 }}
        />,
      )

      // Open dialog
      fireEvent.click(screen.getByRole("button", { name: /submit quiz/i }))

      // Cancel
      fireEvent.click(screen.getByRole("button", { name: /review answers/i }))

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("shows loading state when submitting", () => {
      render(
        <AIQuizPlayer
          quiz={mockQuiz}
          onSubmit={onSubmit}
          isSubmitting={true}
          initialAnswers={{ q1: 1, q2: 1, q3: 1 }}
        />,
      )

      expect(screen.getByText(/submitting/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled()
    })
  })

  describe("feedback during quiz", () => {
    it("does NOT show correct/incorrect during quiz", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Select an answer
      fireEvent.click(screen.getByRole("button", { name: /paris/i }))

      // Should not show any correct/incorrect indication
      expect(screen.queryByText(/correct/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/incorrect/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/explanation/i)).not.toBeInTheDocument()
    })
  })

  describe("progress indicator", () => {
    it("updates answer count as answers are selected", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Initially 0 answered
      expect(screen.getByText("0 of 3 answered")).toBeInTheDocument()

      // Answer first question
      fireEvent.click(screen.getByRole("button", { name: /paris/i }))
      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()

      // Navigate and answer second question
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /mars/i }))
      expect(screen.getByText("2 of 3 answered")).toBeInTheDocument()

      // Navigate and answer third question
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /B.*4/i }))
      expect(screen.getByText("3 of 3 answered")).toBeInTheDocument()
    })
  })

  describe("difficulty levels", () => {
    it("displays easy difficulty correctly", () => {
      render(<AIQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Navigate to easy question
      fireEvent.click(screen.getByRole("button", { name: /next/i }))

      expect(screen.getByText("Easy")).toBeInTheDocument()
    })

    it("displays different difficulty badge colors", () => {
      const easyQuiz: AIQuizPublic = {
        ...mockQuiz,
        questions: [
          {
            ...mockQuiz.questions[0],
            difficulty: "easy",
          },
        ],
        question_count: 1,
      }

      render(<AIQuizPlayer quiz={easyQuiz} onSubmit={onSubmit} />)

      const badge = screen.getByText("Easy")
      expect(badge).toHaveClass("bg-green-100")
    })
  })
})
