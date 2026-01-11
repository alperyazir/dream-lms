/**
 * Vocabulary Explorer API Service
 * Story 27.18: Vocabulary Explorer with Audio Player
 *
 * API client functions for browsing book vocabulary from DCS AI data
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  AudioUrlResponse,
  BookWithVocabulary,
  PaginationParams,
  VocabularyFilters,
  VocabularyListResponse,
} from "../types/vocabulary-explorer"

/**
 * Create axios instance with OpenAPI config
 */
const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
})

// Add token interceptor
apiClient.interceptors.request.use(async (config) => {
  if (!config.baseURL) {
    config.baseURL = OpenAPI.BASE
  }

  const token = OpenAPI.TOKEN
  if (token) {
    const tokenValue =
      typeof token === "function"
        ? await token({
            method: (config.method || "GET") as
              | "GET"
              | "POST"
              | "PUT"
              | "DELETE"
              | "PATCH"
              | "OPTIONS"
              | "HEAD",
            url: config.url || "",
          })
        : token
    if (tokenValue) {
      config.headers.Authorization = `Bearer ${tokenValue}`
    }
  }
  return config
})

const VOCAB_BASE = "/api/v1/ai/vocabulary"

/**
 * Get list of books with AI vocabulary data processed
 *
 * Only returns books that have AI data available for vocabulary exploration.
 *
 * @returns Promise with list of books with vocabulary
 */
export async function getBooksWithVocabulary(): Promise<BookWithVocabulary[]> {
  const url = `${VOCAB_BASE}/books`
  const response = await apiClient.get<BookWithVocabulary[]>(url)
  return response.data
}

/**
 * Get paginated vocabulary list with filters
 *
 * @param filters - Filter parameters (book, module, search, CEFR levels)
 * @param pagination - Page number and page size
 * @returns Promise with paginated vocabulary list
 */
export async function getVocabulary(
  filters: VocabularyFilters,
  pagination: PaginationParams,
): Promise<VocabularyListResponse> {
  const params = new URLSearchParams({
    book_id: filters.bookId.toString(),
    page: pagination.page.toString(),
    page_size: pagination.pageSize.toString(),
  })

  if (filters.moduleId) {
    params.set("module_id", filters.moduleId)
  }

  if (filters.search) {
    params.set("search", filters.search)
  }

  if (filters.cefrLevels && filters.cefrLevels.length > 0) {
    params.set("levels", filters.cefrLevels.join(","))
  }

  if (filters.partOfSpeech) {
    params.set("part_of_speech", filters.partOfSpeech)
  }

  const url = `${VOCAB_BASE}?${params.toString()}`
  const response = await apiClient.get<VocabularyListResponse>(url)
  return response.data
}

/**
 * Get presigned audio URL for a word
 *
 * Fetches a presigned URL from DCS for text-to-speech audio of the word.
 * The URL is valid for a limited time (usually 1 hour).
 *
 * @param bookId - Book ID
 * @param language - Language code (e.g., "en" for English)
 * @param word - Word to get audio for
 * @returns Promise with audio URL response
 */
export async function getAudioUrl(
  bookId: number,
  language: string,
  word: string,
): Promise<AudioUrlResponse> {
  const url = `${VOCAB_BASE}/${bookId}/audio`
  const response = await apiClient.post<AudioUrlResponse>(url, {
    language,
    word,
  })
  return response.data
}

/**
 * Export as object for easier imports
 */
export const vocabularyExplorerApi = {
  getBooksWithVocabulary,
  getVocabulary,
  getAudioUrl,
}

export default vocabularyExplorerApi
