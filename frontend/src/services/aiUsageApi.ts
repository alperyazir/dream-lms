/**
 * AI Usage API Service
 */

import axios from "axios"
import type {
  ErrorResponse,
  ProviderBreakdown,
  UsageByTeacher,
  UsageByType,
  UsageSummary,
} from "@/types/ai-usage"
import { OpenAPI } from "../client"

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

export interface MyUsageResponse {
  total_generations: number
  monthly_quota: number
  remaining_quota: number
}

export const aiUsageApi = {
  /**
   * Get current user's own usage (teacher-accessible)
   * Returns current month's usage stored in teacher record
   */
  getMyUsage: async (): Promise<MyUsageResponse> => {
    const response = await apiClient.get<MyUsageResponse>(
      "/api/v1/ai/usage/my-usage",
    )
    return response.data
  },

  /**
   * Get overall usage summary (admin only)
   */
  getSummary: async (
    fromDate?: Date | null,
    toDate?: Date | null,
  ): Promise<UsageSummary> => {
    const params = new URLSearchParams()
    if (fromDate) params.append("from_date", fromDate.toISOString())
    if (toDate) params.append("to_date", toDate.toISOString())

    const query = params.toString() ? `?${params.toString()}` : ""
    const response = await apiClient.get<UsageSummary>(
      `/api/v1/ai/usage/summary${query}`,
    )
    return response.data
  },

  /**
   * Get usage breakdown by activity type
   */
  getByType: async (
    fromDate?: Date | null,
    toDate?: Date | null,
  ): Promise<UsageByType[]> => {
    const params = new URLSearchParams()
    if (fromDate) params.append("from_date", fromDate.toISOString())
    if (toDate) params.append("to_date", toDate.toISOString())

    const query = params.toString() ? `?${params.toString()}` : ""
    const response = await apiClient.get<UsageByType[]>(
      `/api/v1/ai/usage/by-type${query}`,
    )
    return response.data
  },

  /**
   * Get usage breakdown by teacher
   */
  getByTeacher: async (
    fromDate?: Date | null,
    toDate?: Date | null,
    limit = 100,
  ): Promise<UsageByTeacher[]> => {
    const params = new URLSearchParams()
    if (fromDate) params.append("from_date", fromDate.toISOString())
    if (toDate) params.append("to_date", toDate.toISOString())
    params.append("limit", limit.toString())

    const query = params.toString() ? `?${params.toString()}` : ""
    const response = await apiClient.get<UsageByTeacher[]>(
      `/api/v1/ai/usage/by-teacher${query}`,
    )
    return response.data
  },

  /**
   * Get usage breakdown by provider
   */
  getByProvider: async (
    fromDate?: Date | null,
    toDate?: Date | null,
  ): Promise<ProviderBreakdown> => {
    const params = new URLSearchParams()
    if (fromDate) params.append("from_date", fromDate.toISOString())
    if (toDate) params.append("to_date", toDate.toISOString())

    const query = params.toString() ? `?${params.toString()}` : ""
    const response = await apiClient.get<ProviderBreakdown>(
      `/api/v1/ai/usage/by-provider${query}`,
    )
    return response.data
  },

  /**
   * Get error logs and statistics
   */
  getErrors: async (
    fromDate?: Date | null,
    toDate?: Date | null,
    limit = 100,
  ): Promise<ErrorResponse> => {
    const params = new URLSearchParams()
    if (fromDate) params.append("from_date", fromDate.toISOString())
    if (toDate) params.append("to_date", toDate.toISOString())
    params.append("limit", limit.toString())

    const query = params.toString() ? `?${params.toString()}` : ""
    const response = await apiClient.get<ErrorResponse>(
      `/api/v1/ai/usage/errors${query}`,
    )
    return response.data
  },

  /**
   * Export usage data as CSV
   */
  exportData: async (
    fromDate?: Date | null,
    toDate?: Date | null,
  ): Promise<Blob> => {
    const params = new URLSearchParams()
    if (fromDate) params.append("from_date", fromDate.toISOString())
    if (toDate) params.append("to_date", toDate.toISOString())

    const query = params.toString() ? `?${params.toString()}` : ""
    const response = await apiClient.get<Blob>(
      `/api/v1/ai/usage/export${query}`,
      {
        responseType: "blob",
      },
    )
    return response.data
  },
}
