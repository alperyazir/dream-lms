/**
 * Scoring Library Tests
 * Story 2.5 - Phase 9: Testing & Verification
 */

import { describe, expect, it } from "vitest"
import type { CircleAnswer, DragDropAnswer, MatchSentence } from "./mockData"
import {
  scoreCircle,
  scoreDragDrop,
  scoreMatch,
  scoreWordSearch,
} from "./scoring"

describe("scoreDragDrop", () => {
  const correctAnswers: DragDropAnswer[] = [
    { no: 1, coords: { x: 100, y: 100, w: 80, h: 40 }, text: "apple" },
    { no: 2, coords: { x: 200, y: 100, w: 80, h: 40 }, text: "banana" },
    { no: 3, coords: { x: 300, y: 100, w: 80, h: 40 }, text: "cherry" },
  ]

  it("returns 100% score when all answers correct", () => {
    const userAnswers = new Map([
      ["100-100", "apple"],
      ["200-100", "banana"],
      ["300-100", "cherry"],
    ])

    const result = scoreDragDrop(userAnswers, correctAnswers)

    expect(result.score).toBe(100)
    expect(result.correct).toBe(3)
    expect(result.total).toBe(3)
    expect(result.breakdown?.activity_type).toBe("Drag & Drop")
  })

  it("calculates partial score correctly", () => {
    const userAnswers = new Map([
      ["100-100", "apple"], // correct
      ["200-100", "wrong"], // incorrect
      ["300-100", "cherry"], // correct
    ])

    const result = scoreDragDrop(userAnswers, correctAnswers)

    expect(result.score).toBe(67) // 2/3 = 66.67% rounded to 67
    expect(result.correct).toBe(2)
    expect(result.total).toBe(3)
  })

  it("returns 0% score when all answers wrong", () => {
    const userAnswers = new Map([
      ["100-100", "wrong1"],
      ["200-100", "wrong2"],
      ["300-100", "wrong3"],
    ])

    const result = scoreDragDrop(userAnswers, correctAnswers)

    expect(result.score).toBe(0)
    expect(result.correct).toBe(0)
    expect(result.total).toBe(3)
  })

  it("handles empty user answers", () => {
    const userAnswers = new Map()

    const result = scoreDragDrop(userAnswers, correctAnswers)

    expect(result.score).toBe(0)
    expect(result.correct).toBe(0)
    expect(result.total).toBe(3)
  })
})

describe("scoreMatch", () => {
  const sentences: MatchSentence[] = [
    { sentence: "The capital of France is...", word: "Paris" },
    { sentence: "The largest ocean is...", word: "Pacific" },
    { sentence: "Water boils at...", word: "100°C" },
  ]

  it("returns 100% score when all matches correct", () => {
    const userMatches = new Map([
      ["The capital of France is...", "Paris"],
      ["The largest ocean is...", "Pacific"],
      ["Water boils at...", "100°C"],
    ])

    const result = scoreMatch(userMatches, sentences)

    expect(result.score).toBe(100)
    expect(result.correct).toBe(3)
    expect(result.total).toBe(3)
    expect(result.breakdown?.activity_type).toBe("Match the Words")
  })

  it("calculates partial score correctly", () => {
    const userMatches = new Map([
      ["The capital of France is...", "Paris"], // correct
      ["The largest ocean is...", "Atlantic"], // incorrect
      ["Water boils at...", "100°C"], // correct
    ])

    const result = scoreMatch(userMatches, sentences)

    expect(result.score).toBe(67) // 2/3 = 66.67% rounded to 67
    expect(result.correct).toBe(2)
    expect(result.total).toBe(3)
  })

  it("handles empty user matches", () => {
    const userMatches = new Map()

    const result = scoreMatch(userMatches, sentences)

    expect(result.score).toBe(0)
    expect(result.correct).toBe(0)
    expect(result.total).toBe(3)
  })
})

describe("scoreCircle", () => {
  const answers: CircleAnswer[] = [
    { coords: { x: 100, y: 100, w: 50, h: 50 }, isCorrect: true },
    { coords: { x: 200, y: 100, w: 50, h: 50 }, isCorrect: true },
    { coords: { x: 300, y: 100, w: 50, h: 50 }, isCorrect: false },
    { coords: { x: 400, y: 100, w: 50, h: 50 }, isCorrect: false },
  ]

  it("returns 100% score when all correct selections made with no incorrect", () => {
    const userSelections = new Set(["100-100", "200-100"])

    const result = scoreCircle(userSelections, answers, "circle")

    expect(result.score).toBe(100)
    expect(result.correct).toBe(2)
    expect(result.total).toBe(2) // totalCorrect
    expect(result.breakdown?.activity_type).toBe("Circle")
    expect(result.breakdown?.incorrect_selections).toBe(0)
  })

  it("applies penalty for incorrect selections", () => {
    const userSelections = new Set([
      "100-100", // correct
      "200-100", // correct
      "300-100", // incorrect - penalty
    ])

    const result = scoreCircle(userSelections, answers, "circle")

    // (2 correct - 1 incorrect) / 2 totalCorrect = 1/2 = 50%
    expect(result.score).toBe(50)
    expect(result.correct).toBe(2)
    expect(result.total).toBe(2)
    expect(result.breakdown?.incorrect_selections).toBe(1)
  })

  it("returns 0% when score goes negative (more incorrect than correct)", () => {
    const userSelections = new Set([
      "100-100", // correct
      "300-100", // incorrect
      "400-100", // incorrect
    ])

    const result = scoreCircle(userSelections, answers, "circle")

    // (1 correct - 2 incorrect) / 2 totalCorrect = -1/2 = -50% → clamped to 0
    expect(result.score).toBe(0)
    expect(result.correct).toBe(1)
    expect(result.total).toBe(2)
    expect(result.breakdown?.incorrect_selections).toBe(2)
  })

  it("returns correct activity_type for markwithx", () => {
    const userSelections = new Set(["100-100", "200-100"])

    const result = scoreCircle(userSelections, answers, "markwithx")

    expect(result.breakdown?.activity_type).toBe("Mark with X")
  })

  it("handles empty selections", () => {
    const userSelections = new Set<string>()

    const result = scoreCircle(userSelections, answers, "circle")

    expect(result.score).toBe(0)
    expect(result.correct).toBe(0)
    expect(result.total).toBe(2)
  })
})

describe("scoreWordSearch", () => {
  const totalWords = ["APPLE", "BANANA", "CHERRY", "DATE", "ELDERBERRY"]

  it("returns 100% score when all words found", () => {
    const foundWords = new Set([
      "APPLE",
      "BANANA",
      "CHERRY",
      "DATE",
      "ELDERBERRY",
    ])

    const result = scoreWordSearch(foundWords, totalWords)

    expect(result.score).toBe(100)
    expect(result.correct).toBe(5)
    expect(result.total).toBe(5)
    expect(result.breakdown?.activity_type).toBe("Word Search")
    expect(result.breakdown?.words_found).toBe(
      "APPLE, BANANA, CHERRY, DATE, ELDERBERRY",
    )
  })

  it("calculates partial score correctly", () => {
    const foundWords = new Set(["APPLE", "CHERRY", "ELDERBERRY"])

    const result = scoreWordSearch(foundWords, totalWords)

    expect(result.score).toBe(60) // 3/5 = 60%
    expect(result.correct).toBe(3)
    expect(result.total).toBe(5)
    expect(result.breakdown?.words_found).toBe("APPLE, CHERRY, ELDERBERRY")
  })

  it("returns 0% score when no words found", () => {
    const foundWords = new Set<string>()

    const result = scoreWordSearch(foundWords, totalWords)

    expect(result.score).toBe(0)
    expect(result.correct).toBe(0)
    expect(result.total).toBe(5)
    expect(result.breakdown?.words_found).toBe("")
  })
})
