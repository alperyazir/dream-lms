/**
 * Teachers API Service
 * Story 3.7: Assignment Creation Dialog & Configuration
 * Story 5.4: Error Pattern Detection & Insights
 *
 * This service provides functions to interact with the Teachers API endpoints.
 * Used for fetching teacher's classes and students for assignment creation,
 * and for accessing teacher insights and analytics.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type { InsightDetail, TeacherInsightsResponse } from "../types/analytics"
import type { Class, Student } from "../types/teacher"

/**
 * Create axios instance with OpenAPI config
 */
const apiClient = axios.create({
  baseURL: OpenAPI.BASE,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add token interceptor (async to handle async TOKEN function)
apiClient.interceptors.request.use(async (config) => {
  const token = OpenAPI.TOKEN
  if (token) {
    // Handle both sync and async token functions
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
 * Get all classes for the authenticated teacher
 *
 * @returns Promise with array of classes
 */
export async function getMyClasses(): Promise<Class[]> {
  const url = `/api/v1/teachers/me/classes`
  const response = await apiClient.get<Class[]>(url)
  return response.data
}

/**
 * Get all students for the authenticated teacher
 *
 * @returns Promise with array of students
 */
export async function getMyStudents(): Promise<Student[]> {
  const url = `/api/v1/teachers/me/students`
  const response = await apiClient.get<Student[]>(url)
  return response.data
}

// ============================================================================
// Teacher Insights API - Story 5.4
// ============================================================================

/**
 * Get all insights for the authenticated teacher
 *
 * @param forceRefresh - If true, bypasses cache and recalculates insights
 * @returns Promise with teacher insights response
 */
export async function getMyInsights(
  forceRefresh: boolean = false,
): Promise<TeacherInsightsResponse> {
  const url = `/api/v1/teachers/me/insights`
  const response = await apiClient.get<TeacherInsightsResponse>(url, {
    params: forceRefresh ? { force_refresh: true } : undefined,
  })
  return response.data
}

/**
 * Get detailed view of a specific insight
 *
 * @param insightId - The ID of the insight to fetch details for
 * @returns Promise with insight detail
 */
export async function getInsightDetail(
  insightId: string,
): Promise<InsightDetail> {
  const url = `/api/v1/teachers/me/insights/${insightId}`
  const response = await apiClient.get<InsightDetail>(url)
  return response.data
}

/**
 * Dismiss an insight (hide from future responses)
 *
 * @param insightId - The ID of the insight to dismiss
 * @returns Promise that resolves when dismissed
 */
export async function dismissInsight(insightId: string): Promise<void> {
  const url = `/api/v1/teachers/me/insights/${insightId}/dismiss`
  await apiClient.post(url)
}

/**
 * Export as object for easier imports
 */
export const teachersApi = {
  getMyClasses,
  getMyStudents,
  getMyInsights,
  getInsightDetail,
  dismissInsight,
}

export default teachersApi
