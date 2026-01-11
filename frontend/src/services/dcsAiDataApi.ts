/**
 * DCS AI Data API Service
 *
 * API functions for fetching AI-processed book data from DCS
 * through the LMS proxy endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"

/**
 * Processing metadata for a book
 */
export interface ProcessingMetadata {
  book_id: string
  processing_status:
    | "pending"
    | "processing"
    | "completed"
    | "partial"
    | "failed"
  total_pages: number
  total_modules: number
  total_vocabulary: number
  total_audio_files: number
  languages: string[]
  primary_language: string
  difficulty_range: string[]
  stages?: Record<string, unknown>
}

/**
 * Module summary from DCS AI data
 */
export interface AIModuleSummary {
  module_id: number
  title: string
  pages: number[]
  word_count: number
}

/**
 * Response containing list of AI modules
 */
export interface AIModuleListResponse {
  book_id: string
  total_modules: number
  modules: AIModuleSummary[]
}

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

/**
 * Get AI processing status for a book
 *
 * @param bookId - The DCS book ID
 * @returns Processing metadata including status and totals
 */
export async function getBookAIStatus(
  bookId: number,
): Promise<ProcessingMetadata> {
  const response = await apiClient.get<ProcessingMetadata>(
    `/api/v1/ai/books/${bookId}/status`,
  )
  return response.data
}

/**
 * Get AI modules for a book
 *
 * Returns the list of modules with proper DCS module IDs.
 * Use these module_ids when generating activities.
 *
 * @param bookId - The DCS book ID
 * @returns Module list with IDs, titles, pages, and word counts
 */
export async function getBookAIModules(
  bookId: number,
): Promise<AIModuleListResponse> {
  const response = await apiClient.get<AIModuleListResponse>(
    `/api/v1/ai/books/${bookId}/modules`,
  )
  return response.data
}

/**
 * Check if a book has completed AI processing
 *
 * @param bookId - The DCS book ID
 * @returns true if processing is complete, false otherwise
 */
export async function isBookAIReady(bookId: number): Promise<boolean> {
  try {
    const status = await getBookAIStatus(bookId)
    return status.processing_status === "completed"
  } catch {
    return false
  }
}
