/**
 * ActivityTypeSelector Component Tests
 * Story 27.17: Question Generator UI - Task 11
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ACTIVITY_TYPES, ActivityTypeSelector } from "./ActivityTypeSelector"

describe("ActivityTypeSelector", () => {
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders all activity types", () => {
    render(<ActivityTypeSelector selectedType={null} onSelect={mockOnSelect} />)

    // Check that all 5 activity types are rendered
    expect(screen.getByText("Vocabulary Quiz")).toBeInTheDocument()
    expect(screen.getByText("Quiz")).toBeInTheDocument()
    expect(screen.getByText("Reading Comprehension")).toBeInTheDocument()
    expect(screen.getByText("Sentence Builder")).toBeInTheDocument()
    expect(screen.getByText("Word Builder")).toBeInTheDocument()
  })

  it("displays activity type descriptions", () => {
    render(<ActivityTypeSelector selectedType={null} onSelect={mockOnSelect} />)

    expect(
      screen.getByText("Definition, synonym, or antonym quiz"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("AI-generated multiple choice questions"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("AI-generated passage with comprehension questions"),
    ).toBeInTheDocument()
  })

  it("calls onSelect with activity type and default options when clicked", () => {
    render(<ActivityTypeSelector selectedType={null} onSelect={mockOnSelect} />)

    const aiQuizButton = screen.getByText("Quiz").closest("button")
    fireEvent.click(aiQuizButton!)

    expect(mockOnSelect).toHaveBeenCalledTimes(1)
    expect(mockOnSelect).toHaveBeenCalledWith("ai_quiz", {
      question_count: 10,
      difficulty: "medium",
      include_explanations: true,
    })
  })

  it("highlights selected activity type", () => {
    render(
      <ActivityTypeSelector
        selectedType="vocabulary_quiz"
        onSelect={mockOnSelect}
      />,
    )

    const vocabQuizButton = screen
      .getByText("Vocabulary Quiz")
      .closest("button")

    // Check that selected type has different styling (border-primary)
    expect(vocabQuizButton).toHaveClass("border-primary")
  })

  it("does not highlight non-selected activity types", () => {
    render(
      <ActivityTypeSelector selectedType="ai_quiz" onSelect={mockOnSelect} />,
    )

    const vocabQuizButton = screen
      .getByText("Vocabulary Quiz")
      .closest("button")

    // Check that non-selected type has default styling
    expect(vocabQuizButton).toHaveClass("border-muted")
    expect(vocabQuizButton).not.toHaveClass("border-primary")
  })

  it("can change selection", () => {
    const { rerender } = render(
      <ActivityTypeSelector selectedType="ai_quiz" onSelect={mockOnSelect} />,
    )

    const sentenceBuilderButton = screen
      .getByText("Sentence Builder")
      .closest("button")
    fireEvent.click(sentenceBuilderButton!)

    expect(mockOnSelect).toHaveBeenCalledWith("sentence_builder", {
      sentence_count: 10,
      difficulty: "medium",
      include_audio: true,
    })

    // Rerender with new selection
    rerender(
      <ActivityTypeSelector
        selectedType="sentence_builder"
        onSelect={mockOnSelect}
      />,
    )

    expect(sentenceBuilderButton).toHaveClass("border-primary")
  })

  it("displays icons for each activity type", () => {
    render(<ActivityTypeSelector selectedType={null} onSelect={mockOnSelect} />)

    // Icons are rendered as SVGs - check that buttons contain SVG icons
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBe(ACTIVITY_TYPES.length)

    // Each button should have an SVG icon
    for (const button of buttons) {
      expect(button.querySelector("svg")).not.toBeNull()
    }
  })
})
