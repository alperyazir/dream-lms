/**
 * Notifications API Service
 * Story 6.1: Notification System Foundation
 *
 * This service provides functions to interact with the Notifications API endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  GlobalMuteRequest,
  GlobalMuteStatus,
  GlobalMuteStatusResponse,
  MarkAllReadResponse,
  Notification,
  NotificationListResponse,
  NotificationPreference,
  NotificationPreferencesBulkUpdate,
  NotificationPreferencesBulkUpdateResponse,
  NotificationPreferencesResponse,
  NotificationPreferenceUpdate,
  NotificationQueryParams,
  NotificationType,
  UnreadCountResponse,
} from "../types/notification"

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
 * Get notifications for the current user with optional filtering
 *
 * @param params - Query parameters for filtering and pagination
 * @returns Promise with paginated notification list
 */
export async function getNotifications(
  params: NotificationQueryParams = {},
): Promise<NotificationListResponse> {
  const url = `/api/v1/notifications`
  const response = await apiClient.get<NotificationListResponse>(url, {
    params: {
      unread_only: params.unread_only,
      type: params.type,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    },
  })
  return response.data
}

/**
 * Get count of unread notifications for the current user
 *
 * @returns Promise with unread count
 */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const url = `/api/v1/notifications/unread-count`
  const response = await apiClient.get<UnreadCountResponse>(url)
  return response.data
}

/**
 * Mark a specific notification as read
 *
 * @param notificationId - ID of the notification to mark as read
 * @returns Promise with the updated notification
 */
export async function markAsRead(notificationId: string): Promise<Notification> {
  const url = `/api/v1/notifications/${notificationId}/read`
  const response = await apiClient.patch<Notification>(url)
  return response.data
}

/**
 * Mark all notifications as read for the current user
 *
 * @returns Promise with the count of marked notifications
 */
export async function markAllAsRead(): Promise<MarkAllReadResponse> {
  const url = `/api/v1/notifications/mark-all-read`
  const response = await apiClient.post<MarkAllReadResponse>(url)
  return response.data
}

// =============================================================================
// Notification Preferences API (Story 6.8)
// =============================================================================

/**
 * Get all notification preferences for the current user
 *
 * @returns Promise with preferences list and global mute status
 */
export async function getPreferences(): Promise<NotificationPreferencesResponse> {
  const url = `/api/v1/notifications/preferences`
  const response = await apiClient.get<NotificationPreferencesResponse>(url)
  return response.data
}

/**
 * Bulk update notification preferences
 *
 * @param updates - Map of notification type to enabled status
 * @returns Promise with updated preferences
 */
export async function updatePreferences(
  updates: NotificationPreferencesBulkUpdate,
): Promise<NotificationPreferencesBulkUpdateResponse> {
  const url = `/api/v1/notifications/preferences`
  const response = await apiClient.patch<NotificationPreferencesBulkUpdateResponse>(url, updates)
  return response.data
}

/**
 * Update a single notification preference
 *
 * @param notificationType - Type of notification to update
 * @param update - New enabled status
 * @returns Promise with updated preference
 */
export async function updateSinglePreference(
  notificationType: NotificationType,
  update: NotificationPreferenceUpdate,
): Promise<NotificationPreference> {
  const url = `/api/v1/notifications/preferences/${notificationType}`
  const response = await apiClient.patch<NotificationPreference>(url, update)
  return response.data
}

// =============================================================================
// Global Mute API (Story 6.8)
// =============================================================================

/**
 * Set global notification mute for specified hours
 *
 * @param request - Hours to mute (1-24)
 * @returns Promise with mute status
 */
export async function setGlobalMute(request: GlobalMuteRequest): Promise<GlobalMuteStatus> {
  const url = `/api/v1/notifications/mute`
  const response = await apiClient.post<GlobalMuteStatus>(url, request)
  return response.data
}

/**
 * Cancel global notification mute
 *
 * @returns Promise (void on success)
 */
export async function cancelGlobalMute(): Promise<void> {
  const url = `/api/v1/notifications/mute`
  await apiClient.delete(url)
}

/**
 * Get current global mute status
 *
 * @returns Promise with mute status
 */
export async function getMuteStatus(): Promise<GlobalMuteStatusResponse> {
  const url = `/api/v1/notifications/mute`
  const response = await apiClient.get<GlobalMuteStatusResponse>(url)
  return response.data
}

/**
 * Export as object for easier imports
 */
export const notificationsApi = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  // Preferences (Story 6.8)
  getPreferences,
  updatePreferences,
  updateSinglePreference,
  // Global Mute (Story 6.8)
  setGlobalMute,
  cancelGlobalMute,
  getMuteStatus,
}

export default notificationsApi
