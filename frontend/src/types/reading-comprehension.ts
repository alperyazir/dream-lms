/**
 * Reading Comprehension type definitions for Dream LMS.
 * Story 27.10: Reading Comprehension Generation
 */

/**
 * Valid question types for reading comprehension
 */
export const READING_QUESTION_TYPES = [
  "mcq",
  "true_false",
  "short_answer",
] as const
export type ReadingQuestionType = (typeof READING_QUESTION_TYPES)[number]

/**
 * Valid difficulty levels
 */
export const READING_DIFFICULTIES = ["auto", "easy", "medium", "hard"] as const
export type ReadingDifficulty = (typeof READING_DIFFICULTIES)[number]

/**
 * Question count constraints
 */
export const READING_MIN_QUESTIONS = 1
export const READING_MAX_QUESTIONS = 10
export const READING_DEFAULT_QUESTIONS = 5

/**
 * Request payload for generating a reading comprehension activity.
 * The LLM will create an original passage based on module topics/context,
 * then generate comprehension questions about that passage.
 */
export interface ReadingComprehensionRequest {
  book_id: number
  module_id: number
  module_ids?: number[]
  question_count?: number
  question_types?: ReadingQuestionType[]
  difficulty?: ReadingDifficulty
}

/**
 * A single comprehension question with correct answer (teacher view)
 */
export interface ReadingComprehensionQuestion {
  question_id: string
  question_type: ReadingQuestionType
  question_text: string
  options: string[] | null
  correct_answer: string
  correct_index: number | null
  explanation: string
  passage_reference: string
}

/**
 * A single comprehension question without correct answer (student view)
 */
export interface ReadingComprehensionQuestionPublic {
  question_id: string
  question_type: ReadingQuestionType
  question_text: string
  options: string[] | null
}

/**
 * Word-level timestamp for audio synchronization
 */
export interface WordTimestamp {
  word: string
  start: number
  end: number
}

/**
 * Audio data for a passage narration with word highlighting
 */
export interface PassageAudioData {
  audio_base64: string
  word_timestamps: WordTimestamp[]
  duration_seconds: number
}

/**
 * Full reading comprehension activity with correct answers (teacher view)
 */
export interface ReadingComprehensionActivity {
  activity_id: string
  book_id: number
  module_id: number
  module_title: string
  passage: string
  passage_pages: number[]
  questions: ReadingComprehensionQuestion[]
  difficulty: string
  language: string
  created_at: string
  passage_audio?: PassageAudioData | null
}

/**
 * Public reading comprehension activity without correct answers (student view)
 */
export interface ReadingComprehensionActivityPublic {
  activity_id: string
  book_id: number
  module_id: number
  module_title: string
  passage: string
  passage_pages: number[]
  questions: ReadingComprehensionQuestionPublic[]
  difficulty: string
  language: string
  created_at: string
  question_count: number
  passage_audio?: PassageAudioData | null
}

/**
 * A single answer in a submission
 */
export interface ReadingComprehensionAnswer {
  question_id: string
  answer_index?: number | null
  answer_text?: string | null
}

/**
 * Request payload for submitting reading comprehension answers
 */
export interface ReadingComprehensionSubmission {
  answers: ReadingComprehensionAnswer[]
}

/**
 * Result for a single question after submission
 */
export interface ReadingComprehensionQuestionResult {
  question_id: string
  question_type: ReadingQuestionType
  question_text: string
  options: string[] | null
  correct_answer: string
  correct_index: number | null
  student_answer_index: number | null
  student_answer_text: string | null
  is_correct: boolean
  similarity_score: number | null
  explanation: string
  passage_reference: string
}

/**
 * Overall activity result after submission
 */
export interface ReadingComprehensionResult {
  activity_id: string
  student_id: string
  score: number
  total: number
  percentage: number
  question_results: ReadingComprehensionQuestionResult[]
  score_by_type: Record<string, { correct: number; total: number }>
  submitted_at: string
  difficulty: string
  passage: string
  module_title: string
}

/**
 * Reading comprehension state for the player component
 */
export type ReadingComprehensionState =
  | "loading"
  | "ready"
  | "in_progress"
  | "submitting"
  | "completed"
  | "error"

/**
 * Reading comprehension container state
 */
export type ReadingComprehensionContainerState =
  | "form"
  | "generating"
  | "playing"
  | "results"

/**
 * Type guard to check if activity has correct answers (full activity)
 */
export function isFullActivity(
  activity: ReadingComprehensionActivity | ReadingComprehensionActivityPublic,
): activity is ReadingComprehensionActivity {
  return (
    activity.questions.length > 0 && "correct_answer" in activity.questions[0]
  )
}

/**
 * Type guard to check if activity is public view
 */
export function isPublicActivity(
  activity: ReadingComprehensionActivity | ReadingComprehensionActivityPublic,
): activity is ReadingComprehensionActivityPublic {
  return (
    activity.questions.length > 0 &&
    !("correct_answer" in activity.questions[0])
  )
}

/**
 * Get question type label for display
 */
export function getQuestionTypeLabel(type: ReadingQuestionType): string {
  const labels: Record<ReadingQuestionType, string> = {
    mcq: "Multiple Choice",
    true_false: "True/False",
    short_answer: "Short Answer",
  }
  return labels[type] || type
}

/**
 * Get question type abbreviation
 */
export function getQuestionTypeAbbrev(type: ReadingQuestionType): string {
  const abbrevs: Record<ReadingQuestionType, string> = {
    mcq: "MCQ",
    true_false: "T/F",
    short_answer: "SA",
  }
  return abbrevs[type] || type
}

/**
 * Get difficulty label for display
 */
export function getDifficultyLabel(
  difficulty: ReadingDifficulty | string,
): string {
  const labels: Record<string, string> = {
    auto: "Auto (Based on CEFR)",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
  }
  return labels[difficulty] || difficulty
}

/**
 * Get difficulty color for styling
 */
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "text-green-600"
    case "medium":
      return "text-yellow-600"
    case "hard":
      return "text-red-600"
    default:
      return "text-gray-600"
  }
}
