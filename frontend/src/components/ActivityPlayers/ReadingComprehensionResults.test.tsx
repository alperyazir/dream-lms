/**
 * ReadingComprehensionResults Tests
 * Story 27.10: Reading Comprehension Generation
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReadingComprehensionResult } from "@/types/reading-comprehension"
import { ReadingComprehensionResults } from "./ReadingComprehensionResults"

const mockPerfectResult: ReadingComprehensionResult = {
  activity_id: "test-activity-123",
  book_id: 1,
  module_id: 1,
  module_title: "The Solar System",
  passage:
    "The solar system consists of the Sun and everything that orbits around it.",
  difficulty: "medium",
  language: "en",
  correct: 3,
  total: 3,
  percentage: 100,
  submitted_at: "2024-01-01T12:00:00Z",
  score_by_type: {
    mcq: { correct: 1, total: 1 },
    true_false: { correct: 1, total: 1 },
    short_answer: { correct: 1, total: 1 },
  },
  question_results: [
    {
      question_id: "q1",
      question_type: "mcq",
      question_text: "What is at the center of the solar system?",
      options: ["Earth", "The Sun", "Jupiter", "The Moon"],
      correct_index: 1,
      correct_answer: "The Sun",
      student_answer_index: 1,
      student_answer_text: null,
      is_correct: true,
      passage_reference:
        "The solar system consists of the Sun and everything that orbits around it.",
      explanation: "The Sun is at the center of our solar system.",
      similarity_score: null,
    },
    {
      question_id: "q2",
      question_type: "true_false",
      question_text: "The four inner planets have rocky surfaces.",
      options: ["True", "False"],
      correct_index: 0,
      correct_answer: "True",
      student_answer_index: 0,
      student_answer_text: null,
      is_correct: true,
      passage_reference:
        "The four inner planets are called terrestrial planets because they have rocky surfaces.",
      explanation:
        "Terrestrial means earth-like, referring to their rocky composition.",
      similarity_score: null,
    },
    {
      question_id: "q3",
      question_type: "short_answer",
      question_text: "Name one type of celestial body that orbits the Sun.",
      options: null,
      correct_index: null,
      correct_answer: "planets",
      student_answer_index: null,
      student_answer_text: "planets",
      is_correct: true,
      passage_reference:
        "This includes eight planets, their moons, dwarf planets.",
      explanation: "Planets, moons, asteroids, and comets all orbit the Sun.",
      similarity_score: 1.0,
    },
  ],
}

const mockMixedResult: ReadingComprehensionResult = {
  activity_id: "test-activity-456",
  book_id: 1,
  module_id: 1,
  module_title: "The Solar System",
  passage:
    "The solar system consists of the Sun and everything that orbits around it.",
  difficulty: "hard",
  language: "en",
  correct: 1,
  total: 3,
  percentage: 33,
  submitted_at: "2024-01-01T12:00:00Z",
  score_by_type: {
    mcq: { correct: 0, total: 1 },
    true_false: { correct: 1, total: 1 },
    short_answer: { correct: 0, total: 1 },
  },
  question_results: [
    {
      question_id: "q1",
      question_type: "mcq",
      question_text: "What is at the center of the solar system?",
      options: ["Earth", "The Sun", "Jupiter", "The Moon"],
      correct_index: 1,
      correct_answer: "The Sun",
      student_answer_index: 0,
      student_answer_text: null,
      is_correct: false,
      passage_reference:
        "The solar system consists of the Sun and everything that orbits around it.",
      explanation: "The Sun is at the center of our solar system.",
      similarity_score: null,
    },
    {
      question_id: "q2",
      question_type: "true_false",
      question_text: "The four inner planets have rocky surfaces.",
      options: ["True", "False"],
      correct_index: 0,
      correct_answer: "True",
      student_answer_index: 0,
      student_answer_text: null,
      is_correct: true,
      passage_reference: null,
      explanation: null,
      similarity_score: null,
    },
    {
      question_id: "q3",
      question_type: "short_answer",
      question_text: "Name one type of celestial body that orbits the Sun.",
      options: null,
      correct_index: null,
      correct_answer: "planets",
      student_answer_index: null,
      student_answer_text: "stars",
      is_correct: false,
      passage_reference:
        "This includes eight planets, their moons, dwarf planets.",
      explanation: "Planets, moons, asteroids, and comets all orbit the Sun.",
      similarity_score: 0.4,
    },
  ],
}

describe("ReadingComprehensionResults", () => {
  let onRetry: ReturnType<typeof vi.fn>
  let onBack: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onRetry = vi.fn()
    onBack = vi.fn()
  })

  describe("score display", () => {
    it("displays score summary correctly", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(screen.getByText("Activity Complete!")).toBeInTheDocument()
      expect(screen.getByText("3/3")).toBeInTheDocument()
      expect(screen.getByText("100%")).toBeInTheDocument()
    })

    it("shows module title", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(screen.getByText("The Solar System")).toBeInTheDocument()
    })

    it("shows difficulty level", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(screen.getByText(/difficulty: medium/i)).toBeInTheDocument()
    })

    it("shows excellent message for high scores", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(screen.getByText(/excellent work/i)).toBeInTheDocument()
    })

    it("shows encouragement message for low scores", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      expect(screen.getByText(/keep reading/i)).toBeInTheDocument()
    })
  })

  describe("score by question type", () => {
    it("displays score breakdown by question type", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(screen.getByText("Score by Question Type")).toBeInTheDocument()
    })

    it("shows MCQ score", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(screen.getByText("Multiple Choice")).toBeInTheDocument()
    })

    it("shows True/False score", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(screen.getByText("True/False")).toBeInTheDocument()
    })

    it("shows Short Answer score", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(screen.getByText("Short Answer")).toBeInTheDocument()
    })
  })

  describe("passage display", () => {
    it("displays the original passage section", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(screen.getByText("Original Passage")).toBeInTheDocument()
    })

    it("shows passage content", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      // The passage appears in both the passage section and in question references
      // so we need to use getAllByText to find at least one
      const passageElements = screen.getAllByText((content, element) => {
        return (
          element?.tagName === "P" &&
          content.includes("The solar system consists of the Sun")
        )
      })
      expect(passageElements.length).toBeGreaterThan(0)
    })
  })

  describe("question breakdown", () => {
    it("displays question breakdown section", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      expect(screen.getByText("Question Breakdown")).toBeInTheDocument()
    })

    it("shows question text for each question", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      expect(
        screen.getByText(/what is at the center of the solar system/i),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/the four inner planets have rocky surfaces/i),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/name one type of celestial body/i),
      ).toBeInTheDocument()
    })

    it("shows question type badges", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      expect(screen.getByText("MCQ")).toBeInTheDocument()
      expect(screen.getByText("T/F")).toBeInTheDocument()
      expect(screen.getByText("SA")).toBeInTheDocument()
    })

    it("highlights correct answers in green", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      // The correct answer (The Sun) should be highlighted
      const correctAnswerElement = screen.getByText("The Sun").closest("div")
      expect(correctAnswerElement).toHaveClass("bg-green-100")
    })

    it("highlights incorrect student answers in red", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      // The incorrect student answer (Earth) should be highlighted in MCQ
      const incorrectAnswerElement = screen.getByText("Earth").closest("div")
      expect(incorrectAnswerElement).toHaveClass("bg-red-100")
    })

    it("shows green border for correct questions", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      // All questions are correct, cards should have green border
      const cards = document.querySelectorAll(".border-l-green-500")
      expect(cards.length).toBe(3)
    })

    it("shows red border for incorrect questions", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      // 2 questions are incorrect, cards should have red border
      const cards = document.querySelectorAll(".border-l-red-500")
      expect(cards.length).toBe(2)
    })
  })

  describe("short answer results", () => {
    it("shows student short answer text", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      expect(screen.getByText(/your answer:/i)).toBeInTheDocument()
      expect(screen.getByText(/stars/i)).toBeInTheDocument()
    })

    it("shows similarity score for short answers", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      expect(screen.getByText(/40% match/i)).toBeInTheDocument()
    })

    it("shows correct answer when short answer is wrong", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      expect(screen.getByText(/correct answer:/i)).toBeInTheDocument()
      expect(screen.getByText("planets")).toBeInTheDocument()
    })
  })

  describe("passage references", () => {
    it("shows passage reference when available", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(screen.getAllByText(/passage reference/i).length).toBeGreaterThan(
        0,
      )
    })

    it("displays quoted passage text", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      expect(
        screen.getByText(/this includes eight planets/i),
      ).toBeInTheDocument()
    })
  })

  describe("explanations", () => {
    it("shows explanation when available", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(
        screen.getByText(/the sun is at the center of our solar system/i),
      ).toBeInTheDocument()
    })

    it("does not show explanation section when explanation is null", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      // Q2 has no explanation
      // Check there are only 2 explanation sections (for Q1 and Q3)
      const explanationLabels = screen.getAllByText(/^explanation$/i)
      expect(explanationLabels.length).toBe(2)
    })
  })

  describe("action buttons", () => {
    it("shows retry button when onRetry is provided", () => {
      render(
        <ReadingComprehensionResults
          result={mockPerfectResult}
          onRetry={onRetry}
        />,
      )

      expect(
        screen.getByRole("button", { name: /try again/i }),
      ).toBeInTheDocument()
    })

    it("does not show retry button when onRetry is not provided", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(
        screen.queryByRole("button", { name: /try again/i }),
      ).not.toBeInTheDocument()
    })

    it("calls onRetry when retry button is clicked", () => {
      render(
        <ReadingComprehensionResults
          result={mockPerfectResult}
          onRetry={onRetry}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: /try again/i }))

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it("shows back button when onBack is provided", () => {
      render(
        <ReadingComprehensionResults
          result={mockPerfectResult}
          onBack={onBack}
        />,
      )

      expect(
        screen.getByRole("button", { name: /back to generator/i }),
      ).toBeInTheDocument()
    })

    it("does not show back button when onBack is not provided", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      expect(
        screen.queryByRole("button", { name: /back to generator/i }),
      ).not.toBeInTheDocument()
    })

    it("calls onBack when back button is clicked", () => {
      render(
        <ReadingComprehensionResults
          result={mockPerfectResult}
          onBack={onBack}
        />,
      )

      fireEvent.click(
        screen.getByRole("button", { name: /back to generator/i }),
      )

      expect(onBack).toHaveBeenCalledTimes(1)
    })
  })

  describe("score coloring", () => {
    it("uses green color for high scores (80%+)", () => {
      const highScoreResult = { ...mockPerfectResult, percentage: 85 }
      render(<ReadingComprehensionResults result={highScoreResult} />)

      const scoreElement = screen.getByText("85%")
      expect(scoreElement).toHaveClass("text-green-600")
    })

    it("uses yellow color for medium scores (60-79%)", () => {
      const mediumScoreResult = {
        ...mockPerfectResult,
        correct: 2,
        percentage: 67,
      }
      render(<ReadingComprehensionResults result={mediumScoreResult} />)

      const scoreElement = screen.getByText("67%")
      expect(scoreElement).toHaveClass("text-yellow-600")
    })

    it("uses red color for low scores (<60%)", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      const scoreElement = screen.getByText("33%")
      expect(scoreElement).toHaveClass("text-red-600")
    })
  })

  describe("progress bar", () => {
    it("renders progress bar reflecting score percentage", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      const progressBar = screen.getByRole("progressbar")
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute("data-max", "100")
    })
  })

  describe("MCQ option display", () => {
    it("shows all options for MCQ questions", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      // First question options
      expect(screen.getByText("Earth")).toBeInTheDocument()
      expect(screen.getByText("The Sun")).toBeInTheDocument()
      expect(screen.getByText("Jupiter")).toBeInTheDocument()
      expect(screen.getByText("The Moon")).toBeInTheDocument()
    })

    it("shows letter labels for MCQ options (A, B, C, D)", () => {
      render(<ReadingComprehensionResults result={mockMixedResult} />)

      expect(screen.getAllByText("A").length).toBeGreaterThan(0)
      expect(screen.getAllByText("B").length).toBeGreaterThan(0)
      expect(screen.getAllByText("C").length).toBeGreaterThan(0)
      expect(screen.getAllByText("D").length).toBeGreaterThan(0)
    })
  })

  describe("True/False display", () => {
    it("shows True/False options", () => {
      render(<ReadingComprehensionResults result={mockPerfectResult} />)

      // For true/false question
      expect(screen.getAllByText("True").length).toBeGreaterThan(0)
      expect(screen.getAllByText("False").length).toBeGreaterThan(0)
    })
  })
})
