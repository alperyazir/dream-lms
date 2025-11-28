/**
 * Activity Scoring Library
 * Story 2.5 - Phase 7
 * Extracted from ActivityPlayer.tsx per QA feedback
 */

import type {
  CircleAnswer,
  DragDropAnswer,
  DragDropGroupAnswer,
  MatchSentence,
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
 * Score drag-and-drop group activity (category matching)
 * Each drop zone accepts multiple correct answers from a group
 * Formula: (correct / total) × 100
 * Based on QML DraggableWords.qml line 57: parent.correctAnswerGroup.indexOf(tile.text)
 */
export function scoreDragDropGroup(
  userAnswers: Map<string, string>,
  correctAnswers: DragDropGroupAnswer[],
): ScoreResult {
  let correct = 0

  correctAnswers.forEach((answer) => {
    const dropZoneId = `${answer.coords.x}-${answer.coords.y}`
    const userAnswer = userAnswers.get(dropZoneId)

    // Check if user's answer is in the correct group (category)
    if (userAnswer && answer.group.includes(userAnswer)) {
      correct++
    }
  })

  const percentage = Math.round((correct / correctAnswers.length) * 100)

  return {
    score: percentage,
    correct,
    total: correctAnswers.length,
    breakdown: {
      activity_type: "Drag & Drop Group",
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
 * Score circle/mark-with-x activity with question grouping
 * Story 4.2: New formula based on QML implementation
 * Formula: (correct questions / total questions) × 100
 * Each question group scored independently (1 point if correct answer selected)
 */
export function scoreCircle(
  userSelections: Map<number, number>,
  answers: CircleAnswer[],
  activityType: "circle" | "markwithx",
  circleCount: number,
): ScoreResult {
  // Handle special modes and undefined/null circleCount
  const isMultiSelectMode = circleCount === -1
  // Default to 2 if circleCount is 0, undefined, null, or NaN (but not -1)
  const effectiveCircleCount = (circleCount === 0 || circleCount === undefined || circleCount === null || Number.isNaN(circleCount)) ? 2 : circleCount

  let correct = 0
  let incorrect = 0

  if (isMultiSelectMode) {
    // Multi-select mode: Count correct and incorrect selections (old behavior)
    answers.forEach((answer, answerIndex) => {
      const wasSelected = Array.from(userSelections.values()).includes(answerIndex)
      if (wasSelected && answer.isCorrect) {
        correct++
      } else if (wasSelected && !answer.isCorrect) {
        incorrect++
      }
    })

    const totalCorrect = answers.filter((a) => a.isCorrect).length
    const rawScore = ((correct - incorrect) / totalCorrect) * 100
    const percentage = Math.max(0, Math.round(rawScore))

    return {
      score: percentage,
      correct,
      total: totalCorrect,
      breakdown: {
        activity_type: activityType === "markwithx" ? "Mark with X" : "Circle",
        mode: "multi-select",
        incorrect_selections: incorrect,
      },
    }
  }

  // Question grouping mode: Score 1 point per correctly answered question
  const questionCount = Math.ceil(answers.length / effectiveCircleCount)

  // Safety check: If no answers or questionCount is 0/NaN, return 0 score
  if (!answers.length || !questionCount || Number.isNaN(questionCount)) {
    return {
      score: 0,
      correct: 0,
      total: 0,
      breakdown: {
        activity_type: activityType === "markwithx" ? "Mark with X" : "Circle",
        mode: "question-grouping",
        circle_count: effectiveCircleCount,
        error: "No questions available",
      },
    }
  }

  for (let questionIndex = 0; questionIndex < questionCount; questionIndex++) {
    const selectedAnswerIndex = userSelections.get(questionIndex)

    if (selectedAnswerIndex !== undefined) {
      const selectedAnswer = answers[selectedAnswerIndex]
      if (selectedAnswer && selectedAnswer.isCorrect) {
        correct++
      } else {
        incorrect++
      }
    }
  }

  const percentage = Math.round((correct / questionCount) * 100)

  return {
    score: percentage,
    correct,
    total: questionCount,
    breakdown: {
      activity_type: activityType === "markwithx" ? "Mark with X" : "Circle",
      mode: "question-grouping",
      circle_count: effectiveCircleCount,
      questions_answered: userSelections.size,
      incorrect_answers: incorrect,
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
