/**
 * Activity Scoring Library
 * Story 2.5 - Phase 7
 * Extracted from ActivityPlayer.tsx per QA feedback
 */

import type {
  DragDropAnswer,
  MatchSentence,
  CircleAnswer,
} from "@/lib/mockData"

export interface ScoreResult {
  score: number // 0-100 percentage
  correct: number
  total: number
  breakdown?: Record<string, unknown>
}

/**
 * Score drag-and-drop activity
 * Formula: (correct / total) × 100
 */
export function scoreDragDrop(
  userAnswers: Map<string, string>,
  correctAnswers: DragDropAnswer[],
): ScoreResult {
  let correct = 0

  correctAnswers.forEach((answer) => {
    const dropZoneId = `${answer.coords.x}-${answer.coords.y}`
    const userAnswer = userAnswers.get(dropZoneId)

    if (userAnswer === answer.text) {
      correct++
    }
  })

  const percentage = Math.round((correct / correctAnswers.length) * 100)

  return {
    score: percentage,
    correct,
    total: correctAnswers.length,
    breakdown: {
      activity_type: "Drag & Drop",
    },
  }
}

/**
 * Score matching activity
 * Formula: (correct / total) × 100
 */
export function scoreMatch(
  userMatches: Map<string, string>,
  sentences: MatchSentence[],
): ScoreResult {
  let correct = 0

  sentences.forEach((sentence) => {
    const userAnswer = userMatches.get(sentence.sentence)
    if (userAnswer === sentence.word) {
      correct++
    }
  })

  const percentage = Math.round((correct / sentences.length) * 100)

  return {
    score: percentage,
    correct,
    total: sentences.length,
    breakdown: {
      activity_type: "Match the Words",
    },
  }
}

/**
 * Score circle/mark-with-x activity
 * Formula: ((correct - incorrect) / totalCorrect) × 100, minimum 0
 * Applies penalty for incorrect selections
 */
export function scoreCircle(
  userSelections: Set<string>,
  answers: CircleAnswer[],
  activityType: "circle" | "markwithx",
): ScoreResult {
  let correct = 0
  let incorrect = 0

  // Count correct and incorrect selections
  answers.forEach((answer) => {
    const coordKey = `${answer.coords.x}-${answer.coords.y}`
    const wasSelected = userSelections.has(coordKey)

    if (wasSelected && answer.isCorrect) {
      correct++
    } else if (wasSelected && !answer.isCorrect) {
      incorrect++
    }
  })

  // Calculate score with penalty for incorrect selections
  const totalCorrect = answers.filter((a) => a.isCorrect).length
  const rawScore = ((correct - incorrect) / totalCorrect) * 100
  const percentage = Math.max(0, Math.round(rawScore))

  return {
    score: percentage,
    correct,
    total: totalCorrect,
    breakdown: {
      activity_type: activityType === "markwithx" ? "Mark with X" : "Circle",
      incorrect_selections: incorrect,
    },
  }
}

/**
 * Score word search activity
 * Formula: (foundWords / totalWords) × 100
 * No penalty for missed words
 */
export function scoreWordSearch(
  foundWords: Set<string>,
  totalWords: string[],
): ScoreResult {
  const correct = foundWords.size
  const total = totalWords.length
  const percentage = Math.round((correct / total) * 100)

  return {
    score: percentage,
    correct,
    total,
    breakdown: {
      activity_type: "Word Search",
      words_found: Array.from(foundWords).join(", "),
    },
  }
}
