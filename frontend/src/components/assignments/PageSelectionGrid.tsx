/**
 * Page Selection Grid Component - Story 9.5
 *
 * Displays a grid of page thumbnails grouped by module for bulk activity selection.
 * Clicking a page toggles all activities on that page.
 */

import { Check, ImageIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getPageThumbnailUrl } from "@/services/booksApi"
import type { ModuleWithActivities, PageWithActivities } from "@/types/book"

interface PageSelectionGridProps {
  modules: ModuleWithActivities[]
  selectedActivityIds: Set<string>
  onPageToggle: (
    pageNumber: number,
    activityIds: string[],
    moduleName: string,
  ) => void
}

interface PageCardProps {
  page: PageWithActivities
  isSelected: boolean
  partiallySelected: boolean
  onToggle: () => void
}

function PageCard({
  page,
  isSelected,
  partiallySelected,
  onToggle,
}: PageCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [thumbnailError, setThumbnailError] = useState(false)

  // Load thumbnail on mount
  useEffect(() => {
    if (page.thumbnail_url) {
      getPageThumbnailUrl(page.thumbnail_url)
        .then((url) => {
          if (url) setThumbnailUrl(url)
          else setThumbnailError(true)
        })
        .catch(() => setThumbnailError(true))
    }
  }, [page.thumbnail_url])

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        relative flex flex-col rounded-lg border-2 transition-all overflow-hidden
        ${
          isSelected
            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
            : partiallySelected
              ? "border-purple-300 bg-purple-50/50 dark:bg-purple-900/10"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
        }
      `}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-[3/4] bg-gray-100 dark:bg-neutral-800">
        {thumbnailUrl && !thumbnailError ? (
          <img
            src={thumbnailUrl}
            alt={`Page ${page.page_number}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="h-6 w-6 text-gray-400" />
          </div>
        )}

        {/* Selection Overlay */}
        {(isSelected || partiallySelected) && (
          <div
            className={`
              absolute inset-0 flex items-center justify-center
              ${isSelected ? "bg-purple-500/30" : "bg-purple-500/15"}
            `}
          >
            <div
              className={`
                rounded-full p-1
                ${isSelected ? "bg-purple-500" : "bg-purple-400"}
              `}
            >
              <Check className="h-3 w-3 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Page Info */}
      <div className="px-1 py-1 text-center">
        <div className="text-[10px] font-medium text-foreground">
          Page {page.page_number}
        </div>
        <Badge variant="outline" className="text-[8px] px-1 py-0">
          {page.activity_count}{" "}
          {page.activity_count === 1 ? "activity" : "activities"}
        </Badge>
      </div>
    </button>
  )
}

export function PageSelectionGrid({
  modules,
  selectedActivityIds,
  onPageToggle,
}: PageSelectionGridProps) {
  // Check if a page is fully selected (all activities selected)
  const isPageFullySelected = useCallback(
    (page: PageWithActivities): boolean => {
      return page.activity_ids.every((id) => selectedActivityIds.has(id))
    },
    [selectedActivityIds],
  )

  // Check if a page is partially selected (some activities selected)
  const isPagePartiallySelected = useCallback(
    (page: PageWithActivities): boolean => {
      if (isPageFullySelected(page)) return false
      return page.activity_ids.some((id) => selectedActivityIds.has(id))
    },
    [selectedActivityIds, isPageFullySelected],
  )

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-2">
        {modules.map((module) => (
          <div key={module.name}>
            {/* Module Header */}
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-foreground">
                {module.name}
              </h4>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>
                  Pages {module.page_start}-{module.page_end}
                </span>
                <Badge variant="secondary" className="text-[9px]">
                  {module.activity_count} activities
                </Badge>
              </div>
            </div>

            {/* Pages Grid */}
            <div className="grid grid-cols-6 gap-2">
              {module.pages.map((page) => {
                const isFullySelected = isPageFullySelected(page)
                const isPartiallySelected = isPagePartiallySelected(page)

                return (
                  <PageCard
                    key={`${module.name}-${page.page_number}`}
                    page={page}
                    isSelected={isFullySelected}
                    partiallySelected={isPartiallySelected}
                    onToggle={() =>
                      onPageToggle(
                        page.page_number,
                        page.activity_ids,
                        module.name,
                      )
                    }
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
