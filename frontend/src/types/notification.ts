/**
 * Notification type definitions for Dream LMS.
 * Story 6.1: Notification System Foundation
 * Story 6.5: Feedback Enhancements (Badge names in feedback notifications)
 */

/**
 * Notification type enumeration matching backend
 */
export type NotificationType =
  | "assignment_created"
  | "deadline_approaching"
  | "feedback_received"
  | "message_received"
  | "student_completed"
  | "past_due"
  | "material_shared"
  | "system_announcement"

/**
 * Notification interface with all fields
 */
export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string // ISO 8601 datetime string
}

/**
 * Paginated notification list response from API
 */
export interface NotificationListResponse {
  notifications: Notification[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

/**
 * Unread count response from API
 */
export interface UnreadCountResponse {
  count: number
}

/**
 * Mark all as read response from API
 */
export interface MarkAllReadResponse {
  marked_count: number
}

/**
 * Query parameters for fetching notifications
 */
export interface NotificationQueryParams {
  unread_only?: boolean
  type?: NotificationType
  limit?: number
  offset?: number
}

/**
 * Notification icon mapping type
 */
export type NotificationIconName =
  | "FileText" // assignment_created
  | "Clock" // deadline_approaching
  | "MessageSquare" // feedback_received
  | "Mail" // message_received
  | "CheckCircle" // student_completed
  | "AlertTriangle" // past_due
  | "Share2" // material_shared
  | "Bell" // system_announcement

// =============================================================================
// Notification Preferences (Story 6.8)
// =============================================================================

/**
 * Single notification preference
 */
export interface NotificationPreference {
  notification_type: NotificationType
  enabled: boolean
  email_enabled: boolean
  label: string
  description: string
}

/**
 * Global mute status
 */
export interface GlobalMuteStatus {
  muted_until: string // ISO 8601 datetime
  remaining_hours: number
}

/**
 * Response for preferences list with optional mute status
 */
export interface NotificationPreferencesResponse {
  preferences: NotificationPreference[]
  global_mute: GlobalMuteStatus | null
}

/**
 * Request for bulk updating preferences
 */
export interface NotificationPreferencesBulkUpdate {
  preferences: Record<NotificationType, boolean>
}

/**
 * Response for bulk preference update
 */
export interface NotificationPreferencesBulkUpdateResponse {
  updated: string[]
  preferences: NotificationPreference[]
}

/**
 * Request for single preference update
 */
export interface NotificationPreferenceUpdate {
  enabled: boolean
}

/**
 * Request to set global mute
 */
export interface GlobalMuteRequest {
  hours: number // 1-24
}

/**
 * Response for mute status check
 */
export interface GlobalMuteStatusResponse {
  is_muted: boolean
  mute: GlobalMuteStatus | null
}
