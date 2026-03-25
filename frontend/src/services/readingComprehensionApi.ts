/**
 * Reading Comprehension API Service
 * Story 27.10: Reading Comprehension Generation
 *
 * This service provides functions to interact with the Reading Comprehension API endpoints.
 */

import axios from "axios";
import type {
  ReadingComprehensionActivity,
  ReadingComprehensionActivityPublic,
  ReadingComprehensionAnswer,
  ReadingComprehensionRequest,
  ReadingComprehensionResult,
  ReadingComprehensionSubmission,
} from "../types/reading-comprehension";
import { createApiClient } from "./apiClient";

const apiClient = createApiClient();

/**
 * Generate a new reading comprehension activity from a book module
 *
 * @param request - Activity generation parameters
 * @returns Promise with the generated activity (including correct answers)
 */
export async function generateReadingActivity(
  request: ReadingComprehensionRequest,
): Promise<ReadingComprehensionActivity> {
  const url = "/api/v1/ai/reading/generate";
  const response = await apiClient.post<ReadingComprehensionActivity>(
    url,
    request,
  );
  return response.data;
}

/**
 * Get a reading comprehension activity for taking (without correct answers)
 *
 * @param activityId - ID of the activity
 * @returns Promise with the public activity view
 */
export async function getReadingActivity(
  activityId: string,
): Promise<ReadingComprehensionActivityPublic> {
  const url = `/api/v1/ai/reading/${activityId}`;
  const response = await apiClient.get<ReadingComprehensionActivityPublic>(url);
  return response.data;
}

/**
 * Submit reading comprehension answers and get result
 *
 * @param activityId - ID of the activity
 * @param answers - User's answers for each question
 * @returns Promise with the activity result
 */
export async function submitReadingActivity(
  activityId: string,
  answers: ReadingComprehensionAnswer[],
): Promise<ReadingComprehensionResult> {
  const url = `/api/v1/ai/reading/${activityId}/submit`;
  const submission: ReadingComprehensionSubmission = { answers };
  const response = await apiClient.post<ReadingComprehensionResult>(
    url,
    submission,
  );
  return response.data;
}

/**
 * Get reading comprehension result for a previously submitted activity
 *
 * @param activityId - ID of the activity
 * @returns Promise with the activity result, or null if not found/not submitted
 */
export async function getReadingResult(
  activityId: string,
): Promise<ReadingComprehensionResult | null> {
  const url = `/api/v1/ai/reading/${activityId}/result`;
  try {
    const response = await apiClient.get<ReadingComprehensionResult>(url);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Export as object for easier imports
 */
export const readingComprehensionApi = {
  generateReadingActivity,
  getReadingActivity,
  submitReadingActivity,
  getReadingResult,
};

export default readingComprehensionApi;
