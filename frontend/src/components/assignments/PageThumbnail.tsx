/**
 * Page Thumbnail Component - Story 8.2
 *
 * Displays a single book page thumbnail with:
 * - Lazy-loaded image with skeleton placeholder
 * - Activity count badge
 * - Selection state (checkmark overlay)
 */

import { Check } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { booksApi } from "@/services/booksApi"

interface PageThumbnailProps {
  thumbnailUrl: string
  pageNumber: number
  activityCount: number
  isSelected: boolean
  onClick: () => void
}

export function PageThumbnail({
  thumbnailUrl,
  pageNumber,
  activityCount,
  isSelected,
  onClick,
}: PageThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Fetch authenticated image URL when visible
  useEffect(() => {
    if (!isVisible || !thumbnailUrl) return

    let isMounted = true

    const loadImage = async () => {
      try {
        setIsLoading(true)
        const blobUrl = await booksApi.getPageThumbnailUrl(thumbnailUrl)
        if (isMounted) {
          setImageUrl(blobUrl)
          setIsLoading(false)
        }
      } catch (error) {
        if (isMounted) {
          console.error("Failed to load page thumbnail:", error)
          setHasError(true)
          setIsLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      isMounted = false
      // Clean up blob URL
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [isVisible, thumbnailUrl, imageUrl])

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-lg overflow-hidden transition-all
        border-2
        ${
          isSelected
            ? "border-purple-600 dark:border-purple-500 ring-2 ring-purple-600/30 dark:ring-purple-500/30"
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
        }
      `}
    >
      {/* Thumbnail Image */}
      <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
        {isLoading && <Skeleton className="w-full h-full" />}
        {!isLoading && hasError && (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <span className="text-3xl font-bold">{pageNumber}</span>
            <span className="text-xs mt-1">
              {activityCount} {activityCount === 1 ? "activity" : "activities"}
            </span>
          </div>
        )}
        {!isLoading && imageUrl && (
          <img
            src={imageUrl}
            alt={`Page ${pageNumber}`}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Page Number Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <span className="text-white text-xs font-medium">
          Page {pageNumber}
        </span>
      </div>

      {/* Activity Count Badge */}
      <Badge className="absolute top-2 right-2 bg-teal-600 hover:bg-teal-600 text-white text-xs">
        {activityCount}
      </Badge>

      {/* Selection Checkmark Overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-purple-600/20 dark:bg-purple-500/20 flex items-center justify-center">
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-purple-600 dark:bg-purple-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </div>
  )
}
