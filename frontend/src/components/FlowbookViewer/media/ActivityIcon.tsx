import { Puzzle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActivityReference } from "@/types/flowbook"
import { useFlowbookUIStore } from "../stores"

interface ActivityIconProps {
  activityRef: ActivityReference
  pageWidth: number
  pageHeight: number
}

export function ActivityIcon({
  activityRef,
  pageWidth,
  pageHeight,
}: ActivityIconProps) {
  const { openActivity } = useFlowbookUIStore()

  // Calculate position as percentage of page dimensions
  const leftPercent = (activityRef.x / pageWidth) * 100
  const topPercent = (activityRef.y / pageHeight) * 100

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering zoom gestures
    openActivity(activityRef.id)
  }

  // Render circular icon button (same style as audio/video icons)
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "absolute z-20 pointer-events-auto",
        "flex items-center justify-center",
        "h-6 w-6 rounded-full",
        "border-2 border-white",
        "bg-cyan-500/90 text-white",
        "shadow-md transition-all duration-200",
        "hover:scale-110 hover:bg-cyan-600",
      )}
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
      }}
      aria-label="Open activity"
    >
      <Puzzle className="h-3 w-3" />
    </button>
  )
}
