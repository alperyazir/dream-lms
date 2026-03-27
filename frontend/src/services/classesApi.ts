/**
 * Classes API Service
 * Story 5.2: Class-Wide Performance Analytics
 *
 * This service provides functions to interact with the Classes API endpoints.
 */

import type {
  ClassAnalyticsResponse,
  ClassPeriodType,
} from "../types/analytics";
import { createApiClient } from "./apiClient";

const apiClient = createApiClient();

/**
 * Get comprehensive performance analytics for a class
 *
 * @param classId - ID of the class
 * @param period - Time period for analytics ('weekly', 'monthly', 'semester', 'ytd')
 * @returns Promise with complete class analytics data
 */
export async function getClassAnalytics(
  classId: string,
  period: ClassPeriodType = "monthly",
): Promise<ClassAnalyticsResponse> {
  const url = `/api/v1/classes/${classId}/analytics`;
  const response = await apiClient.get<ClassAnalyticsResponse>(url, {
    params: { period },
  });
  return response.data;
}

/**
 * Export as object for easier imports
 */
export const classesApi = {
  getClassAnalytics,
};

export default classesApi;
