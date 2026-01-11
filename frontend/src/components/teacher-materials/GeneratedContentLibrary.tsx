/**
 * GeneratedContentLibrary Component
 * Story 27.15: Teacher Materials Processing
 *
 * Displays teacher's AI-generated content library with filtering by activity type,
 * usage status tracking, and deletion of unused content.
 */

import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle,
  Eye,
  FileText,
  Filter,
  Loader2,
  MoreVertical,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { teacherMaterialsApi } from "@/services/teacherMaterialsApi"
import type { GeneratedContent } from "@/types/teacher-material"
import { ACTIVITY_TYPE_LABELS } from "@/types/teacher-material"

// =============================================================================
// Types
// =============================================================================

interface GeneratedContentLibraryProps {
  /** Additional CSS classes */
  className?: string
}

// Activity type icons mapping
const ACTIVITY_ICONS: Record<string, typeof Sparkles> = {
  vocab_quiz: Sparkles,
  ai_quiz: Sparkles,
  reading: BookOpen,
  matching: Sparkles,
  sentence_builder: Sparkles,
  word_builder: Sparkles,
}

// =============================================================================
// Component
// =============================================================================

export function GeneratedContentLibrary({
  className,
}: GeneratedContentLibraryProps) {
  // Data state
  const [contents, setContents] = useState<GeneratedContent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [filterActivityType, setFilterActivityType] = useState<string | null>(
    null,
  )

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contentToDelete, setContentToDelete] =
    useState<GeneratedContent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Preview state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState<GeneratedContent | null>(
    null,
  )

  // Load content on mount and filter change
  useEffect(() => {
    async function loadContent() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await teacherMaterialsApi.listGeneratedContent(
          filterActivityType
            ? { activity_type: filterActivityType }
            : undefined,
        )
        setContents(response.items)
      } catch (err) {
        console.error("Failed to load generated content:", err)
        setError("Failed to load generated content")
      } finally {
        setIsLoading(false)
      }
    }
    loadContent()
  }, [filterActivityType])

  // Handle delete click
  const handleDeleteClick = useCallback((content: GeneratedContent) => {
    setContentToDelete(content)
    setDeleteDialogOpen(true)
  }, [])

  // Handle delete confirm
  const handleDeleteConfirm = useCallback(async () => {
    if (!contentToDelete) return

    setIsDeleting(true)
    try {
      await teacherMaterialsApi.deleteGeneratedContent(contentToDelete.id)
      setContents((prev) => prev.filter((c) => c.id !== contentToDelete.id))
      setDeleteDialogOpen(false)
      setContentToDelete(null)
    } catch (err) {
      console.error("Failed to delete content:", err)
      // Show error but don't close dialog
    } finally {
      setIsDeleting(false)
    }
  }, [contentToDelete])

  // Handle preview click
  const handlePreviewClick = useCallback((content: GeneratedContent) => {
    setPreviewContent(content)
    setPreviewDialogOpen(true)
  }, [])

  // Get activity type label
  const getActivityLabel = (type: string) => {
    return ACTIVITY_TYPE_LABELS[type] || type
  }

  // Get activity type icon
  const getActivityIcon = (type: string) => {
    return ACTIVITY_ICONS[type] || Sparkles
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Generated Content Library
        </h3>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select
            value={filterActivityType || "all"}
            onValueChange={(v) => setFilterActivityType(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Activity Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activity Types</SelectItem>
              {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <Card className="bg-red-50 dark:bg-red-900/20">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : contents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Generated Content Yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filterActivityType
                ? `No ${getActivityLabel(filterActivityType)} content found.`
                : "Generate quizzes, reading activities, and more from your books or materials."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contents.map((content) => {
            const ActivityIcon = getActivityIcon(content.activity_type)

            return (
              <Card
                key={content.id}
                className="transition-colors hover:border-gray-400"
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Content Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <ActivityIcon className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {content.title}
                        </h4>
                      </div>

                      {/* Badges */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {getActivityLabel(content.activity_type)}
                        </Badge>
                        {content.is_used ? (
                          <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            In Use
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Available
                          </Badge>
                        )}
                      </div>

                      {/* Source info */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        {content.material_name ? (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {content.material_name}
                          </span>
                        ) : content.book_name ? (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {content.book_name}
                          </span>
                        ) : content.book_id ? (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            Book #{content.book_id}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(content.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handlePreviewClick(content)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        {!content.is_used && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(content)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Generated Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{contentToDelete?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {previewContent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {previewContent &&
                  getActivityLabel(previewContent.activity_type)}
              </Badge>
              {previewContent?.material_name && (
                <Badge variant="outline">
                  <FileText className="h-3 w-3 mr-1" />
                  {previewContent.material_name}
                </Badge>
              )}
              {previewContent?.book_name && (
                <Badge variant="outline">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {previewContent.book_name}
                </Badge>
              )}
            </div>

            {/* Content JSON */}
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                {previewContent &&
                  JSON.stringify(previewContent.content, null, 2)}
              </pre>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

GeneratedContentLibrary.displayName = "GeneratedContentLibrary"
