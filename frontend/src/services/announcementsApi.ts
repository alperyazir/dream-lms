/**
 * Announcements API Service
 * Story 26.1: Teacher Announcement Creation & Management
 *
 * This service provides functions to interact with the Announcements API endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  Announcement,
  AnnouncementCreate,
  AnnouncementDetail,
  AnnouncementListResponse,
  AnnouncementReadResponse,
  AnnouncementUpdate,
  StudentAnnouncement,
  StudentAnnouncementListResponse,
} from "../types/announcement"

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
  // Set baseURL dynamically
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
 * Query parameters for listing announcements
 */
export interface AnnouncementQueryParams {
  skip?: number
  limit?: number
}

/**
 * Query parameters for student announcements (Story 26.2)
 */
export interface StudentAnnouncementQueryParams {
  limit?: number
  offset?: number
  filter?: "all" | "unread" | "read"
}

/**
 * Announcements API functions
 */
export const announcementsApi = {
  /**
   * Get all announcements for the current teacher (paginated)
   */
  getAll: async (
    params?: AnnouncementQueryParams,
  ): Promise<AnnouncementListResponse> => {
    const response = await apiClient.get<AnnouncementListResponse>(
      "/api/v1/announcements",
      { params },
    )
    return response.data
  },

  /**
   * Get a specific announcement by ID
   */
  getById: async (announcementId: string): Promise<AnnouncementDetail> => {
    const response = await apiClient.get<AnnouncementDetail>(
      `/api/v1/announcements/${announcementId}`,
    )
    return response.data
  },

  /**
   * Create a new announcement
   */
  create: async (data: AnnouncementCreate): Promise<Announcement> => {
    const response = await apiClient.post<Announcement>(
      "/api/v1/announcements",
      data,
    )
    return response.data
  },

  /**
   * Update an existing announcement
   */
  update: async (
    announcementId: string,
    data: AnnouncementUpdate,
  ): Promise<Announcement> => {
    const response = await apiClient.put<Announcement>(
      `/api/v1/announcements/${announcementId}`,
      data,
    )
    return response.data
  },

  /**
   * Delete an announcement (soft delete)
   */
  delete: async (announcementId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/announcements/${announcementId}`)
  },

  // Student-facing methods (Story 26.2)

  /**
   * Get announcements for the current student
   */
  getMyAnnouncements: async (
    params?: StudentAnnouncementQueryParams,
  ): Promise<StudentAnnouncementListResponse> => {
    const response = await apiClient.get<StudentAnnouncementListResponse>(
      "/api/v1/announcements/me",
      { params },
    )
    return response.data
  },

  /**
   * Get a specific announcement as a student
   */
  getAsStudent: async (
    announcementId: string,
  ): Promise<StudentAnnouncement> => {
    const response = await apiClient.get<StudentAnnouncement>(
      `/api/v1/announcements/${announcementId}/student`,
    )
    return response.data
  },

  /**
   * Mark an announcement as read
   */
  markAsRead: async (
    announcementId: string,
  ): Promise<AnnouncementReadResponse> => {
    const response = await apiClient.patch<AnnouncementReadResponse>(
      `/api/v1/announcements/${announcementId}/read`,
    )
    return response.data
  },
}
