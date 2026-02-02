/**
 * Assignments API Service
 * Story 3.7: Assignment Creation Dialog & Configuration
 * Story 3.8: Teacher Assignment Management Dashboard
 *
 * This service provides functions to interact with the Assignments API endpoints.
 */

import axios from "axios"
import { OpenAPI } from "../client"
import type {
  AssignmentDetailedResultsResponse,
  StudentAnswersResponse,
} from "../types/analytics"
import type {
  ActivityPreviewResponse,
  ActivityProgressSaveRequest,
  ActivityProgressSaveResponse,
  ActivityStartResponse,
  AssignmentCreateRequest,
  AssignmentForEditResponse,
  AssignmentListItem,
  AssignmentPreviewResponse,
  AssignmentPublishStatus,
  AssignmentResponse,
  AssignmentResultDetailResponse,
  AssignmentSaveProgressRequest,
  AssignmentSaveProgressResponse,
  AssignmentSubmissionResponse,
  AssignmentSubmitRequest,
  AssignmentUpdateRequest,
  BulkAssignmentCreateResponse,
  CalendarAssignmentsResponse,
  MultiActivityAnalyticsResponse,
  MultiActivityStartResponse,
  MultiActivitySubmitRequest,
  MultiActivitySubmitResponse,
  StudentAssignmentResponse,
  StudentAssignmentResultResponse,
  StudentCalendarAssignmentsResponse,
} from "../types/assignment"

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
 * Get list of assignments for the current teacher
 *
 * @returns Promise with assignment list
 */
export async function getAssignments(): Promise<AssignmentListItem[]> {
  const url = `/api/v1/assignments/`
  const response = await apiClient.get<AssignmentListItem[]>(url)
  return response.data
}

/**
 * Create a new assignment
 *
 * @param data - Assignment creation data
 * @returns Promise with created assignment response
 */
export async function createAssignment(
  data: AssignmentCreateRequest,
): Promise<AssignmentResponse> {
  const url = `/api/v1/assignments/`
  const response = await apiClient.post<AssignmentResponse>(url, data)
  return response.data
}

/**
 * Update an existing assignment (Story 3.8)
 *
 * @param assignmentId - ID of assignment to update
 * @param data - Assignment update data (partial)
 * @returns Promise with updated assignment response
 */
export async function updateAssignment(
  assignmentId: string,
  data: AssignmentUpdateRequest,
): Promise<AssignmentResponse> {
  const url = `/api/v1/assignments/${assignmentId}`
  const response = await apiClient.patch<AssignmentResponse>(url, data)
  return response.data
}

/**
 * Delete an assignment (Story 3.8)
 *
 * @param assignmentId - ID of assignment to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteAssignment(assignmentId: string): Promise<void> {
  const url = `/api/v1/assignments/${assignmentId}`
  await apiClient.delete(url)
}

/**
 * Get list of assignments for the current student (Story 3.9)
 *
 * @param status - Optional status filter (not_started, in_progress, completed)
 * @returns Promise with student's assignment list
 */
export async function getStudentAssignments(
  status?: "not_started" | "in_progress" | "completed",
): Promise<StudentAssignmentResponse[]> {
  const url = `/api/v1/students/me/assignments`
  const params = status ? { status } : {}
  const response = await apiClient.get<StudentAssignmentResponse[]>(url, {
    params,
  })
  return response.data
}

/**
 * Start an assignment for the current student (Story 4.1)
 *
 * @param assignmentId - ID of assignment to start
 * @returns Promise with activity configuration and student progress
 */
export async function startAssignment(
  assignmentId: string,
): Promise<ActivityStartResponse> {
  const url = `/api/v1/assignments/${assignmentId}/start`
  const response = await apiClient.get<ActivityStartResponse>(url)
  return response.data
}

/**
 * Save assignment progress (auto-save or manual save) (Story 4.8)
 *
 * @param assignmentId - ID of assignment to save progress for
 * @param data - Progress data (partial answers, time spent)
 * @returns Promise with save progress response
 */
export async function saveProgress(
  assignmentId: string,
  data: AssignmentSaveProgressRequest,
): Promise<AssignmentSaveProgressResponse> {
  const url = `/api/v1/assignments/${assignmentId}/save-progress`
  const response = await apiClient.post<AssignmentSaveProgressResponse>(
    url,
    data,
  )
  return response.data
}

/**
 * Submit a completed assignment (Story 4.7)
 *
 * @param assignmentId - ID of assignment to submit
 * @param data - Submission data (answers, score, time spent)
 * @returns Promise with submission response
 */
export async function submitAssignment(
  assignmentId: string,
  data: AssignmentSubmitRequest,
): Promise<AssignmentSubmissionResponse> {
  const url = `/api/v1/assignments/${assignmentId}/submit`
  const payload = {
    ...data,
    completed_at: data.completed_at || new Date().toISOString(),
  }
  const response = await apiClient.post<AssignmentSubmissionResponse>(
    url,
    payload,
  )
  return response.data
}

/**
 * Get detailed results for an assignment (Story 5.3)
 *
 * @param assignmentId - ID of assignment to get results for
 * @returns Promise with detailed assignment results
 */
export async function getAssignmentDetailedResults(
  assignmentId: string,
): Promise<AssignmentDetailedResultsResponse> {
  const url = `/api/v1/assignments/${assignmentId}/detailed-results`
  const response = await apiClient.get<AssignmentDetailedResultsResponse>(url)
  return response.data
}

/**
 * Get individual student's answers for an assignment (Story 5.3)
 *
 * @param assignmentId - ID of assignment
 * @param studentId - ID of student
 * @returns Promise with student's full answers
 */
export async function getStudentAnswers(
  assignmentId: string,
  studentId: string,
): Promise<StudentAnswersResponse> {
  const url = `/api/v1/assignments/${assignmentId}/students/${studentId}/answers`
  const response = await apiClient.get<StudentAnswersResponse>(url)
  return response.data
}

// =============================================================================
// Multi-Activity Assignment APIs (Story 8.3)
// =============================================================================

/**
 * Start a multi-activity assignment for the current student (Story 8.3)
 *
 * @param assignmentId - ID of assignment to start
 * @returns Promise with all activities, configs, and per-activity progress
 */
export async function startMultiActivityAssignment(
  assignmentId: string,
): Promise<MultiActivityStartResponse> {
  const url = `/api/v1/assignments/${assignmentId}/start-multi`
  const response = await apiClient.get<MultiActivityStartResponse>(url)
  return response.data
}

/**
 * Save progress for a specific activity within a multi-activity assignment (Story 8.3)
 *
 * @param assignmentId - ID of assignment
 * @param activityId - ID of activity to save progress for
 * @param data - Activity progress data (response_data, status, score)
 * @returns Promise with save progress response
 */
export async function saveActivityProgress(
  assignmentId: string,
  activityId: string,
  data: ActivityProgressSaveRequest,
): Promise<ActivityProgressSaveResponse> {
  const url = `/api/v1/assignments/${assignmentId}/students/me/activities/${activityId}`
  const response = await apiClient.patch<ActivityProgressSaveResponse>(
    url,
    data,
  )
  return response.data
}

/**
 * Submit a multi-activity assignment (Story 8.3)
 *
 * @param assignmentId - ID of assignment to submit
 * @param data - Submit request (optional force_submit for timer expiry)
 * @returns Promise with combined score and per-activity scores
 */
export async function submitMultiActivityAssignment(
  assignmentId: string,
  data?: MultiActivitySubmitRequest,
): Promise<MultiActivitySubmitResponse> {
  const url = `/api/v1/assignments/${assignmentId}/students/me/submit-multi`
  const response = await apiClient.post<MultiActivitySubmitResponse>(
    url,
    data || {},
  )
  return response.data
}

// =============================================================================
// Multi-Activity Analytics APIs (Story 8.4)
// =============================================================================

/**
 * Get analytics for a multi-activity assignment (teacher view)
 * Story 8.4: Multi-Activity Assignment Analytics
 *
 * @param assignmentId - ID of assignment to get analytics for
 * @param expandActivityId - Optional activity ID to expand with per-student scores
 * @returns Promise with analytics data including per-activity metrics
 */
export async function getAssignmentAnalytics(
  assignmentId: string,
  expandActivityId?: string,
): Promise<MultiActivityAnalyticsResponse> {
  const url = `/api/v1/assignments/${assignmentId}/analytics`
  const params = expandActivityId
    ? { expand_activity_id: expandActivityId }
    : {}
  const response = await apiClient.get<MultiActivityAnalyticsResponse>(url, {
    params,
  })
  return response.data
}

/**
 * Get student's own result for a multi-activity assignment (student view)
 * Story 8.4: Multi-Activity Assignment Analytics
 *
 * @param assignmentId - ID of assignment to get result for
 * @returns Promise with student's score breakdown by activity
 */
export async function getStudentAssignmentResult(
  assignmentId: string,
): Promise<StudentAssignmentResultResponse> {
  const url = `/api/v1/assignments/${assignmentId}/students/me/result`
  const response = await apiClient.get<StudentAssignmentResultResponse>(url)
  return response.data
}

// =============================================================================
// Bulk Assignment APIs (Time Planning Mode)
// =============================================================================

/**
 * Create multiple assignments using Time Planning mode
 * Story 9.x: Time Planning Mode
 *
 * Each date group creates a separate assignment with its own:
 * - scheduled_publish_date: When the assignment becomes visible
 * - due_date: Optional deadline for that group
 * - time_limit_minutes: Optional time limit for that group
 * - activity_ids: Activities included in that assignment
 *
 * @param data - Assignment creation data with date_groups
 * @returns Promise with bulk creation response containing all created assignments
 */
export async function createBulkAssignments(
  data: AssignmentCreateRequest,
): Promise<BulkAssignmentCreateResponse> {
  const url = `/api/v1/assignments/bulk`
  const response = await apiClient.post<BulkAssignmentCreateResponse>(url, data)
  return response.data
}

// =============================================================================
// Calendar APIs (Story 9.6)
// =============================================================================

/**
 * Calendar filter parameters
 * Story 9.6: Calendar-Based Assignment Scheduling
 */
export interface CalendarFilters {
  startDate: string // ISO date string YYYY-MM-DD
  endDate: string // ISO date string YYYY-MM-DD
  classId?: string
  statusFilter?: AssignmentPublishStatus
  bookId?: string
}

/**
 * Get assignments for calendar view within a date range
 * Story 9.6: Calendar-Based Assignment Scheduling
 *
 * @param filters - Calendar filter parameters (date range, optional filters)
 * @returns Promise with assignments grouped by date
 */
export async function getCalendarAssignments(
  filters: CalendarFilters,
): Promise<CalendarAssignmentsResponse> {
  const url = `/api/v1/assignments/calendar`
  const params: Record<string, string> = {
    start_date: filters.startDate,
    end_date: filters.endDate,
  }
  if (filters.classId) {
    params.class_id = filters.classId
  }
  if (filters.statusFilter) {
    params.status = filters.statusFilter
  }
  if (filters.bookId) {
    params.book_id = filters.bookId
  }
  const response = await apiClient.get<CalendarAssignmentsResponse>(url, {
    params,
  })
  return response.data
}

/**
 * Export as object for easier imports
 */
// =============================================================================
// Student Calendar APIs
// =============================================================================

/**
 * Student calendar filter parameters
 */
export interface StudentCalendarFilters {
  startDate: string // ISO date string YYYY-MM-DD
  endDate: string // ISO date string YYYY-MM-DD
}

/**
 * Get student's assignments for calendar view within a date range
 * Only shows published assignments (scheduled ones are not visible until published).
 *
 * @param filters - Calendar filter parameters (date range)
 * @returns Promise with assignments grouped by due date
 */
export async function getStudentCalendarAssignments(
  filters: StudentCalendarFilters,
): Promise<StudentCalendarAssignmentsResponse> {
  const url = `/api/v1/students/me/calendar`
  const params: Record<string, string> = {
    start_date: filters.startDate,
    end_date: filters.endDate,
  }
  const response = await apiClient.get<StudentCalendarAssignmentsResponse>(
    url,
    {
      params,
    },
  )
  return response.data
}

// =============================================================================
// Preview/Test Mode APIs (Story 9.7)
// =============================================================================

/**
 * Preview an assignment (teacher test mode)
 * Returns assignment data without creating any student records.
 * Teachers can only preview their own assignments.
 *
 * @param assignmentId - ID of the assignment to preview
 * @returns Promise with assignment preview data including all activities
 */
export async function previewAssignment(
  assignmentId: string,
): Promise<AssignmentPreviewResponse> {
  const url = `/api/v1/assignments/${assignmentId}/preview`
  const response = await apiClient.get<AssignmentPreviewResponse>(url)
  return response.data
}

/**
 * Get assignment data for editing (Story 20.2)
 * Returns assignment data with recipient information preserved
 *
 * @param assignmentId - ID of the assignment to edit
 * @returns Promise with assignment edit data including recipients
 */
export async function getAssignmentForEdit(
  assignmentId: string,
): Promise<AssignmentForEditResponse> {
  const url = `/api/v1/assignments/${assignmentId}/for-edit`
  const response = await apiClient.get<AssignmentForEditResponse>(url)
  return response.data
}

/**
 * Preview a single activity
 * Returns activity data for teacher/publisher preview.
 * Teachers must have book access to preview the activity.
 *
 * @param activityId - ID of the activity to preview
 * @returns Promise with activity preview data including config
 */
export async function previewActivity(
  activityId: string,
): Promise<ActivityPreviewResponse> {
  const url = `/api/v1/assignments/activities/${activityId}/preview`
  const response = await apiClient.get<ActivityPreviewResponse>(url)
  return response.data
}

/**
 * Get detailed assignment result for review (Story 23.4)
 * Returns submitted answers with activity config for result review
 *
 * @param assignmentId - Assignment ID
 * @returns Promise with detailed result data including submitted answers
 */
export async function getAssignmentResult(
  assignmentId: string,
): Promise<AssignmentResultDetailResponse> {
  const url = `/api/v1/assignments/${assignmentId}/result`
  const response = await apiClient.get<AssignmentResultDetailResponse>(url)
  return response.data
}

/**
 * Attach a teacher material to an assignment
 * Story 21.3: Upload Materials in Resources Context
 */
async function attachMaterial(
  assignmentId: string,
  materialId: string,
): Promise<{ status: string }> {
  const url = `/api/v1/assignments/${assignmentId}/materials/${materialId}`
  const response = await apiClient.post<{ status: string }>(url)
  return response.data
}

export const assignmentsApi = {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getStudentAssignments,
  startAssignment,
  saveProgress,
  submitAssignment,
  getAssignmentDetailedResults,
  getStudentAnswers,
  // Multi-activity APIs (Story 8.3)
  startMultiActivityAssignment,
  saveActivityProgress,
  submitMultiActivityAssignment,
  // Multi-activity analytics APIs (Story 8.4)
  getAssignmentAnalytics,
  getStudentAssignmentResult,
  // Bulk assignment APIs (Time Planning Mode)
  createBulkAssignments,
  // Calendar APIs (Story 9.6)
  getCalendarAssignments,
  getStudentCalendarAssignments,
  // Preview/Test Mode APIs (Story 9.7)
  previewAssignment,
  previewActivity,
  getAssignmentForEdit,
  // Result Viewing APIs (Story 23.4)
  getAssignmentResult,
  // Teacher Materials APIs (Story 21.3)
  attachMaterial,
}

export default assignmentsApi
