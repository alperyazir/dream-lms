/**
 * Sentence Builder Activity type definitions for Dream LMS.
 * Story 27.13: Sentence Builder Activity (Duolingo-Style)
 *
 * These types support Duolingo-style sentence building activities where
 * students arrange jumbled words into correct sentence order.
 */

/**
 * Valid difficulty levels for sentence builder
 */
export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number]

/**
 * Difficulty level word count ranges
 */
export const DIFFICULTY_WORD_RANGES: Record<
  DifficultyLevel,
  { min: number; max: number }
> = {
  easy: { min: 4, max: 6 },
  medium: { min: 7, max: 10 },
  hard: { min: 11, max: 20 },
}

/**
 * Valid sentence count options
 */
export const SENTENCE_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export type SentenceCount = (typeof SENTENCE_COUNT_OPTIONS)[number]

/**
 * Request payload for generating a sentence builder activity
 */
export interface SentenceBuilderRequest {
  book_id: number
  module_ids?: number[]
  sentence_count?: number
  difficulty?: DifficultyLevel
  include_audio?: boolean
}

/**
 * A single sentence item with shuffled word bank (full view)
 */
export interface SentenceBuilderItem {
  item_id: string
  correct_sentence: string
  words: string[]
  word_count: number
  audio_url: string | null
  source_module_id: number
  source_page: number | null
  difficulty: string
}

/**
 * A single sentence item without correct answer (student view)
 */
export interface SentenceBuilderItemPublic {
  item_id: string
  words: string[]
  word_count: number
  difficulty: string
}

/**
 * Full sentence builder activity with correct answers (teacher view)
 */
export interface SentenceBuilderActivity {
  activity_id: string
  book_id: number
  module_ids: number[]
  sentences: SentenceBuilderItem[]
  difficulty: string
  include_audio: boolean
  created_at: string
}

/**
 * Public sentence builder activity without correct answers (student view)
 */
export interface SentenceBuilderActivityPublic {
  activity_id: string
  book_id: number
  module_ids: number[]
  sentences: SentenceBuilderItemPublic[]
  difficulty: string
  include_audio: boolean
  created_at: string
  sentence_count: number
}

/**
 * Request payload for submitting sentence answers
 */
export interface SentenceBuilderSubmission {
  answers: Record<string, string[]>
}

/**
 * Result for a single sentence after submission
 */
export interface SentenceResult {
  item_id: string
  submitted_words: string[]
  correct_sentence: string
  is_correct: boolean
  audio_url: string | null
}

/**
 * Overall sentence builder result after submission
 */
export interface SentenceBuilderResult {
  activity_id: string
  student_id: string
  score: number
  total: number
  percentage: number
  sentence_results: SentenceResult[]
  submitted_at: string
  difficulty: string
}

/**
 * Activity state for the player component
 */
export type SentenceActivityState =
  | "loading"
  | "ready"
  | "in_progress"
  | "checking"
  | "correct"
  | "incorrect"
  | "completed"
  | "error"

/**
 * Current sentence state during activity
 */
export interface CurrentSentenceState {
  itemId: string
  placedWords: string[]
  availableWords: string[]
  isChecking: boolean
  isCorrect: boolean | null
  attempts: number
}

/**
 * Human-readable labels for difficulty levels
 */
export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: "Easy (4-6 words)",
  medium: "Medium (7-10 words)",
  hard: "Hard (11+ words)",
}

/**
 * Descriptions for difficulty levels
 */
export const DIFFICULTY_DESCRIPTIONS: Record<DifficultyLevel, string> = {
  easy: "Short sentences with simple structure - perfect for beginners",
  medium:
    "Medium-length sentences with some complexity - good for intermediate learners",
  hard: "Long sentences with complex structure - challenging for advanced learners",
}

/**
 * Type guard to check if activity has correct answers (teacher view)
 */
export function isFullActivity(
  activity: SentenceBuilderActivity | SentenceBuilderActivityPublic,
): activity is SentenceBuilderActivity {
  return (
    activity.sentences.length > 0 && "correct_sentence" in activity.sentences[0]
  )
}

/**
 * Type guard to check if activity is public view
 */
export function isPublicActivity(
  activity: SentenceBuilderActivity | SentenceBuilderActivityPublic,
): activity is SentenceBuilderActivityPublic {
  return "sentence_count" in activity
}

/**
 * Check if a sentence item has correct answer (full view)
 */
export function isFullSentenceItem(
  item: SentenceBuilderItem | SentenceBuilderItemPublic,
): item is SentenceBuilderItem {
  return "correct_sentence" in item
}

/**
 * Get the progress text for current sentence
 */
export function getProgressText(currentIndex: number, total: number): string {
  return `${currentIndex + 1} of ${total}`
}

/**
 * Check if the placed words match the correct sentence
 */
export function checkAnswer(
  placedWords: string[],
  correctSentence: string,
): boolean {
  return placedWords.join(" ") === correctSentence
}

/**
 * Get feedback message based on correctness
 */
export function getFeedbackMessage(
  isCorrect: boolean,
  attempts: number,
): string {
  if (isCorrect) {
    if (attempts === 1) {
      return "Perfect! First try!"
    }
    return "Correct! Well done!"
  }
  return "Not quite right. Try again!"
}
