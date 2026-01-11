/**
 * Vocabulary Explorer type definitions
 * Story 27.18: Vocabulary Explorer with Audio Player
 */

/**
 * CEFR proficiency levels
 */
export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2"

/**
 * Part of speech categories
 */
export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "conjunction"
  | "interjection"

/**
 * A single vocabulary word from DCS AI data
 */
export interface VocabularyWord {
  id: string
  word: string
  translation: string // Turkish translation
  definition: string // English definition
  example_sentence: string | null
  cefr_level: CEFRLevel
  part_of_speech: PartOfSpeech | null
  module_name: string // Module where word appears
  book_id: number
  has_audio: boolean // Whether audio is available for this word
}

/**
 * Filter parameters for vocabulary search
 */
export interface VocabularyFilters {
  bookId: number
  moduleId?: string
  search?: string
  cefrLevels?: CEFRLevel[]
  partOfSpeech?: PartOfSpeech
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number
  pageSize: number
}

/**
 * Paginated response for vocabulary list
 */
export interface VocabularyListResponse {
  items: VocabularyWord[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Module information from book
 */
export interface ModuleInfo {
  id: string
  name: string
  vocabulary_count: number
}

/**
 * Book with AI processing status for vocabulary
 */
export interface BookWithVocabulary {
  id: number
  title: string
  publisher_name: string
  has_ai_data: boolean
  processing_status: "pending" | "processing" | "completed" | "failed" | null
  vocabulary_count: number
  modules: ModuleInfo[]
}

/**
 * Audio URL response from DCS
 */
export interface AudioUrlResponse {
  url: string // Presigned URL
  expires_at: string // ISO timestamp
}
