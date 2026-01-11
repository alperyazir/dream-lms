/**
 * QuestionEditor Component Tests (Story 27.19)
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { type QuestionData, QuestionEditor } from "./QuestionEditor"

const mockQuestion: QuestionData = {
  question_id: "q1",
  question_text: "What is the capital of France?",
  options: ["London", "Paris", "Berlin", "Madrid"],
  correct_answer: "Paris",
  correct_index: 1,
  explanation: "Paris is the capital and largest city of France.",
  source_module_id: 1,
  difficulty: "easy",
}

describe("QuestionEditor", () => {
  it("renders question details correctly", () => {
    render(
      <QuestionEditor
        question={mockQuestion}
        questionNumber={1}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    )

    expect(screen.getByText("Question 1")).toBeInTheDocument()
    expect(
      screen.getByText("What is the capital of France?"),
    ).toBeInTheDocument()
    expect(screen.getByText("A) London")).toBeInTheDocument()
    expect(screen.getByText("B) Paris")).toBeInTheDocument()
    expect(screen.getByText(/Paris is the capital/)).toBeInTheDocument()
  })

  it("calls onUpdate when question text is edited", () => {
    const onUpdate = vi.fn()

    render(
      <QuestionEditor
        question={mockQuestion}
        questionNumber={1}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    )

    const questionText = screen.getByText("What is the capital of France?")
    fireEvent.click(questionText)

    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, {
      target: { value: "What is the capital of Germany?" },
    })
    fireEvent.blur(textarea)

    expect(onUpdate).toHaveBeenCalledWith({
      question_text: "What is the capital of Germany?",
    })
  })

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn()

    render(
      <QuestionEditor
        question={mockQuestion}
        questionNumber={1}
        onUpdate={vi.fn()}
        onDelete={onDelete}
        onRegenerate={vi.fn()}
      />,
    )

    const deleteButton = screen.getByLabelText("Delete question")
    fireEvent.click(deleteButton)

    expect(onDelete).toHaveBeenCalled()
  })

  it("calls onRegenerate when regenerate button is clicked", () => {
    const onRegenerate = vi.fn()

    render(
      <QuestionEditor
        question={mockQuestion}
        questionNumber={1}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={onRegenerate}
      />,
    )

    const regenerateButton = screen.getByLabelText("Regenerate question")
    fireEvent.click(regenerateButton)

    expect(onRegenerate).toHaveBeenCalled()
  })

  it("shows correct answer indicator", () => {
    render(
      <QuestionEditor
        question={mockQuestion}
        questionNumber={1}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    )

    expect(screen.getByText("Correct")).toBeInTheDocument()
  })
})
