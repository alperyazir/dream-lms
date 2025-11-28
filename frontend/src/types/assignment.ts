/**
 * Assignment type definitions for Dream LMS.
 * Story 3.7: Assignment Creation Dialog & Configuration
 * Story 3.8: Teacher Assignment Management Dashboard
 */

/**
 * Assignment status enumeration
 */
export type AssignmentStatus = "not_started" | "in_progress" | "completed"

/**
 * Form data for assignment creation wizard
 */
export interface AssignmentFormData {
  name: string
  instructions: string
  due_date: Date | null
  time_limit_minutes: number | null
  student_ids: string[]
  class_ids: string[]
}

/**
 * Assignment creation request payload
 */
export interface AssignmentCreateRequest {
  activity_id: string
  book_id: string
  name: string
  instructions?: string | null
  due_date?: string | null // ISO 8601 datetime string
  time_limit_minutes?: number | null
  student_ids?: string[]
  class_ids?: string[]
}

/**
 * Assignment update request payload (partial update)
 * Story 3.8: Only editable fields can be updated
 */
export interface AssignmentUpdateRequest {
  name?: string
  instructions?: string | null
  due_date?: string | null // ISO 8601 datetime string
  time_limit_minutes?: number | null
}

/**
 * Assignment response from API
 */
export interface AssignmentResponse {
  id: string
  teacher_id: string
  activity_id: string
  book_id: string
  name: string
  instructions: string | null
  due_date: string | null // ISO 8601 datetime string
  time_limit_minutes: number | null
  created_at: string
  updated_at: string
  student_count: number
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
