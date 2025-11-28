/**
 * Teachers API Service
 * Story 3.7: Assignment Creation Dialog & Configuration
 *
 * This service provides functions to interact with the Teachers API endpoints.
 * Used for fetching teacher's classes and students for assignment creation.
 */

import axios from "axios"
import { OpenAPI } from "../client"
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
    const tokenValue = typeof token === "function" ? await token({ method: (config.method || "GET") as "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD", url: config.url || "" }) : token
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

/**
 * Export as object for easier imports
 */
export const teachersApi = {
  getMyClasses,
  getMyStudents,
}

export default teachersApi
