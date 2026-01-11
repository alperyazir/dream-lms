/**
 * Teacher Material AI Processing Types for Story 27.15
 *
 * TypeScript interfaces for teacher material processing and AI content generation.
 */

import type { MaterialType } from "./material"

// =============================================================================
// Source Types
// =============================================================================

export type SourceType = "pdf" | "text" | "other"

// =============================================================================
// Text Extraction
// =============================================================================

export interface TextExtractionResult {
  extracted_text: string
  word_count: number
  language: string | null
  source_type: "pdf" | "text"
}

// =============================================================================
// Teacher Material (AI Processing)
// =============================================================================

/**
 * Teacher material with AI processing fields
 */
export interface TeacherMaterial {
  id: string
  teacher_id: string
  name: string
  description: string | null
  type: MaterialType
  source_type: SourceType

  // File info (for PDFs)
  original_filename: string | null
  file_size: number | null
  mime_type: string | null

  // AI Processing fields
  extracted_text: string | null
  word_count: number | null
  language: string | null

  // Timestamps
  created_at: string
  updated_at: string

  // Computed fields
  download_url: string | null
  is_processable: boolean // True if has extracted_text
}

/**
 * Response for listing teacher materials
 */
export interface TeacherMaterialListResponse {
  materials: TeacherMaterial[]
  total_count: number
}

/**
 * Response after uploading material with text extraction
 */
export interface TeacherMaterialUploadResponse {
  material: TeacherMaterial
  extraction: TextExtractionResult | null
}

// =============================================================================
// Material Creation
// =============================================================================

/**
 * Request to create material from text
 */
export interface TextMaterialCreate {
  name: string
  description?: string
  text: string
}

// =============================================================================
// Generated Content
// =============================================================================

/**
 * Activity types supported by AI generation
 */
export type ActivityType =
  | "vocab_quiz"
  | "ai_quiz"
  | "reading"
  | "matching"
  | "sentence_builder"
  | "word_builder"

/**
 * Generated AI content response
 */
export interface GeneratedContent {
  id: string
  teacher_id: string
  material_id: string | null
  book_id: number | null
  activity_type: string
  title: string
  content: Record<string, unknown>
  is_used: boolean
  assignment_id: string | null
  created_at: string

  // Enriched fields
  material_name: string | null
  book_name: string | null
}

/**
 * Response for listing generated content
 */
export interface GeneratedContentListResponse {
  items: GeneratedContent[]
  total_count: number
}

// =============================================================================
// Source Selection
// =============================================================================

/**
 * Source selection for AI generation
 */
export interface SourceSelection {
  source_type: "book" | "material"
  book_id?: number
  material_id?: string
}

/**
 * Material preview for AI generation
 */
export interface MaterialPreview {
  id: string
  name: string
  extracted_text: string
  word_count: number
  language: string | null
  truncated: boolean
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum text input size (100KB)
 */
export const MAX_TEXT_INPUT_SIZE = 100 * 1024

/**
 * Maximum PDF file size for AI processing (50MB)
 */
export const MAX_PDF_SIZE = 50 * 1024 * 1024

/**
 * Display names for activity types
 */
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  vocab_quiz: "Vocabulary Quiz",
  ai_quiz: "Quiz",
  reading: "Reading Comprehension",
  matching: "Vocabulary Matching",
  sentence_builder: "Sentence Builder",
  word_builder: "Word Builder",
}

/**
 * Language code display names
 */
export const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  tr: "Turkish",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
}

/**
 * Get display name for language code
 */
export function getLanguageLabel(code: string | null): string {
  if (!code) return "Unknown"
  return LANGUAGE_LABELS[code] || code.toUpperCase()
}

/**
 * Format word count with appropriate unit
 */
export function formatWordCount(count: number | null): string {
  if (count === null) return "0 words"
  if (count === 1) return "1 word"
  return `${count.toLocaleString()} words`
}
