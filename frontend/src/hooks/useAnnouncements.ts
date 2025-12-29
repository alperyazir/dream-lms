/**
 * Custom hooks for teacher announcements
 * Story 26.1: Teacher Announcement Creation & Management
 *
 * Uses TanStack Query for efficient data fetching and caching.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import {
  announcementsApi,
  type AnnouncementQueryParams,
  type StudentAnnouncementQueryParams,
} from "@/services/announcementsApi"
import type {
  AnnouncementCreate,
  AnnouncementUpdate,
} from "@/types/announcement"

/**
 * Query keys for announcements
 */
export const ANNOUNCEMENTS_QUERY_KEY = ["announcements"] as const

/**
 * Query key factory for announcement detail
 */
export const announcementDetailQueryKey = (announcementId: string) =>
  ["announcements", "detail", announcementId] as const

/**
 * Hook for fetching announcements list with optional pagination
 *
 * @param params - Optional query parameters for pagination
 * @param options - Optional query options
 */
export function useAnnouncements(
  params: AnnouncementQueryParams = {},
  options: {
    enabled?: boolean
  } = {}
) {
  return useQuery({
    queryKey: [...ANNOUNCEMENTS_QUERY_KEY, params],
    queryFn: () => announcementsApi.getAll(params),
    enabled: options.enabled,
  })
}

/**
 * Hook for fetching a specific announcement by ID
 *
 * @param announcementId - The ID of the announcement to fetch
 * @param options - Optional query options
 */
export function useAnnouncementDetail(
  announcementId: string,
  options: {
    enabled?: boolean
  } = {}
) {
  return useQuery({
    queryKey: announcementDetailQueryKey(announcementId),
    queryFn: () => announcementsApi.getById(announcementId),
    enabled: options.enabled && !!announcementId,
  })
}

/**
 * Hook for creating a new announcement
 *
 * Automatically invalidates the announcements list on success.
 */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: AnnouncementCreate) => announcementsApi.create(data),
    onSuccess: () => {
      // Invalidate announcements list
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY })
      toast({
        title: "Announcement created",
        description: "Your announcement has been sent successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create announcement",
        description: error.response?.data?.detail || "An error occurred",
        variant: "destructive",
      })
    },
  })
}

/**
 * Hook for updating an existing announcement
 *
 * Automatically invalidates the announcements list and detail on success.
 */
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      announcementId,
      data,
    }: {
      announcementId: string
      data: AnnouncementUpdate
    }) => announcementsApi.update(announcementId, data),
    onSuccess: (_, variables) => {
      // Invalidate announcements list and specific detail
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY })
      queryClient.invalidateQueries({
        queryKey: announcementDetailQueryKey(variables.announcementId),
      })
      toast({
        title: "Announcement updated",
        description: "Your changes have been saved.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update announcement",
        description: error.response?.data?.detail || "An error occurred",
        variant: "destructive",
      })
    },
  })
}

/**
 * Hook for deleting an announcement
 *
 * Automatically invalidates the announcements list on success.
 */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (announcementId: string) =>
      announcementsApi.delete(announcementId),
    onSuccess: () => {
      // Invalidate announcements list
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY })
      toast({
        title: "Announcement deleted",
        description: "The announcement has been removed.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete announcement",
        description: error.response?.data?.detail || "An error occurred",
        variant: "destructive",
      })
    },
  })
}

// =============================================================================
// Student-Facing Hooks (Story 26.2)
// =============================================================================

/**
 * Query keys for student announcements
 */
export const STUDENT_ANNOUNCEMENTS_QUERY_KEY = ["student-announcements"] as const

/**
 * Query key factory for student announcement detail
 */
export const studentAnnouncementDetailQueryKey = (announcementId: string) =>
  ["student-announcements", "detail", announcementId] as const

/**
 * Hook for fetching student's announcements with optional filtering and pagination
 *
 * @param params - Optional query parameters for filtering and pagination
 * @param options - Optional query options
 */
export function useStudentAnnouncements(
  params: StudentAnnouncementQueryParams = {},
  options: {
    enabled?: boolean
  } = {}
) {
  return useQuery({
    queryKey: [...STUDENT_ANNOUNCEMENTS_QUERY_KEY, params],
    queryFn: () => announcementsApi.getMyAnnouncements(params),
    enabled: options.enabled,
  })
}

/**
 * Hook for fetching a specific announcement as a student
 *
 * @param announcementId - The ID of the announcement to fetch
 * @param options - Optional query options
 */
export function useStudentAnnouncementDetail(
  announcementId: string,
  options: {
    enabled?: boolean
  } = {}
) {
  return useQuery({
    queryKey: studentAnnouncementDetailQueryKey(announcementId),
    queryFn: () => announcementsApi.getAsStudent(announcementId),
    enabled: options.enabled && !!announcementId,
  })
}

/**
 * Hook for marking an announcement as read
 *
 * Automatically invalidates student announcements on success.
 */
export function useMarkAnnouncementAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (announcementId: string) =>
      announcementsApi.markAsRead(announcementId),
    onSuccess: () => {
      // Invalidate all student announcements queries to update read status
      queryClient.invalidateQueries({ queryKey: STUDENT_ANNOUNCEMENTS_QUERY_KEY })
    },
  })
}
