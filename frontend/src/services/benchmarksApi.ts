/**
 * Benchmarks API Service
 * Story 5.7: Performance Comparison & Benchmarking
 *
 * This service provides functions to interact with the Benchmarks API endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  AdminBenchmarkOverview,
  BenchmarkPeriod,
  BenchmarkSettingsResponse,
  BenchmarkSettingsUpdate,
  ClassBenchmarkResponse,
} from "../types/benchmarks"

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
 * Error type for benchmark disabled response
 */
export interface BenchmarkDisabledError {
  message: string
  isDisabled: true
}

/**
 * Check if error is a benchmark disabled error (403)
 */
export function isBenchmarkDisabledError(
  error: unknown,
): error is BenchmarkDisabledError {
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return true
  }
  return false
}

/**
 * Get benchmark comparison data for a class
 *
 * @param classId - ID of the class
 * @param period - Time period for benchmarks ('weekly', 'monthly', 'semester', 'all')
 * @returns Promise with complete class benchmark data
 * @throws BenchmarkDisabledError if benchmarking is disabled for the school/publisher
 */
export async function getClassBenchmarks(
  classId: string,
  period: BenchmarkPeriod = "monthly",
): Promise<ClassBenchmarkResponse> {
  const url = `/api/v1/classes/${classId}/benchmarks`
  try {
    const response = await apiClient.get<ClassBenchmarkResponse>(url, {
      params: { period },
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      // Transform 403 into a specific error type for disabled benchmarking
      const disabledError: BenchmarkDisabledError = {
        message:
          error.response.data?.detail || "Benchmarking is disabled for this school",
        isDisabled: true,
      }
      throw disabledError
    }
    throw error
  }
}

/**
 * Get system-wide benchmark overview (admin only)
 *
 * @returns Promise with admin benchmark overview data
 */
export async function getAdminBenchmarkOverview(): Promise<AdminBenchmarkOverview> {
  const url = `/api/v1/admin/benchmarks/overview`
  const response = await apiClient.get<AdminBenchmarkOverview>(url)
  return response.data
}

/**
 * Update school benchmark settings (admin only)
 *
 * @param schoolId - ID of the school
 * @param settings - Benchmark settings to update
 * @returns Promise with updated settings
 */
export async function updateSchoolBenchmarkSettings(
  schoolId: string,
  settings: BenchmarkSettingsUpdate,
): Promise<BenchmarkSettingsResponse> {
  const url = `/api/v1/admin/schools/${schoolId}/settings`
  const response = await apiClient.patch<BenchmarkSettingsResponse>(url, settings)
  return response.data
}

/**
 * Update publisher benchmark settings (admin only)
 *
 * @param publisherId - ID of the publisher
 * @param settings - Benchmark settings to update
 * @returns Promise with updated settings
 */
export async function updatePublisherBenchmarkSettings(
  publisherId: string,
  settings: BenchmarkSettingsUpdate,
): Promise<BenchmarkSettingsResponse> {
  const url = `/api/v1/admin/publishers/${publisherId}/settings`
  const response = await apiClient.patch<BenchmarkSettingsResponse>(url, settings)
  return response.data
}

/**
 * Export as object for easier imports
 */
export const benchmarksApi = {
  getClassBenchmarks,
  getAdminBenchmarkOverview,
  updateSchoolBenchmarkSettings,
  updatePublisherBenchmarkSettings,
  isBenchmarkDisabledError,
}

export default benchmarksApi
