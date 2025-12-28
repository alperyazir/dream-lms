/**
 * Publishers API Service
 * Story 25.5: Frontend Publisher Dashboard Restoration
 *
 * This service provides functions to interact with the Publishers API endpoints.
 * Uses the generated OpenAPI client for type safety.
 */

import {
  type PublisherProfile,
  type PublisherStats,
  PublishersService,
} from "@/client"

/**
 * Get the current publisher's profile from DCS
 * @returns Promise<PublisherProfile>
 */
export async function getMyProfile(): Promise<PublisherProfile> {
  return PublishersService.getMyProfile()
}

/**
 * Get publisher organization statistics
 * @returns Promise<PublisherStats>
 */
export async function getMyStats(): Promise<PublisherStats> {
  return PublishersService.getMyStats()
}

// Re-export types for convenience
export type { PublisherProfile, PublisherStats }
