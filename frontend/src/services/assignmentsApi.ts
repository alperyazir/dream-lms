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
  ActivityStartResponse,
  AssignmentCreateRequest,
  AssignmentListItem,
  AssignmentResponse,
  AssignmentSaveProgressRequest,
  AssignmentSaveProgressResponse,
  AssignmentSubmissionResponse,
  AssignmentSubmitRequest,
  AssignmentUpdateRequest,
  StudentAssignmentResponse,
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
    const tokenValue = typeof token === "function" ? await token({ method: (config.method || "GET") as "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD", url: config.url || "" }) : token
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
  const url = `/api/v1/assignments`
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
  const response = await apiClient.post<AssignmentSaveProgressResponse>(url, data)
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
  const response = await apiClient.post<AssignmentSubmissionResponse>(url, payload)
  return response.data
}

/**
 * Export as object for easier imports
 */
export const assignmentsApi = {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getStudentAssignments,
  startAssignment,
  saveProgress,
  submitAssignment,
}

export default assignmentsApi
