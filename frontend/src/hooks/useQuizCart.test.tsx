/**
 * Quiz Cart Hook Tests
 * Story 27.18: Vocabulary Explorer with Audio Player
 */

import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import type { VocabularyWord } from "@/types/vocabulary-explorer"
import { useQuizCart } from "./useQuizCart"

describe("useQuizCart", () => {
  const mockWord1: VocabularyWord = {
    id: "1",
    word: "hello",
    translation: "merhaba",
    definition: "a greeting",
    example_sentence: "Hello, world!",
    cefr_level: "A1",
    part_of_speech: "interjection",
    module_name: "Module 1",
    book_id: 1,
  }

  const mockWord2: VocabularyWord = {
    id: "2",
    word: "goodbye",
    translation: "hoşçakal",
    definition: "a farewell",
    example_sentence: "Goodbye, friend!",
    cefr_level: "A1",
    part_of_speech: "interjection",
    module_name: "Module 1",
    book_id: 1,
  }

  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear()
  })

  it("initializes with empty cart", () => {
    const { result } = renderHook(() => useQuizCart())
    expect(result.current.getCartSize()).toBe(0)
    expect(result.current.getCartWords()).toEqual([])
  })

  it("adds word to cart", () => {
    const { result } = renderHook(() => useQuizCart())

    act(() => {
      result.current.addWord(mockWord1)
    })

    expect(result.current.getCartSize()).toBe(1)
    expect(result.current.hasWord("1")).toBe(true)
    expect(result.current.getCartWords()).toEqual([mockWord1])
  })

  it("adds multiple words to cart", () => {
    const { result } = renderHook(() => useQuizCart())

    act(() => {
      result.current.addWord(mockWord1)
      result.current.addWord(mockWord2)
    })

    expect(result.current.getCartSize()).toBe(2)
    expect(result.current.hasWord("1")).toBe(true)
    expect(result.current.hasWord("2")).toBe(true)
  })

  it("removes word from cart", () => {
    const { result } = renderHook(() => useQuizCart())

    act(() => {
      result.current.addWord(mockWord1)
      result.current.addWord(mockWord2)
    })

    expect(result.current.getCartSize()).toBe(2)

    act(() => {
      result.current.removeWord("1")
    })

    expect(result.current.getCartSize()).toBe(1)
    expect(result.current.hasWord("1")).toBe(false)
    expect(result.current.hasWord("2")).toBe(true)
  })

  it("clears cart", () => {
    const { result } = renderHook(() => useQuizCart())

    act(() => {
      result.current.addWord(mockWord1)
      result.current.addWord(mockWord2)
    })

    expect(result.current.getCartSize()).toBe(2)

    act(() => {
      result.current.clearCart()
    })

    expect(result.current.getCartSize()).toBe(0)
    expect(result.current.getCartWords()).toEqual([])
  })

  it("does not add duplicate words", () => {
    const { result } = renderHook(() => useQuizCart())

    act(() => {
      result.current.addWord(mockWord1)
      result.current.addWord(mockWord1) // Add same word again
    })

    expect(result.current.getCartSize()).toBe(1)
  })

  it("returns false for hasWord when word not in cart", () => {
    const { result } = renderHook(() => useQuizCart())

    expect(result.current.hasWord("999")).toBe(false)
  })

  it("persists cart to session storage", () => {
    const { result } = renderHook(() => useQuizCart())

    act(() => {
      result.current.addWord(mockWord1)
    })

    // Create new hook instance (simulating page reload)
    const { result: result2 } = renderHook(() => useQuizCart())

    // Cart should be persisted
    expect(result2.current.getCartSize()).toBe(1)
    expect(result2.current.hasWord("1")).toBe(true)
  })
})
