import type { Canvas } from "fabric"
import { PencilBrush } from "fabric"

export interface HighlightConfig {
  color: string
  width: number
  opacity: number
}

export function configureHighlightTool(canvas: Canvas, config: HighlightConfig) {
  canvas.isDrawingMode = true

  const brush = new PencilBrush(canvas)
  brush.width = config.width
  brush.color = hexToRgba(config.color, config.opacity)
  canvas.freeDrawingBrush = brush
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#FACC15", bgClass: "bg-yellow-400" },
  { name: "Pink", value: "#F472B6", bgClass: "bg-pink-400" },
  { name: "Green", value: "#4ADE80", bgClass: "bg-green-400" },
  { name: "Blue", value: "#60A5FA", bgClass: "bg-blue-400" },
  { name: "Orange", value: "#FB923C", bgClass: "bg-orange-400" },
] as const

export const HIGHLIGHT_CONFIG = {
  width: 20,
  opacity: 0.4,
} as const
