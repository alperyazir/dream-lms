/**
 * StorageQuotaBar Component
 * Story 13.2: Frontend My Materials Management
 *
 * Displays storage usage with visual progress bar and warning states.
 */

import { AlertCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StorageQuota } from "@/types/material"

interface StorageQuotaBarProps {
  quota: StorageQuota | null
  className?: string
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * StorageQuotaBar displays the teacher's storage usage
 */
export function StorageQuotaBar({ quota, className }: StorageQuotaBarProps) {
  if (!quota) {
    return (
      <div className={cn("rounded-lg border bg-card p-4", className)}>
        <div className="animate-pulse">
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  const { used_bytes, quota_bytes, used_percentage, is_warning, is_full } =
    quota

  const getProgressColor = () => {
    if (is_full) return "bg-red-500"
    if (is_warning) return "bg-amber-500"
    return "bg-teal-500"
  }

  const getTextColor = () => {
    if (is_full) return "text-red-500"
    if (is_warning) return "text-amber-500"
    return "text-muted-foreground"
  }

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          Storage: {formatBytes(used_bytes)} / {formatBytes(quota_bytes)}
        </span>
        <span className={cn("text-sm font-medium", getTextColor())}>
          {used_percentage.toFixed(0)}%
        </span>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full transition-all duration-300",
            getProgressColor(),
          )}
          style={{ width: `${Math.min(used_percentage, 100)}%` }}
        />
      </div>

      {/* Warning/Full Messages */}
      {is_full && (
        <div className="flex items-center gap-2 mt-3 text-red-500">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-xs">
            Storage full - delete materials to upload more
          </p>
        </div>
      )}

      {is_warning && !is_full && (
        <div className="flex items-center gap-2 mt-3 text-amber-500">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p className="text-xs">Running low on space</p>
        </div>
      )}
    </div>
  )
}

StorageQuotaBar.displayName = "StorageQuotaBar"
