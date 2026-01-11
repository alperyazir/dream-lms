/**
 * Word Builder (Spelling Activity) type definitions for Dream LMS.
 * Story 27.14: Word Builder (Spelling Activity)
 *
 * These types support spelling practice activities where students
 * click scrambled letters to spell vocabulary words.
 */

/**
 * Valid hint types for word builder
 */
export const HINT_TYPES = ["definition", "audio", "both"] as const
export type HintType = (typeof HINT_TYPES)[number]

/**
 * Valid word count options
 */
export const WORD_COUNT_OPTIONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
] as const
export type WordCount = (typeof WORD_COUNT_OPTIONS)[number]

/**
 * Request payload for generating a word builder activity
 */
export interface WordBuilderRequest {
  book_id: number
  module_ids?: number[]
  word_count?: number
  cefr_levels?: string[]
  hint_type?: HintType
}

/**
 * A single word item with scrambled letters (full view)
 */
export interface WordBuilderItem {
  item_id: string
  correct_word: string
  letters: string[]
  definition: string
  audio_url: string | null
  vocabulary_id: string
  cefr_level: string
}

/**
 * A single word item without correct answer (student view)
 */
export interface WordBuilderItemPublic {
  item_id: string
  letters: string[]
  definition: string
  audio_url: string | null
  letter_count: number
}

/**
 * Full word builder activity with correct answers (teacher view)
 */
export interface WordBuilderActivity {
  activity_id: string
  book_id: number
  module_ids: number[]
  words: WordBuilderItem[]
  hint_type: string
  created_at: string
}

/**
 * Public word builder activity without correct words (student view)
 */
export interface WordBuilderActivityPublic {
  activity_id: string
  book_id: number
  module_ids: number[]
  words: WordBuilderItemPublic[]
  hint_type: string
  created_at: string
  word_count: number
}

/**
 * Request payload for submitting word spellings
 */
export interface WordBuilderSubmission {
  answers: Record<string, string>
  attempts: Record<string, number>
}

/**
 * Result for a single word after submission
 */
export interface WordResult {
  item_id: string
  submitted_word: string
  correct_word: string
  is_correct: boolean
  attempts: number
  points: number
  audio_url: string | null
  definition: string
}

/**
 * Overall word builder result after submission
 */
export interface WordBuilderResult {
  activity_id: string
  student_id: string
  score: number
  max_score: number
  percentage: number
  correct_count: number
  total: number
  word_results: WordResult[]
  perfect_words: number
  average_attempts: number
  submitted_at: string
}

/**
 * Activity state for the player component
 */
export type WordActivityState =
  | "loading"
  | "ready"
  | "in_progress"
  | "checking"
  | "correct"
  | "incorrect"
  | "completed"
  | "error"

/**
 * Current word state during activity
 */
export interface CurrentWordState {
  itemId: string
  placedLetters: string[]
  availableLetters: LetterWithIndex[]
  isChecking: boolean
  isCorrect: boolean | null
  attempts: number
}

/**
 * Letter with original index for tracking
 */
export interface LetterWithIndex {
  letter: string
  originalIndex: number
}

/**
 * Human-readable labels for hint types
 */
export const HINT_TYPE_LABELS: Record<HintType, string> = {
  definition: "Definition Only",
  audio: "Audio Only",
  both: "Definition & Audio",
}

/**
 * Descriptions for hint types
 */
export const HINT_TYPE_DESCRIPTIONS: Record<HintType, string> = {
  definition: "Show only the word definition as a hint",
  audio: "Allow students to hear the word pronunciation",
  both: "Show definition and allow audio playback",
}

/**
 * Type guard to check if activity has correct words (teacher view)
 */
export function isFullActivity(
  activity: WordBuilderActivity | WordBuilderActivityPublic,
): activity is WordBuilderActivity {
  return activity.words.length > 0 && "correct_word" in activity.words[0]
}

/**
 * Type guard to check if activity is public view
 */
export function isPublicActivity(
  activity: WordBuilderActivity | WordBuilderActivityPublic,
): activity is WordBuilderActivityPublic {
  return "word_count" in activity
}

/**
 * Check if a word item has correct answer (full view)
 */
export function isFullWordItem(
  item: WordBuilderItem | WordBuilderItemPublic,
): item is WordBuilderItem {
  return "correct_word" in item
}

/**
 * Get the progress text for current word
 */
export function getProgressText(currentIndex: number, total: number): string {
  return `${currentIndex + 1} of ${total}`
}

/**
 * Check if the placed letters form the correct word
 */
export function checkSpelling(
  placedLetters: string[],
  correctWord: string,
): boolean {
  return placedLetters.join("").toLowerCase() === correctWord.toLowerCase()
}

/**
 * Get feedback message based on correctness and attempts
 */
export function getFeedbackMessage(
  isCorrect: boolean,
  attempts: number,
): string {
  if (isCorrect) {
    if (attempts === 1) {
      return "Perfect! First try!"
    }
    if (attempts === 2) {
      return "Great job!"
    }
    return "Correct! Well done!"
  }
  return "Not quite right. Try again!"
}

/**
 * Get points text based on attempts
 */
export function getPointsText(attempts: number, isCorrect: boolean): string {
  if (!isCorrect) return "0 points"
  if (attempts === 1) return "100 points (Perfect!)"
  if (attempts === 2) return "70 points"
  if (attempts === 3) return "50 points"
  return "30 points"
}

/**
 * Initialize available letters with indices for tracking
 */
export function initializeLettersWithIndices(
  letters: string[],
): LetterWithIndex[] {
  return letters.map((letter, index) => ({
    letter,
    originalIndex: index,
  }))
}
