/**
 * Content Library Hooks
 * Story 27.21: Content Library UI
 *
 * Custom hooks for content library data fetching and state management.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteLibraryContent,
  getLibraryContentDetail,
  listLibraryContent,
  updateLibraryContent,
} from "@/services/contentLibraryApi"
import type {
  ContentItemDetail,
  LibraryFilters,
  LibraryResponse,
  UpdateContentRequest,
} from "@/types/content-library"

// =============================================================================
// Query Keys
// =============================================================================

export const contentLibraryKeys = {
  all: ["contentLibrary"] as const,
  lists: () => [...contentLibraryKeys.all, "list"] as const,
  list: (filters?: LibraryFilters) =>
    [...contentLibraryKeys.lists(), filters] as const,
  details: () => [...contentLibraryKeys.all, "detail"] as const,
  detail: (id: string) => [...contentLibraryKeys.details(), id] as const,
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to fetch content library items with filters
 */
export function useContentLibrary(filters?: LibraryFilters) {
  return useQuery<LibraryResponse>({
    queryKey: contentLibraryKeys.list(filters),
    queryFn: () => listLibraryContent(filters),
  })
}

/**
 * Hook to fetch detailed content library item
 */
export function useContentLibraryDetail(contentId: string) {
  return useQuery<ContentItemDetail>({
    queryKey: contentLibraryKeys.detail(contentId),
    queryFn: () => getLibraryContentDetail(contentId),
    enabled: !!contentId,
  })
}

/**
 * Hook to delete content library item
 */
export function useDeleteContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (contentId: string) => deleteLibraryContent(contentId),
    onSuccess: () => {
      // Invalidate all library queries to refetch
      queryClient.invalidateQueries({ queryKey: contentLibraryKeys.lists() })
    },
  })
}

/**
 * Hook to update content library item
 */
export function useUpdateContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      contentId,
      data,
    }: {
      contentId: string
      data: UpdateContentRequest
    }) => updateLibraryContent(contentId, data),
    onSuccess: (_, variables) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: contentLibraryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: contentLibraryKeys.detail(variables.contentId),
      })
    },
  })
}
