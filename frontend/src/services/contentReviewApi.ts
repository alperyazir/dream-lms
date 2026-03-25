/**
 * Content Review API Service (Story 27.19)
 *
 * API client for content review, regeneration, and save operations.
 */

import { createApiClient } from "./apiClient";

export interface RegenerateQuestionRequest {
  quiz_id: string;
  question_index: number;
  context: Record<string, any>;
}

export interface AIQuizQuestion {
  question_id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  correct_index: number;
  explanation: string | null;
  source_module_id: number;
  source_page?: number | null;
  difficulty: string;
}

export interface SaveToLibraryRequest {
  quiz_id: string;
  activity_type: string;
  title: string;
  description?: string | null;
  content?: Record<string, any> | null;
}

export interface SaveToLibraryResponse {
  content_id: string;
  title: string;
  activity_type: string;
  created_at: string;
}

export interface CreateAssignmentRequest {
  quiz_id: string;
  activity_type: string;
  title: string;
  description?: string | null;
}

export interface CreateAssignmentResponse {
  message: string;
  quiz_id: string;
  activity_type: string;
  title: string;
  redirect_url: string;
}

const apiClient = createApiClient();

export const contentReviewApi = {
  /**
   * Regenerate a single question in a quiz
   */
  async regenerateQuestion(
    request: RegenerateQuestionRequest,
  ): Promise<AIQuizQuestion> {
    const response = await apiClient.post<AIQuizQuestion>(
      "/api/v1/ai/quiz/regenerate-question",
      request,
    );
    return response.data;
  },

  /**
   * Save generated content to teacher's library
   */
  async saveToLibrary(
    request: SaveToLibraryRequest,
  ): Promise<SaveToLibraryResponse> {
    const response = await apiClient.post<SaveToLibraryResponse>(
      "/api/v1/ai/content/save-to-library",
      request,
    );
    return response.data;
  },

  /**
   * Create assignment from generated content
   */
  async createAssignment(
    request: CreateAssignmentRequest,
  ): Promise<CreateAssignmentResponse> {
    const response = await apiClient.post<CreateAssignmentResponse>(
      "/api/v1/ai/content/create-assignment",
      request,
    );
    return response.data;
  },
};
