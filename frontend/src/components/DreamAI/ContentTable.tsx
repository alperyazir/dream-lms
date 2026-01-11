/**
 * ContentTable - Table view for library content items
 * Story 27.21: Content Library UI
 *
 * Displays content items in a compact table format with sortable columns.
 */

import { BookOpen, Eye, FileText, Pencil, Play, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getActivityTypeColorClasses,
  getActivityTypeConfig,
} from "@/lib/activityTypeConfig"
import type { ContentItem } from "@/types/content-library"

interface ContentTableProps {
  items: ContentItem[]
  onPreview: (content: ContentItem) => void
  onEdit: (content: ContentItem) => void
  onUse: (content: ContentItem) => void
  onDelete: (content: ContentItem) => void
}

export function ContentTable({
  items,
  onPreview,
  onEdit,
  onUse,
  onDelete,
}: ContentTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead className="w-[180px]">Title</TableHead>
            <TableHead className="w-[130px]">Type</TableHead>
            <TableHead className="w-[180px]">Source</TableHead>
            <TableHead className="w-14 text-center">Items</TableHead>
            <TableHead className="w-24">Created</TableHead>
            <TableHead className="w-20 text-center">Status</TableHead>
            <TableHead className="w-[140px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((content) => {
            const config = getActivityTypeConfig(content.activity_type)
            const colorClasses = getActivityTypeColorClasses(config.color)
            const IconComponent = config.icon

            return (
              <TableRow key={content.id}>
                {/* Icon */}
                <TableCell className="py-2">
                  <div className={`rounded-md p-1.5 ${colorClasses.bg} w-fit`}>
                    <IconComponent className={`h-4 w-4 ${colorClasses.text}`} />
                  </div>
                </TableCell>

                {/* Title */}
                <TableCell className="py-2">
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">
                      {content.title}
                    </span>
                    {content.is_shared && content.created_by && (
                      <span className="text-xs text-muted-foreground">
                        by {content.created_by.name}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Activity Type */}
                <TableCell className="py-2">
                  <span className="text-sm text-muted-foreground">
                    {config.label}
                  </span>
                </TableCell>

                {/* Source */}
                <TableCell className="py-2">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {content.source_type === "book" ? (
                      <>
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {content.book_title || `Book ${content.book_id}`}
                        </span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {content.material_name || "My Material"}
                        </span>
                      </>
                    )}
                  </div>
                </TableCell>

                {/* Items Count */}
                <TableCell className="text-center py-2">
                  <span className="text-sm">{content.item_count}</span>
                </TableCell>

                {/* Created Date */}
                <TableCell className="py-2">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(content.created_at)}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell className="text-center py-2">
                  {content.is_shared ? (
                    <Badge variant="secondary" className="text-xs">
                      Shared
                    </Badge>
                  ) : content.used_in_assignments > 0 ? (
                    <Badge variant="outline" className="text-xs">
                      {content.used_in_assignments}x
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* Actions - Always visible */}
                <TableCell className="text-right py-2">
                  <TooltipProvider delayDuration={300}>
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onPreview(content)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="sr-only">Preview</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Preview</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onEdit(content)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Content</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onUse(content)}
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span className="sr-only">Use</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Use in Assignment</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => onDelete(content)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
