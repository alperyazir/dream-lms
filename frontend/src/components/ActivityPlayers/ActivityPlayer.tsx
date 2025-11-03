/**
 * Activity Player - Universal container for all activity types
 * Story 2.5 - Phase 1, Task 1.1
 */

import { useEffect, useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import type {
  ActivityConfig,
  CircleActivity,
  DragDropPictureActivity,
  MatchTheWordsActivity,
  PuzzleFindWordsActivity,
} from "@/lib/mockData"
import {
  scoreCircle,
  scoreDragDrop,
  scoreMatch,
  scoreWordSearch,
} from "@/lib/scoring"
import { ActivityFooter } from "./ActivityFooter"
import { ActivityHeader } from "./ActivityHeader"
import { ActivityResults, type ScoreResult } from "./ActivityResults"
import { CirclePlayer } from "./CirclePlayer"
import { DragDropPicturePlayer } from "./DragDropPicturePlayer"
import { MatchTheWordsPlayer } from "./MatchTheWordsPlayer"
import { PuzzleFindWordsPlayer } from "./PuzzleFindWordsPlayer"

interface ActivityPlayerProps {
  activityConfig: ActivityConfig
  assignmentId: string
  bookTitle: string
  activityType:
    | "dragdroppicture"
    | "dragdroppicturegroup"
    | "matchTheWords"
    | "circle"
    | "markwithx"
    | "puzzleFindWords"
  timeLimit?: number // minutes
  onExit: () => void
}

// Type for activity answers - different players use different data structures
type ActivityAnswers = Map<string, string> | Set<string> | null

export function ActivityPlayer({
  activityConfig,
  assignmentId,
  bookTitle,
  activityType,
  timeLimit,
  onExit,
}: ActivityPlayerProps) {
  const [answers, setAnswers] = useState<ActivityAnswers>(null)
  const [showResults, setShowResults] = useState(false)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState<Set<string>>(new Set())

  // Auto-save logic - save progress every 30 seconds
  useEffect(() => {
    if (!answers || showResults) return

    const interval = setInterval(() => {
      // Save to localStorage for now (can be Zustand store later)
      try {
        // Convert Map/Set to serializable format
        const serializableAnswers =
          answers instanceof Map
            ? Array.from(answers.entries())
            : answers instanceof Set
              ? Array.from(answers)
              : answers

        localStorage.setItem(
          `activity_progress_${assignmentId}`,
          JSON.stringify({
            answers: serializableAnswers,
            timestamp: new Date().toISOString(),
          }),
        )
        console.log("Progress auto-saved")
      } catch (error) {
        console.error("Failed to save progress:", error)
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [answers, assignmentId, showResults])

  // Load saved progress on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`activity_progress_${assignmentId}`)
      if (saved) {
        const { answers: savedAnswers } = JSON.parse(saved)
        // Convert saved answers to appropriate type based on activity
        if (
          activityConfig.type === "dragdroppicture" ||
          activityConfig.type === "matchTheWords"
        ) {
          // Convert array of entries back to Map
          setAnswers(new Map(savedAnswers))
        } else if (
          activityConfig.type === "circle" ||
          activityConfig.type === "markwithx" ||
          activityConfig.type === "puzzleFindWords"
        ) {
          // Convert array back to Set
          setAnswers(new Set(savedAnswers))
        }
      }
    } catch (error) {
      console.error("Failed to load saved progress:", error)
    }
  }, [assignmentId, activityConfig.type])

  const handleSubmit = async () => {
    if (!answers) return

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
      const userSelections = answers as Set<string>
      score = scoreCircle(userSelections, config.answer, config.type)

      // Build correct answers set for results view
      config.answer.forEach((answer) => {
        const coordKey = `${answer.coords.x}-${answer.coords.y}`
        const wasSelected = userSelections.has(coordKey)
        if (wasSelected && answer.isCorrect) {
          correctSet.add(coordKey)
        }
      })
    } else if (activityConfig.type === "puzzleFindWords") {
      const config = activityConfig as PuzzleFindWordsActivity
      const foundWords = answers as Set<string>
      score = scoreWordSearch(foundWords, config.words)

      // Add all found words to correct set for results view
      for (const word of foundWords) {
        correctSet.add(word)
      }
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

    // Clear saved progress after submission
    try {
      localStorage.removeItem(`activity_progress_${assignmentId}`)
    } catch (error) {
      console.error("Failed to clear progress:", error)
    }
  }

  // Handler for when player components update their answers
  const handleAnswersChange = (newAnswers: ActivityAnswers) => {
    setAnswers(newAnswers)
  }

  const handleSave = async () => {
    if (!answers) return

    setIsSaving(true)
    try {
      // Convert Map/Set to serializable format
      const serializableAnswers =
        answers instanceof Map
          ? Array.from(answers.entries())
          : answers instanceof Set
            ? Array.from(answers)
            : answers

      localStorage.setItem(
        `activity_progress_${assignmentId}`,
        JSON.stringify({
          answers: serializableAnswers,
          timestamp: new Date().toISOString(),
        }),
      )
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      console.log("Progress saved manually")
    } catch (error) {
      console.error("Failed to save progress:", error)
    } finally {
      setIsSaving(false)
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
        <div className="rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
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
              onAnswersChange={handleAnswersChange}
              showResults={showResults}
              correctAnswers={correctAnswers}
              initialAnswers={answers as Map<string, string>}
            />
          </ErrorBoundary>
        )

      case "matchTheWords":
        return (
          <ErrorBoundary fallback={fallbackUI}>
            <MatchTheWordsPlayer
              activity={activityConfig as MatchTheWordsActivity}
              onAnswersChange={handleAnswersChange}
              showResults={showResults}
              correctAnswers={correctAnswers}
              initialAnswers={answers as Map<string, string>}
            />
          </ErrorBoundary>
        )

      case "circle":
      case "markwithx":
        return (
          <ErrorBoundary fallback={fallbackUI}>
            <CirclePlayer
              activity={activityConfig as CircleActivity}
              onAnswersChange={handleAnswersChange}
              showResults={showResults}
              correctAnswers={correctAnswers}
              initialAnswers={answers as Set<string>}
            />
          </ErrorBoundary>
        )

      case "puzzleFindWords":
        return (
          <ErrorBoundary fallback={fallbackUI}>
            <PuzzleFindWordsPlayer
              activity={activityConfig as PuzzleFindWordsActivity}
              onAnswersChange={handleAnswersChange}
              showResults={showResults}
              assignmentId={assignmentId}
              initialAnswers={answers as Set<string>}
            />
          </ErrorBoundary>
        )

      default:
        return (
          <div className="p-8 text-center text-red-500">
            <p>Unsupported activity type</p>
          </div>
        )
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Activity Header */}
      <ActivityHeader
        bookTitle={bookTitle}
        activityType={activityType}
        timeLimit={timeLimit}
        onTimeExpired={handleTimeExpired}
      />

      {/* Main Content */}
      <div className="flex-1">
        {!showResults && renderPlayer()}
        {showResults && scoreResult && (
          <ActivityResults
            scoreResult={scoreResult}
            onReviewAnswers={() => setShowResults(false)}
            onExit={onExit}
          />
        )}
      </div>

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
        />
      )}
    </div>
  )
}
