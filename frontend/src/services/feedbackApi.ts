/**
 * Feedback API Service
 * Story 6.4: Teacher Feedback on Assignments
 *
 * This service provides functions to interact with the Feedback API endpoints.
 */

import axios from "axios";
import type {
  FeedbackCreate,
  FeedbackPublic,
  FeedbackResponse,
  FeedbackUpdate,
} from "../types/feedback";
import { createApiClient } from "./apiClient";

const apiClient = createApiClient();

/**
 * Create or update feedback for a student's assignment
 *
 * @param assignmentId - UUID of the assignment
 * @param studentId - UUID of the student (students.id, not user_id)
 * @param data - Feedback creation data
 * @returns Promise with the created/updated feedback
 */
export async function createOrUpdateFeedback(
  assignmentId: string,
  studentId: string,
  data: FeedbackCreate,
): Promise<FeedbackPublic> {
  const url = `/api/v1/assignments/${assignmentId}/students/${studentId}/feedback`;
  const response = await apiClient.post<FeedbackPublic>(url, data);
  return response.data;
}

/**
 * Get feedback for a student's assignment
 * Teachers see full feedback, students see limited view
 *
 * @param assignmentId - UUID of the assignment
 * @param studentId - UUID of the student (students.id, not user_id)
 * @returns Promise with the feedback (full or limited view)
 */
export async function getFeedback(
  assignmentId: string,
  studentId: string,
): Promise<FeedbackResponse> {
  const url = `/api/v1/assignments/${assignmentId}/students/${studentId}/feedback`;
  const response = await apiClient.get<FeedbackResponse>(url);
  return response.data;
}

/**
 * Update existing feedback by ID
 *
 * @param feedbackId - UUID of the feedback to update
 * @param data - Feedback update data
 * @returns Promise with the updated feedback
 */
export async function updateFeedback(
  feedbackId: string,
  data: FeedbackUpdate,
): Promise<FeedbackPublic> {
  const url = `/api/v1/assignments/feedback/${feedbackId}`;
  const response = await apiClient.put<FeedbackPublic>(url, data);
  return response.data;
}

/**
 * Get the current student's feedback for an assignment
 *
 * This endpoint is for students to get their own feedback
 * without needing to know their student_id.
 *
 * @param assignmentId - UUID of the assignment
 * @returns Promise with the feedback (limited student view) or null if none exists
 */
export async function getMyFeedback(
  assignmentId: string,
): Promise<FeedbackResponse | null> {
  const url = `/api/v1/assignments/${assignmentId}/my-feedback`;
  try {
    const response = await apiClient.get<FeedbackResponse | null>(url);
    return response.data;
  } catch (error) {
    // Return null if feedback not found (404)
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Export as object for easier imports
 */
export const feedbackApi = {
  createOrUpdateFeedback,
  getFeedback,
  updateFeedback,
  getMyFeedback,
};

export default feedbackApi;
