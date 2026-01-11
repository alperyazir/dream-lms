/**
 * AI Quiz type definitions for Dream LMS AI-Generated MCQ Quizzes.
 * Story 27.9: AI Quiz Generation (MCQ)
 */

/**
 * Valid difficulty levels for AI quiz generation
 */
export const AI_QUIZ_DIFFICULTIES = ["auto", "easy", "medium", "hard"] as const
export type AIQuizDifficulty = (typeof AI_QUIZ_DIFFICULTIES)[number]

/**
 * Valid question count range
 */
export const AI_QUIZ_MIN_QUESTIONS = 1
export const AI_QUIZ_MAX_QUESTIONS = 20
export const AI_QUIZ_DEFAULT_QUESTIONS = 10

/**
 * Request payload for generating an AI quiz
 */
export interface AIQuizGenerationRequest {
  book_id: number
  module_ids: number[]
  difficulty?: AIQuizDifficulty
  question_count?: number
  language?: string
  include_explanations?: boolean
}

/**
 * A single MCQ question with correct answer (teacher view)
 */
export interface AIQuizQuestion {
  question_id: string
  question_text: string
  options: string[]
  correct_answer: string
  correct_index: number
  explanation: string | null
  source_module_id: number
  source_page: number | null
  difficulty: string
}

/**
 * A single MCQ question without correct answer (student view)
 */
export interface AIQuizQuestionPublic {
  question_id: string
  question_text: string
  options: string[]
  source_module_id: number
  difficulty: string
}

/**
 * Full AI quiz with correct answers (teacher view / after generation)
 */
export interface AIQuiz {
  quiz_id: string
  book_id: number
  module_ids: number[]
  questions: AIQuizQuestion[]
  difficulty: string
  language: string
  created_at: string
}

/**
 * Public AI quiz without correct answers (student view)
 */
export interface AIQuizPublic {
  quiz_id: string
  book_id: number
  module_ids: number[]
  questions: AIQuizQuestionPublic[]
  difficulty: string
  language: string
  created_at: string
  question_count: number
}

/**
 * Request payload for submitting AI quiz answers
 */
export interface AIQuizSubmission {
  answers: Record<string, number>
}

/**
 * Result for a single question after submission
 */
export interface AIQuizQuestionResult {
  question_id: string
  question_text: string
  options: string[]
  correct_answer: string
  correct_index: number
  student_answer_index: number | null
  student_answer: string | null
  is_correct: boolean
  explanation: string | null
  source_module_id: number
}

/**
 * Overall quiz result after submission
 */
export interface AIQuizResult {
  quiz_id: string
  student_id: string
  score: number
  total: number
  percentage: number
  question_results: AIQuizQuestionResult[]
  submitted_at: string
  difficulty: string
}

/**
 * AI Quiz state for the player component
 */
export type AIQuizState =
  | "loading"
  | "ready"
  | "in_progress"
  | "submitting"
  | "completed"
  | "error"

/**
 * AI Quiz container state
 */
export type AIQuizContainerState = "form" | "generating" | "playing" | "results"

/**
 * Type guard to check if quiz has correct answers (full quiz)
 */
export function isFullAIQuiz(quiz: AIQuiz | AIQuizPublic): quiz is AIQuiz {
  return quiz.questions.length > 0 && "correct_answer" in quiz.questions[0]
}

/**
 * Type guard to check if quiz is public view
 */
export function isPublicAIQuiz(
  quiz: AIQuiz | AIQuizPublic,
): quiz is AIQuizPublic {
  return quiz.questions.length > 0 && !("correct_answer" in quiz.questions[0])
}

/**
 * Get difficulty label for display
 */
export function getDifficultyLabel(difficulty: AIQuizDifficulty): string {
  const labels: Record<AIQuizDifficulty, string> = {
    auto: "Auto",
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
