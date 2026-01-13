/**
 * Activity Player - Universal container for all activity types
 * Story 2.5 - Phase 1, Task 1.1
 * Story 4.8 - Activity Progress Persistence (Save & Resume)
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { useToast } from "@/hooks/use-toast"
import { useAssignmentSubmission } from "@/hooks/useAssignmentSubmission"
import { useAutoSaveWithData } from "@/hooks/useAutoSave"
import type {
  ActivityConfig,
  // Story 27.20: AI-generated activity types for scoring
  AIQuizActivity,
  CircleActivity,
  DragDropPictureActivity,
  DragDropPictureGroupActivity,
  MatchTheWordsActivity,
  PuzzleFindWordsActivity,
  ReadingComprehensionActivity,
  SentenceBuilderActivity,
  VocabularyQuizActivity,
  WordBuilderActivity,
} from "@/lib/mockData"
import {
  scoreCircle,
  scoreDragDrop,
  scoreDragDropGroup,
  scoreMatch,
  scoreWordSearch,
} from "@/lib/scoring"
import { saveProgress } from "@/services/assignmentsApi"
import type { QuestionNavigationState } from "@/types/activity-player"
import { ActivityFooter } from "./ActivityFooter"
import { ActivityHeader } from "./ActivityHeader"
import { ActivityResults, type ScoreResult } from "./ActivityResults"
import { AIQuizPlayerAdapter } from "./AIQuizPlayerAdapter"
import { CirclePlayer } from "./CirclePlayer"
import { DragDropPictureGroupPlayer } from "./DragDropPictureGroupPlayer"
import { DragDropPicturePlayer } from "./DragDropPicturePlayer"
import { MatchTheWordsPlayer } from "./MatchTheWordsPlayer"
import { PuzzleFindWordsPlayer } from "./PuzzleFindWordsPlayer"
import { ReadingComprehensionPlayerAdapter } from "./ReadingComprehensionPlayerAdapter"
import { SentenceBuilderPlayerAdapter } from "./SentenceBuilderPlayerAdapter"
// Story 27.20: AI-generated activity player adapters
import { VocabularyQuizPlayerAdapter } from "./VocabularyQuizPlayerAdapter"
import { WordBuilderPlayerAdapter } from "./WordBuilderPlayerAdapter"

interface ActivityPlayerProps {
  activityConfig: ActivityConfig
  assignmentId: string
  bookId: string // Story 4.2: For backend-proxied image URLs
  bookName: string // For display purposes
  publisherName: string // For display purposes
  bookTitle: string
  activityType:
    | "dragdroppicture"
    | "dragdroppicturegroup"
    | "matchTheWords"
    | "circle"
    | "markwithx"
    | "puzzleFindWords"
    // Story 27.20: AI-generated activity types
    | "vocabulary_quiz"
    | "ai_quiz"
    | "reading_comprehension"
    | "sentence_builder"
    | "word_builder"
  timeLimit?: number // minutes
  onExit: () => void
  initialProgress?: Record<string, any> | null // Story 4.8: Saved progress from backend
  initialTimeSpent?: number // Story 4.8: Previously spent time in minutes
  // Story 8.3: When embedded in MultiActivityPlayer
  // - true: hide both header and footer (fully embedded)
  // - "header-only": show activity header, hide footer
  // - false/undefined: show both header and footer (standalone)
  embedded?: boolean | "header-only"
  // Callback when activity is completed (for multi-activity progress tracking)
  onActivityComplete?: (score: number, answersJson: Record<string, any>) => void
  // Story 9.7: Show correct answers in preview mode (highlights correct positions)
  showCorrectAnswers?: boolean
  // Story 10.3: External reset trigger - increments to trigger reset
  resetTrigger?: number
  // Generic question/item navigation control (for question-level navigation from parent)
  // Works with: ai_quiz, vocabulary_quiz, reading_comprehension, sentence_builder, word_builder
  currentQuestionIndex?: number
  onQuestionIndexChange?: (index: number) => void
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

// Type for activity answers - different players use different data structures
type ActivityAnswers =
  | Map<string, string>
  | Set<string>
  | Map<number, number>
  | null

/**
 * Helper function to restore progress from JSON to appropriate data structure
 * Story 4.8: Convert saved progress back to Map/Set based on activity type
 * Exported for testing
 *
 * Note: Progress can be stored in two formats:
 * 1. Direct: { "key1": "value1", ... }
 * 2. Wrapped: { answers: { "key1": "value1", ... } }
 * We handle both cases by extracting .answers if present
 */
export function restoreProgressFromJson(
  initialProgress: Record<string, any> | null | undefined,
  activityType: string,
): ActivityAnswers {
  if (!initialProgress) return null

  try {
    // Extract answers if wrapped in { answers: ... } format
    const rawAnswers = initialProgress.answers || initialProgress

    // Skip if rawAnswers is empty or not an object
    if (!rawAnswers || typeof rawAnswers !== "object") return null
    if (Object.keys(rawAnswers).length === 0) return null

    console.log(
      "[restoreProgress] Activity type:",
      activityType,
      "Raw answers:",
      rawAnswers,
    )

    if (
      activityType === "dragdroppicture" ||
      activityType === "dragdroppicturegroup" ||
      activityType === "matchTheWords" ||
      // Story 27.20: AI activity types also use Map<string, string>
      activityType === "vocabulary_quiz" ||
      activityType === "ai_quiz" ||
      activityType === "reading_comprehension" ||
      activityType === "sentence_builder" ||
      activityType === "word_builder"
    ) {
      // Convert object back to Map<string, string>
      const map = new Map<string, string>(
        Object.entries(rawAnswers).map(([k, v]) => [k, String(v)]),
      )
      console.log("[restoreProgress] Restored Map with", map.size, "entries")
      return map
    }
    if (activityType === "circle" || activityType === "markwithx") {
      // Convert object back to Map<number, number> for question grouping
      const entries = Object.entries(rawAnswers).map(
        ([k, v]) => [parseInt(k, 10), v as number] as [number, number],
      )
      return new Map(entries)
    }
    if (activityType === "puzzleFindWords") {
      // Convert array back to Set - could be rawAnswers directly or .words property
      const wordsArray = Array.isArray(rawAnswers)
        ? rawAnswers
        : rawAnswers.words || []
      return new Set(wordsArray)
    }
  } catch (error) {
    console.error("Failed to restore progress:", error)
  }

  return null
}

export function ActivityPlayer({
  activityConfig,
  assignmentId,
  bookId,
  bookName: _bookName,
  publisherName: _publisherName,
  bookTitle,
  activityType,
  timeLimit,
  onExit,
  initialProgress,
  initialTimeSpent = 0,
  embedded = false,
  onActivityComplete,
  showCorrectAnswers = false,
  resetTrigger = 0,
  currentQuestionIndex,
  onQuestionIndexChange,
  onNavigationStateChange,
}: ActivityPlayerProps) {
  // Guard clause: activityConfig is required
  if (!activityConfig) {
    throw new Error("ActivityPlayer: activityConfig is required")
  }

  // Story 4.8: Initialize answers from saved progress (must happen before first render)
  const [answers, setAnswers] = useState<ActivityAnswers>(() =>
    restoreProgressFromJson(initialProgress, activityConfig.type),
  )
  const [showResults, setShowResults] = useState(false)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [correctAnswers, setCorrectAnswers] = useState<
    Set<string> | Map<number, number>
  >(new Set())
  const [startTime] = useState<number>(Date.now())
  const { toast } = useToast()

  // Story 10.3: Track reset trigger to reset answers when parent requests
  const prevResetTriggerRef = useRef(resetTrigger)
  useEffect(() => {
    if (resetTrigger !== prevResetTriggerRef.current && resetTrigger > 0) {
      // Reset answers based on activity type
      if (activityType === "puzzleFindWords") {
        setAnswers(new Set<string>())
      } else if (activityType === "circle" || activityType === "markwithx") {
        setAnswers(new Map<number, number>())
      } else {
        setAnswers(new Map<string, string>())
      }
      prevResetTriggerRef.current = resetTrigger
    }
  }, [resetTrigger, activityType])

  // Calculate time spent (initial + new time)
  // Use Math.ceil so any partial minute counts (e.g., 30 seconds = 1 minute)
  const getTimeSpent = () => {
    const elapsedSeconds = (Date.now() - startTime) / 1000
    const newTime = elapsedSeconds > 0 ? Math.ceil(elapsedSeconds / 60) : 0 // minutes
    return initialTimeSpent + newTime
  }

  // Convert answers to JSON format for API
  const convertAnswersToJson = (
    answers: ActivityAnswers,
  ): Record<string, any> => {
    if (!answers) return {}

    if (answers instanceof Map) {
      return Object.fromEntries(answers)
    }
    if (answers instanceof Set) {
      return { words: Array.from(answers) }
    }
    return { answers }
  }

  // Auto-save hook (Story 4.8)
  const { lastSavedAt, isSaving, triggerManualSave } = useAutoSaveWithData(
    convertAnswersToJson(answers),
    getTimeSpent(),
    {
      onSave: async (answersJson, timeSpent) => {
        try {
          await saveProgress(assignmentId, {
            partial_answers_json: answersJson,
            time_spent_minutes: timeSpent,
          })
          console.log("Progress auto-saved to server")
        } catch (error) {
          console.error("Auto-save failed:", error)
          toast({
            title: "Auto-save failed",
            description:
              "Your progress could not be saved. Please try manual save.",
            variant: "destructive",
          })
        }
      },
      interval: 30000, // 30 seconds
      enabled: !showResults, // Only auto-save when not showing results
    },
  )

  // Assignment submission hook
  const {
    submit,
    isSubmitting,
    error: submissionError,
    reset: resetSubmissionError,
  } = useAssignmentSubmission({
    assignmentId,
    onSuccess: () => {
      // Progress is cleared by backend after submission
      console.log("Assignment submitted successfully")
    },
  })

  // Note: Removed "Progress restored" toast to reduce popup notifications
  // Progress restoration is handled silently

  // Track last reported answer hash to prevent infinite loops
  const lastReportedAnswerHashRef = useRef<string>("")

  // Store callback in ref to avoid dependency issues
  const onActivityCompleteRef = useRef(onActivityComplete)
  useEffect(() => {
    onActivityCompleteRef.current = onActivityComplete
  }, [onActivityComplete])

  // Story 8.3: Auto-calculate and report score when embedded and answers change
  // This ensures scores are saved when navigating between activities
  useEffect(() => {
    // Only run when embedded with callback and we have answers
    if (!embedded || !onActivityCompleteRef.current || !answers) return

    // Check if we have enough answers to score
    const hasAnswers =
      (answers instanceof Map && answers.size > 0) ||
      (answers instanceof Set && answers.size > 0)

    if (!hasAnswers) return

    // Create a hash of current answers to detect actual changes
    let answersHash: string
    if (answers instanceof Map) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries = [...(answers as Map<any, any>).entries()]
      answersHash = JSON.stringify(
        entries.sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
      )
    } else if (answers instanceof Set) {
      answersHash = JSON.stringify(Array.from(answers).sort())
    } else {
      answersHash = JSON.stringify(answers)
    }

    // Skip if answers haven't actually changed (prevents infinite loop)
    if (answersHash === lastReportedAnswerHashRef.current) {
      return
    }
    lastReportedAnswerHashRef.current = answersHash

    // Normalize activity type for comparison (handle backend variations)
    const normalizedType = activityType.toLowerCase()

    // Calculate score based on activity type
    let calculatedScore: number | null = null
    let answersJson: Record<string, any> = {}

    try {
      if (normalizedType === "dragdroppicture") {
        const config = activityConfig as DragDropPictureActivity
        const userAnswers = answers as Map<string, string>
        const scoreResult = scoreDragDrop(userAnswers, config.answer)
        calculatedScore = scoreResult.score
        answersJson = { answers: Object.fromEntries(userAnswers) }
      } else if (normalizedType === "dragdroppicturegroup") {
        const config = activityConfig as DragDropPictureGroupActivity
        const userAnswers = answers as Map<string, string>
        const scoreResult = scoreDragDropGroup(userAnswers, config.answer)
        calculatedScore = scoreResult.score
        answersJson = { answers: Object.fromEntries(userAnswers) }
      } else if (normalizedType === "matchthewords") {
        const config = activityConfig as MatchTheWordsActivity
        const userMatches = answers as Map<string, string>
        const scoreResult = scoreMatch(userMatches, config.sentences)
        calculatedScore = scoreResult.score
        answersJson = { answers: Object.fromEntries(userMatches) }
      } else if (
        normalizedType === "circle" ||
        normalizedType === "markwithx"
      ) {
        const config = activityConfig as CircleActivity
        const userSelections = answers as Map<number, number>
        const circleCount = config.circleCount ?? 2
        const scoreResult = scoreCircle(
          userSelections,
          config.answer,
          config.type,
          circleCount,
        )
        calculatedScore = scoreResult.score
        answersJson = { answers: Object.fromEntries(userSelections) }
      } else if (normalizedType === "puzzlefindwords") {
        const config = activityConfig as PuzzleFindWordsActivity
        const foundWords = answers as Set<string>
        const scoreResult = scoreWordSearch(foundWords, config.words)
        calculatedScore = scoreResult.score
        answersJson = { answers: Array.from(foundWords) }
      } else if (normalizedType === "ai_quiz") {
        // Story 27.20: AI Quiz scoring
        const config = activityConfig as AIQuizActivity
        const quiz = config.content
        const userAnswers = answers as Map<string, string>
        let correctCount = 0

        if (quiz?.questions) {
          quiz.questions.forEach(
            (q: { question_id: string; correct_index?: number }) => {
              const userAnswer = userAnswers.get(q.question_id)
              if (
                userAnswer !== undefined &&
                parseInt(userAnswer, 10) === q.correct_index
              ) {
                correctCount++
              }
            },
          )
          calculatedScore =
            quiz.questions.length > 0
              ? Math.round((correctCount / quiz.questions.length) * 100)
              : 0
        }
        answersJson = { answers: Object.fromEntries(userAnswers) }
      } else if (normalizedType === "vocabulary_quiz") {
        // Story 27.20: Vocabulary Quiz scoring
        const config = activityConfig as VocabularyQuizActivity
        const quiz = config.content
        const userAnswers = answers as Map<string, string>
        let correctCount = 0

        if (quiz?.questions) {
          quiz.questions.forEach(
            (q: { question_id: string; correct_answer?: string }) => {
              const userAnswer = userAnswers.get(q.question_id)
              if (userAnswer === q.correct_answer) {
                correctCount++
              }
            },
          )
          calculatedScore =
            quiz.questions.length > 0
              ? Math.round((correctCount / quiz.questions.length) * 100)
              : 0
        }
        answersJson = { answers: Object.fromEntries(userAnswers) }
      } else if (normalizedType === "reading_comprehension") {
        // Story 27.20: Reading Comprehension scoring
        const config = activityConfig as ReadingComprehensionActivity
        const content = config.content
        const userAnswers = answers as Map<string, string>
        let correctCount = 0
        let totalQuestions = 0

        if (content?.questions) {
          content.questions.forEach(
            (q: {
              question_id: string
              question_type?: string
              correct_index?: number
              correct_answer_text?: string
            }) => {
              totalQuestions++
              const userAnswer = userAnswers.get(q.question_id)
              // MCQ/True-False use correct_index, Short Answer uses string comparison
              if (q.question_type === "short_answer") {
                // Simplified - exact match (backend does proper grading)
                if (
                  userAnswer?.toLowerCase().trim() ===
                  q.correct_answer_text?.toLowerCase().trim()
                ) {
                  correctCount++
                }
              } else {
                if (
                  userAnswer !== undefined &&
                  parseInt(userAnswer, 10) === q.correct_index
                ) {
                  correctCount++
                }
              }
            },
          )
          calculatedScore =
            totalQuestions > 0
              ? Math.round((correctCount / totalQuestions) * 100)
              : 0
        }
        answersJson = { answers: Object.fromEntries(userAnswers) }
      } else if (normalizedType === "sentence_builder") {
        // Story 27.20: Sentence Builder scoring
        const config = activityConfig as SentenceBuilderActivity
        const content = config.content
        const userAnswers = answers as Map<string, string>
        let correctCount = 0

        if (content?.sentences) {
          content.sentences.forEach(
            (s: {
              item_id?: string
              sentence_id?: string
              correct_sentence?: string
              correct_order?: string[]
              words?: string[]
            }) => {
              // Support both item_id and sentence_id
              const sentenceId = s.item_id || s.sentence_id || ""
              const userAnswer = userAnswers.get(sentenceId)
              // User answer is JSON stringified array of words or direct comparison with correct_sentence
              if (userAnswer) {
                try {
                  const userWords = JSON.parse(userAnswer)
                  const userSentence = Array.isArray(userWords) ? userWords.join(" ") : userAnswer
                  // Compare with correct_sentence (string) or correct_order/words (array)
                  if (s.correct_sentence) {
                    if (userSentence === s.correct_sentence) {
                      correctCount++
                    }
                  } else {
                    const correctWords = s.correct_order || s.words
                    if (JSON.stringify(userWords) === JSON.stringify(correctWords)) {
                      correctCount++
                    }
                  }
                } catch {
                  // If not JSON, compare directly with correct_sentence
                  if (s.correct_sentence && userAnswer === s.correct_sentence) {
                    correctCount++
                  }
                }
              }
            },
          )
          calculatedScore =
            content.sentences.length > 0
              ? Math.round((correctCount / content.sentences.length) * 100)
              : 0
        }
        answersJson = { answers: Object.fromEntries(userAnswers) }
      } else if (normalizedType === "word_builder") {
        // Story 27.20: Word Builder scoring
        const config = activityConfig as WordBuilderActivity
        const content = config.content
        const userAnswers = answers as Map<string, string>
        let correctCount = 0

        if (content?.words) {
          content.words.forEach((w: { item_id?: string; word_id?: string; correct_word?: string; word?: string }) => {
            // Support both item_id and word_id, and both correct_word and word
            const wordId = w.item_id || w.word_id || ""
            const correctWord = w.correct_word || w.word || ""
            const userAnswer = userAnswers.get(wordId)
            if (userAnswer?.toLowerCase() === correctWord?.toLowerCase()) {
              correctCount++
            }
          })
          calculatedScore =
            content.words.length > 0
              ? Math.round((correctCount / content.words.length) * 100)
              : 0
        }
        answersJson = { answers: Object.fromEntries(userAnswers) }
      }

      // Report score to parent using ref (avoids infinite loop)
      if (calculatedScore !== null && onActivityCompleteRef.current) {
        onActivityCompleteRef.current(calculatedScore, answersJson)
      }
    } catch (error) {
      console.error("Error calculating score:", error)
    }
  }, [embedded, answers, activityConfig, activityType]) // Removed onActivityComplete from deps

  // Save before page unload (Story 4.8)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!answers || showResults) return

      // Try to save synchronously
      const answersJson = convertAnswersToJson(answers)
      const timeSpent = getTimeSpent()

      // Use navigator.sendBeacon for reliable save on unload
      const blob = new Blob(
        [
          JSON.stringify({
            partial_answers_json: answersJson,
            time_spent_minutes: timeSpent,
          }),
        ],
        { type: "application/json" },
      )

      navigator.sendBeacon(
        `${import.meta.env.VITE_API_URL || ""}/api/v1/assignments/${assignmentId}/save-progress`,
        blob,
      )

      // Show confirmation dialog
      e.preventDefault()
      e.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [answers, showResults, assignmentId, convertAnswersToJson, getTimeSpent])

  const handleSubmit = async () => {
    if (!answers) return

    // Convert answers to JSON format for backend
    let answersJson: Record<string, any>
    if (answers instanceof Map) {
      answersJson = Object.fromEntries(answers)
    } else if (answers instanceof Set) {
      answersJson = { words: Array.from(answers) }
    } else {
      answersJson = { answers }
    }

    // Calculate score based on activity type using scoring library
    let score: ScoreResult
    const correctSet = new Set<string>()

    if (activityConfig.type === "dragdroppicture") {
      const config = activityConfig as DragDropPictureActivity
      const userAnswers = answers as Map<string, string>
      score = scoreDragDrop(userAnswers, config.answer)

      // Build correct answers set for results view
      config.answer.forEach((answer) => {
        const dropZoneId = `${answer.coords.x}-${answer.coords.y}`
        const userAnswer = userAnswers.get(dropZoneId)
        if (userAnswer === answer.text) {
          correctSet.add(dropZoneId)
        }
      })
    } else if (activityConfig.type === "dragdroppicturegroup") {
      const config = activityConfig as DragDropPictureGroupActivity
      const userAnswers = answers as Map<string, string>
      score = scoreDragDropGroup(userAnswers, config.answer)

      // Build correct answers set for results view (check if answer is in group)
      config.answer.forEach((answer) => {
        const dropZoneId = `${answer.coords.x}-${answer.coords.y}`
        const userAnswer = userAnswers.get(dropZoneId)
        if (userAnswer && answer.group.includes(userAnswer)) {
          correctSet.add(dropZoneId)
        }
      })
    } else if (activityConfig.type === "matchTheWords") {
      const config = activityConfig as MatchTheWordsActivity
      const userMatches = answers as Map<string, string>
      score = scoreMatch(userMatches, config.sentences)

      // Build correct answers set for results view
      config.sentences.forEach((sentence) => {
        const userAnswer = userMatches.get(sentence.sentence)
        if (userAnswer === sentence.word) {
          correctSet.add(sentence.sentence)
        }
      })
    } else if (
      activityConfig.type === "circle" ||
      activityConfig.type === "markwithx"
    ) {
      const config = activityConfig as CircleActivity
      const userSelections = answers as Map<number, number>
      // Default to 2 if circleCount is undefined (handles backend configs without circleCount)
      const circleCount = config.circleCount ?? 2
      score = scoreCircle(
        userSelections,
        config.answer,
        config.type,
        circleCount,
      )

      // Build correct answers map for results view (questionIndex -> correctAnswerIndex)
      const correctMap = new Map<number, number>()
      const isMultiSelectMode = circleCount === -1
      const effectiveCircleCount = circleCount === 0 ? 2 : circleCount

      if (isMultiSelectMode) {
        // For multi-select mode, keep old Set behavior for display
        config.answer.forEach((answer, answerIndex) => {
          if (answer.isCorrect) {
            correctMap.set(answerIndex, answerIndex)
          }
        })
      } else {
        // For question grouping mode
        const questionCount = Math.ceil(
          config.answer.length / effectiveCircleCount,
        )
        for (
          let questionIndex = 0;
          questionIndex < questionCount;
          questionIndex++
        ) {
          // Find correct answer in this question group
          const groupStart = questionIndex * effectiveCircleCount
          const groupEnd = Math.min(
            groupStart + effectiveCircleCount,
            config.answer.length,
          )

          for (
            let answerIndex = groupStart;
            answerIndex < groupEnd;
            answerIndex++
          ) {
            if (config.answer[answerIndex].isCorrect) {
              correctMap.set(questionIndex, answerIndex)
              break
            }
          }
        }
      }

      setCorrectAnswers(correctMap)
      setScoreResult(score)
      setShowResults(true)

      // Story 8.3: Notify parent (MultiActivityPlayer) of completion with score
      if (onActivityComplete) {
        onActivityComplete(score.score, answersJson)
      }

      // Submit to backend (Story 4.8: Use getTimeSpent for initial + new time)
      // Only submit directly if not embedded (parent handles submission for embedded)
      if (!embedded) {
        submit({
          answers_json: answersJson,
          score: score.score,
          time_spent_minutes: getTimeSpent(),
        })
      }
      return // Early return since we already set correctAnswers
    } else if (activityConfig.type === "puzzleFindWords") {
      const config = activityConfig as PuzzleFindWordsActivity
      const foundWords = answers as Set<string>
      score = scoreWordSearch(foundWords, config.words)

      // Add all found words to correct set for results view
      for (const word of foundWords) {
        correctSet.add(word)
      }
    } else if (activityConfig.type === "ai_quiz") {
      // Story 27.20: AI Quiz scoring
      const config = activityConfig as AIQuizActivity
      const quiz = config.content
      const userAnswers = answers as Map<string, string>
      let correctCount = 0
      let totalQuestions = 0

      if (quiz?.questions) {
        quiz.questions.forEach(
          (q: { question_id: string; correct_index?: number }) => {
            const userAnswer = userAnswers.get(q.question_id)
            totalQuestions++
            // Parse "index:X" format
            const answerIndex = userAnswer?.startsWith("index:")
              ? parseInt(userAnswer.substring(6), 10)
              : parseInt(userAnswer || "", 10)
            if (!isNaN(answerIndex) && answerIndex === q.correct_index) {
              correctCount++
              correctSet.add(q.question_id)
            }
          },
        )
      }
      score = {
        score: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
        correct: correctCount,
        total: totalQuestions,
        breakdown: { activity_type: "ai_quiz" },
      }
      answersJson = { answers: Object.fromEntries(userAnswers) }
    } else if (activityConfig.type === "vocabulary_quiz") {
      // Story 27.20: Vocabulary Quiz scoring
      const config = activityConfig as VocabularyQuizActivity
      const quiz = config.content
      const userAnswers = answers as Map<string, string>
      let correctCount = 0
      let totalQuestions = 0

      if (quiz?.questions) {
        quiz.questions.forEach(
          (q: { question_id: string; correct_answer?: string }) => {
            const userAnswer = userAnswers.get(q.question_id)
            totalQuestions++
            if (userAnswer === q.correct_answer) {
              correctCount++
              correctSet.add(q.question_id)
            }
          },
        )
      }
      score = {
        score: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
        correct: correctCount,
        total: totalQuestions,
        breakdown: { activity_type: "vocabulary_quiz" },
      }
      answersJson = { answers: Object.fromEntries(userAnswers) }
    } else if (activityConfig.type === "reading_comprehension") {
      // Story 27.20: Reading Comprehension scoring
      const config = activityConfig as ReadingComprehensionActivity
      const content = config.content
      const userAnswers = answers as Map<string, string>
      let correctCount = 0
      let totalQuestions = 0

      if (content?.questions) {
        content.questions.forEach(
          (q: {
            question_id: string
            question_type?: string
            correct_index?: number
            correct_answer?: string
          }) => {
            const userAnswer = userAnswers.get(q.question_id)
            totalQuestions++

            if (q.question_type === "short_answer") {
              // Parse "text:X" format
              const answerText = userAnswer?.startsWith("text:")
                ? userAnswer.substring(5)
                : userAnswer
              if (
                answerText?.toLowerCase().trim() ===
                q.correct_answer?.toLowerCase().trim()
              ) {
                correctCount++
                correctSet.add(q.question_id)
              }
            } else {
              // MCQ/True-False - parse "index:X" format
              const answerIndex = userAnswer?.startsWith("index:")
                ? parseInt(userAnswer.substring(6), 10)
                : parseInt(userAnswer || "", 10)
              if (!isNaN(answerIndex) && answerIndex === q.correct_index) {
                correctCount++
                correctSet.add(q.question_id)
              }
            }
          },
        )
      }
      score = {
        score: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
        correct: correctCount,
        total: totalQuestions,
        breakdown: { activity_type: "reading_comprehension" },
      }
      answersJson = { answers: Object.fromEntries(userAnswers) }
    } else if (activityConfig.type === "sentence_builder") {
      // Story 27.20: Sentence Builder scoring
      const config = activityConfig as SentenceBuilderActivity
      const content = config.content
      const userAnswers = answers as Map<string, string>
      let correctCount = 0
      let totalSentences = 0

      if (content?.sentences) {
        content.sentences.forEach(
          (s: {
            item_id?: string
            correct_sentence?: string
            correct_order?: string[]
            words?: string[]
          }) => {
            const sentenceId = s.item_id || ""
            const userAnswer = userAnswers.get(sentenceId)
            totalSentences++

            if (userAnswer) {
              try {
                const userWords = JSON.parse(userAnswer)
                const userSentence = Array.isArray(userWords) ? userWords.join(" ") : userAnswer
                if (s.correct_sentence) {
                  if (userSentence === s.correct_sentence) {
                    correctCount++
                    correctSet.add(sentenceId)
                  }
                } else {
                  const correctWords = s.correct_order || s.words
                  if (JSON.stringify(userWords) === JSON.stringify(correctWords)) {
                    correctCount++
                    correctSet.add(sentenceId)
                  }
                }
              } catch {
                if (s.correct_sentence && userAnswer === s.correct_sentence) {
                  correctCount++
                  correctSet.add(sentenceId)
                }
              }
            }
          },
        )
      }
      score = {
        score: totalSentences > 0 ? Math.round((correctCount / totalSentences) * 100) : 0,
        correct: correctCount,
        total: totalSentences,
        breakdown: { activity_type: "sentence_builder" },
      }
      answersJson = { answers: Object.fromEntries(userAnswers) }
    } else if (activityConfig.type === "word_builder") {
      // Story 27.20: Word Builder scoring
      const config = activityConfig as WordBuilderActivity
      const content = config.content
      const userAnswers = answers as Map<string, string>
      let correctCount = 0
      let totalWords = 0

      if (content?.words) {
        content.words.forEach((w: { item_id?: string; word_id?: string; correct_word?: string; word?: string }) => {
          const wordId = w.item_id || w.word_id || ""
          const correctWord = w.correct_word || w.word || ""
          const userAnswer = userAnswers.get(wordId)
          totalWords++

          if (userAnswer?.toLowerCase() === correctWord?.toLowerCase()) {
            correctCount++
            correctSet.add(wordId)
          }
        })
      }
      score = {
        score: totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0,
        correct: correctCount,
        total: totalWords,
        breakdown: { activity_type: "word_builder" },
      }
      answersJson = { answers: Object.fromEntries(userAnswers) }
    } else {
      // Mock score for other activity types (to be implemented)
      score = {
        score: 85,
        correct: 17,
        total: 20,
        breakdown: {
          activity_type: activityConfig.type,
        },
      }
    }

    setCorrectAnswers(correctSet)
    setScoreResult(score)
    setShowResults(true)

    // Story 8.3: Notify parent (MultiActivityPlayer) of completion with score
    if (onActivityComplete) {
      onActivityComplete(score.score, answersJson)
    }

    // Submit to backend (Story 4.8: Use getTimeSpent for initial + new time)
    // Only submit directly if not embedded (parent handles submission for embedded)
    if (!embedded) {
      submit({
        answers_json: answersJson,
        score: score.score,
        time_spent_minutes: getTimeSpent(),
      })
    }
  }

  // Handler for when player components update their answers
  // Memoized to prevent infinite loops in child components
  // Also compares values to prevent unnecessary state updates that cause loops
  const handleAnswersChange = useCallback((newAnswers: ActivityAnswers) => {
    setAnswers((prevAnswers) => {
      // Skip update if both are null/undefined
      if (!newAnswers && !prevAnswers) return prevAnswers

      // If one is null and other isn't, update
      if (!newAnswers || !prevAnswers) return newAnswers

      // Compare Map values
      if (newAnswers instanceof Map && prevAnswers instanceof Map) {
        if (newAnswers.size !== prevAnswers.size) return newAnswers
        for (const [key, value] of newAnswers) {
          if ((prevAnswers as Map<unknown, unknown>).get(key) !== value) return newAnswers
        }
        return prevAnswers // Same content, keep reference
      }

      // Compare Set values
      if (newAnswers instanceof Set && prevAnswers instanceof Set) {
        if (newAnswers.size !== prevAnswers.size) return newAnswers
        for (const value of newAnswers) {
          if (!prevAnswers.has(value)) return newAnswers
        }
        return prevAnswers // Same content, keep reference
      }

      // Different types or other cases - update
      return newAnswers
    })
  }, [])

  const handleSave = async () => {
    if (!answers) return

    try {
      await triggerManualSave()
      toast({
        title: "Progress saved",
        description: "Your work has been saved successfully",
      })
    } catch (error) {
      console.error("Failed to save progress:", error)
      toast({
        title: "Save failed",
        description: "Could not save your progress. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleTimeExpired = () => {
    // Auto-submit when time expires
    handleSubmit()
  }

  // Render appropriate player based on activity type
  const renderPlayer = () => {
    const fallbackUI = (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="rounded-lg bg-white p-8 text-center shadow-lg dark:bg-neutral-800">
          <h2 className="mb-4 text-xl font-bold text-red-600 dark:text-red-400">
            Activity Error
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Something went wrong while loading this activity.
          </p>
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg bg-teal-600 px-6 py-2 font-semibold text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
          >
            Back to Assignments
          </button>
        </div>
      </div>
    )

    switch (activityConfig.type) {
      case "dragdroppicture":
        return (
          <ErrorBoundary fallback={fallbackUI}>
            <DragDropPicturePlayer
              activity={activityConfig as DragDropPictureActivity}
              bookId={bookId}
              onAnswersChange={handleAnswersChange}
              showResults={showResults}
              correctAnswers={correctAnswers as Set<string>}
              initialAnswers={answers as Map<string, string>}
              showCorrectAnswers={showCorrectAnswers}
            />
          </ErrorBoundary>
        )

      case "dragdroppicturegroup":
        return (
          <ErrorBoundary fallback={fallbackUI}>
            <DragDropPictureGroupPlayer
              activity={activityConfig as DragDropPictureGroupActivity}
              bookId={bookId}
              onAnswersChange={handleAnswersChange}
              showResults={showResults}
              correctAnswers={correctAnswers as Set<string>}
              initialAnswers={answers as Map<string, string>}
              showCorrectAnswers={showCorrectAnswers}
            />
          </ErrorBoundary>
        )

      case "matchTheWords":
        return (
          <MatchTheWordsPlayer
            activity={activityConfig as MatchTheWordsActivity}
            bookId={bookId}
            onAnswersChange={handleAnswersChange}
            showResults={showResults}
            correctAnswers={correctAnswers as Set<string>}
            initialAnswers={answers as Map<string, string>}
            showCorrectAnswers={showCorrectAnswers}
          />
        )

      case "circle":
      case "markwithx":
        return (
          <CirclePlayer
            activity={activityConfig as CircleActivity}
            bookId={bookId}
            onAnswersChange={handleAnswersChange}
            showResults={showResults}
            correctAnswers={correctAnswers as Map<number, number>}
            initialAnswers={answers as Map<number, number>}
            showCorrectAnswers={showCorrectAnswers}
          />
        )

      case "puzzleFindWords":
        return (
          <PuzzleFindWordsPlayer
            activity={activityConfig as PuzzleFindWordsActivity}
            onAnswersChange={handleAnswersChange}
            showResults={showResults}
            assignmentId={assignmentId}
            initialAnswers={answers as Set<string>}
            showCorrectAnswers={showCorrectAnswers}
          />
        )

      // Story 27.20: AI-generated activity players
      case "vocabulary_quiz":
        return (
          <VocabularyQuizPlayerAdapter
            activity={activityConfig}
            onAnswersChange={handleAnswersChange}
            showResults={showResults}
            correctAnswers={correctAnswers as Set<string>}
            initialAnswers={answers as Map<string, string>}
            showCorrectAnswers={showCorrectAnswers}
            currentQuestionIndex={currentQuestionIndex}
            onQuestionIndexChange={onQuestionIndexChange}
            onNavigationStateChange={onNavigationStateChange}
          />
        )

      case "ai_quiz":
        return (
          <AIQuizPlayerAdapter
            activity={activityConfig}
            onAnswersChange={handleAnswersChange}
            showResults={showResults}
            correctAnswers={correctAnswers as Set<string>}
            initialAnswers={answers as Map<string, string>}
            showCorrectAnswers={showCorrectAnswers}
            currentQuestionIndex={currentQuestionIndex}
            onQuestionIndexChange={onQuestionIndexChange}
            onNavigationStateChange={onNavigationStateChange}
          />
        )

      case "reading_comprehension":
        return (
          <ReadingComprehensionPlayerAdapter
            activity={activityConfig}
            onAnswersChange={handleAnswersChange}
            showResults={showResults}
            correctAnswers={correctAnswers as Set<string>}
            initialAnswers={answers as Map<string, string>}
            showCorrectAnswers={showCorrectAnswers}
            currentQuestionIndex={currentQuestionIndex}
            onQuestionIndexChange={onQuestionIndexChange}
            onNavigationStateChange={onNavigationStateChange}
          />
        )

      case "sentence_builder":
        return (
          <SentenceBuilderPlayerAdapter
            activity={activityConfig}
            onAnswersChange={handleAnswersChange}
            showResults={showResults}
            correctAnswers={correctAnswers as Set<string>}
            initialAnswers={answers as Map<string, string>}
            showCorrectAnswers={showCorrectAnswers}
            currentSentenceIndex={currentQuestionIndex}
            onSentenceIndexChange={onQuestionIndexChange}
            onNavigationStateChange={onNavigationStateChange}
          />
        )

      case "word_builder":
        return (
          <WordBuilderPlayerAdapter
            activity={activityConfig}
            onAnswersChange={handleAnswersChange}
            showResults={showResults}
            correctAnswers={correctAnswers as Set<string>}
            initialAnswers={answers as Map<string, string>}
            showCorrectAnswers={showCorrectAnswers}
            currentWordIndex={currentQuestionIndex}
            onWordIndexChange={onQuestionIndexChange}
            onNavigationStateChange={onNavigationStateChange}
          />
        )

      default:
        return (
          <div className="p-8 text-center text-red-500">
            <p>Unsupported activity type</p>
          </div>
        )
    }
  }

  // When fully embedded (embedded=true), render only the player content with full height
  if (embedded === true) {
    return (
      <div className="flex h-full flex-col bg-gray-50 dark:bg-neutral-900">
        {/* Main Content - Activity Only - Full Height */}
        <div className="flex h-full min-h-0 flex-1">
          <div className="h-full w-full">
            {!showResults && renderPlayer()}
            {showResults && scoreResult && (
              <ActivityResults
                scoreResult={scoreResult}
                onReviewAnswers={() => setShowResults(false)}
                onExit={onExit}
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  // When embedded="header-only", show activity header but hide footer
  if (embedded === "header-only") {
    return (
      <div className="flex h-full flex-col bg-gray-50 dark:bg-neutral-900">
        {/* Activity Header */}
        <ActivityHeader
          bookTitle={bookTitle}
          activityType={activityType}
          timeLimit={undefined} // Timer handled by MultiActivityPlayer
          onTimeExpired={handleTimeExpired}
          activityConfig={activityConfig}
          bookId={bookId}
        />

        {/* Main Content - Full remaining height */}
        <div className="flex min-h-0 flex-1">
          <div className="h-full w-full">
            {!showResults && renderPlayer()}
            {showResults && scoreResult && (
              <ActivityResults
                scoreResult={scoreResult}
                onReviewAnswers={() => setShowResults(false)}
                onExit={onExit}
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  // Standalone mode - full header/footer
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-neutral-900">
      {/* Activity Header */}
      <ActivityHeader
        bookTitle={bookTitle}
        activityType={activityType}
        timeLimit={timeLimit}
        onTimeExpired={handleTimeExpired}
        activityConfig={activityConfig}
        bookId={bookId}
      />

      {/* Main Content - Centered */}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="w-full h-full max-w-screen-2xl">
          {!showResults && renderPlayer()}
          {showResults && scoreResult && (
            <ActivityResults
              scoreResult={scoreResult}
              onReviewAnswers={() => setShowResults(false)}
              onExit={onExit}
            />
          )}
        </div>
      </div>

      {/* Submission Error Banner */}
      {submissionError && (
        <div className="border-t border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                  Submission Failed
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  {submissionError.message ||
                    "Unable to submit your assignment. Please try again."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => resetSubmissionError()}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              aria-label="Dismiss error"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Activity Footer */}
      {!showResults && (
        <ActivityFooter
          onExit={onExit}
          onSave={handleSave}
          onSubmit={handleSubmit}
          isComplete={
            !!answers &&
            (answers instanceof Map
              ? answers.size > 0
              : answers instanceof Set
                ? answers.size > 0
                : Object.keys(answers).length > 0)
          }
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          lastSavedAt={lastSavedAt}
        />
      )}
    </div>
  )
}
