/**
 * useGenerationState Hook Tests
 * Story 27.17: Question Generator UI - Task 11
 */

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useGenerationState } from "./useGenerationState"

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
})

describe("useGenerationState", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("initializes with default state", () => {
    const { result } = renderHook(() => useGenerationState())

    expect(result.current.formState).toEqual({
      sourceType: "book",
      bookId: null,
      moduleIds: [],
      materialId: null,
      activityType: null,
      options: {},
      language: null,
    })

    expect(result.current.generationState).toEqual({
      isLoading: false,
      error: null,
      result: null,
    })

    expect(result.current.isFormValid).toBe(false)
  })

  it("updates source type and resets related fields", () => {
    const { result } = renderHook(() => useGenerationState())

    act(() => {
      result.current.setBookId(1)
      result.current.setModuleIds([1, 2])
    })

    expect(result.current.formState.bookId).toBe(1)
    expect(result.current.formState.moduleIds).toEqual([1, 2])

    act(() => {
      result.current.setSourceType("material")
    })

    expect(result.current.formState.sourceType).toBe("material")
    expect(result.current.formState.bookId).toBe(null)
    expect(result.current.formState.moduleIds).toEqual([])
  })

  it("updates book selection and resets modules", () => {
    const { result } = renderHook(() => useGenerationState())

    act(() => {
      result.current.setBookId(1)
      result.current.setModuleIds([1, 2, 3])
    })

    expect(result.current.formState.bookId).toBe(1)
    expect(result.current.formState.moduleIds).toEqual([1, 2, 3])

    act(() => {
      result.current.setBookId(2)
    })

    expect(result.current.formState.bookId).toBe(2)
    expect(result.current.formState.moduleIds).toEqual([])
  })

  it("updates activity type and resets options", () => {
    const { result } = renderHook(() => useGenerationState())

    act(() => {
      result.current.setActivityType("ai_quiz")
      result.current.setOptions({ question_count: 10 })
    })

    expect(result.current.formState.activityType).toBe("ai_quiz")
    expect(result.current.formState.options).toEqual({ question_count: 10 })

    act(() => {
      result.current.setActivityType("vocabulary_quiz")
    })

    expect(result.current.formState.activityType).toBe("vocabulary_quiz")
    expect(result.current.formState.options).toEqual({})
  })

  it("updates individual options", () => {
    const { result } = renderHook(() => useGenerationState())

    act(() => {
      result.current.setOption("difficulty", "hard")
      result.current.setOption("question_count", 15)
    })

    expect(result.current.formState.options).toEqual({
      difficulty: "hard",
      question_count: 15,
    })
  })

  it("validates form correctly for book source", () => {
    const { result } = renderHook(() => useGenerationState())

    expect(result.current.isFormValid).toBe(false)

    act(() => {
      result.current.setActivityType("ai_quiz")
    })

    expect(result.current.isFormValid).toBe(false)

    act(() => {
      result.current.setBookId(1)
    })

    expect(result.current.isFormValid).toBe(false)

    act(() => {
      result.current.setModuleIds([1, 2])
    })

    expect(result.current.isFormValid).toBe(true)
  })

  it("validates form correctly for material source", () => {
    const { result } = renderHook(() => useGenerationState())

    act(() => {
      result.current.setSourceType("material")
      result.current.setActivityType("reading_comprehension")
    })

    expect(result.current.isFormValid).toBe(false)

    act(() => {
      result.current.setMaterialId("material-123")
    })

    expect(result.current.isFormValid).toBe(true)
  })

  it("manages generation state correctly", () => {
    const { result } = renderHook(() => useGenerationState())

    act(() => {
      result.current.startGeneration()
    })

    expect(result.current.generationState.isLoading).toBe(true)
    expect(result.current.generationState.error).toBe(null)
    expect(result.current.generationState.result).toBe(null)

    const mockResult = { questions: [{ question: "Test?" }] }

    act(() => {
      result.current.setGenerationResult(mockResult as any)
    })

    expect(result.current.generationState.isLoading).toBe(false)
    expect(result.current.generationState.error).toBe(null)
    expect(result.current.generationState.result).toEqual(mockResult)
  })

  it("handles generation errors", () => {
    const { result } = renderHook(() => useGenerationState())

    act(() => {
      result.current.startGeneration()
    })

    act(() => {
      result.current.setGenerationError("API Error")
    })

    expect(result.current.generationState.isLoading).toBe(false)
    expect(result.current.generationState.error).toBe("API Error")
    expect(result.current.generationState.result).toBe(null)
  })

  it("clears generation state", () => {
    const { result } = renderHook(() => useGenerationState())

    act(() => {
      result.current.startGeneration()
      result.current.setGenerationResult({ test: true } as any)
    })

    expect(result.current.generationState.result).not.toBe(null)

    act(() => {
      result.current.clearGeneration()
    })

    expect(result.current.generationState).toEqual({
      isLoading: false,
      error: null,
      result: null,
    })
  })

  it("resets entire form", () => {
    const { result } = renderHook(() => useGenerationState())

    act(() => {
      result.current.setBookId(1)
      result.current.setModuleIds([1, 2])
      result.current.setActivityType("ai_quiz")
      result.current.setLanguage("en")
      result.current.startGeneration()
    })

    act(() => {
      result.current.resetForm()
    })

    expect(result.current.formState).toEqual({
      sourceType: "book",
      bookId: null,
      moduleIds: [],
      materialId: null,
      activityType: null,
      options: {},
      language: null,
    })

    expect(result.current.generationState).toEqual({
      isLoading: false,
      error: null,
      result: null,
    })
  })

  it("persists form state to localStorage", () => {
    const { result } = renderHook(() => useGenerationState())

    act(() => {
      result.current.setActivityType("vocabulary_quiz")
      result.current.setBookId(5)
    })

    const saved = JSON.parse(
      localStorage.getItem("dreamai-generator-form-state") || "{}",
    )

    expect(saved.activityType).toBe("vocabulary_quiz")
    expect(saved.bookId).toBe(5)
  })

  it("restores form state from localStorage", () => {
    const savedState = {
      sourceType: "material",
      materialId: "mat-456",
      activityType: "sentence_builder",
      options: { sentence_count: 7 },
      bookId: null,
      moduleIds: [],
      language: "es",
    }

    localStorage.setItem(
      "dreamai-generator-form-state",
      JSON.stringify(savedState),
    )

    const { result } = renderHook(() => useGenerationState())

    expect(result.current.formState.sourceType).toBe("material")
    expect(result.current.formState.materialId).toBe("mat-456")
    expect(result.current.formState.activityType).toBe("sentence_builder")
    expect(result.current.formState.options).toEqual({ sentence_count: 7 })
    expect(result.current.formState.language).toBe("es")
  })
})
