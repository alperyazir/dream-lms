/**
 * Zoom Controls Component - Story 9.8
 *
 * Provides zoom controls for page viewer:
 * - Zoom in (+) button
 * - Zoom out (-) button
 * - Current zoom level display
 * - Reset to 100% button
 * - Keyboard shortcuts (Ctrl/Cmd + / -)
 */

import { Minus, Plus, RotateCcw } from "lucide-react"
import { useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200] as const
export type ZoomLevel = (typeof ZOOM_LEVELS)[number]

export interface ZoomControlsProps {
  zoomLevel: ZoomLevel
  onZoomChange: (level: ZoomLevel) => void
  enableKeyboardShortcuts?: boolean
}

export function ZoomControls({
  zoomLevel,
  onZoomChange,
  enableKeyboardShortcuts = true,
}: ZoomControlsProps) {
  // Find current index in zoom levels
  const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel)

  // Handlers
  const handleZoomIn = useCallback(() => {
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1)
    onZoomChange(ZOOM_LEVELS[nextIndex])
  }, [currentIndex, onZoomChange])

  const handleZoomOut = useCallback(() => {
    const prevIndex = Math.max(currentIndex - 1, 0)
    onZoomChange(ZOOM_LEVELS[prevIndex])
  }, [currentIndex, onZoomChange])

  const handleReset = useCallback(() => {
    onZoomChange(100)
  }, [onZoomChange])

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey

      if (isMod && (e.key === "=" || e.key === "+")) {
        e.preventDefault()
        handleZoomIn()
      } else if (isMod && e.key === "-") {
        e.preventDefault()
        handleZoomOut()
      } else if (isMod && e.key === "0") {
        e.preventDefault()
        handleReset()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enableKeyboardShortcuts, handleZoomIn, handleZoomOut, handleReset])

  const canZoomOut = currentIndex > 0
  const canZoomIn = currentIndex < ZOOM_LEVELS.length - 1
  const isDefaultZoom = zoomLevel === 100

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1 bg-muted/50 rounded-md p-1">
        {/* Row 1: Zoom Out, Level, Zoom In */}
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleZoomOut}
                disabled={!canZoomOut}
              >
                <Minus className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom out (Ctrl/Cmd + -)</p>
            </TooltipContent>
          </Tooltip>

          {/* Current Zoom Level */}
          <div className="text-center text-[10px] font-medium text-muted-foreground">
            {zoomLevel}%
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleZoomIn}
                disabled={!canZoomIn}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom in (Ctrl/Cmd + +)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Row 2: Reset Button (full width) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-full text-[10px]"
              onClick={handleReset}
              disabled={isDefaultZoom}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reset zoom (Ctrl/Cmd + 0)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
