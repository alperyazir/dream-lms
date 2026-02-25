/**
 * Content Library Hooks
 * Story 27.21: Content Library UI
 *
 * Custom hooks for content library data fetching and state management.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteBookContent,
  deleteLibraryContent,
  getBookContentDetail,
  getLibraryContentDetail,
  listBookContent,
  listLibraryContent,
  updateLibraryContent,
  type BookContentFilters,
} from "@/services/contentLibraryApi"
import type {
  BookContentDetail,
  BookContentListResponse,
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

// =============================================================================
// Book-Centric Content Library
// =============================================================================

export const bookContentKeys = {
  all: ["bookContent"] as const,
  lists: () => [...bookContentKeys.all, "list"] as const,
  list: (bookId: number, filters?: BookContentFilters) =>
    [...bookContentKeys.lists(), bookId, filters] as const,
  details: () => [...bookContentKeys.all, "detail"] as const,
  detail: (bookId: number, contentId: string) =>
    [...bookContentKeys.details(), bookId, contentId] as const,
}

/**
 * Hook to fetch book content from DCS
 */
export function useBookContent(
  bookId: number | null,
  filters?: BookContentFilters,
) {
  return useQuery<BookContentListResponse>({
    queryKey: bookContentKeys.list(bookId!, filters),
    queryFn: () => listBookContent(bookId!, filters),
    enabled: !!bookId,
  })
}

/**
 * Hook to fetch detailed book content from DCS (includes full content data)
 */
export function useBookContentDetail(bookId: number | null, contentId: string) {
  return useQuery<BookContentDetail>({
    queryKey: bookContentKeys.detail(bookId!, contentId),
    queryFn: () => getBookContentDetail(bookId!, contentId),
    enabled: !!bookId && !!contentId,
  })
}

/**
 * Hook to delete book content from DCS
 */
export function useDeleteBookContent(bookId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (contentId: string) => deleteBookContent(bookId!, contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookContentKeys.lists() })
    },
  })
}
