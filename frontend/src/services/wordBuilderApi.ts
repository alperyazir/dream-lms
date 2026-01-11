/**
 * Word Builder API Service
 * Story 27.14: Word Builder (Spelling Activity)
 *
 * This service provides functions to interact with the AI Word Builder API endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  WordBuilderActivity,
  WordBuilderActivityPublic,
  WordBuilderRequest,
  WordBuilderResult,
  WordBuilderSubmission,
} from "../types/word-builder"

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
 * Generate a new word builder activity from book vocabulary
 *
 * @param request - Activity generation parameters
 * @returns Promise with the generated activity (including correct words)
 */
export async function generateActivity(
  request: WordBuilderRequest,
): Promise<WordBuilderActivity> {
  const url = "/api/v1/ai/word-builder/generate"
  const response = await apiClient.post<WordBuilderActivity>(url, request)
  return response.data
}

/**
 * Get an activity for taking (without correct words)
 *
 * @param activityId - ID of the activity
 * @returns Promise with the public activity view
 */
export async function getActivity(
  activityId: string,
): Promise<WordBuilderActivityPublic> {
  const url = `/api/v1/ai/word-builder/${activityId}`
  const response = await apiClient.get<WordBuilderActivityPublic>(url)
  return response.data
}

/**
 * Submit word spellings and get result
 *
 * @param activityId - ID of the activity
 * @param submission - User's spelled words and attempt counts
 * @returns Promise with the activity result
 */
export async function submitWords(
  activityId: string,
  submission: WordBuilderSubmission,
): Promise<WordBuilderResult> {
  const url = `/api/v1/ai/word-builder/${activityId}/submit`
  const response = await apiClient.post<WordBuilderResult>(url, submission)
  return response.data
}

/**
 * Get result for a previously submitted word builder activity
 *
 * @param activityId - ID of the activity
 * @returns Promise with the result, or null if not found/not submitted
 */
export async function getActivityResult(
  activityId: string,
): Promise<WordBuilderResult | null> {
  const url = `/api/v1/ai/word-builder/${activityId}/result`
  try {
    const response = await apiClient.get<WordBuilderResult>(url)
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
export const wordBuilderApi = {
  generateActivity,
  getActivity,
  submitWords,
  getActivityResult,
}

export default wordBuilderApi
