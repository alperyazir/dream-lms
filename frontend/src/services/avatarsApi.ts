/**
 * Avatars API Service
 * Story 9.1: Profile Avatar System
 *
 * This service provides functions to interact with the Avatars API endpoints.
 */

import type { UserPublic } from "../client";
import type {
  AvatarUpdateResponse,
  PredefinedAvatarsResponse,
  SelectAvatarRequest,
  SetAvatarUrlRequest,
} from "../types/avatar";
import { createApiClient } from "./apiClient";

// UserPublic is used for the selectPredefinedAvatar return type

const apiClient = createApiClient();

/**
 * Get all predefined avatar options
 *
 * @returns Promise with list of predefined avatars
 */
export async function getPredefinedAvatars(): Promise<PredefinedAvatarsResponse> {
  const url = `/api/v1/avatars/predefined`;
  const response = await apiClient.get<PredefinedAvatarsResponse>(url);
  return response.data;
}

/**
 * Select a predefined avatar for the current user
 *
 * @param data - Avatar selection data with avatar_id
 * @returns Promise with the updated user
 */
export async function selectPredefinedAvatar(
  data: SelectAvatarRequest,
): Promise<UserPublic> {
  const url = `/api/v1/avatars/me`;
  const response = await apiClient.patch<UserPublic>(url, data);
  return response.data;
}

/**
 * Remove the current user's avatar (reset to default)
 *
 * @returns Promise with the update response
 */
export async function removeAvatar(): Promise<AvatarUpdateResponse> {
  const url = `/api/v1/avatars/me`;
  const response = await apiClient.delete<AvatarUpdateResponse>(url);
  return response.data;
}

/**
 * Set a custom avatar URL for the current user (e.g., DiceBear)
 *
 * @param data - Object with avatar_url
 * @returns Promise with the updated user
 */
export async function setAvatarUrl(
  data: SetAvatarUrlRequest,
): Promise<UserPublic> {
  const url = `/api/v1/avatars/me`;
  const response = await apiClient.patch<UserPublic>(url, data);
  return response.data;
}

/**
 * Export as object for easier imports
 */
export const avatarsApi = {
  getPredefinedAvatars,
  selectPredefinedAvatar,
  removeAvatar,
  setAvatarUrl,
};

export default avatarsApi;
