/**
 * Classes API Service
 * Story 5.2: Class-Wide Performance Analytics
 *
 * This service provides functions to interact with the Classes API endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  ClassAnalyticsResponse,
  ClassPeriodType,
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
 * Get comprehensive performance analytics for a class
 *
 * @param classId - ID of the class
 * @param period - Time period for analytics ('weekly', 'monthly', 'semester', 'ytd')
 * @returns Promise with complete class analytics data
 */
export async function getClassAnalytics(
  classId: string,
  period: ClassPeriodType = "monthly",
): Promise<ClassAnalyticsResponse> {
  const url = `/api/v1/classes/${classId}/analytics`
  const response = await apiClient.get<ClassAnalyticsResponse>(url, {
    params: { period },
  })
  return response.data
}

/**
 * Export as object for easier imports
 */
export const classesApi = {
  getClassAnalytics,
}

export default classesApi
