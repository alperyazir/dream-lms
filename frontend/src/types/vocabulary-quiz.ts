/**
 * Vocabulary Quiz type definitions for Dream LMS AI-Generated Quizzes.
 * Story 27.8: Vocabulary Quiz Generation (Definition-Based)
 */

/**
 * Valid CEFR levels for vocabulary filtering
 */
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const
export type CEFRLevel = (typeof CEFR_LEVELS)[number]

/**
 * Quiz length options
 */
export const QUIZ_LENGTH_OPTIONS = [5, 10, 15, 20, 25, 30] as const
export type QuizLength = (typeof QUIZ_LENGTH_OPTIONS)[number]

/**
 * Valid quiz mode options
 */
export const QUIZ_MODES = ["definition", "synonym", "antonym", "mixed"] as const
export type QuizMode = (typeof QUIZ_MODES)[number]

/**
 * Request payload for generating a vocabulary quiz
 */
export interface VocabularyQuizGenerationRequest {
  book_id: number
  module_ids?: number[]
  quiz_length?: number // 1-50, default 10
  cefr_levels?: CEFRLevel[]
  include_audio?: boolean
  quiz_mode?: QuizMode
}

/**
 * Question type for vocabulary quiz questions
 */
export type QuestionType = "definition" | "synonym" | "antonym"

/**
 * A single quiz question with correct answer (teacher view)
 */
export interface VocabularyQuizQuestion {
  question_id: string
  definition: string // The prompt (definition, synonym, or antonym)
  correct_answer: string
  options: string[]
  audio_url: string | null
  vocabulary_id: string
  cefr_level: string
  question_type: QuestionType
}

/**
 * A single quiz question without correct answer (student view)
 */
export interface VocabularyQuizQuestionPublic {
  question_id: string
  definition: string // The prompt (definition, synonym, or antonym)
  options: string[]
  audio_url: string | null
  cefr_level: string
  question_type: QuestionType
}

/**
 * Full quiz with correct answers (teacher view / after submission)
 */
export interface VocabularyQuiz {
  quiz_id: string
  book_id: number
  module_ids: number[]
  questions: VocabularyQuizQuestion[]
  created_at: string
  quiz_length: number
  quiz_mode: QuizMode
}

/**
 * Public quiz without correct answers (student view)
 */
export interface VocabularyQuizPublic {
  quiz_id: string
  book_id: number
  questions: VocabularyQuizQuestionPublic[]
  quiz_length: number
  quiz_mode: QuizMode
}

/**
 * Request payload for submitting quiz answers
 */
export interface VocabularyQuizSubmission {
  answers: Record<string, string>
}

/**
 * Result for a single question after submission
 */
export interface QuestionResult {
  question_id: string
  definition: string
  correct_answer: string
  user_answer: string
  is_correct: boolean
  audio_url: string | null
}

/**
 * Overall quiz result after submission
 */
export interface VocabularyQuizResult {
  quiz_id: string
  student_id: string
  score: number
  total: number
  percentage: number
  results: QuestionResult[]
  submitted_at: string
}

/**
 * Quiz state for the player component
 */
export type QuizState =
  | "loading"
  | "ready"
  | "in_progress"
  | "submitting"
  | "completed"
  | "error"

/**
 * Type guard to check if quiz has correct answers (teacher view)
 */
export function isFullQuiz(
  quiz: VocabularyQuiz | VocabularyQuizPublic,
): quiz is VocabularyQuiz {
  return quiz.questions.length > 0 && "correct_answer" in quiz.questions[0]
}

/**
 * Type guard to check if quiz is public view
 */
export function isPublicQuiz(
  quiz: VocabularyQuiz | VocabularyQuizPublic,
): quiz is VocabularyQuizPublic {
  return quiz.questions.length > 0 && !("correct_answer" in quiz.questions[0])
}
