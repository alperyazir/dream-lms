/**
 * Scoring Library Tests
 * Story 2.5 - Phase 9: Testing & Verification
 */

import { describe, expect, it } from "vitest"
import type { CircleAnswer, DragDropAnswer, DragDropGroupAnswer, MatchSentence } from "./mockData"
import {
  scoreCircle,
  scoreDragDrop,
  scoreDragDropGroup,
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

describe("scoreDragDropGroup", () => {
  const correctAnswers: DragDropGroupAnswer[] = [
    // Fruits category
    { no: 1, coords: { x: 100, y: 100, w: 120, h: 60 }, group: ["apple", "banana", "orange"] },
    // Animals category
    { no: 2, coords: { x: 300, y: 100, w: 120, h: 60 }, group: ["cat", "dog", "bird"] },
    // Vehicles category
    { no: 3, coords: { x: 500, y: 100, w: 120, h: 60 }, group: ["car", "bus", "train"] },
  ]

  it("returns 100% score when all answers correct with any valid group member", () => {
    const userAnswers = new Map([
      ["100-100", "apple"],  // fruits category - correct
      ["300-100", "dog"],    // animals category - correct
      ["500-100", "bus"],    // vehicles category - correct
    ])

    const result = scoreDragDropGroup(userAnswers, correctAnswers)

    expect(result.score).toBe(100)
    expect(result.correct).toBe(3)
    expect(result.total).toBe(3)
    expect(result.breakdown?.activity_type).toBe("Drag & Drop Group")
  })

  it("accepts different words from the same group as correct", () => {
    // Test with different valid words for each category
    const userAnswers = new Map([
      ["100-100", "banana"], // fruits - also valid (not just apple)
      ["300-100", "bird"],   // animals - also valid (not just cat)
      ["500-100", "train"],  // vehicles - also valid (not just car)
    ])

    const result = scoreDragDropGroup(userAnswers, correctAnswers)

    expect(result.score).toBe(100)
    expect(result.correct).toBe(3)
    expect(result.total).toBe(3)
  })

  it("marks answer incorrect when word is from wrong category", () => {
    const userAnswers = new Map([
      ["100-100", "cat"],    // animal in fruits zone - WRONG
      ["300-100", "dog"],    // animal in animals zone - correct
      ["500-100", "bus"],    // vehicle in vehicles zone - correct
    ])

    const result = scoreDragDropGroup(userAnswers, correctAnswers)

    expect(result.score).toBe(67) // 2/3 = 66.67% rounded to 67
    expect(result.correct).toBe(2)
    expect(result.total).toBe(3)
  })

  it("returns 0% score when all answers are from wrong categories", () => {
    const userAnswers = new Map([
      ["100-100", "cat"],    // animal in fruits zone - wrong
      ["300-100", "apple"],  // fruit in animals zone - wrong
      ["500-100", "dog"],    // animal in vehicles zone - wrong
    ])

    const result = scoreDragDropGroup(userAnswers, correctAnswers)

    expect(result.score).toBe(0)
    expect(result.correct).toBe(0)
    expect(result.total).toBe(3)
  })

  it("handles partial answers correctly", () => {
    const userAnswers = new Map([
      ["100-100", "orange"], // fruits - correct
      // 300-100 not answered
      ["500-100", "car"],    // vehicles - correct
    ])

    const result = scoreDragDropGroup(userAnswers, correctAnswers)

    expect(result.score).toBe(67) // 2/3 = 66.67% rounded to 67
    expect(result.correct).toBe(2)
    expect(result.total).toBe(3)
  })

  it("handles empty user answers", () => {
    const userAnswers = new Map()

    const result = scoreDragDropGroup(userAnswers, correctAnswers)

    expect(result.score).toBe(0)
    expect(result.correct).toBe(0)
    expect(result.total).toBe(3)
  })

  it("handles words not in any group as incorrect", () => {
    const userAnswers = new Map([
      ["100-100", "randomword"], // not in any group - wrong
      ["300-100", "cat"],        // correct
      ["500-100", "bus"],        // correct
    ])

    const result = scoreDragDropGroup(userAnswers, correctAnswers)

    expect(result.score).toBe(67) // 2/3 = 66.67% rounded to 67
    expect(result.correct).toBe(2)
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
  // 9 answers with circleCount=3 creates 3 questions (Story 4.2 example)
  const answersGrouped: CircleAnswer[] = [
    { coords: { x: 100, y: 100, w: 50, h: 50 }, isCorrect: false }, // Q1 opt1
    { coords: { x: 200, y: 100, w: 50, h: 50 }, isCorrect: false }, // Q1 opt2
    { coords: { x: 300, y: 100, w: 50, h: 50 }, isCorrect: true },  // Q1 opt3 ✓
    { coords: { x: 100, y: 200, w: 50, h: 50 }, isCorrect: true },  // Q2 opt1 ✓
    { coords: { x: 200, y: 200, w: 50, h: 50 }, isCorrect: false }, // Q2 opt2
    { coords: { x: 300, y: 200, w: 50, h: 50 }, isCorrect: false }, // Q2 opt3
    { coords: { x: 100, y: 300, w: 50, h: 50 }, isCorrect: false }, // Q3 opt1
    { coords: { x: 200, y: 300, w: 50, h: 50 }, isCorrect: true },  // Q3 opt2 ✓
    { coords: { x: 300, y: 300, w: 50, h: 50 }, isCorrect: false }, // Q3 opt3
  ]

  describe("question grouping mode (circleCount > 0)", () => {
    it("returns 100% score when all questions answered correctly", () => {
      // User selected correct answer in each question group
      const userSelections = new Map<number, number>([
        [0, 2], // Question 0: selected answer 2 (correct)
        [1, 3], // Question 1: selected answer 3 (correct)
        [2, 7], // Question 2: selected answer 7 (correct)
      ])

      const result = scoreCircle(userSelections, answersGrouped, "circle", 3)

      expect(result.score).toBe(100)
      expect(result.correct).toBe(3)
      expect(result.total).toBe(3) // 3 questions
      expect(result.breakdown?.mode).toBe("question-grouping")
      expect(result.breakdown?.circle_count).toBe(3)
      expect(result.breakdown?.incorrect_answers).toBe(0)
    })

    it("scores 1 point per correctly answered question", () => {
      // User got 2 out of 3 questions correct
      const userSelections = new Map<number, number>([
        [0, 2], // Question 0: correct
        [1, 4], // Question 1: WRONG (selected answer 4 instead of 3)
        [2, 7], // Question 2: correct
      ])

      const result = scoreCircle(userSelections, answersGrouped, "circle", 3)

      // 2 correct / 3 total = 66.67% → rounds to 67%
      expect(result.score).toBe(67)
      expect(result.correct).toBe(2)
      expect(result.total).toBe(3)
      expect(result.breakdown?.incorrect_answers).toBe(1)
    })

    it("handles circleCount=0 (defaults to 2 for true/false)", () => {
      const trueFalseAnswers: CircleAnswer[] = [
        { coords: { x: 100, y: 100, w: 50, h: 50 }, isCorrect: true },  // Q1 True ✓
        { coords: { x: 200, y: 100, w: 50, h: 50 }, isCorrect: false }, // Q1 False
        { coords: { x: 100, y: 200, w: 50, h: 50 }, isCorrect: false }, // Q2 True
        { coords: { x: 200, y: 200, w: 50, h: 50 }, isCorrect: true },  // Q2 False ✓
      ]

      const userSelections = new Map<number, number>([
        [0, 0], // Q1: selected True (correct)
        [1, 3], // Q2: selected False (correct)
      ])

      const result = scoreCircle(userSelections, trueFalseAnswers, "circle", 0)

      expect(result.score).toBe(100)
      expect(result.correct).toBe(2)
      expect(result.total).toBe(2) // 2 questions
      expect(result.breakdown?.circle_count).toBe(2) // Defaults to 2
    })

    it("handles undefined circleCount (defaults to 2)", () => {
      const trueFalseAnswers: CircleAnswer[] = [
        { coords: { x: 100, y: 100, w: 50, h: 50 }, isCorrect: true },  // Q1 True ✓
        { coords: { x: 200, y: 100, w: 50, h: 50 }, isCorrect: false }, // Q1 False
        { coords: { x: 100, y: 200, w: 50, h: 50 }, isCorrect: false }, // Q2 True
        { coords: { x: 200, y: 200, w: 50, h: 50 }, isCorrect: true },  // Q2 False ✓
      ]

      const userSelections = new Map<number, number>([
        [0, 0], // Q1: selected True (correct)
        [1, 3], // Q2: selected False (correct)
      ])

      // @ts-expect-error - Testing undefined circleCount edge case
      const result = scoreCircle(userSelections, trueFalseAnswers, "circle", undefined)

      expect(result.score).toBe(100)
      expect(result.correct).toBe(2)
      expect(result.total).toBe(2) // 2 questions
      expect(result.breakdown?.circle_count).toBe(2) // Defaults to 2
    })

    it("handles null circleCount (defaults to 2)", () => {
      const trueFalseAnswers: CircleAnswer[] = [
        { coords: { x: 100, y: 100, w: 50, h: 50 }, isCorrect: true },
        { coords: { x: 200, y: 100, w: 50, h: 50 }, isCorrect: false },
      ]

      const userSelections = new Map<number, number>([[0, 0]])

      // @ts-expect-error - Testing null circleCount edge case
      const result = scoreCircle(userSelections, trueFalseAnswers, "circle", null)

      expect(result.score).toBe(100)
      expect(result.correct).toBe(1)
      expect(result.total).toBe(1)
      expect(result.breakdown?.circle_count).toBe(2)
    })

    it("returns correct activity_type for markwithx", () => {
      const userSelections = new Map<number, number>([[0, 2]])

      const result = scoreCircle(userSelections, answersGrouped, "markwithx", 3)

      expect(result.breakdown?.activity_type).toBe("Mark with X")
    })
  })

  describe("multi-select mode (circleCount === -1)", () => {
    const multiSelectAnswers: CircleAnswer[] = [
      { coords: { x: 100, y: 100, w: 50, h: 50 }, isCorrect: true },
      { coords: { x: 200, y: 100, w: 50, h: 50 }, isCorrect: true },
      { coords: { x: 300, y: 100, w: 50, h: 50 }, isCorrect: false },
      { coords: { x: 400, y: 100, w: 50, h: 50 }, isCorrect: false },
    ]

    it("allows selecting multiple items with penalty for incorrect", () => {
      // User selected both correct items
      const userSelections = new Map<number, number>([
        [0, 0], // Selected answer 0 (correct)
        [1, 1], // Selected answer 1 (correct)
      ])

      const result = scoreCircle(userSelections, multiSelectAnswers, "circle", -1)

      expect(result.score).toBe(100)
      expect(result.correct).toBe(2)
      expect(result.total).toBe(2) // totalCorrect
      expect(result.breakdown?.mode).toBe("multi-select")
    })

    it("applies penalty for incorrect selections in multi-select mode", () => {
      // User selected both correct + 1 incorrect
      const userSelections = new Map<number, number>([
        [0, 0], // correct
        [1, 1], // correct
        [2, 2], // incorrect - penalty
      ])

      const result = scoreCircle(userSelections, multiSelectAnswers, "circle", -1)

      // (2 correct - 1 incorrect) / 2 totalCorrect = 1/2 = 50%
      expect(result.score).toBe(50)
      expect(result.correct).toBe(2)
      expect(result.total).toBe(2)
      expect(result.breakdown?.incorrect_selections).toBe(1)
    })
  })

  it("handles empty selections", () => {
    const userSelections = new Map<number, number>()

    const result = scoreCircle(userSelections, answersGrouped, "circle", 3)

    expect(result.score).toBe(0)
    expect(result.correct).toBe(0)
    expect(result.total).toBe(3) // 3 questions
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
