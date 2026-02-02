import type { ViewMode } from "@/types/flowbook"

/**
 * Get the pages to display in the current spread
 * For single view: just the current page
 * For double view: current page and next page (or just current if on last page)
 */
export function getSpreadPages(
  currentPageIndex: number,
  totalPages: number,
  viewMode: ViewMode,
): number[] {
  if (totalPages === 0) return []

  if (viewMode === "single") {
    return [currentPageIndex]
  }

  // Double page view
  // If on an even index (0, 2, 4...), show current and next
  // If on an odd index (1, 3, 5...), show previous and current
  const isEven = currentPageIndex % 2 === 0

  if (isEven) {
    // Show current page on left, next on right
    if (currentPageIndex + 1 < totalPages) {
      return [currentPageIndex, currentPageIndex + 1]
    }
    // Last page alone
    return [currentPageIndex]
  }
  // Show previous page on left, current on right
  return [currentPageIndex - 1, currentPageIndex]
}

/**
 * Calculate position for an element as percentage of container
 */
export function calculatePosition(
  x: number,
  y: number,
  elementWidth: number,
  elementHeight: number,
  containerWidth: number,
  containerHeight: number,
): { left: string; top: string; width: string; height: string } {
  return {
    left: `${(x / containerWidth) * 100}%`,
    top: `${(y / containerHeight) * 100}%`,
    width: `${(elementWidth / containerWidth) * 100}%`,
    height: `${(elementHeight / containerHeight) * 100}%`,
  }
}

/**
 * Format page number for display (1-indexed)
 */
export function formatPageNumber(index: number): string {
  return String(index + 1)
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
