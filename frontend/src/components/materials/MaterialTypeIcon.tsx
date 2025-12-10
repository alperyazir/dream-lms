/**
 * MaterialTypeIcon Component
 * Story 13.2: Frontend My Materials Management
 *
 * Displays appropriate icon based on material type.
 */

import {
  FileText,
  Image,
  Link,
  Music,
  StickyNote,
  Video,
} from "lucide-react"
import type { MaterialType } from "@/types/material"

interface MaterialTypeIconProps {
  type: MaterialType
  className?: string
  size?: "sm" | "md" | "lg"
}

const iconMap: Record<MaterialType, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  image: Image,
  audio: Music,
  video: Video,
  url: Link,
  text_note: StickyNote,
}

const colorMap: Record<MaterialType, string> = {
  document: "text-red-500",
  image: "text-blue-500",
  audio: "text-green-500",
  video: "text-purple-500",
  url: "text-cyan-500",
  text_note: "text-amber-500",
}

const sizeMap: Record<string, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
}

/**
 * MaterialTypeIcon displays an icon and color based on material type
 */
export function MaterialTypeIcon({
  type,
  className = "",
  size = "md",
}: MaterialTypeIconProps) {
  const Icon = iconMap[type] || FileText
  const color = colorMap[type] || "text-gray-500"
  const sizeClass = sizeMap[size]

  return <Icon className={`${sizeClass} ${color} ${className}`} />
}

/**
 * Get the display label for a material type
 */
export function getMaterialTypeLabel(type: MaterialType): string {
  const labels: Record<MaterialType, string> = {
    document: "Document",
    image: "Image",
    audio: "Audio",
    video: "Video",
    url: "URL Link",
    text_note: "Text Note",
  }
  return labels[type] || type
}

MaterialTypeIcon.displayName = "MaterialTypeIcon"
