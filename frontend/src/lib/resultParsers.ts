/**
 * Result Parsers for Assignment Result Review
 * Task 5: Detailed Answer Review for All Activity Types
 *
 * Transforms config_json and answers_json from the API response
 * into the format expected by each activity result component.
 */

import type { AIQuizQuestionResult, AIQuizResult } from "@/types/ai-quiz"
import type {
  ReadingComprehensionQuestionResult,
  ReadingComprehensionResult,
} from "@/types/reading-comprehension"
import type {
  SentenceBuilderResult,
  SentenceResult,
} from "@/types/sentence-builder"
import type {
  QuestionResult,
  VocabularyQuizResult,
} from "@/types/vocabulary-quiz"
import type { WordBuilderResult, WordResult } from "@/types/word-builder"

/**
 * Parse AI Quiz result from config and answers
 */
export function parseAIQuizResult(
  config: Record<string, unknown>,
  answers: Record<string, unknown>,
  score: number,
): AIQuizResult | null {
  try {
    // Config structure: { content: { questions: [...], quiz_id, difficulty, ... } }
    // or direct: { questions: [...], quiz_id, ... }
    const content = (config.content as Record<string, unknown>) || config
    const questions = content.questions as Array<{
      question_id: string
      question_text: string
      options: string[]
      correct_answer: string
      correct_index: number
      explanation: string | null
      source_module_id?: number
    }>

    if (!questions || !Array.isArray(questions)) {
      console.error("[parseAIQuizResult] No questions found in config")
      return null
    }

    // Helper to convert string/number values to numbers
    const toNumber = (val: unknown): number | null => {
      if (typeof val === "number") return val
      if (typeof val === "string") {
        const num = parseInt(val, 10)
        return Number.isNaN(num) ? null : num
      }
      return null
    }

    // Helper to extract answers from nested structure (handles both number and string indices)
    const extractAnswers = (
      obj: Record<string, unknown>,
    ): Record<string, number> | null => {
      // Check for nested answers object
      if (obj.answers && typeof obj.answers === "object") {
        const inner = obj.answers as Record<string, unknown>
        if (inner.answers && typeof inner.answers === "object") {
          return convertToNumbers(inner.answers as Record<string, unknown>)
        }
        const keys = Object.keys(inner)
        if (
          keys.length > 0 &&
          !["score", "status", "answers"].includes(keys[0])
        ) {
          return convertToNumbers(inner)
        }
      }
      const keys = Object.keys(obj)
      if (
        keys.length > 0 &&
        !["score", "status", "answers", "0", "1", "2"].includes(keys[0])
      ) {
        return convertToNumbers(obj)
      }
      return null
    }

    // Helper to convert object values to numbers
    const convertToNumbers = (
      obj: Record<string, unknown>,
    ): Record<string, number> => {
      const result: Record<string, number> = {}
      for (const [key, value] of Object.entries(obj)) {
        const num = toNumber(value)
        if (num !== null) {
          result[key] = num
        }
      }
      return result
    }

    let answerMap: Record<string, number> = {}

    console.log(
      "[parseAIQuizResult] Raw answers:",
      JSON.stringify(answers, null, 2),
    )

    const firstKey = Object.keys(answers)[0]
    if (
      firstKey &&
      typeof answers[firstKey] === "object" &&
      answers[firstKey] !== null
    ) {
      const activityEntry = answers[firstKey] as Record<string, unknown>
      console.log(
        "[parseAIQuizResult] Activity entry keys:",
        Object.keys(activityEntry),
      )

      if (activityEntry.answers && typeof activityEntry.answers === "object") {
        const outerAnswers = activityEntry.answers as Record<string, unknown>
        console.log(
          "[parseAIQuizResult] Outer answers keys:",
          Object.keys(outerAnswers),
        )

        const extracted = extractAnswers(outerAnswers)
        if (extracted && Object.keys(extracted).length > 0) {
          answerMap = extracted
        } else {
          // Direct conversion of outerAnswers values
          answerMap = convertToNumbers(outerAnswers)
        }
      }

      if (Object.keys(answerMap).length === 0) {
        const extracted = extractAnswers(activityEntry)
        if (extracted) answerMap = extracted
      }
    } else {
      const extracted = extractAnswers(answers)
      if (extracted) answerMap = extracted
    }

    console.log(
      "[parseAIQuizResult] Final answerMap:",
      JSON.stringify(answerMap),
    )

    if (Object.keys(answerMap).length === 0) {
      console.warn("[parseAIQuizResult] WARNING: No answers extracted!")
    }

    const questionResults: AIQuizQuestionResult[] = questions.map((q) => {
      const studentAnswerIndex = answerMap[q.question_id] ?? null
      const isCorrect = studentAnswerIndex === q.correct_index

      return {
        question_id: q.question_id,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        correct_index: q.correct_index,
        student_answer_index: studentAnswerIndex,
        student_answer:
          studentAnswerIndex !== null ? q.options[studentAnswerIndex] : null,
        is_correct: isCorrect,
        explanation: q.explanation,
        source_module_id: q.source_module_id || 0,
      }
    })

    const correctCount = questionResults.filter((r) => r.is_correct).length
    const total = questionResults.length

    return {
      quiz_id: (content.quiz_id as string) || "result",
      student_id: "",
      score: correctCount,
      total,
      percentage: Math.round(score),
      question_results: questionResults,
      submitted_at: new Date().toISOString(),
      difficulty: (content.difficulty as string) || "medium",
    }
  } catch (e) {
    console.error("Failed to parse AI Quiz result:", e)
    return null
  }
}

/**
 * Parse Vocabulary Quiz result from config and answers
 */
export function parseVocabularyQuizResult(
  config: Record<string, unknown>,
  answers: Record<string, unknown>,
  score: number,
): VocabularyQuizResult | null {
  try {
    // Config structure: { content: { questions: [...], quiz_id, ... } }
    const content = (config.content as Record<string, unknown>) || config
    const questions = content.questions as Array<{
      question_id: string
      definition: string
      correct_answer: string
      options: string[]
      audio_url: string | null
    }>

    if (!questions || !Array.isArray(questions)) {
      console.error("[parseVocabularyQuizResult] No questions found in config")
      return null
    }

    // Helper to extract answers from nested structure
    const extractAnswers = (
      obj: Record<string, unknown>,
    ): Record<string, string> | null => {
      if (obj.answers && typeof obj.answers === "object") {
        const inner = obj.answers as Record<string, unknown>
        if (inner.answers && typeof inner.answers === "object") {
          return inner.answers as Record<string, string>
        }
        const keys = Object.keys(inner)
        if (
          keys.length > 0 &&
          !["score", "status", "answers"].includes(keys[0])
        ) {
          return inner as Record<string, string>
        }
      }
      const keys = Object.keys(obj)
      if (
        keys.length > 0 &&
        !["score", "status", "answers", "0", "1", "2"].includes(keys[0])
      ) {
        return obj as Record<string, string>
      }
      return null
    }

    let answerMap: Record<string, string> = {}

    console.log(
      "[parseVocabularyQuizResult] Raw answers:",
      JSON.stringify(answers, null, 2),
    )

    const firstKey = Object.keys(answers)[0]
    if (
      firstKey &&
      typeof answers[firstKey] === "object" &&
      answers[firstKey] !== null
    ) {
      const activityEntry = answers[firstKey] as Record<string, unknown>
      console.log(
        "[parseVocabularyQuizResult] Activity entry keys:",
        Object.keys(activityEntry),
      )

      if (activityEntry.answers && typeof activityEntry.answers === "object") {
        const outerAnswers = activityEntry.answers as Record<string, unknown>
        console.log(
          "[parseVocabularyQuizResult] Outer answers keys:",
          Object.keys(outerAnswers),
        )

        const extracted = extractAnswers(outerAnswers)
        if (extracted) {
          answerMap = extracted
        } else {
          const keys = Object.keys(outerAnswers)
          if (keys.length > 0 && typeof outerAnswers[keys[0]] === "string") {
            answerMap = outerAnswers as Record<string, string>
          }
        }
      }

      if (Object.keys(answerMap).length === 0) {
        const extracted = extractAnswers(activityEntry)
        if (extracted) answerMap = extracted
      }
    } else {
      const extracted = extractAnswers(answers)
      if (extracted) answerMap = extracted
    }

    console.log(
      "[parseVocabularyQuizResult] Final answerMap:",
      JSON.stringify(answerMap),
    )

    if (Object.keys(answerMap).length === 0) {
      console.warn("[parseVocabularyQuizResult] WARNING: No answers extracted!")
    }

    const results: QuestionResult[] = questions.map((q) => {
      const userAnswer = answerMap[q.question_id] || ""
      const isCorrect =
        userAnswer.toLowerCase() === q.correct_answer.toLowerCase()

      return {
        question_id: q.question_id,
        definition: q.definition,
        correct_answer: q.correct_answer,
        user_answer: userAnswer,
        is_correct: isCorrect,
        audio_url: q.audio_url,
      }
    })

    const correctCount = results.filter((r) => r.is_correct).length
    const total = results.length

    return {
      quiz_id: (content.quiz_id as string) || "result",
      student_id: "",
      score: correctCount,
      total,
      percentage: Math.round(score),
      results,
      submitted_at: new Date().toISOString(),
    }
  } catch (e) {
    console.error("Failed to parse Vocabulary Quiz result:", e)
    return null
  }
}

/**
 * Parse Reading Comprehension result from config and answers
 */
export function parseReadingComprehensionResult(
  config: Record<string, unknown>,
  answers: Record<string, unknown>,
  score: number,
): ReadingComprehensionResult | null {
  try {
    // Config structure: { content: { questions: [...], passage, module_title, ... } }
    const content = (config.content as Record<string, unknown>) || config
    const questions = content.questions as Array<{
      question_id: string
      question_type: "mcq" | "true_false" | "short_answer"
      question_text: string
      options: string[] | null
      correct_answer: string
      correct_index: number | null
      explanation: string
      passage_reference: string
    }>

    if (!questions || !Array.isArray(questions)) {
      console.error(
        "[parseReadingComprehensionResult] No questions found in config",
      )
      return null
    }

    // Helper to extract map-based answers (question_id -> value)
    const extractMapAnswers = (
      obj: Record<string, unknown>,
    ): Record<string, unknown> | null => {
      if (
        obj.answers &&
        typeof obj.answers === "object" &&
        !Array.isArray(obj.answers)
      ) {
        const inner = obj.answers as Record<string, unknown>
        if (
          inner.answers &&
          typeof inner.answers === "object" &&
          !Array.isArray(inner.answers)
        ) {
          return inner.answers as Record<string, unknown>
        }
        const keys = Object.keys(inner)
        if (
          keys.length > 0 &&
          !["score", "status", "answers"].includes(keys[0])
        ) {
          return inner
        }
      }
      const keys = Object.keys(obj)
      if (
        keys.length > 0 &&
        !["score", "status", "answers", "0", "1", "2"].includes(keys[0])
      ) {
        return obj
      }
      return null
    }

    // Answers can be either:
    // 1. Map-based: { "question_id": "answer_index_or_text" }
    // 2. Array-based: [{ question_id, answer_index, answer_text }]
    const answerMap = new Map<
      string,
      { answer_index?: number | null; answer_text?: string | null }
    >()

    console.log(
      "[parseReadingComprehensionResult] Raw answers:",
      JSON.stringify(answers, null, 2),
    )

    const firstKey = Object.keys(answers)[0]
    if (
      firstKey &&
      typeof answers[firstKey] === "object" &&
      answers[firstKey] !== null
    ) {
      const activityEntry = answers[firstKey] as Record<string, unknown>
      console.log(
        "[parseReadingComprehensionResult] Activity entry keys:",
        Object.keys(activityEntry),
      )

      if (activityEntry.answers && typeof activityEntry.answers === "object") {
        const outerAnswers = activityEntry.answers as Record<string, unknown>
        console.log(
          "[parseReadingComprehensionResult] Outer answers keys:",
          Object.keys(outerAnswers),
        )
        console.log(
          "[parseReadingComprehensionResult] Outer answers content:",
          JSON.stringify(outerAnswers, null, 2),
        )

        // Try array format first
        if (outerAnswers.answers && Array.isArray(outerAnswers.answers)) {
          const answerList = outerAnswers.answers as Array<{
            question_id: string
            answer_index?: number | null
            answer_text?: string | null
          }>
          answerList.forEach((a) => {
            answerMap.set(a.question_id, {
              answer_index: a.answer_index,
              answer_text: a.answer_text,
            })
          })
          console.log(
            "[parseReadingComprehensionResult] Found double-nested array answers",
          )
        } else if (Array.isArray(activityEntry.answers)) {
          const answerList = activityEntry.answers as Array<{
            question_id: string
            answer_index?: number | null
            answer_text?: string | null
          }>
          answerList.forEach((a) => {
            answerMap.set(a.question_id, {
              answer_index: a.answer_index,
              answer_text: a.answer_text,
            })
          })
          console.log(
            "[parseReadingComprehensionResult] Found single-level array answers",
          )
        } else {
          // Try map format - first with extractMapAnswers
          const mapAnswers = extractMapAnswers(outerAnswers)
          if (mapAnswers) {
            Object.entries(mapAnswers).forEach(([qId, value]) => {
              if (typeof value === "number") {
                answerMap.set(qId, { answer_index: value, answer_text: null })
              } else if (typeof value === "string") {
                // Handle "index:X" format
                if (value.startsWith("index:")) {
                  const indexVal = parseInt(value.substring(6), 10)
                  if (!Number.isNaN(indexVal)) {
                    answerMap.set(qId, {
                      answer_index: indexVal,
                      answer_text: null,
                    })
                  }
                  // Handle "text:X" format
                } else if (value.startsWith("text:")) {
                  answerMap.set(qId, {
                    answer_index: null,
                    answer_text: value.substring(5),
                  })
                } else {
                  // Could be index as string or text answer
                  const numVal = parseInt(value, 10)
                  if (!Number.isNaN(numVal)) {
                    answerMap.set(qId, {
                      answer_index: numVal,
                      answer_text: value,
                    })
                  } else {
                    answerMap.set(qId, {
                      answer_index: null,
                      answer_text: value,
                    })
                  }
                }
              }
            })
            console.log(
              "[parseReadingComprehensionResult] Found map-based answers via extractMapAnswers",
            )
          }

          // Direct fallback: try to extract directly from outerAnswers (skip metadata keys)
          // Handle "index:X" and "text:X" format from ReadingComprehensionPlayerAdapter
          if (answerMap.size === 0) {
            const metadataKeys = ["score", "status", "answers", "time_spent"]
            Object.entries(outerAnswers).forEach(([key, value]) => {
              if (!metadataKeys.includes(key)) {
                if (typeof value === "number") {
                  answerMap.set(key, { answer_index: value, answer_text: null })
                } else if (typeof value === "string") {
                  // Handle "index:X" format
                  if (value.startsWith("index:")) {
                    const indexVal = parseInt(value.substring(6), 10)
                    if (!Number.isNaN(indexVal)) {
                      answerMap.set(key, {
                        answer_index: indexVal,
                        answer_text: null,
                      })
                    }
                    // Handle "text:X" format
                  } else if (value.startsWith("text:")) {
                    answerMap.set(key, {
                      answer_index: null,
                      answer_text: value.substring(5),
                    })
                  } else {
                    // Plain number as string or text
                    const numVal = parseInt(value, 10)
                    if (!Number.isNaN(numVal)) {
                      answerMap.set(key, {
                        answer_index: numVal,
                        answer_text: value,
                      })
                    } else {
                      answerMap.set(key, {
                        answer_index: null,
                        answer_text: value,
                      })
                    }
                  }
                }
              }
            })
            if (answerMap.size > 0) {
              console.log(
                "[parseReadingComprehensionResult] Found answers via direct extraction from outerAnswers",
              )
            }
          }
        }
      }

      // Fallback: try extracting map directly from activityEntry
      if (answerMap.size === 0) {
        console.log(
          "[parseReadingComprehensionResult] Trying fallback extraction from activityEntry",
        )
        const metadataKeys = ["score", "status", "answers", "time_spent"]
        Object.entries(activityEntry).forEach(([key, value]) => {
          if (!metadataKeys.includes(key)) {
            if (typeof value === "number") {
              answerMap.set(key, { answer_index: value, answer_text: null })
            } else if (typeof value === "string") {
              // Handle "index:X" format
              if (value.startsWith("index:")) {
                const indexVal = parseInt(value.substring(6), 10)
                if (!Number.isNaN(indexVal)) {
                  answerMap.set(key, {
                    answer_index: indexVal,
                    answer_text: null,
                  })
                }
                // Handle "text:X" format
              } else if (value.startsWith("text:")) {
                answerMap.set(key, {
                  answer_index: null,
                  answer_text: value.substring(5),
                })
              } else {
                const numVal = parseInt(value, 10)
                if (!Number.isNaN(numVal)) {
                  answerMap.set(key, {
                    answer_index: numVal,
                    answer_text: value,
                  })
                } else {
                  answerMap.set(key, { answer_index: null, answer_text: value })
                }
              }
            }
          }
        })
        if (answerMap.size > 0) {
          console.log(
            "[parseReadingComprehensionResult] Found answers via direct extraction from activityEntry",
          )
        }
      }
    } else if (Array.isArray(answers)) {
      const answerList = answers as Array<{
        question_id: string
        answer_index?: number | null
        answer_text?: string | null
      }>
      answerList.forEach((a) => {
        answerMap.set(a.question_id, {
          answer_index: a.answer_index,
          answer_text: a.answer_text,
        })
      })
    }

    // Final fallback: try to extract directly from root answers object
    if (answerMap.size === 0) {
      console.log(
        "[parseReadingComprehensionResult] Trying final fallback from root answers",
      )
      const metadataKeys = [
        "score",
        "status",
        "answers",
        "time_spent",
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
      ]
      Object.entries(answers).forEach(([key, value]) => {
        if (!metadataKeys.includes(key)) {
          if (typeof value === "number") {
            answerMap.set(key, { answer_index: value, answer_text: null })
          } else if (typeof value === "string") {
            // Handle "index:X" format
            if (value.startsWith("index:")) {
              const indexVal = parseInt(value.substring(6), 10)
              if (!Number.isNaN(indexVal)) {
                answerMap.set(key, {
                  answer_index: indexVal,
                  answer_text: null,
                })
              }
              // Handle "text:X" format
            } else if (value.startsWith("text:")) {
              answerMap.set(key, {
                answer_index: null,
                answer_text: value.substring(5),
              })
            } else {
              const numVal = parseInt(value, 10)
              if (!Number.isNaN(numVal)) {
                answerMap.set(key, { answer_index: numVal, answer_text: value })
              } else {
                answerMap.set(key, { answer_index: null, answer_text: value })
              }
            }
          }
        }
      })
    }

    console.log(
      "[parseReadingComprehensionResult] Final answerMap size:",
      answerMap.size,
    )
    console.log(
      "[parseReadingComprehensionResult] Final answerMap entries:",
      Array.from(answerMap.entries()),
    )

    if (answerMap.size === 0) {
      console.warn(
        "[parseReadingComprehensionResult] WARNING: No answers extracted!",
      )
    }

    const scoreByType: Record<string, { correct: number; total: number }> = {}

    // Helper to convert value to number (handles string indices like "0", "1")
    const toNumber = (val: unknown): number | null => {
      if (typeof val === "number") return val
      if (typeof val === "string") {
        const num = parseInt(val, 10)
        return Number.isNaN(num) ? null : num
      }
      return null
    }

    const questionResults: ReadingComprehensionQuestionResult[] = questions.map(
      (q) => {
        const answer = answerMap.get(q.question_id)
        const studentAnswerIndex = answer?.answer_index ?? null
        const studentAnswerText = answer?.answer_text ?? null

        // Convert correct_index to number (it may be stored as string in JSON)
        const correctIndex = toNumber(q.correct_index)

        let isCorrect = false
        if (q.question_type === "short_answer") {
          // For short answer, we do a simple comparison (backend should have calculated this)
          isCorrect =
            studentAnswerText?.toLowerCase().trim() ===
            q.correct_answer.toLowerCase().trim()
        } else {
          // Compare as numbers to handle string vs number type mismatches
          isCorrect =
            studentAnswerIndex !== null &&
            correctIndex !== null &&
            studentAnswerIndex === correctIndex
          console.log(
            `[parseReadingComprehensionResult] Q${q.question_id}: studentIdx=${studentAnswerIndex} (${typeof studentAnswerIndex}), correctIdx=${correctIndex} (${typeof q.correct_index}), isCorrect=${isCorrect}`,
          )
        }

        // Track score by type
        if (!scoreByType[q.question_type]) {
          scoreByType[q.question_type] = { correct: 0, total: 0 }
        }
        scoreByType[q.question_type].total++
        if (isCorrect) {
          scoreByType[q.question_type].correct++
        }

        return {
          question_id: q.question_id,
          question_type: q.question_type,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          correct_index: correctIndex,
          student_answer_index: studentAnswerIndex,
          student_answer_text: studentAnswerText,
          is_correct: isCorrect,
          similarity_score: null,
          explanation: q.explanation,
          passage_reference: q.passage_reference,
        }
      },
    )

    const correctCount = questionResults.filter((r) => r.is_correct).length
    const total = questionResults.length

    return {
      activity_id: (content.activity_id as string) || "result",
      student_id: "",
      score: correctCount,
      total,
      percentage: Math.round(score),
      question_results: questionResults,
      score_by_type: scoreByType,
      submitted_at: new Date().toISOString(),
      difficulty: (content.difficulty as string) || "medium",
      passage: (content.passage as string) || "",
      module_title: (content.module_title as string) || "",
    }
  } catch (e) {
    console.error("Failed to parse Reading Comprehension result:", e)
    return null
  }
}

/**
 * Parse Sentence Builder result from config and answers
 */
export function parseSentenceBuilderResult(
  config: Record<string, unknown>,
  answers: Record<string, unknown>,
  score: number,
): SentenceBuilderResult | null {
  try {
    // Config structure: { content: { sentences: [...], activity_id, difficulty, ... } }
    const content = (config.content as Record<string, unknown>) || config
    const sentences = content.sentences as Array<{
      item_id: string
      correct_sentence: string
      words: string[]
      word_count: number
      audio_url: string | null
    }>

    if (!sentences || !Array.isArray(sentences)) {
      console.error("[parseSentenceBuilderResult] No sentences found in config")
      return null
    }

    // Helper to parse a value that could be a JSON-stringified array or actual array
    const parseArrayValue = (value: unknown): string[] | null => {
      if (Array.isArray(value)) {
        return value as string[]
      }
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) {
            return parsed as string[]
          }
        } catch {
          // Not valid JSON, return null
        }
      }
      return null
    }

    // Helper to extract answers from nested structure (for array values)
    // Handles both actual arrays and JSON-stringified arrays
    const extractAnswers = (
      obj: Record<string, unknown>,
    ): Record<string, string[]> | null => {
      const metadataKeys = [
        "score",
        "status",
        "answers",
        "time_spent",
        "0",
        "1",
        "2",
      ]

      // Convert values that may be JSON strings to arrays
      const convertToArrayMap = (
        source: Record<string, unknown>,
      ): Record<string, string[]> | null => {
        const result: Record<string, string[]> = {}
        for (const [key, value] of Object.entries(source)) {
          if (metadataKeys.includes(key)) continue
          const arr = parseArrayValue(value)
          if (arr) {
            result[key] = arr
          }
        }
        return Object.keys(result).length > 0 ? result : null
      }

      if (obj.answers && typeof obj.answers === "object") {
        const inner = obj.answers as Record<string, unknown>
        if (inner.answers && typeof inner.answers === "object") {
          return convertToArrayMap(inner.answers as Record<string, unknown>)
        }
        const keys = Object.keys(inner)
        if (keys.length > 0 && !metadataKeys.includes(keys[0])) {
          return convertToArrayMap(inner)
        }
      }
      const keys = Object.keys(obj)
      if (keys.length > 0 && !metadataKeys.includes(keys[0])) {
        return convertToArrayMap(obj)
      }
      return null
    }

    let answerMap: Record<string, string[]> = {}

    console.log(
      "[parseSentenceBuilderResult] Raw answers:",
      JSON.stringify(answers, null, 2),
    )

    const firstKey = Object.keys(answers)[0]
    if (
      firstKey &&
      typeof answers[firstKey] === "object" &&
      answers[firstKey] !== null
    ) {
      const activityEntry = answers[firstKey] as Record<string, unknown>
      console.log(
        "[parseSentenceBuilderResult] Activity entry keys:",
        Object.keys(activityEntry),
      )

      if (activityEntry.answers && typeof activityEntry.answers === "object") {
        const outerAnswers = activityEntry.answers as Record<string, unknown>
        console.log(
          "[parseSentenceBuilderResult] Outer answers keys:",
          Object.keys(outerAnswers),
        )

        const extracted = extractAnswers(outerAnswers)
        if (extracted) {
          answerMap = extracted
        } else {
          // Fallback: try parsing each value as JSON string or direct array
          const metadataKeys = ["score", "status", "answers", "time_spent"]
          for (const [key, value] of Object.entries(outerAnswers)) {
            if (metadataKeys.includes(key)) continue
            const arr = parseArrayValue(value)
            if (arr) {
              answerMap[key] = arr
            }
          }
        }
      }

      if (Object.keys(answerMap).length === 0) {
        const extracted = extractAnswers(activityEntry)
        if (extracted) {
          answerMap = extracted
        } else {
          // Fallback: try parsing each value directly from activityEntry
          const metadataKeys = ["score", "status", "answers", "time_spent"]
          for (const [key, value] of Object.entries(activityEntry)) {
            if (metadataKeys.includes(key)) continue
            const arr = parseArrayValue(value)
            if (arr) {
              answerMap[key] = arr
            }
          }
        }
      }
    } else {
      const extracted = extractAnswers(answers)
      if (extracted) {
        answerMap = extracted
      } else {
        // Fallback: try parsing each value directly from root answers
        const metadataKeys = [
          "score",
          "status",
          "answers",
          "time_spent",
          "0",
          "1",
          "2",
        ]
        for (const [key, value] of Object.entries(answers)) {
          if (metadataKeys.includes(key)) continue
          const arr = parseArrayValue(value)
          if (arr) {
            answerMap[key] = arr
          }
        }
      }
    }

    console.log(
      "[parseSentenceBuilderResult] Final answerMap:",
      JSON.stringify(answerMap),
    )

    if (Object.keys(answerMap).length === 0) {
      console.warn(
        "[parseSentenceBuilderResult] WARNING: No answers extracted!",
      )
    }

    const sentenceResults: SentenceResult[] = sentences.map((s) => {
      const submittedWords = answerMap[s.item_id] || []
      console.log(
        `[parseSentenceBuilderResult] Sentence ${s.item_id}: submitted=${JSON.stringify(submittedWords)}, correct="${s.correct_sentence}"`,
      )
      const isCorrect = submittedWords.join(" ") === s.correct_sentence

      return {
        item_id: s.item_id,
        submitted_words: submittedWords,
        correct_sentence: s.correct_sentence,
        is_correct: isCorrect,
        audio_url: s.audio_url,
      }
    })

    const correctCount = sentenceResults.filter((r) => r.is_correct).length
    const total = sentenceResults.length

    return {
      activity_id: (content.activity_id as string) || "result",
      student_id: "",
      score: correctCount,
      total,
      percentage: Math.round(score),
      sentence_results: sentenceResults,
      submitted_at: new Date().toISOString(),
      difficulty: (content.difficulty as string) || "medium",
    }
  } catch (e) {
    console.error("Failed to parse Sentence Builder result:", e)
    return null
  }
}

/**
 * Parse Word Builder result from config and answers
 */
export function parseWordBuilderResult(
  config: Record<string, unknown>,
  answers: Record<string, unknown>,
  score: number,
): WordBuilderResult | null {
  try {
    // Config structure: { content: { words: [...], activity_id, ... } }
    // or { type: "word_builder", content: { words: [...] } }
    const content = (config.content as Record<string, unknown>) || config
    const words = content.words as Array<{
      item_id?: string
      word_id?: string
      correct_word?: string
      word?: string
      letters: string[]
      definition: string
      audio_url: string | null
    }>

    if (!words || !Array.isArray(words)) {
      console.error("[parseWordBuilderResult] No words found in config")
      console.error(
        "[parseWordBuilderResult] Config structure:",
        JSON.stringify(config, null, 2),
      )
      return null
    }

    // Answers structure from backend can be one of:
    // 1. { "0": { "answers": { "answers": { "item_id": "WORD" } }, "score": 100, "status": "completed" } }
    // 2. { "0": { "answers": { "item_id": "WORD" }, "score": 100, "status": "completed" } }
    // 3. { "answers": { "item_id": "WORD" } }
    // 4. { "item_id": "WORD" } (direct)
    let wordAnswers: Record<string, string> = {}
    let attemptMap: Record<string, number> = {}

    console.log(
      "[parseWordBuilderResult] Raw answers:",
      JSON.stringify(answers, null, 2),
    )

    // Helper to check if object looks like an answer map (has UUID-like keys with string values)
    const looksLikeAnswerMap = (obj: Record<string, unknown>): boolean => {
      const keys = Object.keys(obj)
      if (keys.length === 0) return false
      // Check if keys are not metadata fields and values are strings
      const nonMetadataKeys = keys.filter(
        (k) =>
          ![
            "score",
            "status",
            "answers",
            "attempts",
            "0",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
          ].includes(k),
      )
      return (
        nonMetadataKeys.length > 0 &&
        nonMetadataKeys.some((k) => typeof obj[k] === "string")
      )
    }

    // Recursive helper to find answer map at any depth
    const findAnswerMap = (
      obj: Record<string, unknown>,
      depth = 0,
    ): Record<string, string> | null => {
      if (depth > 5) return null // Prevent infinite recursion

      // Check if current object is an answer map
      if (looksLikeAnswerMap(obj)) {
        const answerKeys = Object.keys(obj).filter(
          (k) => !["score", "status", "answers", "attempts"].includes(k),
        )
        if (answerKeys.length > 0) {
          const result: Record<string, string> = {}
          answerKeys.forEach((k) => {
            if (typeof obj[k] === "string") {
              result[k] = obj[k] as string
            }
          })
          if (Object.keys(result).length > 0) {
            console.log(
              `[parseWordBuilderResult] Found answer map at depth ${depth}`,
            )
            return result
          }
        }
      }

      // Try "answers" key first (most common nesting)
      if (
        obj.answers &&
        typeof obj.answers === "object" &&
        obj.answers !== null
      ) {
        const found = findAnswerMap(
          obj.answers as Record<string, unknown>,
          depth + 1,
        )
        if (found) return found
      }

      // Try numeric keys (activity index like "0")
      const numericKeys = Object.keys(obj).filter((k) => /^\d+$/.test(k))
      for (const key of numericKeys) {
        if (typeof obj[key] === "object" && obj[key] !== null) {
          const found = findAnswerMap(
            obj[key] as Record<string, unknown>,
            depth + 1,
          )
          if (found) return found
        }
      }

      return null
    }

    // Try to find answer map recursively
    const foundAnswers = findAnswerMap(answers)
    if (foundAnswers) {
      wordAnswers = foundAnswers
    }

    // Also try to find attempts map
    const findAttemptsMap = (
      obj: Record<string, unknown>,
      depth = 0,
    ): Record<string, number> | null => {
      if (depth > 5) return null
      if (obj.attempts && typeof obj.attempts === "object") {
        return obj.attempts as Record<string, number>
      }
      if (
        obj.answers &&
        typeof obj.answers === "object" &&
        obj.answers !== null
      ) {
        const found = findAttemptsMap(
          obj.answers as Record<string, unknown>,
          depth + 1,
        )
        if (found) return found
      }
      const numericKeys = Object.keys(obj).filter((k) => /^\d+$/.test(k))
      for (const key of numericKeys) {
        if (typeof obj[key] === "object" && obj[key] !== null) {
          const found = findAttemptsMap(
            obj[key] as Record<string, unknown>,
            depth + 1,
          )
          if (found) return found
        }
      }
      return null
    }

    attemptMap = findAttemptsMap(answers) || {}

    console.log(
      "[parseWordBuilderResult] Final wordAnswers:",
      JSON.stringify(wordAnswers),
    )
    console.log(
      "[parseWordBuilderResult] Words in config:",
      words.map((w) => ({
        id: w.item_id || w.word_id,
        word: w.correct_word || w.word,
      })),
    )
    console.log(
      "[parseWordBuilderResult] Answer keys:",
      Object.keys(wordAnswers),
    )

    // Warn if no answers were extracted
    if (Object.keys(wordAnswers).length === 0) {
      console.warn(
        "[parseWordBuilderResult] WARNING: No answers extracted! Check data structure above.",
      )
    }

    // Create array of answer values for fallback matching by index
    const answerValues = Object.values(wordAnswers)

    const wordResults: WordResult[] = words.map((w, index) => {
      // Config may use item_id or word_id depending on source
      const wordId = w.item_id || w.word_id || ""
      // Correct answer may be correct_word or word
      const correctWord = w.correct_word || w.word || ""

      // Try multiple lookup strategies:
      // 1. Direct ID match
      // 2. Alternative ID field match
      // 3. Fallback to index-based if we have same number of answers as words
      let submittedWord = wordAnswers[wordId] || ""

      if (!submittedWord && w.item_id) {
        submittedWord = wordAnswers[w.item_id] || ""
      }
      if (!submittedWord && w.word_id) {
        submittedWord = wordAnswers[w.word_id] || ""
      }

      // Fallback: If answer keys look like UUIDs but don't match, try index-based lookup
      if (!submittedWord && answerValues.length === words.length) {
        submittedWord = answerValues[index] || ""
        console.log(
          `[parseWordBuilderResult] Using index-based fallback for word ${index}: "${submittedWord}"`,
        )
      }

      // Fallback: Try partial ID match (in case of prefix/suffix differences)
      if (!submittedWord) {
        for (const [key, value] of Object.entries(wordAnswers)) {
          if (
            wordId.includes(key) ||
            key.includes(wordId) ||
            (w.item_id && (w.item_id.includes(key) || key.includes(w.item_id)))
          ) {
            submittedWord = value
            console.log(
              `[parseWordBuilderResult] Partial match found: ${key} matches ${wordId}`,
            )
            break
          }
        }
      }

      const attempts =
        attemptMap[wordId] ||
        attemptMap[w.item_id || ""] ||
        attemptMap[w.word_id || ""] ||
        1

      const isCorrect =
        submittedWord.toLowerCase() === correctWord.toLowerCase()

      // Calculate points based on attempts
      let points = 0
      if (isCorrect) {
        if (attempts === 1) points = 100
        else if (attempts === 2) points = 70
        else if (attempts === 3) points = 50
        else points = 30
      }

      console.log(
        `[parseWordBuilderResult] Word ${index} (${wordId}): submitted="${submittedWord}", correct="${correctWord}", isCorrect=${isCorrect}`,
      )

      return {
        item_id: wordId,
        submitted_word: submittedWord,
        correct_word: correctWord,
        is_correct: isCorrect,
        attempts,
        points,
        audio_url: w.audio_url,
        definition: w.definition,
      }
    })

    const correctCount = wordResults.filter((r) => r.is_correct).length
    const total = wordResults.length
    const totalScore = wordResults.reduce((sum, r) => sum + r.points, 0)
    const maxScore = total * 100
    const perfectWords = wordResults.filter(
      (r) => r.is_correct && r.attempts === 1,
    ).length
    const totalAttempts = wordResults.reduce((sum, r) => sum + r.attempts, 0)

    return {
      activity_id: (content.activity_id as string) || "result",
      student_id: "",
      score: totalScore,
      max_score: maxScore,
      percentage: Math.round(score),
      correct_count: correctCount,
      total,
      word_results: wordResults,
      perfect_words: perfectWords,
      average_attempts: total > 0 ? totalAttempts / total : 0,
      submitted_at: new Date().toISOString(),
    }
  } catch (e) {
    console.error("Failed to parse Word Builder result:", e)
    return null
  }
}

/**
 * Listening Fill-in-the-Blank result types
 */
export interface ListeningFillBlankItemResult {
  item_id: string
  display_sentence: string
  missing_words: string[]
  submitted_words: string[]
  is_correct: boolean
  audio_url: string | null
}

export interface ListeningFillBlankResult {
  activity_id: string
  score: number
  total: number
  percentage: number
  item_results: ListeningFillBlankItemResult[]
  submitted_at: string
}

/**
 * Parse Listening Fill-in-the-Blank result from config and answers
 */
export function parseListeningFillBlankResult(
  config: Record<string, unknown>,
  answers: Record<string, unknown>,
  score: number,
): ListeningFillBlankResult | null {
  try {
    const content = (config.content as Record<string, unknown>) || config
    const items = content.items as Array<{
      item_id: string
      display_sentence: string
      missing_words?: string[]
      word_bank: string[]
      audio_url: string | null
    }>

    if (!items || !Array.isArray(items)) {
      console.error("[parseListeningFillBlankResult] No items found in config")
      return null
    }

    // Extract answer map: item_id -> JSON stringified array of words
    let answerMap: Record<string, string> = {}

    console.log(
      "[parseListeningFillBlankResult] Raw answers:",
      JSON.stringify(answers, null, 2),
    )

    const firstKey = Object.keys(answers)[0]
    if (
      firstKey &&
      typeof answers[firstKey] === "object" &&
      answers[firstKey] !== null
    ) {
      const activityEntry = answers[firstKey] as Record<string, unknown>

      if (activityEntry.answers && typeof activityEntry.answers === "object") {
        const outerAnswers = activityEntry.answers as Record<string, unknown>
        // Look for item IDs as keys
        const metadataKeys = ["score", "status", "answers", "time_spent"]

        // Check if outerAnswers.answers exists (double-nested)
        if (outerAnswers.answers && typeof outerAnswers.answers === "object") {
          const inner = outerAnswers.answers as Record<string, unknown>
          for (const [key, value] of Object.entries(inner)) {
            if (!metadataKeys.includes(key) && typeof value === "string") {
              answerMap[key] = value
            }
          }
        }

        if (Object.keys(answerMap).length === 0) {
          for (const [key, value] of Object.entries(outerAnswers)) {
            if (!metadataKeys.includes(key) && typeof value === "string") {
              answerMap[key] = value
            }
          }
        }
      }

      if (Object.keys(answerMap).length === 0) {
        const metadataKeys = ["score", "status", "answers", "time_spent"]
        for (const [key, value] of Object.entries(activityEntry)) {
          if (!metadataKeys.includes(key) && typeof value === "string") {
            answerMap[key] = value
          }
        }
      }
    } else {
      // Direct structure
      const metadataKeys = ["score", "status", "answers", "time_spent"]
      for (const [key, value] of Object.entries(answers)) {
        if (!metadataKeys.includes(key) && typeof value === "string") {
          answerMap[key] = value
        }
      }
    }

    console.log(
      "[parseListeningFillBlankResult] Final answerMap:",
      JSON.stringify(answerMap),
    )

    const itemResults: ListeningFillBlankItemResult[] = items.map((item) => {
      const rawAnswer = answerMap[item.item_id] || "[]"
      let submittedWords: string[] = []
      try {
        const parsed = JSON.parse(rawAnswer)
        submittedWords = Array.isArray(parsed) ? parsed : []
      } catch {
        submittedWords = []
      }

      // Derive missing_words from display_sentence blanks count and word_bank
      const missingWords = item.missing_words || []
      const blankCount = item.display_sentence.split("_______").length - 1

      // Check correctness: compare submitted words with missing words
      let isCorrect = false
      if (missingWords.length > 0) {
        isCorrect =
          submittedWords.length === missingWords.length &&
          submittedWords.every(
            (w, i) => w.toLowerCase() === missingWords[i].toLowerCase(),
          )
      } else {
        // Fallback: if no missing_words in config, assume correct if all blanks filled
        isCorrect = submittedWords.filter(Boolean).length === blankCount
      }

      return {
        item_id: item.item_id,
        display_sentence: item.display_sentence,
        missing_words: missingWords,
        submitted_words: submittedWords,
        is_correct: isCorrect,
        audio_url: item.audio_url,
      }
    })

    const correctCount = itemResults.filter((r) => r.is_correct).length
    const total = itemResults.length

    return {
      activity_id: (content.activity_id as string) || "result",
      score: correctCount,
      total,
      percentage: Math.round(score),
      item_results: itemResults,
      submitted_at: new Date().toISOString(),
    }
  } catch (e) {
    console.error("Failed to parse Listening Fill-in-the-Blank result:", e)
    return null
  }
}

/**
 * Writing/Grammar Fill-in-the-Blank result types
 */
export interface WritingFillBlankItemResult {
  item_id: string
  display_sentence: string
  correct_answer: string
  acceptable_answers: string[]
  submitted_answer: string
  is_correct: boolean
}

export interface WritingFillBlankResult {
  activity_id: string
  score: number
  total: number
  percentage: number
  item_results: WritingFillBlankItemResult[]
  submitted_at: string
}

/**
 * Parse Writing/Grammar Fill-in-the-Blank result from config and answers
 */
export function parseWritingFillBlankResult(
  config: Record<string, unknown>,
  answers: Record<string, unknown>,
  score: number,
): WritingFillBlankResult | null {
  try {
    const content = (config.content as Record<string, unknown>) || config
    const items = content.items as Array<{
      item_id: string
      sentence?: string
      display_sentence?: string
      correct_answer?: string
      acceptable_answers?: string[]
    }>

    if (!items || !Array.isArray(items)) {
      console.error("[parseWritingFillBlankResult] No items found in config")
      return null
    }

    let answerMap: Record<string, string> = {}

    const firstKey = Object.keys(answers)[0]
    if (
      firstKey &&
      typeof answers[firstKey] === "object" &&
      answers[firstKey] !== null
    ) {
      const activityEntry = answers[firstKey] as Record<string, unknown>
      if (activityEntry.answers && typeof activityEntry.answers === "object") {
        const outerAnswers = activityEntry.answers as Record<string, unknown>
        const metadataKeys = ["score", "status", "answers", "time_spent"]
        if (outerAnswers.answers && typeof outerAnswers.answers === "object") {
          const inner = outerAnswers.answers as Record<string, unknown>
          for (const [key, value] of Object.entries(inner)) {
            if (!metadataKeys.includes(key) && typeof value === "string") {
              answerMap[key] = value
            }
          }
        }
        if (Object.keys(answerMap).length === 0) {
          for (const [key, value] of Object.entries(outerAnswers)) {
            if (!metadataKeys.includes(key) && typeof value === "string") {
              answerMap[key] = value
            }
          }
        }
      }
      if (Object.keys(answerMap).length === 0) {
        const metadataKeys = ["score", "status", "answers", "time_spent"]
        for (const [key, value] of Object.entries(activityEntry)) {
          if (!metadataKeys.includes(key) && typeof value === "string") {
            answerMap[key] = value
          }
        }
      }
    } else {
      const metadataKeys = ["score", "status", "answers", "time_spent"]
      for (const [key, value] of Object.entries(answers)) {
        if (!metadataKeys.includes(key) && typeof value === "string") {
          answerMap[key] = value
        }
      }
    }

    const itemResults: WritingFillBlankItemResult[] = items.map((item) => {
      const submitted = answerMap[item.item_id] || ""
      const correctAnswer = item.correct_answer || ""
      const acceptable = [
        correctAnswer,
        ...(item.acceptable_answers || []),
      ].filter(Boolean)

      const isCorrect = acceptable.some(
        (a) => submitted.trim().toLowerCase() === a.trim().toLowerCase(),
      )

      // Collect other acceptable answers (exclude the primary correct answer)
      const otherAcceptable = (item.acceptable_answers || []).filter(
        (a) => a.trim().toLowerCase() !== correctAnswer.trim().toLowerCase(),
      )

      return {
        item_id: item.item_id,
        display_sentence: item.sentence || item.display_sentence || "",
        correct_answer: correctAnswer,
        acceptable_answers: otherAcceptable,
        submitted_answer: submitted,
        is_correct: isCorrect,
      }
    })

    const correctCount = itemResults.filter((r) => r.is_correct).length
    const total = itemResults.length

    return {
      activity_id: (content.activity_id as string) || "result",
      score: correctCount,
      total,
      percentage: total > 0 ? Math.round((correctCount / total) * 100) : 0,
      item_results: itemResults,
      submitted_at: new Date().toISOString(),
    }
  } catch (e) {
    console.error("Failed to parse Writing Fill-blank result:", e)
    return null
  }
}

/**
 * Writing Sentence Corrector result types
 */
export interface SentenceCorrectorItemResult {
  item_id: string
  incorrect_sentence: string
  correct_sentence: string
  submitted_sentence: string
  is_correct: boolean
}

export interface SentenceCorrectorResult {
  activity_id: string
  score: number
  total: number
  percentage: number
  item_results: SentenceCorrectorItemResult[]
  submitted_at: string
}

/**
 * Parse Writing Sentence Corrector result from config and answers
 */
export function parseSentenceCorrectorResult(
  config: Record<string, unknown>,
  answers: Record<string, unknown>,
  score: number,
): SentenceCorrectorResult | null {
  try {
    const content = (config.content as Record<string, unknown>) || config
    const items = content.items as Array<{
      item_id: string
      incorrect_sentence: string
      correct_sentence: string
    }>

    if (!items || !Array.isArray(items)) {
      console.error("[parseSentenceCorrectorResult] No items found in config")
      return null
    }

    // Extract answer map: item_id -> submitted sentence text
    let answerMap: Record<string, string> = {}

    const firstKey = Object.keys(answers)[0]
    if (
      firstKey &&
      typeof answers[firstKey] === "object" &&
      answers[firstKey] !== null
    ) {
      const activityEntry = answers[firstKey] as Record<string, unknown>

      if (activityEntry.answers && typeof activityEntry.answers === "object") {
        const outerAnswers = activityEntry.answers as Record<string, unknown>
        const metadataKeys = ["score", "status", "answers", "time_spent"]

        if (outerAnswers.answers && typeof outerAnswers.answers === "object") {
          const inner = outerAnswers.answers as Record<string, unknown>
          for (const [key, value] of Object.entries(inner)) {
            if (!metadataKeys.includes(key) && typeof value === "string") {
              answerMap[key] = value
            }
          }
        }

        if (Object.keys(answerMap).length === 0) {
          for (const [key, value] of Object.entries(outerAnswers)) {
            if (!metadataKeys.includes(key) && typeof value === "string") {
              answerMap[key] = value
            }
          }
        }
      }

      if (Object.keys(answerMap).length === 0) {
        const metadataKeys = ["score", "status", "answers", "time_spent"]
        for (const [key, value] of Object.entries(activityEntry)) {
          if (!metadataKeys.includes(key) && typeof value === "string") {
            answerMap[key] = value
          }
        }
      }
    } else {
      const metadataKeys = ["score", "status", "answers", "time_spent"]
      for (const [key, value] of Object.entries(answers)) {
        if (!metadataKeys.includes(key) && typeof value === "string") {
          answerMap[key] = value
        }
      }
    }

    const itemResults: SentenceCorrectorItemResult[] = items.map((item) => {
      const submitted = answerMap[item.item_id] || ""
      const isCorrect =
        submitted.trim().toLowerCase() ===
        item.correct_sentence.trim().toLowerCase()

      return {
        item_id: item.item_id,
        incorrect_sentence: item.incorrect_sentence,
        correct_sentence: item.correct_sentence,
        submitted_sentence: submitted,
        is_correct: isCorrect,
      }
    })

    const correctCount = itemResults.filter((r) => r.is_correct).length
    const total = itemResults.length

    return {
      activity_id: (content.activity_id as string) || "result",
      score: correctCount,
      total,
      percentage: total > 0 ? Math.round((correctCount / total) * 100) : 0,
      item_results: itemResults,
      submitted_at: new Date().toISOString(),
    }
  } catch (e) {
    console.error("Failed to parse Sentence Corrector result:", e)
    return null
  }
}

/**
 * Activity types that support detailed result review
 */
/**
 * Writing Free Response result types
 */
export interface FreeResponseItemResult {
  item_id: string
  prompt: string
  submitted_text: string
}

export interface FreeResponseResult {
  activity_id: string
  total: number
  item_results: FreeResponseItemResult[]
  submitted_at: string
}

/**
 * Parse Writing Free Response result from config and answers
 */
export function parseFreeResponseResult(
  config: Record<string, unknown>,
  answers: Record<string, unknown>,
): FreeResponseResult | null {
  try {
    const content = (config.content as Record<string, unknown>) || config
    const items = content.items as Array<{
      item_id: string
      prompt?: string
    }>

    if (!items || !Array.isArray(items)) {
      console.error("[parseFreeResponseResult] No items found in config")
      return null
    }

    let answerMap: Record<string, string> = {}

    const firstKey = Object.keys(answers)[0]
    if (
      firstKey &&
      typeof answers[firstKey] === "object" &&
      answers[firstKey] !== null
    ) {
      const activityEntry = answers[firstKey] as Record<string, unknown>
      if (activityEntry.answers && typeof activityEntry.answers === "object") {
        const outerAnswers = activityEntry.answers as Record<string, unknown>
        const metadataKeys = ["score", "status", "answers", "time_spent"]
        if (outerAnswers.answers && typeof outerAnswers.answers === "object") {
          const inner = outerAnswers.answers as Record<string, unknown>
          for (const [key, value] of Object.entries(inner)) {
            if (!metadataKeys.includes(key) && typeof value === "string") {
              answerMap[key] = value
            }
          }
        }
        if (Object.keys(answerMap).length === 0) {
          for (const [key, value] of Object.entries(outerAnswers)) {
            if (!metadataKeys.includes(key) && typeof value === "string") {
              answerMap[key] = value
            }
          }
        }
      }
      if (Object.keys(answerMap).length === 0) {
        const metadataKeys = ["score", "status", "answers", "time_spent"]
        for (const [key, value] of Object.entries(activityEntry)) {
          if (!metadataKeys.includes(key) && typeof value === "string") {
            answerMap[key] = value
          }
        }
      }
    } else {
      const metadataKeys = ["score", "status", "answers", "time_spent"]
      for (const [key, value] of Object.entries(answers)) {
        if (!metadataKeys.includes(key) && typeof value === "string") {
          answerMap[key] = value
        }
      }
    }

    const itemResults: FreeResponseItemResult[] = items.map((item) => ({
      item_id: item.item_id,
      prompt: item.prompt || "",
      submitted_text: answerMap[item.item_id] || "",
    }))

    return {
      activity_id: (content.activity_id as string) || "result",
      total: itemResults.length,
      item_results: itemResults,
      submitted_at: new Date().toISOString(),
    }
  } catch (e) {
    console.error("Failed to parse Free Response result:", e)
    return null
  }
}

/**
 * Vocabulary Matching result types
 */
export interface VocabularyMatchingItemResult {
  pair_id: string
  word: string
  correct_definition: string
  matched_definition: string
  is_correct: boolean
}

export interface VocabularyMatchingResult {
  activity_id: string
  score: number
  total: number
  percentage: number
  item_results: VocabularyMatchingItemResult[]
  submitted_at: string
}

/**
 * Parse Vocabulary Matching result from config and answers
 */
export function parseVocabularyMatchingResult(
  config: Record<string, unknown>,
  answers: Record<string, unknown>,
  score: number,
): VocabularyMatchingResult | null {
  try {
    const content = (config.content as Record<string, unknown>) || config

    // Get pairs data (words + definitions)
    const pairs = (content.pairs as Array<{
      pair_id: string
      word: string
      definition: string
    }>) || []

    const words = (content.words as Array<{
      pair_id: string
      word: string
    }>) || pairs.map((p) => ({ pair_id: p.pair_id, word: p.word }))

    const definitions = (content.definitions as Array<{
      def_id: string
      definition: string
    }>) || pairs.map((p) => ({ def_id: p.pair_id, definition: p.definition }))

    if (words.length === 0) {
      console.error("[parseVocabularyMatchingResult] No words/pairs found")
      return null
    }

    // Build definition lookup: def_id -> definition text
    const defLookup: Record<string, string> = {}
    for (const d of definitions) {
      defLookup[d.def_id] = d.definition
    }
    // Also from pairs
    for (const p of pairs) {
      defLookup[p.pair_id] = p.definition
    }

    // Extract answer map (pair_id -> def_id)
    let answerMap: Record<string, string> = {}

    const firstKey = Object.keys(answers)[0]
    if (
      firstKey &&
      typeof answers[firstKey] === "object" &&
      answers[firstKey] !== null
    ) {
      const activityEntry = answers[firstKey] as Record<string, unknown>
      if (activityEntry.answers && typeof activityEntry.answers === "object") {
        const outerAnswers = activityEntry.answers as Record<string, unknown>
        const metadataKeys = ["score", "status", "answers", "time_spent"]
        if (outerAnswers.answers && typeof outerAnswers.answers === "object") {
          const inner = outerAnswers.answers as Record<string, unknown>
          for (const [key, value] of Object.entries(inner)) {
            if (!metadataKeys.includes(key) && typeof value === "string") {
              answerMap[key] = value
            }
          }
        }
        if (Object.keys(answerMap).length === 0) {
          for (const [key, value] of Object.entries(outerAnswers)) {
            if (!metadataKeys.includes(key) && typeof value === "string") {
              answerMap[key] = value
            }
          }
        }
      }
      if (Object.keys(answerMap).length === 0) {
        const metadataKeys = ["score", "status", "answers", "time_spent"]
        for (const [key, value] of Object.entries(activityEntry)) {
          if (!metadataKeys.includes(key) && typeof value === "string") {
            answerMap[key] = value
          }
        }
      }
    } else {
      const metadataKeys = ["score", "status", "answers", "time_spent"]
      for (const [key, value] of Object.entries(answers)) {
        if (!metadataKeys.includes(key) && typeof value === "string") {
          answerMap[key] = value
        }
      }
    }

    const itemResults: VocabularyMatchingItemResult[] = words.map((w) => {
      const matchedDefId = answerMap[w.pair_id] || ""
      const isCorrect = matchedDefId === w.pair_id
      return {
        pair_id: w.pair_id,
        word: w.word,
        correct_definition: defLookup[w.pair_id] || "",
        matched_definition: defLookup[matchedDefId] || "",
        is_correct: isCorrect,
      }
    })

    const correctCount = itemResults.filter((r) => r.is_correct).length
    const total = itemResults.length

    return {
      activity_id: (content.activity_id as string) || "result",
      score: correctCount,
      total,
      percentage: total > 0 ? Math.round((correctCount / total) * 100) : 0,
      item_results: itemResults,
      submitted_at: new Date().toISOString(),
    }
  } catch (e) {
    console.error("Failed to parse Vocabulary Matching result:", e)
    return null
  }
}

/**
 * Mix Mode question result
 */
export interface MixModeQuestionResult {
  question_id: string
  skill_slug: string
  format_slug: string
  question_data: Record<string, any>
  student_answer: string | undefined
  is_correct: boolean
  status: "correct" | "incorrect" | "pending_review"
}

/**
 * Mix Mode result
 */
export interface MixModeResult {
  activity_id: string
  total: number
  auto_scored: number
  auto_correct: number
  pending_review: number
  percentage: number
  question_results: MixModeQuestionResult[]
  submitted_at: string
}

/**
 * Parse Mix Mode result from config and answers
 */
export function parseMixModeResult(
  config: Record<string, unknown>,
  answers: Record<string, unknown>,
  score: number,
): MixModeResult | null {
  try {
    const content = (config.content as Record<string, unknown>) || config
    const questions = content.questions as Array<{
      question_id: string
      skill_slug: string
      format_slug: string
      question_data: Record<string, any>
    }>

    if (!questions || !Array.isArray(questions)) {
      console.error("[parseMixModeResult] No questions found in config")
      return null
    }

    // Extract answer map
    let answerMap: Record<string, string> = {}

    const firstKey = Object.keys(answers)[0]
    if (
      firstKey &&
      typeof answers[firstKey] === "object" &&
      answers[firstKey] !== null
    ) {
      const activityEntry = answers[firstKey] as Record<string, unknown>
      if (activityEntry.answers && typeof activityEntry.answers === "object") {
        const outerAnswers = activityEntry.answers as Record<string, unknown>
        const metadataKeys = ["score", "status", "answers", "time_spent"]
        if (outerAnswers.answers && typeof outerAnswers.answers === "object") {
          const inner = outerAnswers.answers as Record<string, unknown>
          for (const [key, value] of Object.entries(inner)) {
            if (!metadataKeys.includes(key)) answerMap[key] = String(value)
          }
        }
        if (Object.keys(answerMap).length === 0) {
          for (const [key, value] of Object.entries(outerAnswers)) {
            if (!metadataKeys.includes(key)) answerMap[key] = String(value)
          }
        }
      }
      if (Object.keys(answerMap).length === 0) {
        const metadataKeys = ["score", "status", "answers", "time_spent"]
        for (const [key, value] of Object.entries(activityEntry)) {
          if (!metadataKeys.includes(key)) answerMap[key] = String(value)
        }
      }
    } else {
      const metadataKeys = ["score", "status", "answers", "time_spent"]
      for (const [key, value] of Object.entries(answers)) {
        if (!metadataKeys.includes(key)) answerMap[key] = String(value)
      }
    }

    const MANUAL_FORMATS = new Set(["free_response", "open_response"])

    let autoCorrect = 0
    let autoScorable = 0
    let pendingReview = 0

    const questionResults: MixModeQuestionResult[] = questions.map((q) => {
      const studentAnswer = answerMap[q.question_id]
      const d = q.question_data

      if (MANUAL_FORMATS.has(q.format_slug)) {
        pendingReview++
        return {
          question_id: q.question_id,
          skill_slug: q.skill_slug,
          format_slug: q.format_slug,
          question_data: d,
          student_answer: studentAnswer,
          is_correct: false,
          status: "pending_review" as const,
        }
      }

      autoScorable++
      let isCorrect = false

      if (studentAnswer !== undefined) {
        switch (q.format_slug) {
          case "mcq":
          case "multiple_choice":
          case "comprehension":
            isCorrect = parseInt(studentAnswer, 10) === d.correct_index
            break
          case "fill_blank": {
            const acceptable = [d.correct_answer, ...(d.acceptable_answers || [])].filter(Boolean)
            isCorrect = acceptable.some((a: string) => studentAnswer.trim().toLowerCase() === a.trim().toLowerCase())
            break
          }
          case "word_builder":
            isCorrect = d.word && studentAnswer.toLowerCase() === d.word.toLowerCase()
            break
          case "sentence_builder":
            try {
              const words = JSON.parse(studentAnswer)
              isCorrect = Array.isArray(words) && words.join(" ") === d.correct_sentence
            } catch { /* skip */ }
            break
          case "matching":
            isCorrect = d.definition && studentAnswer.trim().toLowerCase() === d.definition.trim().toLowerCase()
            break
          case "sentence_corrector":
            isCorrect = d.correct_sentence && studentAnswer.trim().toLowerCase() === d.correct_sentence.trim().toLowerCase()
            break
        }
      }

      if (isCorrect) autoCorrect++

      return {
        question_id: q.question_id,
        skill_slug: q.skill_slug,
        format_slug: q.format_slug,
        question_data: d,
        student_answer: studentAnswer,
        is_correct: isCorrect,
        status: isCorrect ? ("correct" as const) : ("incorrect" as const),
      }
    })

    return {
      activity_id: (content.activity_id as string) || "result",
      total: questions.length,
      auto_scored: autoScorable,
      auto_correct: autoCorrect,
      pending_review: pendingReview,
      percentage: autoScorable > 0 ? Math.round((autoCorrect / autoScorable) * 100) : 0,
      question_results: questionResults,
      submitted_at: new Date().toISOString(),
    }
  } catch (e) {
    console.error("Failed to parse Mix Mode result:", e)
    return null
  }
}

export const SUPPORTED_ACTIVITY_TYPES = [
  "ai_quiz",
  "vocabulary_quiz",
  "reading_comprehension",
  "sentence_builder",
  "word_builder",
  "listening_quiz",
  "listening_fill_blank",
  "listening_word_builder",
  "listening_sentence_builder",
  "writing_sentence_corrector",
  "writing_fill_blank",
  "grammar_fill_blank",
  "writing_free_response",
  "vocabulary_matching",
  "speaking_open_response",
  "mix_mode",
] as const

export type SupportedActivityType = (typeof SUPPORTED_ACTIVITY_TYPES)[number]

/**
 * Check if an activity type supports detailed result review
 */
export function supportsDetailedReview(
  activityType: string,
): activityType is SupportedActivityType {
  return SUPPORTED_ACTIVITY_TYPES.includes(
    activityType as SupportedActivityType,
  )
}
