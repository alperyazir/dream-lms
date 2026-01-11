/**
 * VocabularyQuizPlayer Tests
 * Story 27.8: Vocabulary Quiz Generation (Definition-Based)
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { VocabularyQuizPublic } from "@/types/vocabulary-quiz"
import { VocabularyQuizPlayer } from "./VocabularyQuizPlayer"

const mockQuiz: VocabularyQuizPublic = {
  quiz_id: "test-quiz-123",
  book_id: 1,
  quiz_length: 3,
  questions: [
    {
      question_id: "q1",
      definition: "to succeed in doing something",
      options: ["accomplish", "achieve", "complete", "finish"],
      audio_url: "https://example.com/audio1.mp3",
      cefr_level: "B1",
    },
    {
      question_id: "q2",
      definition: "to reach a goal or result",
      options: ["attempt", "achieve", "try", "effort"],
      audio_url: "https://example.com/audio2.mp3",
      cefr_level: "B1",
    },
    {
      question_id: "q3",
      definition: "to try hard to do something",
      options: ["accomplish", "achieve", "attempt", "succeed"],
      audio_url: null,
      cefr_level: "A2",
    },
  ],
}

describe("VocabularyQuizPlayer", () => {
  let onSubmit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSubmit = vi.fn()
  })

  describe("rendering", () => {
    it("renders the first question correctly", () => {
      render(<VocabularyQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Progress indicator
      expect(screen.getByText("Question 1 of 3")).toBeInTheDocument()
      expect(screen.getByText("0 of 3 answered")).toBeInTheDocument()

      // CEFR level badge
      expect(screen.getByText("B1")).toBeInTheDocument()

      // Definition
      expect(
        screen.getByText('"to succeed in doing something"'),
      ).toBeInTheDocument()

      // Options (4 buttons)
      expect(
        screen.getByRole("button", { name: /accomplish/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /achieve/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /complete/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /finish/i }),
      ).toBeInTheDocument()

      // Navigation buttons
      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled()
      expect(screen.getByRole("button", { name: /next/i })).toBeEnabled()

      // Submit button should be disabled (no answers yet)
      expect(
        screen.getByRole("button", { name: /submit quiz/i }),
      ).toBeDisabled()
    })

    it("renders audio button when audio_url is provided", () => {
      render(<VocabularyQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // First question has audio
      const audioButton = screen.getByRole("button", {
        name: /listen to pronunciation/i,
      })
      expect(audioButton).toBeInTheDocument()
    })

    it("does not render audio button when audio_url is null", () => {
      // Navigate to question 3 which has no audio
      render(
        <VocabularyQuizPlayer
          quiz={mockQuiz}
          onSubmit={onSubmit}
          initialAnswers={{ q1: "accomplish", q2: "achieve" }}
        />,
      )

      // Click next twice to get to question 3
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /next/i }))

      // Question 3 should not have audio button
      expect(screen.getByText("A2")).toBeInTheDocument() // Confirms we're on Q3
      expect(
        screen.queryByRole("button", { name: /listen to pronunciation/i }),
      ).not.toBeInTheDocument()
    })
  })

  describe("answer selection", () => {
    it("selects an answer when option is clicked", () => {
      render(<VocabularyQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      const accomplishButton = screen.getByRole("button", {
        name: /accomplish/i,
      })
      fireEvent.click(accomplishButton)

      // Answer count should update
      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()
    })

    it("allows changing answer before submission", () => {
      render(<VocabularyQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Select first option
      fireEvent.click(screen.getByRole("button", { name: /accomplish/i }))
      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()

      // Change to different option
      fireEvent.click(screen.getByRole("button", { name: /achieve/i }))

      // Count should still be 1 (changed, not added)
      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()
    })

    it("uses initial answers when provided", () => {
      render(
        <VocabularyQuizPlayer
          quiz={mockQuiz}
          onSubmit={onSubmit}
          initialAnswers={{ q1: "accomplish" }}
        />,
      )

      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()
    })
  })

  describe("navigation", () => {
    it("navigates to next question", () => {
      render(<VocabularyQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      fireEvent.click(screen.getByRole("button", { name: /next/i }))

      expect(screen.getByText("Question 2 of 3")).toBeInTheDocument()
      expect(
        screen.getByText('"to reach a goal or result"'),
      ).toBeInTheDocument()
    })

    it("navigates to previous question", () => {
      render(<VocabularyQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Go to Q2
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      expect(screen.getByText("Question 2 of 3")).toBeInTheDocument()

      // Go back to Q1
      fireEvent.click(screen.getByRole("button", { name: /previous/i }))
      expect(screen.getByText("Question 1 of 3")).toBeInTheDocument()
    })

    it("disables previous button on first question", () => {
      render(<VocabularyQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled()
    })

    it("disables next button on last question", () => {
      render(<VocabularyQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Navigate to last question
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /next/i }))

      expect(screen.getByText("Question 3 of 3")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled()
    })

    it("navigates via question dots", () => {
      render(<VocabularyQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Click on third dot
      const dots = screen.getAllByRole("button", { name: /go to question/i })
      fireEvent.click(dots[2])

      expect(screen.getByText("Question 3 of 3")).toBeInTheDocument()
    })
  })

  describe("submission", () => {
    it("enables submit button when all questions answered", () => {
      render(
        <VocabularyQuizPlayer
          quiz={mockQuiz}
          onSubmit={onSubmit}
          initialAnswers={{ q1: "accomplish", q2: "achieve", q3: "attempt" }}
        />,
      )

      expect(screen.getByRole("button", { name: /submit quiz/i })).toBeEnabled()
    })

    it("shows confirmation dialog on submit click", () => {
      render(
        <VocabularyQuizPlayer
          quiz={mockQuiz}
          onSubmit={onSubmit}
          initialAnswers={{ q1: "accomplish", q2: "achieve", q3: "attempt" }}
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
        <VocabularyQuizPlayer
          quiz={mockQuiz}
          onSubmit={onSubmit}
          initialAnswers={{ q1: "accomplish", q2: "achieve", q3: "attempt" }}
        />,
      )

      // Open dialog
      fireEvent.click(screen.getByRole("button", { name: /submit quiz/i }))

      // Confirm submission
      fireEvent.click(screen.getByRole("button", { name: /^submit$/i }))

      expect(onSubmit).toHaveBeenCalledWith({
        q1: "accomplish",
        q2: "achieve",
        q3: "attempt",
      })
    })

    it("does not submit when dialog is cancelled", () => {
      render(
        <VocabularyQuizPlayer
          quiz={mockQuiz}
          onSubmit={onSubmit}
          initialAnswers={{ q1: "accomplish", q2: "achieve", q3: "attempt" }}
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
        <VocabularyQuizPlayer
          quiz={mockQuiz}
          onSubmit={onSubmit}
          isSubmitting={true}
          initialAnswers={{ q1: "accomplish", q2: "achieve", q3: "attempt" }}
        />,
      )

      expect(screen.getByText(/submitting/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled()
    })
  })

  describe("progress indicator", () => {
    it("updates answer count as answers are selected", () => {
      render(<VocabularyQuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />)

      // Initially 0 answered
      expect(screen.getByText("0 of 3 answered")).toBeInTheDocument()

      // Answer first question
      fireEvent.click(screen.getByRole("button", { name: /accomplish/i }))

      // Should be 1 answered
      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()

      // Navigate and answer second question
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /achieve/i }))

      // Should be 2 answered
      expect(screen.getByText("2 of 3 answered")).toBeInTheDocument()
    })
  })
})
