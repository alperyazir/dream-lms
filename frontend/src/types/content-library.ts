/**
 * Content Library Types
 * Story 27.21: Content Library UI
 *
 * Types for managing saved AI-generated content in the library.
 */

export interface ContentCreator {
  id: string
  name: string
}

export interface ContentItem {
  id: string
  activity_type: string
  title: string
  source_type: "book" | "material"
  book_id: number | null
  book_title: string | null
  material_id: string | null
  material_name: string | null
  item_count: number
  created_at: string
  updated_at: string | null
  used_in_assignments: number
  is_shared: boolean
  created_by: ContentCreator
}

export interface ContentItemDetail extends ContentItem {
  content: Record<string, any>
}

export interface LibraryFilters {
  type?: string
  source_type?: "book" | "material"
  book_id?: number
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}

export interface LibraryResponse {
  items: ContentItem[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface DeleteContentResponse {
  message: string
  content_id: string
}

export interface UpdateContentRequest {
  title?: string
  content?: Record<string, any>
}

export interface UpdateContentResponse {
  message: string
  content_id: string
  updated_at: string
}

// =============================================================================
// Book-Centric Content Library Types
// =============================================================================

export interface BookContentItem {
  content_id: string
  activity_type: string
  title: string
  item_count: number
  has_audio: boolean
  difficulty: string | null
  language: string | null
  created_by_id: string | null
  created_by_name: string | null
  book_id: number
}

export interface BookContentListResponse {
  items: BookContentItem[]
  total: number
  page: number
  page_size: number
  has_more: boolean
  book_id: number
}

export interface BookContentDetail extends BookContentItem {
  content: Record<string, any>
}
