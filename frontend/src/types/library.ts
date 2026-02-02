/**
 * Library Viewer Types
 * Story 29.2: Create DCS Library Browser Page
 */

export interface LibraryBook {
  id: number
  dream_storage_id: string
  title: string
  book_name: string
  publisher_id: number // DCS publisher ID for logo URL
  publisher_name: string
  cover_image_url: string | null
  activity_count: number
  language?: string | null
  category?: string | null
}

export interface LibraryBooksResponse {
  items: LibraryBook[]
  total: number
  skip: number
  limit: number
}

export interface LibraryFiltersState {
  search: string
  publisherId?: string
  page: number
  limit: number
}

export interface Publisher {
  id: number
  name: string
}
