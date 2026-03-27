/**
 * Students API Service
 * Story 5.1: Individual Student Performance Dashboard
 * Story 5.5: Student Progress Tracking & Personal Analytics
 *
 * This service provides functions to interact with the Students API endpoints.
 */

import type {
  PeriodType,
  StudentAnalyticsResponse,
  StudentProgressPeriod,
  StudentProgressResponse,
} from "../types/analytics";
import type { Student } from "../types/teacher";
import { createApiClient } from "./apiClient";

const apiClient = createApiClient();

/**
 * Get comprehensive performance analytics for a student
 *
 * @param studentId - ID of the student
 * @param period - Time period for analytics ('7d', '30d', '3m', 'all')
 * @returns Promise with complete analytics data
 */
export async function getStudentAnalytics(
  studentId: string,
  period: PeriodType = "30d",
): Promise<StudentAnalyticsResponse> {
  const url = `/api/v1/students/${studentId}/analytics`;
  const response = await apiClient.get<StudentAnalyticsResponse>(url, {
    params: { period },
  });
  return response.data;
}

/**
 * Get student's own progress data for the student-facing dashboard
 *
 * @param period - Time period for progress ('this_week', 'this_month', 'all_time')
 * @returns Promise with complete student progress data
 */
export async function getStudentProgress(
  period: StudentProgressPeriod = "this_month",
): Promise<StudentProgressResponse> {
  const url = "/api/v1/students/me/progress";
  const response = await apiClient.get<StudentProgressResponse>(url, {
    params: { period },
  });
  return response.data;
}

/**
 * Get students not enrolled in any of the teacher's classes (Story 20.5)
 *
 * @returns Promise with array of unassigned students
 */
export async function getUnassignedStudents(): Promise<Student[]> {
  const url = "/api/v1/students/unassigned";
  const response = await apiClient.get<Student[]>(url);
  return response.data;
}

/**
 * Story 28.1: Student Password Response type
 */
export interface StudentPasswordResponse {
  student_id: string;
  username: string;
  full_name: string;
  password: string | null;
  message: string | null;
}

/**
 * Get viewable password for a student (Story 28.1)
 * Admin/supervisor can see all students
 * Teachers can only see passwords for students they created or in their classes
 *
 * @param studentId - ID of the student
 * @returns Promise with student password data
 */
export async function getStudentPassword(
  studentId: string,
): Promise<StudentPasswordResponse> {
  const url = `/api/v1/admin/students/${studentId}/password`;
  const response = await apiClient.get<StudentPasswordResponse>(url);
  return response.data;
}

/**
 * Set password for a student (Story 28.1)
 * Admin/supervisor can set for all students
 * Teachers can only set passwords for students they created or in their classes
 *
 * @param studentId - ID of the student
 * @param password - New password (4-50 characters)
 * @returns Promise with updated student password data
 */
export async function setStudentPassword(
  studentId: string,
  password: string,
): Promise<StudentPasswordResponse> {
  const url = `/api/v1/admin/students/${studentId}/password`;
  const response = await apiClient.put<StudentPasswordResponse>(url, {
    password,
  });
  return response.data;
}

/**
 * Export as object for easier imports
 */
export const studentsApi = {
  getStudentAnalytics,
  getStudentProgress,
  getUnassignedStudents,
  getStudentPassword,
  setStudentPassword,
};

export default studentsApi;
