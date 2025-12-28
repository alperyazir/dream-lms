/**
 * ResourcesSectionSkeleton Component
 * Story 21.2: Conditional Resources Section
 *
 * Loading skeleton for the Resources section.
 * Prevents content flash while checking for available resources.
 */

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface ResourcesSectionSkeletonProps {
  className?: string
}

export function ResourcesSectionSkeleton({
  className,
}: ResourcesSectionSkeletonProps) {
  return (
    <section
      className={cn("space-y-4", className)}
      data-testid="resources-skeleton"
      aria-label="Loading resources"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    </section>
  )
}
