/**
 * ContentCard - Display card for library content item
 * Story 27.21: Content Library UI - Task 6
 *
 * Shows activity type, name, source, item count, dates, and usage stats.
 */

import { BookOpen, FileText, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getActivityTypeColorClasses,
  getActivityTypeConfig,
} from "@/lib/activityTypeConfig"
import type { ContentItem } from "@/types/content-library"

interface ContentCardProps {
  content: ContentItem
  onPreview: (content: ContentItem) => void
  onEdit: (content: ContentItem) => void
  onUse: (content: ContentItem) => void
}

export function ContentCard({
  content,
  onPreview,
  onEdit,
  onUse,
}: ContentCardProps) {
  const config = getActivityTypeConfig(content.activity_type)
  const colorClasses = getActivityTypeColorClasses(config.color)
  const IconComponent = config.icon

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Get source display
  const getSourceDisplay = () => {
    if (content.source_type === "book" && content.book_title) {
      return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>{content.book_title}</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>{content.material_name || "My Material"}</span>
      </div>
    )
  }

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${colorClasses.bg}`}>
              <IconComponent className={`h-5 w-5 ${colorClasses.text}`} />
            </div>
            <div>
              <CardTitle className="text-base">{content.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
          </div>
          {content.is_shared && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              Shared
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {/* Source */}
        {getSourceDisplay()}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {content.item_count} {content.item_count === 1 ? "item" : "items"}
          </span>
          {content.used_in_assignments > 0 && (
            <Badge variant="outline" className="text-xs">
              Used {content.used_in_assignments}x
            </Badge>
          )}
        </div>

        {/* Date */}
        <p className="text-xs text-muted-foreground">
          Created: {formatDate(content.created_at)}
        </p>

        {/* Creator (only for shared content) */}
        {content.is_shared && content.created_by && (
          <p className="text-xs text-muted-foreground">
            By: {content.created_by.name}
          </p>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(content)}
            className="flex-1"
          >
            Preview
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onEdit(content)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => onUse(content)} className="flex-1">
            Use
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
