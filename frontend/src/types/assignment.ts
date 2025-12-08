/**
 * Assignment type definitions for Dream LMS.
 * Story 3.7: Assignment Creation Dialog & Configuration
 * Story 3.8: Teacher Assignment Management Dashboard
 * Story 8.1: Multi-Activity Assignment Data Model
 * Story 10.3+: Additional Resources with subtitle control
 */

/**
 * Assignment status enumeration
 */
export type AssignmentStatus = "not_started" | "in_progress" | "completed"

// --- Additional Resources Types ---

/**
 * Resource types that can be attached to assignments
 */
export type ResourceType = "video" // Future: "pdf" | "image" | "link"

/**
 * Video resource attached to an assignment
 * Story 10.3+: Video with subtitle control for students
 */
export interface VideoResource {
  type: "video"
  path: string // Relative path like "video/1.mp4"
  name: string // Display name
  subtitles_enabled: boolean // Whether students can see subtitles
  has_subtitles: boolean // Whether the video has subtitle files
}

/**
 * Additional resources attached to an assignment
 * Currently supports video resources. Extensible for future resource types.
 */
export interface AdditionalResources {
  videos: VideoResource[]
  // Future: pdfs, images, links, etc.
}

/**
 * Date group for time planning mode
 * Groups activities by their scheduled due date
 */
export interface DateActivityGroup {
  date: Date
  activityIds: string[]
  dueDate?: Date | null // Optional specific due date for this group
  timeLimit?: number | null // Optional time limit in minutes for this group
}

/**
 * Form data for assignment creation wizard
 * Story 8.2: Added activity_ids for multi-activity selection
 * Story 9.6: Added scheduled_publish_date for scheduled publishing
 * Story 9.x: Added time_planning_enabled and date_groups for time planning
 * Story 10.3: Added video_path for video attachment
 */
export interface AssignmentFormData {
  name: string
  instructions: string
  due_date: Date | null
  time_limit_minutes: number | null
  student_ids: string[]
  class_ids: string[]
  activity_ids: string[] // Story 8.2: Multi-activity selection
  scheduled_publish_date: Date | null // Story 9.6: Scheduled publishing
  // Time Planning mode
  time_planning_enabled: boolean
  date_groups: DateActivityGroup[]
  // Story 10.3: Video attachment (deprecated, use resources)
  video_path: string | null
  // Additional Resources with subtitle control
  resources: AdditionalResources | null
}

/**
 * Date group for bulk assignment creation (Time Planning mode)
 */
export interface DateGroupCreateRequest {
  scheduled_publish_date: string // ISO 8601 datetime string - when to publish
  due_date?: string | null // ISO 8601 datetime string - when due
  time_limit_minutes?: number | null
  activity_ids: string[]
}

/**
 * Assignment creation request payload
 * Story 8.1: Supports both single-activity (backward compatible) and multi-activity assignments.
 * Story 9.6: Added scheduled_publish_date for scheduled publishing.
 * Story 9.x: Added date_groups for Time Planning mode (creates multiple assignments)
 * Story 10.3: Added video_path for video attachment
 * Provide either activity_id (single) OR activity_ids (multi), not both.
 */
export interface AssignmentCreateRequest {
  book_id: string
  name: string
  instructions?: string | null
  due_date?: string | null // ISO 8601 datetime string
  time_limit_minutes?: number | null
  student_ids?: string[]
  class_ids?: string[]
  // Backward compatible: single activity (legacy)
  activity_id?: string
  // Multi-activity: list of activities with order
  activity_ids?: string[]
  // Story 9.6: Scheduled publishing
  scheduled_publish_date?: string | null // ISO 8601 datetime string
  // Story 9.x: Time Planning mode - creates multiple assignments
  date_groups?: DateGroupCreateRequest[]
  // Story 10.3: Video attachment (deprecated, use resources)
  video_path?: string | null
  // Additional Resources with subtitle control
  resources?: AdditionalResources | null
}

/**
 * Assignment update request payload (partial update)
 * Story 3.8: Only editable fields can be updated
 * Story 9.6: Added status for publish now functionality
 * Story 9.8: Added activity_ids for editing activities
 */
export interface AssignmentUpdateRequest {
  name?: string
  instructions?: string | null
  due_date?: string | null // ISO 8601 datetime string
  time_limit_minutes?: number | null
  scheduled_publish_date?: string | null // ISO 8601 datetime string
  status?: AssignmentPublishStatus // For publish now functionality
  activity_ids?: string[] // Story 9.8: Update activities (add/remove/reorder)
}

/**
 * Minimal activity info for assignment response
 * Story 8.1: Multi-Activity Assignment Data Model
 */
export interface ActivityInfo {
  id: string
  title: string | null
  activity_type: string
  order_index: number
}

/**
 * Assignment response from API
 * Story 8.1: Added activities list and activity_count for multi-activity support
 */
export interface AssignmentResponse {
  id: string
  teacher_id: string
  book_id: string
  name: string
  instructions: string | null
  due_date: string | null // ISO 8601 datetime string
  time_limit_minutes: number | null
  created_at: string
  updated_at: string
  student_count: number
  // Backward compatible: keep activity_id for single-activity assignments
  activity_id: string | null
  // Multi-activity support
  activities: ActivityInfo[]
  activity_count: number
}

/**
 * Assignment-student junction data
 */
export interface AssignmentStudentResponse {
  id: string
  assignment_id: string
  student_id: string
  status: AssignmentStatus
  score: number | null
  started_at: string | null
  completed_at: string | null
}

/**
 * Per-activity progress status for multi-activity assignments
 * Story 8.1: Multi-Activity Assignment Data Model
 */
export type AssignmentStudentActivityStatus =
  | "not_started"
  | "in_progress"
  | "completed"

/**
 * Per-activity progress tracking for multi-activity assignments
 * Story 8.1: Multi-Activity Assignment Data Model
 */
export interface AssignmentStudentActivityResponse {
  id: string
  assignment_student_id: string
  activity_id: string
  status: AssignmentStudentActivityStatus
  score: number | null
  max_score: number
  response_data: Record<string, any> | null
  started_at: string | null
  completed_at: string | null
}

/**
 * Assignment publishing status (Story 9.6)
 */
export type AssignmentPublishStatus = "draft" | "scheduled" | "published" | "archived"

/**
 * Assignment list item with enriched data for display
 */
export interface AssignmentListItem {
  id: string
  name: string
  instructions: string | null
  due_date: string | null // ISO 8601 datetime string
  time_limit_minutes: number | null
  created_at: string

  // Enriched data
  book_id: string
  book_title: string
  activity_id: string
  activity_title: string
  activity_type: string

  // Student statistics
  total_students: number
  not_started: number
  in_progress: number
  completed: number

  // Scheduling fields (Story 9.6)
  scheduled_publish_date: string | null // ISO 8601 datetime string
  status: AssignmentPublishStatus
}

/**
 * Student-facing assignment response with enriched data
 * Story 3.9: Student Assignment View & Dashboard
 */
export interface StudentAssignmentResponse {
  // Assignment fields
  assignment_id: string
  assignment_name: string
  instructions: string | null
  due_date: string | null // ISO 8601 datetime string
  time_limit_minutes: number | null
  created_at: string

  // Book fields
  book_id: string
  book_title: string
  book_cover_url: string | null

  // Activity fields
  activity_id: string
  activity_title: string
  activity_type: string

  // Student-specific fields
  status: AssignmentStatus
  score: number | null
  started_at: string | null
  completed_at: string | null
  time_spent_minutes: number

  // Multi-activity support (Story 8.3)
  activity_count: number

  // Computed fields
  is_past_due: boolean
  days_until_due: number | null
}

/**
 * Activity start response with full activity configuration
 * Story 4.1: Activity Player Framework & Layout
 * Story 4.2: Added book_name and publisher_name for DCS image URLs
 */
export interface ActivityStartResponse {
  // Assignment info
  assignment_id: string
  assignment_name: string
  instructions: string | null
  due_date: string | null // ISO 8601 datetime string
  time_limit_minutes: number | null

  // Book info
  book_id: string
  book_title: string
  book_name: string // Story 4.2: For Dream Central Storage image URLs
  publisher_name: string // Story 4.2: For Dream Central Storage image URLs
  book_cover_url: string | null

  // Activity info
  activity_id: string
  activity_title: string
  activity_type: string
  config_json: Record<string, any>

  // Student progress (if resuming)
  current_status: AssignmentStatus
  time_spent_minutes: number
  progress_json: Record<string, any> | null
  has_saved_progress: boolean // Story 4.8: Computed field
}

/**
 * Assignment progress save request payload
 * Story 4.8: Activity Progress Persistence (Save & Resume)
 */
export interface AssignmentSaveProgressRequest {
  partial_answers_json: Record<string, any>
  time_spent_minutes: number
}

/**
 * Assignment progress save response
 * Story 4.8: Activity Progress Persistence (Save & Resume)
 */
export interface AssignmentSaveProgressResponse {
  message: string
  last_saved_at: string // ISO 8601 datetime string
  time_spent_minutes: number
}

/**
 * Assignment submission request payload
 * Story 4.7: Assignment Submission & Result Storage
 */
export interface AssignmentSubmitRequest {
  answers_json: Record<string, any>
  score: number
  time_spent_minutes: number
  completed_at?: string // Optional ISO 8601 datetime string
}

/**
 * Assignment submission response
 * Story 4.7: Assignment Submission & Result Storage
 */
export interface AssignmentSubmissionResponse {
  success: boolean
  message: string
  score: number
  completed_at: string // ISO 8601 datetime string
  assignment_id: string
}

// =============================================================================
// Multi-Activity Player Types (Story 8.3)
// =============================================================================

/**
 * Activity with full config for multi-activity player
 * Story 8.3: Student Multi-Activity Assignment Player
 */
export interface ActivityWithConfig {
  id: string
  title: string | null
  activity_type: string
  config_json: Record<string, any>
  order_index: number
}

/**
 * Per-activity progress info for multi-activity assignments
 * Story 8.3: Student Multi-Activity Assignment Player
 */
export interface ActivityProgressInfo {
  id: string
  activity_id: string
  status: AssignmentStudentActivityStatus
  score: number | null
  max_score: number
  response_data: Record<string, any> | null
  started_at: string | null
  completed_at: string | null
}

/**
 * Multi-activity assignment start response
 * Story 8.3: Student Multi-Activity Assignment Player
 * Story 10.3: Added video_path for video attachment
 */
export interface MultiActivityStartResponse {
  // Assignment info
  assignment_id: string
  assignment_name: string
  instructions: string | null
  due_date: string | null
  time_limit_minutes: number | null

  // Book info
  book_id: string
  book_title: string
  book_name: string
  publisher_name: string
  book_cover_url: string | null

  // Multi-activity data
  activities: ActivityWithConfig[]
  activity_progress: ActivityProgressInfo[]
  total_activities: number

  // Assignment-level progress
  current_status: AssignmentStatus
  time_spent_minutes: number
  started_at: string | null

  // Computed fields
  completed_activities_count: number
  all_activities_completed: boolean

  // Story 10.3: Video attachment
  video_path: string | null

  // Story 10.3+: Additional resources with subtitle control
  resources: AdditionalResources | null
}

/**
 * Per-activity progress save request
 * Story 8.3: Student Multi-Activity Assignment Player
 */
export interface ActivityProgressSaveRequest {
  response_data: Record<string, any>
  time_spent_seconds?: number
  status: "in_progress" | "completed"
  score?: number | null
  max_score?: number
}

/**
 * Per-activity progress save response
 * Story 8.3: Student Multi-Activity Assignment Player
 */
export interface ActivityProgressSaveResponse {
  message: string
  activity_id: string
  status: string
  score: number | null
  last_saved_at: string
}

/**
 * Multi-activity assignment submit request
 * Story 8.3: Student Multi-Activity Assignment Player
 */
export interface MultiActivitySubmitRequest {
  force_submit?: boolean // For timer expiry
  total_time_spent_minutes?: number
}

/**
 * Per-activity score info for submission response
 * Story 8.3: Student Multi-Activity Assignment Player
 */
export interface PerActivityScore {
  activity_id: string
  activity_title: string | null
  score: number | null
  max_score: number
  status: string
}

/**
 * Multi-activity assignment submit response
 * Story 8.3: Student Multi-Activity Assignment Player
 */
export interface MultiActivitySubmitResponse {
  success: boolean
  message: string
  assignment_id: string
  combined_score: number
  per_activity_scores: PerActivityScore[]
  completed_at: string
  total_activities: number
  completed_activities: number
}

/**
 * Activity state for UI tracking
 * Story 8.3: Student Multi-Activity Assignment Player
 */
export interface ActivityState {
  activityId: string
  status: AssignmentStudentActivityStatus
  isDirty: boolean // Has unsaved changes
  responseData: Record<string, any> | null
  score: number | null
  timeSpentSeconds: number
}

// =============================================================================
// Multi-Activity Analytics Types (Story 8.4)
// =============================================================================

/**
 * Per-student score for a specific activity (used in expanded analytics view)
 * Story 8.4: Multi-Activity Assignment Analytics
 */
export interface StudentActivityScore {
  student_id: string
  student_name: string
  status: AssignmentStudentActivityStatus
  score: number | null
  max_score: number
  time_spent_seconds: number
  completed_at: string | null
}

/**
 * Analytics data for a single activity within a multi-activity assignment
 * Story 8.4: Multi-Activity Assignment Analytics
 */
export interface ActivityAnalyticsItem {
  activity_id: string
  activity_title: string | null
  page_number: number
  activity_type: string
  class_average_score: number | null // null if no completions
  completion_rate: number // 0.0 to 1.0
  completed_count: number
  total_assigned_count: number
}

/**
 * Multi-activity assignment analytics response (teacher view)
 * Story 8.4: Multi-Activity Assignment Analytics
 */
export interface MultiActivityAnalyticsResponse {
  assignment_id: string
  assignment_name: string
  total_students: number
  submitted_count: number
  activities: ActivityAnalyticsItem[]
  expanded_students: StudentActivityScore[] | null // Populated when expand_activity_id provided
}

/**
 * Per-activity score item for student result view
 * Story 8.4: Multi-Activity Assignment Analytics
 */
export interface ActivityScoreItem {
  activity_id: string
  activity_title: string | null
  activity_type: string
  score: number | null
  max_score: number
  status: AssignmentStudentActivityStatus
}

/**
 * Student assignment result response (student view)
 * Story 8.4: Multi-Activity Assignment Analytics
 */
export interface StudentAssignmentResultResponse {
  assignment_id: string
  assignment_name: string
  total_score: number | null
  completed_at: string | null
  activity_scores: ActivityScoreItem[]
  total_activities: number
  completed_activities: number
}

// =============================================================================
// Calendar Types (Story 9.6)
// =============================================================================

/**
 * Calendar assignment item for calendar view
 * Story 9.6: Calendar-Based Assignment Scheduling
 */
export interface CalendarAssignmentItem {
  id: string
  name: string
  due_date: string | null
  scheduled_publish_date: string | null
  status: AssignmentPublishStatus
  activity_count: number
  class_names: string[]
  book_id: string
  book_title: string
}

/**
 * Calendar assignments response grouped by date
 * Story 9.6: Calendar-Based Assignment Scheduling
 */
export interface CalendarAssignmentsResponse {
  start_date: string
  end_date: string
  total_assignments: number
  assignments_by_date: Record<string, CalendarAssignmentItem[]>
}

// =============================================================================
// Bulk Assignment Types (Time Planning Mode)
// =============================================================================

/**
 * Individual assignment created in bulk operation
 * Story 9.x: Time Planning Mode
 */
export interface BulkAssignmentCreatedItem {
  id: string
  name: string
  scheduled_publish_date: string | null
  due_date: string | null
  status: AssignmentPublishStatus
  activity_count: number
}

/**
 * Response from bulk assignment creation (Time Planning mode)
 * Story 9.x: Time Planning Mode
 */
export interface BulkAssignmentCreateResponse {
  success: boolean
  message: string
  total_created: number
  assignments: BulkAssignmentCreatedItem[]
}

// =============================================================================
// Student Calendar Types
// =============================================================================

/**
 * Assignment item for student calendar view
 */
export interface StudentCalendarAssignmentItem {
  id: string
  name: string
  due_date: string | null
  book_id: string
  book_title: string
  book_cover_url: string | null
  activity_count: number
  status: AssignmentStatus
}

/**
 * Response for student calendar assignments endpoint
 */
export interface StudentCalendarAssignmentsResponse {
  start_date: string
  end_date: string
  total_assignments: number
  assignments_by_date: Record<string, StudentCalendarAssignmentItem[]>
}

// =============================================================================
// Preview/Test Mode Types (Story 9.7)
// =============================================================================

/**
 * Response for assignment preview (teacher test mode)
 * Similar to MultiActivityStartResponse but without student-specific data
 */
export interface AssignmentPreviewResponse {
  assignment_id: string
  assignment_name: string
  instructions: string | null
  due_date: string | null
  time_limit_minutes: number | null
  status: AssignmentPublishStatus

  // Book info
  book_id: string
  book_title: string
  book_name: string
  publisher_name: string
  book_cover_url: string | null

  // Multi-activity data
  activities: ActivityWithConfig[]
  total_activities: number

  // Preview mode indicator
  is_preview: boolean

  // Story 10.3: Video attachment
  video_path: string | null
}

/**
 * Response for single activity preview
 */
export interface ActivityPreviewResponse {
  activity_id: string
  activity_title: string | null
  activity_type: string
  config_json: Record<string, unknown>

  // Book info (for image URL construction)
  book_id: string
  book_name: string
  publisher_name: string

  // Preview mode indicator
  is_preview: boolean
}
