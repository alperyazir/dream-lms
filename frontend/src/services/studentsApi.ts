/**
 * Students API Service
 * Story 5.1: Individual Student Performance Dashboard
 * Story 5.5: Student Progress Tracking & Personal Analytics
 *
 * This service provides functions to interact with the Students API endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  PeriodType,
  StudentAnalyticsResponse,
  StudentProgressPeriod,
  StudentProgressResponse,
} from "../types/analytics"

/**
 * Create axios instance with OpenAPI config
 */
const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
})

// Add token interceptor (async to handle async TOKEN function)
apiClient.interceptors.request.use(async (config) => {
  // Set baseURL dynamically to ensure it uses the value set in main.tsx
  if (!config.baseURL) {
    config.baseURL = OpenAPI.BASE
  }

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
 * Get comprehensive performance analytics for a student
 *
 * @param studentId - ID of the student
 * @param period - Time period for analytics ('7d', '30d', '3m', 'all')
 * @returns Promise with complete analytics data
 */
export async function getStudentAnalytics(
  studentId: string,
  period: PeriodType = "30d",
): Promise<StudentAnalyticsResponse> {
  const url = `/api/v1/students/${studentId}/analytics`
  const response = await apiClient.get<StudentAnalyticsResponse>(url, {
    params: { period },
  })
  return response.data
}

/**
 * Get student's own progress data for the student-facing dashboard
 *
 * @param period - Time period for progress ('this_week', 'this_month', 'all_time')
 * @returns Promise with complete student progress data
 */
export async function getStudentProgress(
  period: StudentProgressPeriod = "this_month",
): Promise<StudentProgressResponse> {
  const url = "/api/v1/students/me/progress"
  const response = await apiClient.get<StudentProgressResponse>(url, {
    params: { period },
  })
  return response.data
}

/**
 * Export as object for easier imports
 */
export const studentsApi = {
  getStudentAnalytics,
  getStudentProgress,
}

export default studentsApi
