/**
 * Teachers API Service
 * Story 3.7: Assignment Creation Dialog & Configuration
 *
 * This service provides functions to interact with the Teachers API endpoints.
 * Used for fetching teacher's classes and students for assignment creation.
 */

import type { StudentPublic } from "../client";
import type { Class, Student } from "../types/teacher";
import { createApiClient } from "./apiClient";

export interface PaginatedStudentsResponse {
  items: StudentPublic[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

const apiClient = createApiClient();

/**
 * Get all classes for the authenticated teacher
 *
 * @returns Promise with array of classes
 */
export async function getMyClasses(): Promise<Class[]> {
  const url = `/api/v1/teachers/me/classes`;
  const response = await apiClient.get<Class[]>(url);
  return response.data;
}

/**
 * Get all students for the authenticated teacher
 *
 * @returns Promise with array of students
 */
export async function getMyStudents(): Promise<Student[]> {
  const url = `/api/v1/teachers/me/students`;
  const response = await apiClient.get(url);
  // Handle both paginated response { items: [...] } and legacy array response
  const data = response.data;
  return Array.isArray(data) ? data : (data.items ?? []);
}

/**
 * Get paginated students for the authenticated teacher
 *
 * @param limit - Number of students per page (default 20, max 100)
 * @param offset - Number of students to skip
 * @returns Promise with paginated response including items, total, has_more
 */
export async function getMyStudentsPaginated(
  limit = 20,
  offset = 0,
): Promise<PaginatedStudentsResponse> {
  const url = `/api/v1/teachers/me/students`;
  const response = await apiClient.get<PaginatedStudentsResponse>(url, {
    params: { limit, offset },
  });
  return response.data;
}

/**
 * Class students group - students grouped by class ID
 * Story 20.5: Recipient Selection Enhancements
 */
export interface ClassStudentsGroup {
  class_id: string;
  students: Student[];
}

/**
 * Get students for multiple classes at once (Story 20.5)
 *
 * This is optimized to fetch students across multiple classes
 * in a single request to avoid N+1 query problems.
 *
 * @param classIds - Array of class IDs to fetch students for
 * @returns Promise with array of ClassStudentsGroup
 */
export async function getStudentsForClasses(
  classIds: string[],
): Promise<ClassStudentsGroup[]> {
  const url = `/api/v1/teachers/me/classes/students`;
  const response = await apiClient.post<ClassStudentsGroup[]>(url, {
    class_ids: classIds,
  });
  return response.data;
}

/**
 * Export as object for easier imports
 */
export const teachersApi = {
  getMyClasses,
  getMyStudents,
  getMyStudentsPaginated,
  getStudentsForClasses,
};

export default teachersApi;
