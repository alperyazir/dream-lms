/**
 * Sentence Builder API Service
 * Story 27.13: Sentence Builder Activity (Duolingo-Style)
 *
 * This service provides functions to interact with the AI Sentence Builder API endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  SentenceBuilderActivity,
  SentenceBuilderActivityPublic,
  SentenceBuilderRequest,
  SentenceBuilderResult,
  SentenceBuilderSubmission,
} from "../types/sentence-builder"

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
 * Generate a new sentence builder activity from book modules
 *
 * @param request - Activity generation parameters
 * @returns Promise with the generated activity (including correct sentences)
 */
export async function generateActivity(
  request: SentenceBuilderRequest,
): Promise<SentenceBuilderActivity> {
  const url = "/api/v1/ai/sentence-builder/generate"
  const response = await apiClient.post<SentenceBuilderActivity>(url, request)
  return response.data
}

/**
 * Get an activity for taking (without correct sentences)
 *
 * @param activityId - ID of the activity
 * @returns Promise with the public activity view
 */
export async function getActivity(
  activityId: string,
): Promise<SentenceBuilderActivityPublic> {
  const url = `/api/v1/ai/sentence-builder/${activityId}`
  const response = await apiClient.get<SentenceBuilderActivityPublic>(url)
  return response.data
}

/**
 * Submit sentence answers and get result
 *
 * @param activityId - ID of the activity
 * @param submission - User's word orderings
 * @returns Promise with the activity result
 */
export async function submitSentences(
  activityId: string,
  submission: SentenceBuilderSubmission,
): Promise<SentenceBuilderResult> {
  const url = `/api/v1/ai/sentence-builder/${activityId}/submit`
  const response = await apiClient.post<SentenceBuilderResult>(url, submission)
  return response.data
}

/**
 * Get result for a previously submitted sentence builder activity
 *
 * @param activityId - ID of the activity
 * @returns Promise with the result, or null if not found/not submitted
 */
export async function getActivityResult(
  activityId: string,
): Promise<SentenceBuilderResult | null> {
  const url = `/api/v1/ai/sentence-builder/${activityId}/result`
  try {
    const response = await apiClient.get<SentenceBuilderResult>(url)
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
export const sentenceBuilderApi = {
  generateActivity,
  getActivity,
  submitSentences,
  getActivityResult,
}

export default sentenceBuilderApi
