/**
 * useContentReview Hook Tests (Story 27.19)
 */

import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { type GeneratedActivity, useContentReview } from "./useContentReview"

const mockActivity: GeneratedActivity = {
  id: "quiz-1",
  activity_type: "ai_quiz",
  questions: [
    {
      question_id: "q1",
      question_text: "Question 1?",
      options: ["A", "B", "C", "D"],
      correct_answer: "A",
      correct_index: 0,
    },
    {
      question_id: "q2",
      question_text: "Question 2?",
      options: ["A", "B", "C", "D"],
      correct_answer: "B",
      correct_index: 1,
    },
  ],
  difficulty: "medium",
  language: "en",
}

describe("useContentReview", () => {
  it("initializes with provided content", () => {
    const { result } = renderHook(() => useContentReview(mockActivity))

    expect(result.current.content).toEqual(mockActivity)
    expect(result.current.isDirty).toBe(false)
    expect(result.current.isRegenerating).toBe(false)
  })

  it("updates question and marks as dirty", () => {
    const { result } = renderHook(() => useContentReview(mockActivity))

    act(() => {
      result.current.updateQuestion(0, { question_text: "Updated Question 1?" })
    })

    expect(result.current.content.questions[0].question_text).toBe(
      "Updated Question 1?",
    )
    expect(result.current.isDirty).toBe(true)
  })

  it("deletes question and marks as dirty", () => {
    const { result } = renderHook(() => useContentReview(mockActivity))

    expect(result.current.content.questions).toHaveLength(2)

    act(() => {
      result.current.deleteQuestion(0)
    })

    expect(result.current.content.questions).toHaveLength(1)
    expect(result.current.content.questions[0].question_id).toBe("q2")
    expect(result.current.isDirty).toBe(true)
  })

  it("resets to original content", () => {
    const { result } = renderHook(() => useContentReview(mockActivity))

    act(() => {
      result.current.updateQuestion(0, { question_text: "Modified" })
    })

    expect(result.current.isDirty).toBe(true)

    act(() => {
      result.current.reset()
    })

    expect(result.current.content.questions[0].question_text).toBe(
      "Question 1?",
    )
    expect(result.current.isDirty).toBe(false)
  })

  it("marks as saved and clears dirty state", () => {
    const { result } = renderHook(() => useContentReview(mockActivity))

    act(() => {
      result.current.updateQuestion(0, { question_text: "Modified" })
    })

    expect(result.current.isDirty).toBe(true)

    act(() => {
      result.current.markAsSaved()
    })

    expect(result.current.isDirty).toBe(false)
    expect(result.current.content.questions[0].question_text).toBe("Modified")
  })
})
