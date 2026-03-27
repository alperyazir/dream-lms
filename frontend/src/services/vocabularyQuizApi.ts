/**
 * Vocabulary Quiz API Service
 * Story 27.8: Vocabulary Quiz Generation (Definition-Based)
 *
 * This service provides functions to interact with the AI Vocabulary Quiz API endpoints.
 */

import axios from "axios";
import type {
  VocabularyQuiz,
  VocabularyQuizGenerationRequest,
  VocabularyQuizPublic,
  VocabularyQuizResult,
  VocabularyQuizSubmission,
} from "../types/vocabulary-quiz";
import { createApiClient } from "./apiClient";

const apiClient = createApiClient();

/**
 * Generate a new vocabulary quiz from book modules
 *
 * @param request - Quiz generation parameters
 * @returns Promise with the generated quiz (including correct answers)
 */
export async function generateQuiz(
  request: VocabularyQuizGenerationRequest,
): Promise<VocabularyQuiz> {
  const url = "/api/v1/ai/vocabulary-quiz/generate";
  const response = await apiClient.post<VocabularyQuiz>(url, request);
  return response.data;
}

/**
 * Get a quiz for taking (without correct answers)
 *
 * @param quizId - ID of the quiz
 * @returns Promise with the public quiz view
 */
export async function getQuiz(quizId: string): Promise<VocabularyQuizPublic> {
  const url = `/api/v1/ai/vocabulary-quiz/${quizId}`;
  const response = await apiClient.get<VocabularyQuizPublic>(url);
  return response.data;
}

/**
 * Submit quiz answers and get result
 *
 * @param quizId - ID of the quiz
 * @param submission - User's answers
 * @returns Promise with the quiz result
 */
export async function submitQuiz(
  quizId: string,
  submission: VocabularyQuizSubmission,
): Promise<VocabularyQuizResult> {
  const url = `/api/v1/ai/vocabulary-quiz/${quizId}/submit`;
  const response = await apiClient.post<VocabularyQuizResult>(url, submission);
  return response.data;
}

/**
 * Get quiz result for a previously submitted quiz
 *
 * @param quizId - ID of the quiz
 * @returns Promise with the quiz result, or null if not found/not submitted
 */
export async function getQuizResult(
  quizId: string,
): Promise<VocabularyQuizResult | null> {
  const url = `/api/v1/ai/vocabulary-quiz/${quizId}/result`;
  try {
    const response = await apiClient.get<VocabularyQuizResult>(url);
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
export const vocabularyQuizApi = {
  generateQuiz,
  getQuiz,
  submitQuiz,
  getQuizResult,
};

export default vocabularyQuizApi;
