/**
 * ReadingComprehensionPlayer Tests
 * Story 27.10: Reading Comprehension Generation
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReadingComprehensionActivityPublic } from "@/types/reading-comprehension"
import { ReadingComprehensionPlayer } from "./ReadingComprehensionPlayer"

const mockActivity: ReadingComprehensionActivityPublic = {
  activity_id: "test-activity-123",
  book_id: 1,
  module_id: 1,
  module_title: "Test Module: The Solar System",
  passage:
    "The solar system consists of the Sun and everything that orbits around it. This includes eight planets, their moons, dwarf planets, asteroids, and comets. The four inner planets—Mercury, Venus, Earth, and Mars—are called terrestrial planets because they have rocky surfaces.",
  passage_pages: [10, 11],
  difficulty: "medium",
  language: "en",
  created_at: "2024-01-01T00:00:00Z",
  question_count: 3,
  questions: [
    {
      question_id: "q1",
      question_type: "mcq",
      question_text: "What is at the center of the solar system?",
      options: ["Earth", "The Sun", "Jupiter", "The Moon"],
    },
    {
      question_id: "q2",
      question_type: "true_false",
      question_text: "The four inner planets have rocky surfaces.",
      options: ["True", "False"],
    },
    {
      question_id: "q3",
      question_type: "short_answer",
      question_text: "Name one type of celestial body that orbits the Sun.",
    },
  ],
}

describe("ReadingComprehensionPlayer", () => {
  let onSubmit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSubmit = vi.fn()
  })

  describe("rendering", () => {
    it("displays the module title", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(
        screen.getByText("Test Module: The Solar System"),
      ).toBeInTheDocument()
    })

    it("displays the passage text", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(
        screen.getByText(/the solar system consists of the sun/i),
      ).toBeInTheDocument()
    })

    it("shows passage page numbers", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(screen.getByText(/pages: 10, 11/i)).toBeInTheDocument()
    })

    it("displays question text prominently", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(
        screen.getByText("What is at the center of the solar system?"),
      ).toBeInTheDocument()
    })

    it("shows MCQ options as clickable buttons", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(screen.getByRole("button", { name: /earth/i })).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /the sun/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /jupiter/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /the moon/i }),
      ).toBeInTheDocument()
    })

    it("renders progress indicator correctly", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(screen.getByText("Question 1 of 3")).toBeInTheDocument()
      expect(screen.getByText("0 of 3 answered")).toBeInTheDocument()
    })

    it("shows question type badge", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(screen.getByText("MCQ")).toBeInTheDocument()
    })

    it("shows difficulty badge", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(screen.getByText("Medium")).toBeInTheDocument()
    })

    it("displays navigation buttons", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(
        screen.getByRole("button", { name: /previous/i }),
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
    })

    it("shows submit button", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(
        screen.getByRole("button", { name: /submit activity/i }),
      ).toBeInTheDocument()
    })
  })

  describe("question types", () => {
    it("shows True/False options for true_false questions", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      // Navigate to True/False question
      fireEvent.click(screen.getByRole("button", { name: /next/i }))

      expect(screen.getByRole("button", { name: /true/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /false/i })).toBeInTheDocument()
      expect(screen.getByText("T/F")).toBeInTheDocument()
    })

    it("shows text input for short_answer questions", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      // Navigate to short answer question
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /next/i }))

      expect(
        screen.getByPlaceholderText(/type your answer here/i),
      ).toBeInTheDocument()
      expect(screen.getByText("SA")).toBeInTheDocument()
    })
  })

  describe("answer selection", () => {
    it("highlights selected MCQ option", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      const sunButton = screen.getByRole("button", { name: /the sun/i })
      fireEvent.click(sunButton)

      expect(sunButton).toHaveClass("bg-indigo-600")
    })

    it("tracks answered questions", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      // Initially 0 answered
      expect(screen.getByText("0 of 3 answered")).toBeInTheDocument()

      // Select answer
      fireEvent.click(screen.getByRole("button", { name: /the sun/i }))

      // Should be 1 answered
      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()
    })

    it("allows changing MCQ answer before submission", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      // Select first option
      fireEvent.click(screen.getByRole("button", { name: /earth/i }))
      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()

      // Change to different option
      fireEvent.click(screen.getByRole("button", { name: /the sun/i }))

      // Count should still be 1
      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()
    })

    it("tracks short answer text input", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      // Navigate to short answer question
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /next/i }))

      // Type answer
      const input = screen.getByPlaceholderText(/type your answer here/i)
      fireEvent.change(input, { target: { value: "planets" } })

      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()
    })

    it("removes answer count if short answer is cleared", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      // Navigate to short answer question
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /next/i }))

      // Type and then clear
      const input = screen.getByPlaceholderText(/type your answer here/i)
      fireEvent.change(input, { target: { value: "planets" } })
      expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()

      fireEvent.change(input, { target: { value: "" } })
      expect(screen.getByText("0 of 3 answered")).toBeInTheDocument()
    })
  })

  describe("navigation", () => {
    it("allows navigation between questions", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      // Navigate forward
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      expect(screen.getByText("Question 2 of 3")).toBeInTheDocument()
      expect(
        screen.getByText("The four inner planets have rocky surfaces."),
      ).toBeInTheDocument()

      // Navigate back
      fireEvent.click(screen.getByRole("button", { name: /previous/i }))
      expect(screen.getByText("Question 1 of 3")).toBeInTheDocument()
    })

    it("disables previous button on first question", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled()
    })

    it("disables next button on last question", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      // Navigate to last question
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /next/i }))

      expect(screen.getByText("Question 3 of 3")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled()
    })

    it("navigates via question dots", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      const dots = screen.getAllByRole("button", { name: /go to question/i })
      fireEvent.click(dots[2])

      expect(screen.getByText("Question 3 of 3")).toBeInTheDocument()
    })
  })

  describe("submission", () => {
    it("enables submit only when all answered", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      // Initially disabled
      expect(
        screen.getByRole("button", { name: /submit activity/i }),
      ).toBeDisabled()

      // Answer all questions
      fireEvent.click(screen.getByRole("button", { name: /the sun/i })) // Q1 MCQ
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      fireEvent.click(screen.getByRole("button", { name: /true/i })) // Q2 T/F
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
      const input = screen.getByPlaceholderText(/type your answer here/i)
      fireEvent.change(input, { target: { value: "planets" } }) // Q3 Short

      // Now enabled
      expect(
        screen.getByRole("button", { name: /submit activity/i }),
      ).toBeEnabled()
    })

    it("shows confirmation dialog on submit click", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
          initialAnswers={[
            { question_id: "q1", answer_index: 1, answer_text: null },
            { question_id: "q2", answer_index: 0, answer_text: null },
            { question_id: "q3", answer_index: null, answer_text: "planets" },
          ]}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: /submit activity/i }))

      expect(screen.getByText(/submit activity\?/i)).toBeInTheDocument()
      expect(
        screen.getByText(/you have answered all 3 questions/i),
      ).toBeInTheDocument()
    })

    it("calls onSubmit with answers when confirmed", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
          initialAnswers={[
            { question_id: "q1", answer_index: 1, answer_text: null },
            { question_id: "q2", answer_index: 0, answer_text: null },
            { question_id: "q3", answer_index: null, answer_text: "planets" },
          ]}
        />,
      )

      // Open dialog
      fireEvent.click(screen.getByRole("button", { name: /submit activity/i }))

      // Confirm submission
      fireEvent.click(screen.getByRole("button", { name: /^submit$/i }))

      expect(onSubmit).toHaveBeenCalledWith([
        { question_id: "q1", answer_index: 1, answer_text: null },
        { question_id: "q2", answer_index: 0, answer_text: null },
        { question_id: "q3", answer_index: null, answer_text: "planets" },
      ])
    })

    it("does not submit when dialog is cancelled", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
          initialAnswers={[
            { question_id: "q1", answer_index: 1, answer_text: null },
            { question_id: "q2", answer_index: 0, answer_text: null },
            { question_id: "q3", answer_index: null, answer_text: "planets" },
          ]}
        />,
      )

      // Open dialog
      fireEvent.click(screen.getByRole("button", { name: /submit activity/i }))

      // Cancel
      fireEvent.click(screen.getByRole("button", { name: /review answers/i }))

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("shows loading state when submitting", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
          isSubmitting={true}
          initialAnswers={[
            { question_id: "q1", answer_index: 1, answer_text: null },
            { question_id: "q2", answer_index: 0, answer_text: null },
            { question_id: "q3", answer_index: null, answer_text: "planets" },
          ]}
        />,
      )

      expect(screen.getByText(/submitting/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled()
    })
  })

  describe("feedback during activity", () => {
    it("does NOT show correct/incorrect during activity", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      // Select an answer
      fireEvent.click(screen.getByRole("button", { name: /the sun/i }))

      // Should not show any correct/incorrect indication
      expect(screen.queryByText(/correct/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/incorrect/i)).not.toBeInTheDocument()
    })
  })

  describe("passage toggle on mobile", () => {
    it("has toggle passage button for mobile view", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      // Should have a button to toggle passage visibility
      expect(
        screen.getByRole("button", { name: /hide passage/i }),
      ).toBeInTheDocument()
    })

    it("toggles passage visibility", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      // Initially showing passage
      expect(
        screen.getByRole("button", { name: /hide passage/i }),
      ).toBeInTheDocument()

      // Toggle
      fireEvent.click(screen.getByRole("button", { name: /hide passage/i }))

      // Now should show "Show Passage"
      expect(
        screen.getByRole("button", { name: /show passage/i }),
      ).toBeInTheDocument()
    })
  })

  describe("keyboard hints", () => {
    it("shows keyboard navigation hints", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(
        screen.getByText(/use arrow keys to navigate/i),
      ).toBeInTheDocument()
    })

    it("shows number key hints for MCQ questions", () => {
      render(
        <ReadingComprehensionPlayer
          activity={mockActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(screen.getByText(/1-4 to select answers/i)).toBeInTheDocument()
    })
  })

  describe("difficulty display", () => {
    it("displays easy difficulty correctly", () => {
      const easyActivity: ReadingComprehensionActivityPublic = {
        ...mockActivity,
        difficulty: "easy",
      }
      render(
        <ReadingComprehensionPlayer
          activity={easyActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(screen.getByText("Easy")).toBeInTheDocument()
    })

    it("displays hard difficulty correctly", () => {
      const hardActivity: ReadingComprehensionActivityPublic = {
        ...mockActivity,
        difficulty: "hard",
      }
      render(
        <ReadingComprehensionPlayer
          activity={hardActivity}
          onSubmit={onSubmit}
        />,
      )

      expect(screen.getByText("Hard")).toBeInTheDocument()
    })
  })
})
