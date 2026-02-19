/**
 * Standard interfaces for Activity Players
 *
 * These interfaces ensure consistent integration between the Activity Player router
 * and individual activity player components (both existing and AI-generated types).
 */

import type { ActivityType } from "./book"

/**
 * Standard props interface that all activity players must implement.
 *
 * This interface enables:
 * - Consistent progress tracking across all activity types
 * - Unified result submission
 * - Standardized time tracking
 * - Type-safe activity content handling
 */
export interface ActivityPlayerProps {
  /** Unique identifier for the assignment */
  assignmentId: string

  /** Type of activity being played */
  activityType: ActivityType

  /** Activity-specific content data (structure varies by activity type) */
  activityContent: ActivityContent

  /** Callback when activity is completed with final results */
  onComplete: (result: ActivityResult) => void

  /** Callback for intermediate progress updates (autosave, partial completion) */
  onProgress: (progress: ProgressUpdate) => void
}

/**
 * Base interface for all activity content types.
 * Each specific activity type extends this with its own fields.
 */
export interface ActivityContent {
  /** Activity type discriminator */
  type: ActivityType

  /** Additional properties defined by specific activity types */
  [key: string]: unknown
}

/**
 * Result data returned when an activity is completed.
 * Contains all necessary data for scoring and storage.
 */
export interface ActivityResult {
  /** Final completion status */
  status: "completed"

  /** Calculated score (0-100 percentage) */
  score: number

  /** Maximum possible score */
  maxScore: number

  /** Number of correct answers */
  correctCount: number

  /** Total number of questions/items */
  totalCount: number

  /** Time spent in seconds */
  timeSpent: number

  /** Activity-specific response data for storage */
  responseData: Record<string, unknown>
}

/**
 * Progress update data for intermediate saves.
 * Sent during activity play for autosave functionality.
 */
export interface ProgressUpdate {
  /** Current progress status */
  status: "in_progress"

  /** Partial score if applicable */
  score?: number

  /** Maximum possible score */
  maxScore?: number

  /** Time spent so far in seconds */
  timeSpent: number

  /** Partial response data for autosave */
  responseData: Record<string, unknown>
}

/**
 * Standard progress data structure returned from backend API.
 * Matches the ActivityProgressSaveResponse schema.
 */
export interface ActivityProgress {
  /** Assignment identifier */
  assignmentId: string

  /** Activity identifier */
  activityId?: string

  /** Student identifier */
  studentId: string

  /** Current status */
  status: "not_started" | "in_progress" | "completed"

  /** Current score (0-100) */
  score: number

  /** Maximum possible score */
  maxScore: number

  /** Number of correct answers */
  correctCount: number

  /** Total number of items */
  totalCount: number

  /** Time spent in seconds */
  timeSpent: number

  /** When activity was started */
  startedAt: string | null

  /** When activity was completed */
  completedAt: string | null

  /** Activity-specific details */
  details: ActivitySpecificDetails
}

/**
 * Activity-specific details stored in response_data.
 * Structure varies by activity type.
 */
export type ActivitySpecificDetails = Record<string, unknown>

/**
 * Type guard to check if an object implements ActivityPlayerProps
 */
export function isActivityPlayerProps(
  obj: unknown,
): obj is ActivityPlayerProps {
  if (typeof obj !== "object" || obj === null) return false

  const props = obj as Record<string, unknown>

  return (
    typeof props.assignmentId === "string" &&
    typeof props.activityType === "string" &&
    typeof props.activityContent === "object" &&
    typeof props.onComplete === "function" &&
    typeof props.onProgress === "function"
  )
}

/**
 * Helper function to create a completed activity result
 */
export function createActivityResult(
  score: number,
  maxScore: number,
  correctCount: number,
  totalCount: number,
  timeSpent: number,
  responseData: Record<string, unknown>,
): ActivityResult {
  return {
    status: "completed",
    score,
    maxScore,
    correctCount,
    totalCount,
    timeSpent,
    responseData,
  }
}

/**
 * Helper function to create a progress update
 */
export function createProgressUpdate(
  timeSpent: number,
  responseData: Record<string, unknown>,
  score?: number,
  maxScore?: number,
): ProgressUpdate {
  return {
    status: "in_progress",
    timeSpent,
    responseData,
    ...(score !== undefined && { score }),
    ...(maxScore !== undefined && { maxScore }),
  }
}

// ============================================================================
// Question-Level Navigation Interfaces
// Story 27.20: Unified Activity Player Integration
// ============================================================================

/**
 * Unified question-level navigation state exposed by any activity
 * that has sequential questions/items to navigate through.
 *
 * Used by: AIQuizPlayer, VocabularyQuizPlayer, ReadingComprehensionPlayer,
 * SentenceBuilderPlayer, WordBuilderPlayer
 */
export interface QuestionNavigationState {
  /** Current question/item index (0-based) */
  currentIndex: number
  /** Total number of questions/items */
  totalItems: number
  /** IDs of items that have been answered/completed */
  answeredItemIds: string[]
  /** Indices of answered items (for UI rendering) */
  answeredIndices: number[]
}

/**
 * Props for external control of question navigation.
 * Activities that support question navigation should accept these props.
 */
export interface QuestionNavigationProps {
  /** External control: current item index (when controlled by parent) */
  currentItemIndex?: number
  /** External control: callback when item index should change */
  onItemIndexChange?: (index: number) => void
  /** Callback to expose navigation state to parent */
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

/**
 * Activity types that support question-level navigation.
 * These activities have multiple sequential questions/items that can be navigated.
 */
export const QUESTION_NAV_ACTIVITY_TYPES = [
  "ai_quiz",
  "vocabulary_quiz",
  "reading_comprehension",
  "sentence_builder",
  "word_builder",
  // Story 30.11: New skill-based activity types
  "listening_quiz",
  "listening_fill_blank",
  "grammar_fill_blank",
  "writing_fill_blank",
  "listening_sentence_builder",
  "listening_word_builder",
] as const

export type QuestionNavActivityType =
  (typeof QUESTION_NAV_ACTIVITY_TYPES)[number]

/**
 * Check if an activity type supports question-level navigation
 */
export function supportsQuestionNavigation(activityType: string): boolean {
  return QUESTION_NAV_ACTIVITY_TYPES.includes(
    activityType as QuestionNavActivityType,
  )
}
