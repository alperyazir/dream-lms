/**
 * Content Library API Service
 * Story 27.21: Content Library UI
 *
 * This service provides functions to interact with the Content Library API endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  BookContentDetail,
  BookContentListResponse,
  ContentItemDetail,
  DeleteContentResponse,
  LibraryFilters,
  LibraryResponse,
  UpdateContentRequest,
  UpdateContentResponse,
} from "../types/content-library"

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
 * List content library items with optional filters
 */
export async function listLibraryContent(
  filters?: LibraryFilters,
): Promise<LibraryResponse> {
  const response = await apiClient.get<LibraryResponse>("/api/v1/ai/library", {
    params: filters,
  })
  return response.data
}

/**
 * Get detailed content library item
 */
export async function getLibraryContentDetail(
  contentId: string,
): Promise<ContentItemDetail> {
  const response = await apiClient.get<ContentItemDetail>(
    `/api/v1/ai/library/${contentId}`,
  )
  return response.data
}

/**
 * Delete content library item
 */
export async function deleteLibraryContent(
  contentId: string,
): Promise<DeleteContentResponse> {
  const response = await apiClient.delete<DeleteContentResponse>(
    `/api/v1/ai/library/${contentId}`,
  )
  return response.data
}

/**
 * Update content library item
 */
export async function updateLibraryContent(
  contentId: string,
  data: UpdateContentRequest,
): Promise<UpdateContentResponse> {
  const response = await apiClient.patch<UpdateContentResponse>(
    `/api/v1/ai/library/${contentId}`,
    data,
  )
  return response.data
}

/**
 * Assign AI content to classes
 */
export interface AssignContentRequest {
  name: string
  instructions: string | null
  due_date: string | null
  time_limit_minutes: number | null
  class_ids: string[]
}

export interface AssignContentResponse {
  message: string
  assignment_id: string
  student_count: number
}

export async function assignAIContent(
  contentId: string,
  data: AssignContentRequest,
): Promise<AssignContentResponse> {
  const response = await apiClient.post<AssignContentResponse>(
    `/api/v1/ai/library/${contentId}/assign`,
    data,
  )
  return response.data
}

// =============================================================================
// Book-Centric Content Library API
// =============================================================================

export interface BookContentFilters {
  activity_type?: string
  page?: number
  page_size?: number
}

export async function listBookContent(
  bookId: number,
  filters?: BookContentFilters,
): Promise<BookContentListResponse> {
  const response = await apiClient.get<BookContentListResponse>(
    `/api/v1/ai/books/${bookId}/content`,
    { params: filters },
  )
  return response.data
}

export async function getBookContentDetail(
  bookId: number,
  contentId: string,
): Promise<BookContentDetail> {
  const response = await apiClient.get<BookContentDetail>(
    `/api/v1/ai/books/${bookId}/content/${contentId}`,
  )
  return response.data
}

export async function deleteBookContent(
  bookId: number,
  contentId: string,
): Promise<DeleteContentResponse> {
  const response = await apiClient.delete<DeleteContentResponse>(
    `/api/v1/ai/books/${bookId}/content/${contentId}`,
  )
  return response.data
}
