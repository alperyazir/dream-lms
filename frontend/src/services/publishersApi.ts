/**
 * Publishers API Service
 * Story 9.3: Publisher Logo & Profile Enhancements
 *
 * This service provides functions to interact with the Publishers API endpoints.
 * Used for fetching publisher profile information including logo.
 */

import axios from "axios"
import { OpenAPI } from "../client"

/**
 * Publisher profile interface
 */
export interface PublisherProfile {
  id: string
  name: string
  contact_email: string | null
  logo_url: string | null
  benchmarking_enabled: boolean
  user_id: string
  user_email: string
  user_username: string
  user_full_name: string
  created_at: string
  updated_at: string
}

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
    config.headers.Authorization = `Bearer ${tokenValue}`
  }
  return config
})

/**
 * Get the current publisher's profile including logo_url
 * @returns Promise<PublisherProfile>
 */
export async function getMyProfile(): Promise<PublisherProfile> {
  const url = `/api/v1/publishers/me/profile`
  const response = await apiClient.get<PublisherProfile>(url)
  return response.data
}
