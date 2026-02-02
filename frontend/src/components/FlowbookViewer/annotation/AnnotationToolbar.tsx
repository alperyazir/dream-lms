import {
  Check,
  GripVertical,
  Highlighter,
  LogOut,
  Pencil,
  Pipette,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useAnnotationStore, useFlowbookBookStore, useFlowbookUIStore } from "../stores"
import { ConfirmDialog } from "../ui/ConfirmDialog"

// Main/common colors - easy to reach
const MAIN_COLORS = [
  "#000000", // Black
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
]

// Extended colors
const MORE_PEN_COLORS = [
  "#374151", // Gray
  "#DC2626", // Dark Red
  "#F59E0B", // Amber
  "#84CC16", // Lime
  "#10B981", // Emerald
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#0EA5E9", // Sky
  "#6366F1", // Indigo
  "#A855F7", // Violet
  "#D946EF", // Fuchsia
  "#F43F5E", // Rose
]

// Highlight colors - pastel/semi-transparent looking
const MAIN_HIGHLIGHT_COLORS = [
  "#FFFF00", // Yellow
  "#4ADE80", // Green
  "#22D3EE", // Cyan
  "#F472B6", // Pink
  "#FB923C", // Orange
  "#A78BFA", // Purple
  "#FCA5A5", // Red
  "#60A5FA", // Blue
]

const MORE_HIGHLIGHT_COLORS = [
  "#FEF08A", // Yellow light
  "#FDE047", // Yellow bright
  "#BBF7D0", // Green light
  "#86EFAC", // Green
  "#A5F3FC", // Cyan light
  "#67E8F9", // Cyan bright
  "#FBCFE8", // Pink light
  "#F9A8D4", // Pink
  "#FED7AA", // Orange light
  "#FDBA74", // Orange
  "#C4B5FD", // Purple light
  "#FECACA", // Red light
]

const WIDTH_OPTIONS = [2, 4, 8, 12]

interface AnnotationToolbarProps {
  onClose: () => void
}

export function AnnotationToolbar({ onClose }: AnnotationToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    penColor,
    setPenColor,
    penWidth,
    setPenWidth,
    highlightColor,
    setHighlightColor,
    undo,
    redo,
    clearAnnotations,
    savePageAnnotations,
    canvas,
    history,
    historyIndex,
  } = useAnnotationStore()

  const { currentPageIndex, totalPages } = useFlowbookBookStore()
  const { viewMode } = useFlowbookUIStore()

  // Compute canUndo and canRedo reactively based on history state
  const currentHistoryIndex = historyIndex[currentPageIndex] ?? -1
  const pageHistory = history[currentPageIndex] ?? []
  const canUndoNow = currentHistoryIndex > 0
  const canRedoNow = currentHistoryIndex < pageHistory.length - 1
  const hasCanvas = canvas !== null

  // Dragging state
  const [position, setPosition] = useState({ x: 16, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const positionRef = useRef(position)

  // Color picker state
  const [showMoreColors, setShowMoreColors] = useState(false)
  const [customColor, setCustomColor] = useState("#000000")
  const colorInputRef = useRef<HTMLInputElement>(null)

  // Clear confirmation dialog state
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const currentColor = activeTool === "highlight" ? highlightColor : penColor
  const mainColors = activeTool === "highlight" ? MAIN_HIGHLIGHT_COLORS : MAIN_COLORS
  const moreColors = activeTool === "highlight" ? MORE_HIGHLIGHT_COLORS : MORE_PEN_COLORS

  // Update position ref when position changes
  useEffect(() => {
    positionRef.current = position
  }, [position])

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      setIsDragging(true)

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

      dragStartRef.current = {
        x: clientX - positionRef.current.x,
        y: clientY - positionRef.current.y,
      }
    },
    []
  )

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

      const newX = clientX - dragStartRef.current.x
      const newY = clientY - dragStartRef.current.y

      // Keep within viewport bounds
      const maxX = window.innerWidth - 220
      const maxY = window.innerHeight - 300

      setPosition({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY)),
      })
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleEnd)
    window.addEventListener("touchmove", handleMove)
    window.addEventListener("touchend", handleEnd)

    return () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleEnd)
      window.removeEventListener("touchmove", handleMove)
      window.removeEventListener("touchend", handleEnd)
    }
  }, [isDragging])

  // Handle tool change
  const handleToolChange = (tool: "pen" | "highlight") => {
    setActiveTool(tool)
    setShowMoreColors(false)
  }

  // Handle color change
  const handleColorChange = (color: string) => {
    if (activeTool === "highlight") {
      setHighlightColor(color)
    } else {
      setPenColor(color)
    }
  }

  // Handle custom color from input
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    handleColorChange(color)
  }

  // Handle undo
  const handleUndo = () => {
    if (hasCanvas && canUndoNow) {
      undo(currentPageIndex)
    }
  }

  // Handle redo
  const handleRedo = () => {
    if (hasCanvas && canRedoNow) {
      redo(currentPageIndex)
    }
  }

  // Handle clear - show confirmation dialog
  const handleClearClick = () => {
    if (hasCanvas) {
      setShowClearConfirm(true)
    }
  }

  // Confirm clear action - clears both pages in double mode
  const handleClearConfirm = () => {
    // Clear current page
    clearAnnotations(currentPageIndex)

    // In double mode, also clear the adjacent page
    if (viewMode === "double") {
      const total = totalPages()
      // Normalize to even index (left page of spread)
      const normalizedIndex = currentPageIndex % 2 === 0 ? currentPageIndex : currentPageIndex - 1
      const rightPageIndex = normalizedIndex + 1

      // Clear the right page if it exists
      if (rightPageIndex < total) {
        clearAnnotations(rightPageIndex)
      }
      // Also ensure left page is cleared if we started on the right
      if (currentPageIndex !== normalizedIndex) {
        clearAnnotations(normalizedIndex)
      }
    }

    setShowClearConfirm(false)
  }

  // Handle save - save annotations and close toolbar
  const handleSave = () => {
    // Save current page
    savePageAnnotations(currentPageIndex)

    // In double mode, also save the adjacent page
    if (viewMode === "double") {
      const total = totalPages()
      const normalizedIndex = currentPageIndex % 2 === 0 ? currentPageIndex : currentPageIndex - 1
      const rightPageIndex = normalizedIndex + 1

      if (rightPageIndex < total) {
        savePageAnnotations(rightPageIndex)
      }
      if (currentPageIndex !== normalizedIndex) {
        savePageAnnotations(normalizedIndex)
      }
    }

    // Close toolbar after saving
    setActiveTool(null)
    onClose()
  }

  // Handle exit without explicit save (auto-save already happens on each stroke)
  const handleExit = () => {
    setActiveTool(null)
    onClose()
  }

  return (
    <>
      {/* Mode Notification - stays visible until toolbar closes */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300"
      >
        <div className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg">
          {activeTool === "highlight" ? (
            <Highlighter className="h-4 w-4 text-yellow-400" />
          ) : (
            <Pencil className="h-4 w-4 text-cyan-400" />
          )}
          <span className="text-sm font-medium">
            {activeTool === "highlight" ? "Highlight Mode" : "Draw Mode"}
          </span>
        </div>
      </div>

      {/* Compact Toolbar */}
      <div
        className={cn(
          "fixed z-50 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden",
          "transition-shadow duration-200",
          isDragging && "shadow-3xl"
        )}
        style={{
          left: position.x,
          top: position.y,
          width: 200,
          touchAction: "none",
        }}
      >
        {/* Drag Handle + Title */}
        <div
          className="flex items-center justify-center px-2 py-1.5 bg-slate-700/50 cursor-move select-none"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-300">
              {activeTool === "highlight" ? "Highlight" : "Draw"}
            </span>
          </div>
        </div>

        {/* Tool Toggle */}
        <div className="flex gap-1 px-2 py-1.5 border-b border-slate-700/50">
          <button
            onClick={() => handleToolChange("pen")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all",
              activeTool === "pen"
                ? "bg-cyan-600 text-white"
                : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
            Pen
          </button>
          <button
            onClick={() => handleToolChange("highlight")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all",
              activeTool === "highlight"
                ? "bg-cyan-600 text-white"
                : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
            )}
          >
            <Highlighter className="h-3.5 w-3.5" />
            Highlight
          </button>
        </div>

        {/* Color Section */}
        <div className="px-2 py-2 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Color</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowMoreColors(!showMoreColors)}
                className="text-[10px] text-cyan-400 hover:text-cyan-300"
              >
                {showMoreColors ? "Less" : "More"}
              </button>
              <button
                onClick={() => colorInputRef.current?.click()}
                className="p-0.5 text-slate-400 hover:text-cyan-400"
              >
                <Pipette className="h-3 w-3" />
              </button>
              <input
                ref={colorInputRef}
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="sr-only"
              />
            </div>
          </div>

          {/* Main Colors Row */}
          <div className="flex gap-1 mb-1">
            {mainColors.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className={cn(
                  "w-5 h-5 rounded-full border transition-all hover:scale-110",
                  currentColor === color
                    ? "border-white scale-110 ring-1 ring-white/50"
                    : "border-slate-600"
                )}
                style={{
                  backgroundColor: color,
                  opacity: activeTool === "highlight" ? 0.8 : 1,
                }}
              />
            ))}
          </div>

          {/* More Colors */}
          {showMoreColors && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-700/30">
              {moreColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={cn(
                    "w-4 h-4 rounded-full border transition-all hover:scale-110",
                    currentColor === color
                      ? "border-white scale-110"
                      : "border-slate-600"
                  )}
                  style={{
                    backgroundColor: color,
                    opacity: activeTool === "highlight" ? 0.8 : 1,
                  }}
                />
              ))}
            </div>
          )}

          {/* Current color indicator */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <div
              className="w-4 h-4 rounded-full border border-slate-500"
              style={{
                backgroundColor: currentColor,
                opacity: activeTool === "highlight" ? 0.6 : 1,
              }}
            />
            <span className="text-[10px] text-slate-500 font-mono">{currentColor}</span>
          </div>
        </div>

        {/* Size Section */}
        <div className="px-2 py-2 border-b border-slate-700/50">
          <span className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1.5">Size</span>
          <div className="flex gap-1">
            {WIDTH_OPTIONS.map((width) => (
              <button
                key={width}
                onClick={() => setPenWidth(width)}
                className={cn(
                  "flex-1 flex items-center justify-center h-7 rounded-lg transition-all",
                  penWidth === width
                    ? "bg-cyan-600"
                    : "bg-slate-700/50 hover:bg-slate-700"
                )}
              >
                <div
                  className="rounded-full bg-white"
                  style={{
                    width: Math.min(width + 1, 12),
                    height: Math.min(width + 1, 12),
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-700/50">
          <div className="flex gap-0.5">
            <button
              onClick={handleUndo}
              disabled={!hasCanvas || !canUndoNow}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                hasCanvas && canUndoNow
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-600 cursor-not-allowed"
              )}
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!hasCanvas || !canRedoNow}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                hasCanvas && canRedoNow
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-600 cursor-not-allowed"
              )}
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={handleClearClick}
            disabled={!hasCanvas}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all",
              hasCanvas
                ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                : "text-slate-600 cursor-not-allowed"
            )}
            title="Clear all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>

        {/* Save & Exit Buttons */}
        <div className="flex gap-2 px-2 py-2">
          <button
            onClick={handleSave}
            disabled={!hasCanvas}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
              hasCanvas
                ? "bg-cyan-600 text-white hover:bg-cyan-700"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            )}
          >
            <Check className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            onClick={handleExit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit
          </button>
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Annotations"
        message="Are you sure you want to clear all annotations on this page? This action cannot be undone."
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        onConfirm={handleClearConfirm}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  )
}
