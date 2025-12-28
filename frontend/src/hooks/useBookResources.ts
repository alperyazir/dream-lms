/**
 * Hook for checking book resource availability
 * Story 21.2: Conditional Resources Section
 *
 * Provides easy access to book resources (videos) and checks if content exists.
 * Used for conditional rendering of Resources sections across the app.
 */

import { useQuery } from "@tanstack/react-query"
import { getBookVideos, type VideoInfo } from "@/services/booksApi"

export interface UseBookResourcesReturn {
  videos: VideoInfo[]
  hasVideos: boolean
  hasAnyContent: boolean
  isLoading: boolean
  error: Error | null
}

/**
 * Hook to check if a book has videos or other resources
 *
 * @param bookId - Book ID (string or number)
 * @returns Object with videos, availability flags, loading state
 */
export function useBookResources(
  bookId: string | number | undefined,
): UseBookResourcesReturn {
  const {
    data: videosData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["book-resources", bookId],
    queryFn: () => getBookVideos(bookId!),
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const videos = videosData?.videos ?? []

  return {
    videos,
    hasVideos: videos.length > 0,
    hasAnyContent: videos.length > 0, // Currently only videos, but extendable for other resource types
    isLoading,
    error: error as Error | null,
  }
}
