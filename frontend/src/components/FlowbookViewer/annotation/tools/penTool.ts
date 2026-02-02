import type { Canvas } from "fabric"
import { PencilBrush } from "fabric"

export interface PenConfig {
  color: string
  width: number
}

export function configurePenTool(canvas: Canvas, config: PenConfig) {
  canvas.isDrawingMode = true
  const brush = new PencilBrush(canvas)
  brush.color = config.color
  brush.width = config.width
  canvas.freeDrawingBrush = brush
}

export const PEN_COLORS = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#EF4444" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#22C55E" },
  { name: "Orange", value: "#F97316" },
  { name: "Purple", value: "#A855F7" },
] as const

export const PEN_WIDTHS = [
  { name: "Thin", value: 2 },
  { name: "Medium", value: 4 },
  { name: "Thick", value: 8 },
] as const
