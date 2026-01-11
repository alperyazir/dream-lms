/**
 * AI Quiz API Service
 * Story 27.9: AI Quiz Generation (MCQ)
 *
 * This service provides functions to interact with the AI Quiz API endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  AIQuiz,
  AIQuizGenerationRequest,
  AIQuizPublic,
  AIQuizResult,
  AIQuizSubmission,
} from "../types/ai-quiz"

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
 * Generate a new AI quiz from book modules using LLM
 *
 * @param request - Quiz generation parameters
 * @returns Promise with the generated quiz (including correct answers)
 */
export async function generateAIQuiz(
  request: AIQuizGenerationRequest,
): Promise<AIQuiz> {
  const url = "/api/v1/ai/quiz/generate"
  // Debug: log the request payload
  console.log("AI Quiz Generation Request:", JSON.stringify(request, null, 2))
  const response = await apiClient.post<AIQuiz>(url, request)
  return response.data
}

/**
 * Get an AI quiz for taking (without correct answers)
 *
 * @param quizId - ID of the quiz
 * @returns Promise with the public quiz view
 */
export async function getAIQuiz(quizId: string): Promise<AIQuizPublic> {
  const url = `/api/v1/ai/quiz/${quizId}`
  const response = await apiClient.get<AIQuizPublic>(url)
  return response.data
}

/**
 * Submit AI quiz answers and get result
 *
 * @param quizId - ID of the quiz
 * @param answers - User's answers (question_id -> option index)
 * @returns Promise with the quiz result
 */
export async function submitAIQuiz(
  quizId: string,
  answers: Record<string, number>,
): Promise<AIQuizResult> {
  const url = `/api/v1/ai/quiz/${quizId}/submit`
  const submission: AIQuizSubmission = { answers }
  const response = await apiClient.post<AIQuizResult>(url, submission)
  return response.data
}

/**
 * Get AI quiz result for a previously submitted quiz
 *
 * @param quizId - ID of the quiz
 * @returns Promise with the quiz result, or null if not found/not submitted
 */
export async function getAIQuizResult(
  quizId: string,
): Promise<AIQuizResult | null> {
  const url = `/api/v1/ai/quiz/${quizId}/result`
  try {
    const response = await apiClient.get<AIQuizResult>(url)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    throw error
  }
}

/**
 * Export as object for easier imports
 */
export const aiQuizApi = {
  generateAIQuiz,
  getAIQuiz,
  submitAIQuiz,
  getAIQuizResult,
}

export default aiQuizApi
