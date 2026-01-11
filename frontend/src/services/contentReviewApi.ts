/**
 * Content Review API Service (Story 27.19)
 *
 * API client for content review, regeneration, and save operations.
 */

import axios from "axios"
import { OpenAPI } from "../client"

export interface RegenerateQuestionRequest {
  quiz_id: string
  question_index: number
  context: Record<string, any>
}

export interface AIQuizQuestion {
  question_id: string
  question_text: string
  options: string[]
  correct_answer: string
  correct_index: number
  explanation: string | null
  source_module_id: number
  source_page?: number | null
  difficulty: string
}

export interface SaveToLibraryRequest {
  quiz_id: string
  activity_type: string
  title: string
  description?: string | null
  content?: Record<string, any> | null
}

export interface SaveToLibraryResponse {
  content_id: string
  title: string
  activity_type: string
  created_at: string
}

export interface CreateAssignmentRequest {
  quiz_id: string
  activity_type: string
  title: string
  description?: string | null
}

export interface CreateAssignmentResponse {
  message: string
  quiz_id: string
  activity_type: string
  title: string
  redirect_url: string
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
              | "OPTIONS"
              | "HEAD"
              | "PATCH",
            url: config.url || "",
          })
        : token
    config.headers.Authorization = `Bearer ${tokenValue}`
  }

  return config
})

export const contentReviewApi = {
  /**
   * Regenerate a single question in a quiz
   */
  async regenerateQuestion(
    request: RegenerateQuestionRequest,
  ): Promise<AIQuizQuestion> {
    const response = await apiClient.post<AIQuizQuestion>(
      "/api/v1/ai/quiz/regenerate-question",
      request,
    )
    return response.data
  },

  /**
   * Save generated content to teacher's library
   */
  async saveToLibrary(
    request: SaveToLibraryRequest,
  ): Promise<SaveToLibraryResponse> {
    const response = await apiClient.post<SaveToLibraryResponse>(
      "/api/v1/ai/content/save-to-library",
      request,
    )
    return response.data
  },

  /**
   * Create assignment from generated content
   */
  async createAssignment(
    request: CreateAssignmentRequest,
  ): Promise<CreateAssignmentResponse> {
    const response = await apiClient.post<CreateAssignmentResponse>(
      "/api/v1/ai/content/create-assignment",
      request,
    )
    return response.data
  },
}
