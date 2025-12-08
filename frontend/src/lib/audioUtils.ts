/**
 * Audio Utility Functions
 * Story 10.2: Frontend Audio Player Component
 *
 * Utilities for transforming activity audio paths to API URLs
 * and detecting audio content in activities.
 */

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem("access_token")
}

/**
 * Get the API base URL from environment
 */
function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || ""
}

/**
 * Transform activity config audio path to API URL.
 *
 * Config paths look like: "./books/SwitchtoCLIL/audio/08.mp3"
 * API expects: "{baseUrl}/api/v1/books/{bookId}/media/audio/08.mp3?token=xxx"
 *
 * @param bookId - The book UUID
 * @param audioPath - The audio_extra.path from activity config
 * @returns Full API URL for streaming (with auth token for HTML5 audio element)
 */
export function getAudioUrl(bookId: string, audioPath: string): string {
  // Remove leading "./" and "books/{bookName}/" prefix
  // "./books/SwitchtoCLIL/audio/08.mp3" → "audio/08.mp3"
  let cleanPath = audioPath

  // Remove "./" prefix
  if (cleanPath.startsWith("./")) {
    cleanPath = cleanPath.slice(2)
  }

  // Remove "books/{bookName}/" prefix if present
  const booksMatch = cleanPath.match(/^books\/[^/]+\/(.+)$/)
  if (booksMatch) {
    cleanPath = booksMatch[1]
  }

  // Include auth token for HTML5 audio element authentication
  const token = getAuthToken()
  const baseUrl = getApiBaseUrl()
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ""

  return `${baseUrl}/api/v1/books/${bookId}/media/${cleanPath}${tokenParam}`
}

/**
 * Audio extra configuration shape
 */
export interface AudioExtra {
  path: string
}

/**
 * Type for activity objects that may have audio_extra
 */
export interface ActivityWithAudio {
  audio_extra: AudioExtra
}

/**
 * Check if an activity has audio attached.
 *
 * @param activity - Activity config object
 * @returns True if audio_extra.path exists
 */
export function hasAudio(activity: unknown): activity is ActivityWithAudio {
  return (
    typeof activity === "object" &&
    activity !== null &&
    "audio_extra" in activity &&
    typeof (activity as { audio_extra: unknown }).audio_extra === "object" &&
    (activity as { audio_extra: { path?: unknown } | null }).audio_extra !==
      null &&
    typeof (activity as { audio_extra: { path: unknown } }).audio_extra.path ===
      "string" &&
    (activity as { audio_extra: { path: string } }).audio_extra.path.length > 0
  )
}

/**
 * Extract audio path from activity config if present.
 *
 * @param activity - Activity config object
 * @returns Audio path string or null if not present
 */
export function getAudioPath(activity: unknown): string | null {
  if (hasAudio(activity)) {
    return activity.audio_extra.path
  }
  return null
}
