import { BookOpen } from "lucide-react"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getAuthenticatedCoverUrl } from "@/services/booksApi"

interface BookCoverProps {
  coverUrl: string | null
  title: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeMap = {
  sm: { width: "w-12", height: "h-16" }, // 48x64 - table thumbnails
  md: { width: "w-24", height: "h-32" }, // 96x128 - small cards
  lg: { width: "w-36", height: "h-48" }, // 144x192 - large cards
}

export function BookCover({
  coverUrl,
  title,
  size = "md",
  className,
}: BookCoverProps) {
  const [authenticatedUrl, setAuthenticatedUrl] = useState<string | null>(null)
  const [isLoadingCover, setIsLoadingCover] = useState(true)
  const [imageError, setImageError] = useState(false)

  // Use fixed sizes from sizeMap only if className doesn't override them
  const useFallbackSizes =
    !className?.includes("w-") && !className?.includes("h-")
  const { width, height } = sizeMap[size]

  // Fetch authenticated cover URL
  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    // Reset error state when cover URL changes
    setImageError(false)

    async function fetchCover() {
      if (!coverUrl) {
        setIsLoadingCover(false)
        return
      }

      const url = await getAuthenticatedCoverUrl(coverUrl)
      if (isMounted) {
        blobUrl = url
        setAuthenticatedUrl(url)
        setIsLoadingCover(false)
      }
    }

    fetchCover()

    return () => {
      isMounted = false
      // Cleanup blob URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [coverUrl])

  if (imageError || !authenticatedUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-md",
          useFallbackSizes && width,
          useFallbackSizes && height,
          className,
        )}
        role="img"
        aria-label={`${title} cover`}
      >
        {isLoadingCover ? (
          <Skeleton className={cn("w-full h-full rounded-md")} />
        ) : (
          <BookOpen className="w-1/3 h-1/3 text-muted-foreground" />
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative",
        useFallbackSizes && width,
        useFallbackSizes && height,
        className,
      )}
    >
      {isLoadingCover && (
        <Skeleton className={cn("absolute inset-0 rounded-md")} />
      )}
      <img
        src={authenticatedUrl}
        alt={`${title} cover`}
        className={cn(
          "rounded-md object-cover",
          useFallbackSizes && width,
          useFallbackSizes && height,
          !useFallbackSizes && "w-full h-full",
          isLoadingCover && "invisible",
        )}
        onLoad={() => setIsLoadingCover(false)}
        onError={() => setImageError(true)}
      />
    </div>
  )
}
